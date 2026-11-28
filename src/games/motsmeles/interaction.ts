import { complete, isUnlocked, line, parseRecords, select, start, type Records, type State } from '../../engines/motsmeles';
import { bindAction } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { stopSpeech } from '../../shell/speech';
import type { StoragePort } from '../../shell/storage';
import { gameView, instruction, labels, levelView } from './view';

export const RECORDS_KEY = 'opencadkid.motsmeles.v1';
export function readRecords(storage?: StoragePort): Records {
    try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; }
}
export function writeRecords(storage: StoragePort | undefined, records: Records): void {
    try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ }
}

export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
export function snapshot(session: Session): object {
    return { ...session, grid: session.state?.grid ?? null };
}

export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined,
    speak: (parts: string[]) => void, seed: () => number, home: () => void): () => void {
    const t = labels[locale];
    let disposeBoard: (() => void) | undefined;
    function showLevels(): void {
        disposeBoard?.();
        disposeBoard = undefined;
        stopSpeech();
        session.screen = 'levels';
        session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'motsmeles:home');
        for (const button of root.querySelectorAll<HTMLButtonElement>('[data-motsmeles-level]')) {
            const id = Number(button.dataset.motsmelesLevel);
            bindAction(button, () => begin(id), `motsmeles:level:${id}`);
        }
    }
    function begin(id: number): void {
        if (!isUnlocked(session.records, id)) return;
        const previousSeed = session.state?.grid.seed;
        const nextSeed = seed();
        const state = start(id, nextSeed === previousSeed ? (nextSeed + 1) >>> 0 : nextSeed, locale);
        session.screen = 'play';
        session.state = state;
        draw(state);
        root.querySelector<HTMLButtonElement>('[data-motsmeles-cell]')?.focus({ preventScroll: true });
        speak([instruction(state, locale)]);
    }

    function draw(initial: State): void {
        disposeBoard?.();
        root.innerHTML = gameView(initial, locale);
        const play = root.querySelector<HTMLElement>('.motsmeles-play')!;
        const grid = play.querySelector<HTMLElement>('.motsmeles-grid')!;
        const cells = [...grid.querySelectorAll<HTMLButtonElement>('[data-motsmeles-cell]')];
        const size = initial.grid.size;
        let anchor: number | null = null, cursor = 0, errorTimer: number | undefined;
        let gesture: { id: number; from: number; visited: Set<number>; x: number; y: number; moved: boolean } | undefined;

        function highlight(path: readonly number[]): void {
            cells.forEach((cell, i) => {
                const selected = path.includes(i);
                cell.toggleAttribute('data-selected', selected);
                cell.setAttribute('aria-pressed', String(selected));
            });
        }
        function clearError(): void {
            window.clearTimeout(errorTimer);
            cells.forEach(cell => cell.removeAttribute('data-error'));
        }
        function reset(): void {
            const id = gesture?.id;
            gesture = undefined;
            anchor = null;
            highlight([]);
            if (id !== undefined && grid.hasPointerCapture(id)) grid.releasePointerCapture(id);
        }
        function focusCell(index: number): void {
            cells[cursor]!.tabIndex = -1;
            cursor = index;
            cells[cursor]!.tabIndex = 0;
            cells[cursor]!.focus({ preventScroll: true });
        }
        function attempt(from: number, to: number, crooked = false): void {
            clearError();
            const current = session.state!;
            const result = select(current, from, crooked ? -1 : to);
            session.state = result.state;
            for (const event of result.events) {
                if (event.kind === 'rate') {
                    for (const i of event.cells ?? [from, to]) cells[i]?.setAttribute('data-error', '');
                    errorTimer = window.setTimeout(clearError, 260);
                }
                if (event.kind === 'trouve') {
                    for (const i of event.cells) cells[i]!.setAttribute('data-found', '');
                    play.querySelector(`[data-motsmeles-word="${event.word}"]`)?.setAttribute('data-found', '');
                }
                if (event.kind === 'fini') {
                    session.records = complete(session.records, current.level);
                    writeRecords(storage, session.records);
                    play.classList.add('motsmeles-won');
                    play.querySelector('#motsmeles-message')!.textContent = t.bravo;
                    play.querySelector<HTMLElement>('.motsmeles-actions')!.hidden = false;
                    speak([t.bravo]);
                }
            }
        }
        function tap(index: number): void {
            if (gesture || session.state?.finished) return;
            if (anchor === null) {
                anchor = index;
                highlight([index]);
                return;
            }
            const from = anchor;
            reset();
            if (from !== index) attempt(from, index);
        }
        function hit(event: PointerEvent): number | null {
            const rect = grid.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
            if (x < 0 || y < 0 || x >= 1 || y >= 1) return null;
            return Math.floor(y * size) * size + Math.floor(x * size);
        }
        function straight(from: number, to: number, visited: ReadonlySet<number>): number[] | null {
            const path = line(size, from, to);
            if (!path || from === to) return path;
            const row = Math.floor(from / size), col = from % size;
            const dr = Math.floor(to / size) - row, dc = to % size - col;
            for (const cell of visited) {
                if ((Math.floor(cell / size) - row) * dc !== (cell % size - col) * dr) return null;
            }
            return path;
        }
        grid.addEventListener('pointerdown', event => {
            if (gesture || !event.isPrimary || event.button !== 0 || session.state?.finished) return;
            const from = hit(event);
            if (from === null) return;
            event.preventDefault();
            focusCell(from);
            clearError();
            gesture = { id: event.pointerId, from, visited: new Set([from]), x: event.clientX, y: event.clientY, moved: false };
            grid.setPointerCapture(event.pointerId);
            highlight(anchor === null ? [from] : [anchor, from]);
        });
        grid.addEventListener('pointermove', event => {
            if (gesture?.id !== event.pointerId) return;
            const to = hit(event);
            if (to === null) { reset(); return; }
            if (to !== gesture.from || Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= 12) gesture.moved = true;
            if (!gesture.moved) return;
            anchor = null;
            gesture.visited.add(to);
            highlight(straight(gesture.from, to, gesture.visited) ?? []);
        });
        grid.addEventListener('pointerup', event => {
            if (gesture?.id !== event.pointerId) return;
            const { from, moved, visited } = gesture, to = hit(event);
            gesture = undefined;
            if (to === null) { reset(); return; }
            if (!moved && to === from) { tap(to); return; }
            reset();
            if (to !== from) attempt(from, to, straight(from, to, visited) === null);
        });
        for (const name of ['pointercancel', 'lostpointercapture'] as const) {
            grid.addEventListener(name, event => { if (gesture?.id === event.pointerId) reset(); });
        }

        grid.addEventListener('keydown', event => {
            const button = event.target;
            if (!(button instanceof HTMLButtonElement)) return;
            const from = Number(button.dataset.motsmelesCell);
            const row = Math.floor(from / size), col = from % size;
            const steps: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
            const step = steps[event.key];
            if (step) {
                event.preventDefault();
                const r = row + step[0], c = col + step[1];
                if (r >= 0 && c >= 0 && r < size && c < size) focusCell(r * size + c);
            } else if (event.key === 'Escape') reset();
        });
        cells.forEach((cell, index) => {
            cell.onclick = event => { if (event.detail === 0) tap(index); };
        });

        const cancelGesture = (): void => { reset(); clearError(); };
        window.addEventListener('blur', cancelGesture);
        window.addEventListener('pagehide', cancelGesture);
        disposeBoard = () => {
            cancelGesture();
            window.removeEventListener('blur', cancelGesture);
            window.removeEventListener('pagehide', cancelGesture);
        };

        bindAction(root.querySelector<HTMLElement>('#back')!, () => {
            showLevels();
            root.querySelector<HTMLElement>(`[data-motsmeles-level="${initial.level}"]`)?.focus({ preventScroll: true });
        }, 'motsmeles:levels');
        bindAction(play.querySelector<HTMLElement>('[data-motsmeles-instruction]')!, () => {
            const state = session.state!;
            speak([state.finished ? t.bravo : instruction(state, locale)]);
        }, 'motsmeles:instruction');
        for (const button of play.querySelectorAll<HTMLButtonElement>('[data-motsmeles-listen]')) {
            const word = button.dataset.motsmelesListen!;
            bindAction(button, () => speak([word]), `motsmeles:listen:${word}`);
        }
        bindAction(play.querySelector<HTMLElement>('[data-motsmeles-again]')!, () => begin(initial.level), `motsmeles:again:${initial.grid.seed}`);
        bindAction(play.querySelector<HTMLElement>('[data-motsmeles-next]')!, () => begin(initial.level + 1), `motsmeles:next:${initial.level}`);
    }

    if (session.screen === 'play' && session.state) draw(session.state);
    else showLevels();
    return () => disposeBoard?.();
}
