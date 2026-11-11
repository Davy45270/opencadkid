import { CALI, complete, coneId, geometry, hint, isUnlocked, levelOf, parseRecords, play, start, touched, W, waited, type Event, type Fail, type LevelDef, type Records, type State } from '../../engines/autobus';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bubble, bubbleWidth, CHILD_Y, childX, confetti, effects, failAnimations, failWords, pigeon, place, thingAnimations } from './art';
import { gameView, instruction, labels, levelView, sceneSvg, stopSvg, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.autobus.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
/** How long a vehicle drives along its lane, a bus drives out through its gate, a funny try plays, and the last show. */
export const MOVE_MS = 450, LEAVE_MS = 1000, FUNNY_MS = 1700, END_MS = 2600;
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…»]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { fail: Fail | null; ending: boolean; funny: Fail[]; moving: string[] } = { fail: null, ending: false, funny: [], moving: [] };
export function snapshot(session: Session, root: ParentNode): object {
    const rect = (el: Element | null | undefined): { x: number; y: number; width: number; height: number } | null => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const s = session.state;
    return { ...session, ...observed, funny: [...observed.funny], moving: [...observed.moving], zone: rect(root.querySelector('.autobus-zone svg')), hint: s ? hint(s) : [],
        vehicles: [...root.querySelectorAll('.autobus-zone [data-vehicle]:not([data-gone])')].map(el => ({ id: el.getAttribute('data-vehicle'), ...rect(el.querySelector('.autobus-corps'))! })),
        cones: [...root.querySelectorAll('.autobus-zone [data-cone]')].map(el => ({ id: el.getAttribute('data-cone'), ...rect(el.querySelector('.bus-plot'))! })),
        children: [...root.querySelectorAll('.autobus-zone [data-child]')].map(el => ({ id: el.getAttribute('data-child'), ...rect(el)! })),
        stop: rect(root.querySelector('.autobus-zone [data-stop]')), cali: rect(root.querySelector('.autobus-zone [data-cali] svg')) };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '';
    observed = { fail: null, ending: false, funny: [], moving: [] };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 60) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'autobus:home');
        root.querySelectorAll<HTMLElement>('[data-autobus-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.autobusLevel); if (isUnlocked(id, session.records)) begin(start(id), true); }, () => `autobus:level:${el.dataset.autobusLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#autobus-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const q = (sel: string): SVGGElement | null => root.querySelector<SVGGElement>(`.autobus-zone ${sel}`);
    const effect = (x: number, y: number, inner: string): void => { q('[data-effects]')?.insertAdjacentHTML('beforeend', `<g transform="translate(${x} ${y})">${inner}</g>`); };
    const wordBubble = (word: string, x: number, y: number): void => { const half = bubbleWidth(word) / 2 + 4; effect(Math.min(W - half, Math.max(half, x)), Math.max(48, y), bubble(word)); };
    /** Plays a CSS animation again from its start, even if it is already on. */
    const replay = (el: Element | null, name: string): void => { if (!el) return; el.classList.remove(name); void el.getBoundingClientRect(); el.classList.add(name); };
    /** The vehicle to touch shines after three funny tries, until the next bus leaves. */
    const marks = (): void => {
        const s = session.state, z = root.querySelector('.autobus-zone'); if (!s || !z) return;
        const good = observed.ending ? [] : hint(s);
        z.querySelectorAll('[data-vehicle]').forEach(el => el.toggleAttribute('data-shine', good.includes(el.getAttribute('data-vehicle')!)));
    };
    const centre = (l: LevelDef, id: string, pos: number): { x: number; y: number } => { const p = place(l, l.vehicles.find(v => v.id === id)!, pos); return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; };
    const setVars = (el: Element | null, v: { dx: number; dy: number }): void => { if (el instanceof SVGElement || el instanceof HTMLElement) { el.style.setProperty('--dx', `${v.dx}px`); el.style.setProperty('--dy', `${v.dy}px`); } };
    /** A funny try: CaliRoux’s animation, the thing’s, the sound word, the sentence. */
    const funny = (kind: Fail, on: string, x: number, y: number): void => {
        const s = session.state!, l = levelOf(s.level);
        observed.fail = kind; observed.funny.push(kind);
        say(kind === 'pasmoi' ? t.fail.pasmoi[waited(l, s.gone)!] : t.fail[kind]);
        recordActivation(`autobus:try:${kind}`, 'action', false, on);
        // The word of the stop is said by the shelter, so that the children stay in sight.
        const shelter = { x: 30, y: 62 };
        if (kind === 'pigeon') { const g = q('[data-pigeon]'); if (g) g.innerHTML = `<g transform="translate(${x} ${y})">${pigeon()}</g>`; }
        const thing = kind === 'klaxon' ? q(`[data-vehicle="${on}"] .bus-roule`) : kind === 'pasmoi' || kind === 'coucou' ? q('.bus-file') : kind === 'plot' ? q(`[data-cone="${on}"] .bus-plot`) : kind === 'pigeon' ? q('.bus-pigeon') : q('.bus-panneau');
        const body = q('.bus-cali-corps');
        replay(body, failAnimations[kind]); replay(thing, thingAnimations[kind]);
        const i = l.vehicles.findIndex(v => v.id === on), cell = geometry(l).cell;
        const at = kind === 'klaxon' || kind === 'pasmoi' ? centre(l, on, s.pos[i]!) : kind === 'coucou' ? shelter : kind === 'plot' ? (c => ({ x: geometry(l).x0 + (c.col + .5) * cell, y: geometry(l).y0 + (c.row + .5) * cell }))(l.cones[l.cones.findIndex((_, k) => coneId(k) === on)]!) : kind === 'pigeon' ? { x, y } : { x: (CALI.x0 + CALI.x1) / 2, y: CALI.y0 + 4 };
        effect(at.x, at.y, effects[kind]); wordBubble(failWords[locale][kind], at.x, at.y - 8);
        void wait(FUNNY_MS).then(() => {
            if (gone()) return;
            body?.classList.remove(failAnimations[kind]); thing?.classList.remove(thingAnimations[kind]);
            if (observed.fail === kind) observed.fail = null;
            const fx = q('[data-effects]'); if (fx && !observed.ending) fx.innerHTML = '';
            if (kind === 'pigeon') { const g = q('[data-pigeon]'); if (g) g.innerHTML = ''; }
        });
    };
    /** A vehicle drives along its lane to `to`. */
    const drive = (l: LevelDef, id: string, to: number): void => {
        const v = l.vehicles.find(x => x.id === id)!, p = place(l, v, to), g = q(`[data-vehicle="${id}"]`);
        if (g instanceof SVGElement) g.style.transform = `translate(${p.x}px,${p.y}px)`;
        observed.moving.push(id);
        void wait(MOVE_MS).then(() => { if (!gone()) observed.moving = observed.moving.filter(x => x !== id); });
    };
    /** A bus leaves: the first child hops in, the bus drives out through its gate and the row moves up. */
    const leave = (l: LevelDef, id: string, after: number, s: State): void => {
        const v = l.vehicles.find(x => x.id === id)!, p = place(l, v, s.pos[l.vehicles.indexOf(v)]!), g = q(`[data-vehicle="${id}"]`), inner = q(`[data-vehicle="${id}"] .bus-roule`);
        const out = v.nose === 'haut' ? { dx: 0, dy: -(p.y + p.h + 10) } : v.nose === 'gauche' ? { dx: -(p.x + p.w + 10), dy: 0 } : { dx: W - p.x + 10, dy: 0 };
        observed.moving.push(id);
        const kid = q(`[data-child="${s.gone.length - 1}"] .bus-enfant`), c = centre(l, id, s.pos[l.vehicles.indexOf(v)]!);
        setVars(kid, { dx: c.x - childX(0), dy: Math.min(60, c.y - CHILD_Y) });
        replay(kid, 'bus-monte');
        void wait(after).then(() => { if (gone()) return; setVars(inner, out); replay(inner, 'bus-part'); });
        void wait(after + LEAVE_MS).then(() => {
            if (gone()) return;
            observed.moving = observed.moving.filter(x => x !== id);
            inner?.classList.remove('bus-part'); g?.toggleAttribute('data-gone', true);
            const stopG = q('[data-stop]'); if (stopG && !observed.ending) stopG.innerHTML = stopSvg(l, session.state!);
        });
    };
    /** The end: confetti over the empty stop, CaliRoux jumps for joy. */
    const ending = async (s: State): Promise<void> => {
        observed.ending = true; marks();
        await wait(MOVE_MS + LEAVE_MS + 100); if (gone()) return;
        const st = q('[data-stop]'); if (st) st.innerHTML = stopSvg(levelOf(s.level), s);
        q('.bus-cali-corps')?.classList.add('bus-cali-joie');
        effect(90, 40, confetti()); effect(90, 160, confetti());
        say(t.won);
        await wait(END_MS); if (gone()) return;
        observed.ending = false;
        session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound());
        draw();
    };
    /** A touch at (x, y) in board units. */
    const touch = (x: number, y: number, how: string): void => {
        const s = session.state; if (!s || s.finished || observed.ending) return;
        const id = touched(s, x, y); if (id === null) return;
        // A vehicle still driving finishes its way first.
        if (observed.moving.includes(id)) return;
        const r = play(s, id); if (!r) return;
        session.state = r.state;
        const l = levelOf(s.level), first = r.events[0]!;
        recordActivation(`autobus:touch:${how}`, 'action', first.kind !== 'fail', id);
        if (first.kind === 'fail') funny(first.fail, first.on, x, y);
        const moved = r.events.find((e): e is Extract<Event, { kind: 'roule' }> => e.kind === 'roule');
        if (moved) drive(l, moved.vehicle, moved.to);
        const left = r.events.find((e): e is Extract<Event, { kind: 'part' }> => e.kind === 'part');
        if (left) { leave(l, left.bus, moved ? MOVE_MS : 0, r.state); if (!r.state.finished) say(t.gone[left.color]); }
        if (r.events.some(e => e.kind === 'fini')) void ending(r.state);
        // The help is said once the funny try has been told.
        else if (hint(r.state).length && first.kind === 'fail') { const st = r.state; void wait(FUNNY_MS * .6).then(() => { if (!gone() && session.state === st) say(t.shine); }); }
        marks();
    };
    const draw = (): void => {
        const s = session.state!, l = levelOf(s.level);
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'autobus:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : hint(st).length ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'autobus:listen');
        const again = root.querySelector<HTMLElement>('#autobus-again'), next = root.querySelector<HTMLElement>('#autobus-next');
        if (again) bindAction(again, () => begin(start(s.level), true), `autobus:again:${s.level}`);
        if (next) bindAction(next, () => begin(start(s.level + 1), true), `autobus:next:${s.level}`);
        const z = root.querySelector<HTMLElement>('.autobus-zone')!;
        z.innerHTML = sceneSvg(l, s, locale);
        if (s.finished) q('.bus-cali-corps')?.classList.add('bus-cali-joie');
        marks();
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary) return;
            const b = z.querySelector('svg')?.getBoundingClientRect(); if (!b) return;
            const k = b.width / W;
            e.preventDefault(); touch((e.clientX - b.x) / k, (e.clientY - b.y) / k, e.pointerType || 'mouse');
        });
    };
    function begin(s: State, fresh: boolean): void {
        for (const id of timers) clearTimeout(id); timers.clear();
        observed = { fail: null, ending: false, funny: [], moving: [] };
        session.screen = 'play'; session.state = s;
        if (s.finished) { session.records = complete(session.records, s); writeRecords(storage, session.records); }
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) begin(session.state, false); else levelsScreen();
    return () => { disposed = true; for (const id of timers) clearTimeout(id); timers.clear(); };
}
