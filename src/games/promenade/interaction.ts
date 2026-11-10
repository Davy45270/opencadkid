import { act, advance, complete, failOf, gates, isRole, isUnlocked, levelOf, migrateV1, needed, offered, open, parseRecords, start, targets, TICK_MS, waiting, type Records, type Role, type State, type Target } from '../../engines/promenade';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime, drumNote } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { fieldSize, flowerSpot, gameView, instruction, labels, levelView, placeFoals, terrainSvg, thingSpot, touchSpot, trapSpot, treatPercent, wonWords } from './view';

/** The walk's levels changed in 1.9.0: a new key, so that old stars never sit on new levels. */
export const RECORDS_KEY = 'opencadkid.promenade.v2';
export const RECORDS_KEY_V1 = 'opencadkid.promenade.v1';
/** Reads the records; the first time, the first walk's progress becomes as many open levels, and its key goes away. */
export function readRecords(storage?: StoragePort): Records {
    try {
        const raw = storage?.getItem(RECORDS_KEY) ?? null;
        if (raw !== null) return parseRecords(raw);
        const old = storage?.getItem(RECORDS_KEY_V1) ?? null;
        if (old === null) return {};
        const records = migrateV1(old);
        writeRecords(storage, records);
        try { (storage as StoragePort & { removeItem?: (key: string) => void }).removeItem?.(RECORDS_KEY_V1); } catch { /* The old key only takes a few bytes. */ }
        return records;
    } catch { return {}; }
}
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the walk in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.promenade-zone')?.getBoundingClientRect(), s = session.state;
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, field: s ? fieldSize(levelOf(s.level)) : null,
        waiting: s ? waiting(s) : null, needed: s ? needed(s) : null, offered: s ? offered(levelOf(s.level)) : [], targets: s ? targets(s) : [], gates: s ? gates(levelOf(s.level)) : [] };
}
/** A touch zone stays whole inside the field, even next to its edge. */
const place = (button: HTMLElement, at: { left: number; top: number }): void => { button.style.left = `clamp(46px, ${at.left.toFixed(2)}%, calc(100% - 46px))`; button.style.top = `clamp(46px, ${at.top.toFixed(2)}%, calc(100% - 46px))`; };
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale];
    let frame = 0, last = 0, carry = 0, disposed = false, message = '', drawnKey = '';
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stop = (): void => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const levelsScreen = (): void => {
        stop(); session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'promenade:home');
        root.querySelectorAll<HTMLElement>('[data-promenade-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.promenadeLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `promenade:level:${el.dataset.promenadeLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#promenade-message'); if (p) p.textContent = text; if (aloud) speak([text]); };
    /** A funny try sounds funny: two soft rising notes, never a buzzer. */
    const boing = (): void => { drumNote(sound(), 330); timers.push(setTimeout(() => { if (!disposed) drumNote(sound(), 494); }, 140)); };
    /** What changes the drawing of the scenery (the foals, the friend and the funny tries move on their own). */
    const terrainKey = (s: State): string => `${String(s.started)}:${s.cleared.join()}:${s.works.map(w => `${w.gate}-${Math.ceil(w.left / 4)}`).join()}:${s.picked.join()}:${s.ways.join()}:${String(!!s.friend)}:${s.foals.filter(f => f.home).length}`;
    const refresh = (): void => {
        const s = session.state!, list = targets(s), has = (type: Target['type']) => list.some(x => x.type === type);
        const key = terrainKey(s);
        if (key !== drawnKey) { drawnKey = key; root.querySelector('[data-terrain]')!.innerHTML = terrainSvg(s); const front = root.querySelector('[data-front]'); if (front) front.innerHTML = terrainSvg(s, 'front'); }
        placeFoals(root, s, reducedMotion());
        const button = (id: string) => root.querySelector<HTMLButtonElement>(id);
        const startButton = button('#promenade-start'), foalButton = button('#promenade-foal'), thingButton = button('#promenade-thing'), flowerButton = button('#promenade-flower');
        if (startButton) { startButton.hidden = s.started; place(startButton, trapSpot(s)); startButton.toggleAttribute('data-hint', s.hint === 'start'); }
        const roleList = offered(levelOf(s.level)), single = roleList.length <= 1, kind = needed(s);
        const spot = touchSpot(s);
        if (foalButton) {
            foalButton.hidden = spot === null;
            if (spot) place(foalButton, spot);
            foalButton.toggleAttribute('data-hint', !s.choosing && (s.hint === 'foal' || (s.hint === 'role' && (single || kind === 'fourche'))));
        }
        const thing = has('thing') ? thingSpot(s) : null;
        if (thingButton) { thingButton.hidden = thing === null; if (thing) place(thingButton, thing); thingButton.toggleAttribute('data-hint', s.hint !== 'none' && s.hint !== 'start'); }
        const flower = flowerSpot(s);
        if (flowerButton) { flowerButton.hidden = !has('flower') || flower === null; if (flower) place(flowerButton, flower); flowerButton.toggleAttribute('data-hint', kind === 'pontlevis' && s.hint !== 'none'); }
        for (const b of root.querySelectorAll<HTMLButtonElement>('[data-treat]')) { const i = Number(b.dataset.treat); b.hidden = !list.some(x => x.type === 'treat' && x.index === i); if (!b.hidden) place(b, treatPercent(s, i)); }
        const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-role]')];
        for (const b of buttons) { b.disabled = !s.choosing || waiting(s) === null; b.toggleAttribute('data-hint', s.hint === 'role' && b.dataset.role === kind); }
        root.querySelector('.promenade-roles')?.toggleAttribute('data-open', s.choosing && (waiting(s) !== null || s.fail !== null));
        if (s.choosing && waiting(s) !== null && document.activeElement === foalButton) buttons[0]?.focus();
    };
    const update = (before: State | null, s: State): void => {
        session.state = s;
        if (s.finished && !before?.finished) { session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound()); message = wonWords(levelOf(s.level), locale); speak([message]); draw(); return; }
        const kind = needed(s);
        if (kind && s.hint === 'role' && before?.hint !== 'role') say(t.say[kind]);
        else if (kind && waiting(before ?? s) === null && !before?.fail) say(isRole(kind) ? t.waiting : t.say[kind], false);
        else if (!kind && before && needed(before) && !s.fail) say(t.good, false);
        refresh();
    };
    const touchTarget = (target: Target, label: string): void => {
        const st = session.state!, { state, outcome } = act(st, target);
        recordActivation(`promenade:${label}:${outcome}`, 'action', outcome !== 'ignored' && outcome !== 'fail', outcome);
        if (outcome === 'choose') say(t.choose, false);
        if (outcome === 'fail' && state.fail) { say(t.oops[failOf(gates(levelOf(st.level))[state.fail.gate]!.kind as Role, state.fail.role)!], false); boing(); }
        if (outcome === 'pick') drumNote(sound(), 659);
        update(st, state);
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message); drawnKey = '';
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'promenade:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!, kind = needed(st); speak(st.finished ? [wonWords(levelOf(st.level), locale)] : st.hint === 'role' && kind ? [t.say[kind]] : instruction(levelOf(st.level), locale)); }, 'promenade:listen');
        const again = root.querySelector<HTMLElement>('#promenade-again'), next = root.querySelector<HTMLElement>('#promenade-next');
        if (again) bindAction(again, () => play(start(s.level), true), `promenade:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `promenade:next:${s.level}`);
        bindAction(root.querySelector<HTMLElement>('#promenade-start')!, () => { const st = session.state!; if (!st.started) { recordActivation('promenade:open', 'action', true, 'trapdoor'); update(st, open(st)); } }, 'promenade:start');
        bindAction(root.querySelector<HTMLElement>('#promenade-foal')!, () => touchTarget({ type: 'foal' }, 'foal'), () => `promenade:foal:${String(waiting(session.state!))}`);
        bindAction(root.querySelector<HTMLElement>('#promenade-thing')!, () => touchTarget({ type: 'thing' }, 'thing'), () => `promenade:thing:${String(waiting(session.state!))}`);
        bindAction(root.querySelector<HTMLElement>('#promenade-flower')!, () => touchTarget({ type: 'flower' }, 'flower'), 'promenade:flower');
        root.querySelectorAll<HTMLElement>('[data-treat]').forEach(el => bindAction(el, () => touchTarget({ type: 'treat', index: Number(el.dataset.treat) }, 'treat'), () => `promenade:treat:${el.dataset.treat!}`));
        root.querySelectorAll<HTMLElement>('[data-role]').forEach(el => bindAction(el, () => touchTarget({ type: 'role', role: el.dataset.role as never }, `role:${el.dataset.role!}`), () => `promenade:role:${el.dataset.role!}:${String(session.state?.tick)}`));
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
        if (fresh) { message = words.at(-1)!; speak(words); }
        else if (!message) message = s.finished ? wonWords(levelOf(s.level), locale) : words.at(-1)!;
        draw();
        if (!s.finished) frame = requestAnimationFrame(tick);
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; stop(); timers.forEach(clearTimeout); };
}
