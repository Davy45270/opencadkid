import { complete, helpOn, hint, isGiven, isUnlocked, levelOf, parseRecords, sizeOf, start, step, type Action, type Fail, type Records, type State, type UnitKind } from '../../engines/grille';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bubble, dances, failAnimations, failWords } from './art';
import { cap, gameView, instruction, labels, levelView, nameOf, pictureSvg, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.grille.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the cell or the picture chosen, and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; cell: number | null; image: number | null }
/** Durations, in ms: a funny try, a picture going back to the tray. */
export const FAIL_MS = 1300, BACK_MS = 350;
/** A drag that changes side this many times, each time by at least `SHAKE_PX`, is a shake: the picture gets dizzy. */
export const SHAKES = 4, SHAKE_PX = 24;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { busy: boolean; fail: Fail | null } = { busy: false, fail: null };
export function snapshot(session: Session, root: ParentNode): object {
    const s = session.state, board = root.querySelector('.grille-board')?.getBoundingClientRect(), first = root.querySelector('.grille-cell')?.getBoundingClientRect();
    return { ...session, board: board ? { x: board.x, y: board.y, width: board.width, height: board.height } : null, cellSize: first ? Math.min(first.width, first.height) : null, hint: s && helpOn(s) ? hint(s) : null, busy: observed.busy, fail: observed.fail };
}
/** Which of the row, the column and the square of a cell holds the twin: the first one, read in that order. */
function unitOf(n: number, cell: number, twin: number): UnitKind {
    if (Math.floor(cell / n) === Math.floor(twin / n)) return 'ligne';
    if (cell % n === twin % n) return 'colonne';
    return 'carre';
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '';
    observed = { busy: false, fail: null };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 40) : ms); timers.add(id); });
    let drag: { pointer: number; image: number; ghost: HTMLElement; x0: number; y0: number; moved: boolean; lastX: number; dir: number; turns: number; travel: number } | null = null;
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null; session.cell = null; session.image = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'grille:home');
        root.querySelectorAll<HTMLElement>('[data-grille-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.grilleLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `grille:level:${el.dataset.grilleLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#grille-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const cellEl = (i: number): HTMLElement | null => root.querySelector<HTMLElement>(`[data-cell="${i}"]`);
    const pickEl = (k: number): HTMLElement | null => root.querySelector<HTMLElement>(`[data-image="${k}"]`);
    /** The cell or the picture chosen, and what shines when the help is on. */
    const marks = (): void => {
        const s = session.state; if (!s) return;
        root.querySelectorAll('[data-chosen]').forEach(el => el.removeAttribute('data-chosen'));
        if (session.cell !== null) cellEl(session.cell)?.setAttribute('data-chosen', '');
        if (session.image !== null) pickEl(session.image)?.setAttribute('data-chosen', '');
        root.querySelectorAll('.grille-hint').forEach(el => el.classList.remove('grille-hint')); root.querySelectorAll('[data-hint]').forEach(el => el.removeAttribute('data-hint'));
        const h = !observed.busy && helpOn(s) ? hint(s) : null;
        root.querySelector('.grille-board')?.toggleAttribute('data-help', Boolean(h));
        if (h) { cellEl(h.cell)?.querySelector('.grille-in')?.classList.add('grille-hint'); cellEl(h.cell)?.setAttribute('data-hint', ''); pickEl(h.image)?.querySelector('.grille-in')?.classList.add('grille-hint'); pickEl(h.image)?.setAttribute('data-hint', ''); }
    };
    /** A bubble with a sound word over an element of the screen. */
    const pop = (over: Element | null, word: string): void => {
        if (!over) return;
        // The bubble stays on the screen, even over a cell at the edge: it leans away from the edge.
        const r = over.getBoundingClientRect(), side = r.left < 70 ? ' data-side="left"' : r.right > innerWidth - 70 ? ' data-side="right"' : '';
        over.insertAdjacentHTML('beforeend', `<span class="grille-bulle"${side}>${bubble(word)}</span>`);
    };
    const fillCell = (s: State, i: number): void => {
        const el = cellEl(i), v = s.cells[i]!; if (!el) return;
        el.querySelector('.grille-in')!.innerHTML = v >= 0 ? pictureSvg(levelOf(s.level).theme, v) : '';
        el.toggleAttribute('data-filled', v >= 0 && !isGiven(levelOf(s.level), i));
        el.setAttribute('aria-label', `${v >= 0 ? nameOf(locale, levelOf(s.level).theme, v) : t.empty}, ${t.cell.replace('{r}', String(Math.floor(i / sizeOf(levelOf(s.level))) + 1)).replace('{c}', String(i % sizeOf(levelOf(s.level)) + 1))}`);
    };
    /** A funny try: the twins, the picture or CaliRoux play their reaction, then the picture goes back to the tray. */
    const funny = async (s: State, fail: { kind: Fail; cell: number; image: number; twins: number[] }): Promise<void> => {
        const level = levelOf(s.level), n = sizeOf(level), name = fail.image >= 0 ? nameOf(locale, level.theme, fail.image) : '';
        const unit = fail.twins.length ? t.units[unitOf(n, fail.cell, fail.twins[0]!)] : '';
        observed.fail = fail.kind; say(t.fail[fail.kind].replace('{X}', cap(name)).replace('{u}', unit));
        recordActivation(`grille:try:${fail.kind}`, 'action', false, fail.kind);
        const anim = failAnimations[fail.kind], word = failWords[locale][fail.kind], moved: Element[] = [];
        const play = (el: Element | null | undefined, cls = anim): void => { if (el) { el.classList.add(cls); moved.push(el); } };
        let ghost: HTMLElement | null = null;
        if (fail.kind === 'roulade') { play(root.querySelector('.grille-guide')); pop(root.querySelector('#grille-caliroux'), word); }
        else if (fail.kind === 'tournis') { play(pickEl(fail.image)?.querySelector('.grille-in')); pop(pickEl(fail.image), word); }
        else if (fail.kind === 'coucou') { play(cellEl(fail.cell)?.querySelector('.grille-in')); pop(cellEl(fail.cell), word); }
        else {
            // The picture shows on the cell (over the picture already there for a somersault), then goes back.
            const el = cellEl(fail.cell);
            el?.insertAdjacentHTML('beforeend', `<span class="grille-ghost">${pictureSvg(level.theme, fail.image)}</span>`);
            ghost = el?.querySelector<HTMLElement>('.grille-ghost') ?? null;
            if (fail.kind === 'salto' || fail.kind === 'pasici') play(ghost);
            else {
                // The twins react; two animals squabble, so the new one joins in.
                for (const tw of fail.twins) play(cellEl(tw)?.querySelector('.grille-in'));
                if (fail.kind === 'chamaille') play(ghost);
                else play(ghost, 'grille-recule');
                if (ghost && fail.twins.length) {
                    const a = el!.getBoundingClientRect(), b = cellEl(fail.twins[0]!)!.getBoundingClientRect();
                    ghost.style.setProperty('--dx', `${Math.sign(b.x - a.x) * 8}px`); ghost.style.setProperty('--dy', `${Math.sign(b.y - a.y) * 8}px`);
                }
            }
            pop(el, word);
        }
        await wait(FAIL_MS);
        if (gone()) return;
        moved.forEach(el => el.classList.remove(anim, 'grille-recule'));
        root.querySelectorAll('.grille-bulle').forEach(b => b.remove());
        if (ghost) {
            // Back to the tray: the picture flies to its place in the tray.
            const to = pickEl(fail.image)?.getBoundingClientRect(), from = ghost.getBoundingClientRect();
            if (to) { ghost.classList.add('grille-retour'); ghost.style.transform = `translate(${to.x - from.x}px,${to.y - from.y}px) scale(.8)`; }
            await wait(BACK_MS);
            if (gone()) return;
            ghost.remove();
        }
        observed.fail = null;
    };
    const act = async (a: Action, how: string): Promise<void> => {
        const s = session.state;
        if (!s || s.finished || observed.busy) return;
        const r = step(s, a);
        if (!r) return;
        session.cell = null; session.image = null;
        observed.busy = true; marks();
        if (r.fail) {
            await funny(s, r.fail);
            if (gone()) return;
            session.state = r.state; observed.busy = false;
            if (helpOn(r.state) && !helpOn(s)) say(t.shine);
            marks(); return;
        }
        recordActivation(`grille:pose:${how}`, 'action', true, `${r.placed!.cell}:${r.placed!.image}`);
        session.state = r.state;
        fillCell(r.state, r.placed!.cell);
        const inner = cellEl(r.placed!.cell)?.querySelector('.grille-in');
        inner?.classList.add('grille-pose');
        const level = levelOf(r.state.level);
        if (!r.state.finished) say(`${cap(nameOf(locale, level.theme, r.placed!.image))}${locale === 'fr' ? ' !' : '!'}`);
        await wait(r.state.finished ? 450 : 250);
        if (gone()) return;
        inner?.classList.remove('grille-pose');
        observed.busy = false;
        if (r.state.finished) {
            session.records = complete(session.records, r.state); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        marks();
    };
    /** A touch on a cell: with a picture in hand, it goes there; otherwise the cell is chosen (a given cell waves). */
    const touchCell = (i: number): void => {
        const s = session.state; if (!s || s.finished || observed.busy) return;
        const level = levelOf(s.level);
        if (session.image !== null) { void act({ kind: 'pose', cell: i, image: session.image }, 'image-then-cell'); return; }
        if (isGiven(level, i)) { void act({ kind: 'touche', cell: i }, 'touch'); return; }
        if (s.cells[i]! >= 0) return;
        session.cell = session.cell === i ? null : i; marks();
        if (session.cell !== null) { say(t.which, false); recordActivation('grille:cell', 'action', true, String(i)); }
    };
    /** A touch on a picture of the tray: with a cell chosen, it goes there; otherwise the picture is held. */
    const touchImage = (k: number): void => {
        const s = session.state; if (!s || s.finished || observed.busy) return;
        if (session.cell !== null) { void act({ kind: 'pose', cell: session.cell, image: k }, 'cell-then-image'); return; }
        session.image = session.image === k ? null : k; marks();
        if (session.image !== null) { say(t.where.replace('{x}', nameOf(locale, levelOf(s.level).theme, k)), true); recordActivation('grille:image', 'action', true, String(k)); }
    };
    const endDrag = (): void => { drag?.ghost.remove(); drag = null; };
    const draw = (): void => {
        const s = session.state!;
        const level = levelOf(s.level);
        root.innerHTML = gameView(level, s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'grille:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'grille:listen');
        bindAction(root.querySelector<HTMLElement>('#grille-caliroux')!, () => { void act({ kind: 'caliroux' }, 'guide'); }, 'grille:caliroux');
        const again = root.querySelector<HTMLElement>('#grille-again'), next = root.querySelector<HTMLElement>('#grille-next');
        if (again) bindAction(again, () => play(start(s.level), true), `grille:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `grille:next:${s.level}`);
        root.querySelectorAll<HTMLElement>('[data-cell]').forEach(el => bindAction(el, () => touchCell(Number(el.dataset.cell)), () => `grille:cell:${el.dataset.cell!}`));
        if (s.finished) {
            // The grid becomes a little living painting: each picture dances in turn.
            root.querySelectorAll('.grille-cell .grille-in').forEach(el => el.classList.add(dances[level.theme]));
            root.querySelector('.grille-board')?.setAttribute('data-done', '');
            return;
        }
        root.querySelectorAll<HTMLElement>('[data-image]').forEach(el => {
            const k = Number(el.dataset.image);
            // A tap holds the picture; a drag carries it to a cell; a shake makes it dizzy.
            el.addEventListener('pointerdown', e => {
                if (!e.isPrimary || observed.busy || session.state!.finished) return;
                e.preventDefault();
                const ghost = document.createElement('div'); ghost.className = 'grille-drag'; ghost.innerHTML = pictureSvg(level.theme, k); ghost.hidden = true;
                root.appendChild(ghost);
                drag = { pointer: e.pointerId, image: k, ghost, x0: e.clientX, y0: e.clientY, moved: false, lastX: e.clientX, dir: 0, turns: 0, travel: 0 };
                try { el.setPointerCapture(e.pointerId); } catch { /* A finger already gone: the tap still counts. */ }
            });
            el.addEventListener('pointermove', e => {
                if (!drag || e.pointerId !== drag.pointer) return;
                if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 12) { drag.moved = true; drag.ghost.hidden = false; }
                if (!drag.moved) return;
                drag.ghost.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
                const dx = e.clientX - drag.lastX, d = Math.sign(dx);
                if (d && d !== drag.dir) { if (drag.dir && drag.travel >= SHAKE_PX) drag.turns++; drag.dir = d; drag.travel = 0; }
                drag.travel += Math.abs(dx); drag.lastX = e.clientX;
                if (drag.turns >= SHAKES) { const img = drag.image; endDrag(); void act({ kind: 'secoue', image: img }, 'shake'); }
            });
            el.addEventListener('pointerup', e => {
                if (!drag || e.pointerId !== drag.pointer) return;
                const d = drag; endDrag();
                if (!d.moved) { touchImage(k); return; }
                const under = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-cell]');
                if (under) void act({ kind: 'pose', cell: Number(under.dataset.cell), image: d.image }, 'drag');
            });
            el.addEventListener('pointercancel', endDrag);
            el.addEventListener('click', e => { if (e.detail === 0) touchImage(k); });
        });
        marks();
    };
    function play(s: State, fresh: boolean): void {
        observed = { busy: false, fail: null };
        for (const id of timers) clearTimeout(id); timers.clear();
        endDrag();
        session.screen = 'play'; session.state = s;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { session.cell = null; session.image = null; message = sentence(words); speak(words); }
        else if (!message) message = s.finished ? t.won : sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; endDrag(); for (const id of timers) clearTimeout(id); timers.clear(); };
}
