import { CHEST, complete, freeScrews, hint, isUnlocked, levelOf, parseRecords, play, potBox, start, touched, W, type Event, type Fail, type LevelDef, type Plate, type Records, type State } from '../../engines/vis';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bubble, bubbleWidth, chest, confetti, effects, failAnimations, failWords, thingAnimations } from './art';
import { gameView, instruction, labels, levelView, potsSvg, sceneSvg, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.vis.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
/** How long a screw flies to its pot, a plate falls into the chest, a funny try plays, and the toy's last show lasts. */
export const FLY_MS = 900, FALL_MS = 1000, FUNNY_MS = 1700, END_MS = 3200;
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…»]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { fail: Fail | null; ending: boolean; funny: Fail[]; flying: string[] } = { fail: null, ending: false, funny: [], flying: [] };
const centre = (p: Plate): { x: number; y: number } => ({ x: (p.x0 + p.x1) / 2, y: (p.y0 + p.y1) / 2 });
export function snapshot(session: Session, root: ParentNode): object {
    const rect = (el: Element | null | undefined): { x: number; y: number; width: number; height: number } | null => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const s = session.state, all = (sel: string, key: string) => [...root.querySelectorAll(`.vis-zone ${sel}`)].map(el => ({ id: el.getAttribute(key), ...rect(el.firstElementChild)! }));
    return { ...session, ...observed, funny: [...observed.funny], flying: [...observed.flying], zone: rect(root.querySelector('.vis-zone svg')), hint: s ? hint(s) : [], free: s ? freeScrews(s) : [],
        screws: all('[data-screw]:not([data-out])', 'data-screw').map(x => ({ ...x, ...rect(root.querySelector(`.vis-zone [data-screw="${x.id}"] .vis-tete circle`))! })),
        plates: all('[data-plate]:not([data-fallen])', 'data-plate'), pots: all('[data-pot]', 'data-pot'),
        chest: rect(root.querySelector('.vis-zone .vis-coffre')), pest: rect(root.querySelector('.vis-zone [data-pest] svg')), toy: rect(root.querySelector('.vis-zone .vis-jouet')) };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '';
    observed = { fail: null, ending: false, funny: [], flying: [] };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 60) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'vis:home');
        root.querySelectorAll<HTMLElement>('[data-vis-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.visLevel); if (isUnlocked(id, session.records)) begin(start(id), true); }, () => `vis:level:${el.dataset.visLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#vis-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const q = (sel: string): SVGGElement | null => root.querySelector<SVGGElement>(`.vis-zone ${sel}`);
    const effect = (x: number, y: number, inner: string): void => { q('[data-effects]')?.insertAdjacentHTML('beforeend', `<g transform="translate(${x} ${y})">${inner}</g>`); };
    const wordBubble = (word: string, x: number, y: number): void => { const half = bubbleWidth(word) / 2 + 4; effect(Math.min(W - half, Math.max(half, x)), Math.max(48, y), bubble(word)); };
    /** Plays a CSS animation again from its start, even if it is already on. */
    const replay = (el: Element | null, name: string): void => { if (!el) return; el.classList.remove(name); void el.getBoundingClientRect(); el.classList.add(name); };
    /** The good screw shines after three touches that took no screw out. */
    const marks = (): void => {
        const s = session.state, z = root.querySelector('.vis-zone'); if (!s || !z) return;
        const good = observed.ending ? [] : hint(s);
        z.querySelectorAll('[data-screw]').forEach(el => el.toggleAttribute('data-shine', good.includes(el.getAttribute('data-screw')!)));
    };
    /** Where a screw flies to: the bottom of the pot of its colour. */
    const toPot = (l: LevelDef, id: string): { dx: number; dy: number } => { const x = l.screws.find(y => y.id === id)!, b = potBox(l, x.color); return { dx: (b.x0 + b.x1) / 2 - x.x, dy: b.y1 - 10 - x.y }; };
    const toChest = (p: Plate): { dx: number; dy: number } => { const c = centre(p); return { dx: (CHEST.x0 + CHEST.x1) / 2 - c.x, dy: CHEST.y0 + 16 - c.y }; };
    const setVars = (el: Element | null, v: { dx: number; dy: number }): void => { if (el instanceof SVGElement || el instanceof HTMLElement) { el.style.setProperty('--dx', `${v.dx}px`); el.style.setProperty('--dy', `${v.dy}px`); } };
    const refreshPots = (): void => { const s = session.state, g = q('[data-pots]'); if (s && g) g.innerHTML = potsSvg(levelOf(s.level), s); };
    const refreshChest = (n: number): void => { const g = q('.vis-coffre'); if (g) g.innerHTML = chest(n); };
    /** A funny try: Pestouille's animation, the thing's, the sound word. */
    const funny = (kind: Fail, on: string): void => {
        const l = levelOf(session.state!.level);
        observed.fail = kind; observed.funny.push(kind);
        say(kind === 'klaxon' ? t.fail.klaxon[l.toy] : t.fail[kind]);
        recordActivation(`vis:try:${kind}`, 'action', false, on);
        const word = kind === 'klaxon' ? failWords[locale].klaxon[l.toy] : failWords[locale][kind];
        const thing = kind === 'toc' ? q(`[data-plate="${on}"] .vis-plaque`) : kind === 'toupie' ? q(`[data-screw="${on}"] .vis-tete`) : kind === 'rot' ? q(`[data-pot="${on.slice(4)}"] .vis-pot`) : kind === 'klaxon' ? q('.vis-jouet') : kind === 'ressort' ? q('.vis-diable') : q('.vis-chapeau');
        const body = q('.vis-pest-corps');
        replay(body, failAnimations[kind]); replay(thing, thingAnimations[kind]);
        const at = kind === 'toc' ? centre(l.plates.find(p => p.id === on)!) : kind === 'toupie' ? l.screws.find(x => x.id === on)! : kind === 'rot' ? (b => ({ x: (b.x0 + b.x1) / 2, y: b.y1 + 44 }))(potBox(l, on.slice(4) as never)) : kind === 'klaxon' ? { x: 90, y: 140 } : kind === 'ressort' ? { x: (CHEST.x0 + CHEST.x1) / 2, y: CHEST.y0 - 30 } : { x: 37, y: 232 };
        effect(at.x, at.y, effects[kind]); wordBubble(word, at.x, at.y - 8);
        void wait(FUNNY_MS).then(() => { if (gone()) return; body?.classList.remove(failAnimations[kind]); thing?.classList.remove(thingAnimations[kind]); if (observed.fail === kind) observed.fail = null; const fx = q('[data-effects]'); if (fx && !observed.ending) fx.innerHTML = ''; });
    };
    /** A screw out: it spins up and flies into its pot; its plate, when empty, falls gently into the chest. */
    const devisse = (id: string, events: Event[]): void => {
        const s = session.state!, l = levelOf(s.level), el = q(`[data-screw="${id}"]`), vol = q(`[data-screw="${id}"] .vis-vol`);
        setVars(vol, toPot(l, id)); el?.removeAttribute('data-shine'); replay(vol, 'vis-envol');
        const fx = q('[data-effects]'); if (fx) fx.innerHTML = '';
        observed.flying.push(id);
        void wait(FLY_MS).then(() => { if (gone()) return; observed.flying = observed.flying.filter(x => x !== id); vol?.classList.remove('vis-envol'); el?.toggleAttribute('data-out', true); refreshPots(); replay(q(`[data-pot="${l.screws.find(x => x.id === id)!.color}"] .vis-pot`), 'vis-pot-recoit'); });
        const fell = events.find(e => e.kind === 'tombe');
        if (fell?.kind === 'tombe') {
            const p = l.plates.find(x => x.id === fell.plate)!, g = q(`[data-plate="${p.id}"]`), n = s.fallen.length;
            void wait(FLY_MS * .45).then(() => { if (gone()) return; setVars(g, toChest(p)); replay(g, 'vis-tombe'); });
            void wait(FLY_MS * .45 + FALL_MS).then(() => { if (gone()) return; g?.classList.remove('vis-tombe'); g?.toggleAttribute('data-fallen', true); refreshChest(n); replay(q('.vis-couvercle'), 'vis-couvercle-saute'); });
        }
    };
    /** The end: the plates and screws jump back onto the toy, which then drives, flies, lights up or sails. */
    const ending = async (s: State): Promise<void> => {
        observed.ending = true; marks();
        await wait(FLY_MS * .45 + FALL_MS + 150); if (gone()) return;
        const l = levelOf(s.level);
        refreshChest(0); observed.flying = [];
        for (const p of l.plates) { const g = q(`[data-plate="${p.id}"]`); setVars(g, toChest(p)); g?.removeAttribute('data-fallen'); g?.classList.remove('vis-tombe'); replay(g, 'vis-remonte'); }
        for (const x of l.screws) { const g = q(`[data-screw="${x.id}"]`), vol = q(`[data-screw="${x.id}"] .vis-vol`); setVars(vol, toPot(l, x.id)); g?.removeAttribute('data-out'); vol?.classList.remove('vis-envol'); replay(vol, 'vis-revient'); }
        const pots = q('[data-pots]'); if (pots) pots.innerHTML = potsSvg(l, { out: [] });
        await wait(1000); if (gone()) return;
        q('[data-toy]')?.classList.add(`vis-fini-${l.toy}`); q('.vis-pest-corps')?.classList.add('vis-pest-joie');
        effect(90, 120, confetti());
        say(t.won[l.toy]);
        await wait(END_MS - 1000); if (gone()) return;
        observed.ending = false;
        session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound());
        draw();
    };
    /** A touch at (x, y) in board units. */
    const touch = (x: number, y: number, how: string): void => {
        const s = session.state; if (!s || s.finished || observed.ending) return;
        const id = touched(s, x, y, observed.flying); if (id === null) return;
        const r = play(s, id); if (!r) return;
        session.state = r.state;
        const first = r.events[0]!;
        recordActivation(`vis:touch:${how}`, 'action', first.kind === 'devisse', id);
        if (first.kind === 'fail') funny(first.fail, first.on);
        else if (first.kind === 'devisse') {
            devisse(first.screw, r.events);
            if (!r.state.finished) say(r.events.some(e => e.kind === 'tombe') ? t.fall : t.got[first.color]);
        }
        if (r.events.some(e => e.kind === 'fini')) void ending(r.state);
        // The help is said once the funny try has been told.
        else if (hint(r.state).length && first.kind === 'fail') { const st = r.state; void wait(FUNNY_MS * .6).then(() => { if (!gone() && session.state === st) say(t.shine); }); }
        marks();
    };
    const draw = (): void => {
        const s = session.state!, l = levelOf(s.level);
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'vis:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : hint(st).length ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'vis:listen');
        const again = root.querySelector<HTMLElement>('#vis-again'), next = root.querySelector<HTMLElement>('#vis-next');
        if (again) bindAction(again, () => begin(start(s.level), true), `vis:again:${s.level}`);
        if (next) bindAction(next, () => begin(start(s.level + 1), true), `vis:next:${s.level}`);
        const z = root.querySelector<HTMLElement>('.vis-zone')!;
        // Once finished, the toy stands put back together, doing its thing.
        z.innerHTML = sceneSvg(l, s.finished ? { ...s, out: [], fallen: [] } : s, locale);
        if (s.finished) q('[data-toy]')?.classList.add(`vis-fini-${l.toy}`);
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
        observed = { fail: null, ending: false, funny: [], flying: [] };
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
