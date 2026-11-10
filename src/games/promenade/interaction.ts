import { advance, choose, complete, isUnlocked, levelOf, needed, offered, open, parseRecords, start, TICK_MS, touch, waiting, type Records, type State } from '../../engines/promenade';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { fieldSize, gameView, instruction, labels, levelView, placeFoals, terrainSvg, touchSpot, trapSpot } from './view';

export const RECORDS_KEY = 'opencadkid.promenade.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the walk in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.promenade-zone')?.getBoundingClientRect(), s = session.state;
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, field: s ? fieldSize(levelOf(s.level)) : null,
        waiting: s ? waiting(s) : null, needed: s ? needed(s) : null, offered: s ? offered(levelOf(s.level)) : [] };
}
/** A touch zone stays whole inside the field, even next to its edge. */
const place = (button: HTMLElement, at: { left: number; top: number }): void => { button.style.left = `clamp(46px, ${at.left.toFixed(2)}%, calc(100% - 46px))`; button.style.top = `clamp(46px, ${at.top.toFixed(2)}%, calc(100% - 46px))`; };
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale];
    let frame = 0, last = 0, carry = 0, disposed = false, message = '', drawnKey = '';
    const stop = (): void => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const levelsScreen = (): void => {
        stop(); session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'promenade:home');
        root.querySelectorAll<HTMLElement>('[data-promenade-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.promenadeLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `promenade:level:${el.dataset.promenadeLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#promenade-message'); if (p) p.textContent = text; if (aloud) speak([text]); };
    /** What changes the drawing of the scenery (the foals move on their own). */
    const terrainKey = (s: State): string => `${String(s.started)}:${s.cleared.join()}:${s.work ? `${s.work.obstacle}-${Math.ceil(s.work.left / 4)}` : ''}:${s.foals.filter(f => f.home).length}`;
    const refresh = (): void => {
        const s = session.state!;
        const key = terrainKey(s);
        if (key !== drawnKey) { drawnKey = key; root.querySelector('[data-terrain]')!.innerHTML = terrainSvg(s); }
        placeFoals(root, s, reducedMotion());
        const startButton = root.querySelector<HTMLButtonElement>('#promenade-start'), foalButton = root.querySelector<HTMLButtonElement>('#promenade-foal');
        if (startButton) { startButton.hidden = s.started; const at = trapSpot(s); place(startButton, at); startButton.toggleAttribute('data-hint', s.hint === 'start'); }
        const spot = touchSpot(s);
        if (foalButton) {
            foalButton.hidden = spot === null;
            if (spot) place(foalButton, spot);
            foalButton.toggleAttribute('data-hint', s.hint === 'foal' || (s.hint === 'role' && offered(levelOf(s.level)).length === 1));
        }
        const role = needed(s), buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-role]')];
        for (const b of buttons) { b.disabled = !s.choosing || role === null; b.toggleAttribute('data-hint', s.hint === 'role' && b.dataset.role === role); }
        root.querySelector('.promenade-roles')?.toggleAttribute('data-open', s.choosing && role !== null);
        if (s.choosing && role !== null && document.activeElement === foalButton) buttons[0]?.focus();
    };
    const update = (before: State | null, s: State): void => {
        session.state = s;
        if (s.finished && !before?.finished) { session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound()); message = t.won; speak([t.won]); draw(); return; }
        const role = needed(s);
        if (role && s.hint === 'role' && before?.hint !== 'role') say(t.say[role]);
        else if (role && waiting(before ?? s) === null) say(t.waiting, false);
        else if (!role && before && needed(before)) say(t.good, false);
        refresh();
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message); drawnKey = '';
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'promenade:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!, role = needed(st); speak(st.finished ? [t.won] : st.hint === 'role' && role ? [t.say[role]] : instruction(levelOf(st.level), locale)); }, 'promenade:listen');
        const again = root.querySelector<HTMLElement>('#promenade-again'), next = root.querySelector<HTMLElement>('#promenade-next');
        if (again) bindAction(again, () => play(start(s.level), true), `promenade:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `promenade:next:${s.level}`);
        bindAction(root.querySelector<HTMLElement>('#promenade-start')!, () => { const st = session.state!; if (!st.started) { recordActivation('promenade:open', 'action', true, 'trapdoor'); const words = instruction(levelOf(st.level), locale); if (words.length > 1) say(words.at(-1)!, false); update(st, open(st)); } }, 'promenade:start');
        bindAction(root.querySelector<HTMLElement>('#promenade-foal')!, () => {
            const st = session.state!, { state, outcome } = touch(st);
            recordActivation(`promenade:foal:${outcome}`, 'action', outcome !== 'ignored', outcome);
            if (outcome === 'choose') say(t.choose, false);
            update(st, state);
        }, () => `promenade:foal:${String(waiting(session.state!))}`);
        root.querySelectorAll<HTMLElement>('[data-role]').forEach(el => bindAction(el, () => {
            const st = session.state!, { state, outcome } = choose(st, el.dataset.role as Parameters<typeof choose>[1]);
            recordActivation(`promenade:role:${el.dataset.role!}`, 'action', outcome === 'work', outcome);
            update(st, state);
        }, () => `promenade:role:${el.dataset.role!}:${String(session.state?.tick)}`));
        refresh();
    };
    const tick = (now: number): void => {
        frame = 0; if (disposed || !session.state) return;
        // A hidden tab or a slow phone never makes the troupe jump: at most six steps per frame.
        carry = Math.min(carry + (last ? now - last : TICK_MS), TICK_MS * 6); last = now;
        const steps = Math.floor(carry / TICK_MS); carry -= steps * TICK_MS;
        const before = session.state;
        if (steps) update(before, advance(before, steps));
        if (!session.state.finished) frame = requestAnimationFrame(tick);
    };
    function play(s: State, fresh: boolean): void {
        stop(); session.screen = 'play'; session.state = s; last = 0; carry = 0;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { message = words[0]!; speak(words); }
        else if (!message) message = s.finished ? t.won : s.started ? words.at(-1)! : words[0]!;
        draw();
        if (!s.finished) frame = requestAnimationFrame(tick);
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; stop(); };
}
