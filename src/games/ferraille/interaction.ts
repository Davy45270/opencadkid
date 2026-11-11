import { boubouAt, complete, hint, isUnlocked, levelOf, lift, liftY, parseRecords, platOf, play, reachable, robotBox, ROBOT, start, touched, W, type Event, type Fail, type Records, type State } from '../../engines/ferraille';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bubble, bubbleWidth, button, confetti, effects, failAnimations, failWords, thingAnimations } from './art';
import { gameView, goalsHtml, instruction, labels, levelView, sceneSvg, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.ferraille.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
/** One tick of the workshop, in ms: a jump takes 8 ticks, the lift's loop 56. */
export const TICK_MS = 100;
export const END_MS = 2200;
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…»]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { now: number; moving: boolean; fail: Fail | null; ending: boolean; funny: Fail[] } = { now: 0, moving: false, fail: null, ending: false, funny: [] };
export function snapshot(session: Session, root: ParentNode): object {
    const rect = (el: Element | null | undefined): { x: number; y: number; width: number; height: number } | null => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const s = session.state;
    return { ...session, ...observed, funny: [...observed.funny], zone: rect(root.querySelector('.ferraille-zone svg')), hint: s ? hint(s) : [], reach: s && !observed.moving ? reachable(s, observed.now) : [],
        plats: [...root.querySelectorAll('.ferraille-zone [data-plat]:not([data-hidden])')].map(el => ({ id: el.getAttribute('data-plat'), ...rect(el.querySelector('.ferraille-plateforme'))! })),
        parts: [...root.querySelectorAll('.ferraille-zone [data-part]:not([data-got])')].map(el => ({ id: el.getAttribute('data-part'), ...rect(el)! })),
        robot: rect(root.querySelector('.ferraille-zone [data-robot] .ferraille-robot')), boubou: rect(root.querySelector('.ferraille-zone [data-mover] svg')) };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', clock = 0, pending: Event[] = [], shown: State | null = null;
    observed = { now: 0, moving: false, fail: null, ending: false, funny: [] };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 60) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'ferraille:home');
        root.querySelectorAll<HTMLElement>('[data-ferraille-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.ferrailleLevel); if (isUnlocked(id, session.records)) begin(start(id), true); }, () => `ferraille:level:${el.dataset.ferrailleLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#ferraille-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const q = (sel: string): SVGGElement | null => root.querySelector<SVGGElement>(`.ferraille-zone ${sel}`);
    const effect = (x: number, y: number, inner: string): void => { q('[data-effects]')?.insertAdjacentHTML('beforeend', `<g transform="translate(${x} ${y})">${inner}</g>`); };
    const wordBubble = (word: string, x: number, y: number): void => { const half = bubbleWidth(word) / 2 + 4; effect(Math.min(W - half, Math.max(half, x)), Math.max(48, y), bubble(word)); };
    /** Boubou and the lift where the state puts them at this tick. */
    const place = (ms: number): void => {
        const s = session.state; if (!s) return;
        const b = q('[data-boubou]'), p = boubouAt(s, observed.now), l = levelOf(s.level), lf = lift(l);
        if (b) { b.style.transitionDuration = `${reduce ? 0 : ms}ms`; b.style.transform = `translate(${p.x}px,${p.y}px)`; }
        const g = lf && q(`[data-plat="${lf.id}"]`);
        if (lf && g) { g.style.transitionDuration = b?.style.transitionDuration ?? '0ms'; g.style.transform = `translateY(${liftY(lf, observed.now) - lf.y}px)`; }
    };
    /** The good touches shine after three that brought nothing nearer; in a scene with a lift, what the lift lets Boubou reach
     * right now glows. */
    const marks = (): void => {
        const s = session.state, z = root.querySelector('.ferraille-zone'); if (!s || !z) return;
        const good = observed.moving ? [] : hint(s), lf = lift(levelOf(s.level)), now = lf && !observed.moving ? reachable(s, observed.now).filter(id => s.at === lf.id || id === lf.id) : [];
        z.querySelectorAll('[data-plat], [data-robot]').forEach(el => { const id = el.getAttribute('data-plat') ?? ROBOT; el.toggleAttribute('data-shine', good.includes(id)); el.toggleAttribute('data-reach', now.includes(id)); });
    };
    const goals = (s: State): void => { const el = root.querySelector('.ferraille-goals'); if (el) el.outerHTML = goalsHtml(s, levelOf(s.level), locale); };
    /** A funny try plays while Boubou moves: his animation, the thing's, the sound word. */
    const funny = (kind: Fail, target: string): void => {
        const s = session.state!, l = levelOf(s.level);
        observed.fail = kind; observed.funny.push(kind);
        say(t.fail[kind]);
        recordActivation(`ferraille:try:${kind}`, 'action', false, kind);
        q('.ferraille-corps')?.classList.add(failAnimations[kind]);
        const thing = kind === 'coussin' ? q('[data-cushion]') : kind === 'eternue' ? q('[data-robot] .ferraille-robot') : kind === 'canard' ? q(`[data-plat="${target}"] .ferraille-canard`) : q(`[data-plat="${target}"] .ferraille-plateforme`);
        thing?.classList.add(thingAnimations[kind]);
        const at = boubouAt(s, s.busy), r = robotBox(l);
        if (kind === 'eternue') { effect((r.x0 + r.x1) / 2, r.y1, effects.eternue); wordBubble(failWords[locale][kind], (r.x0 + r.x1) / 2, r.y0 - 20); }
        else { const p = platOf(l, target); effect(kind === 'coussin' ? at.x : (p.x0 + p.x1) / 2, kind === 'bong' ? p.y + 60 : at.y, effects[kind]); wordBubble(failWords[locale][kind], at.x, Math.min(at.y, p.y) - 30); }
        void wait((s.busy - observed.now) * TICK_MS + 200).then(() => { if (gone()) return; q('.ferraille-corps')?.classList.remove(failAnimations[kind]); thing?.classList.remove(thingAnimations[kind]); });
    };
    /** Boubou lands: the parts he picked up, the bridge, the robot's magnet, the end. */
    const landing = (events: Event[]): void => {
        const s = session.state!;
        observed.moving = false; observed.fail = null; shown = s;
        const fx = q('[data-effects]'); if (fx) fx.innerHTML = '';
        for (const e of events) {
            if (e.kind === 'piece') { q(`[data-part="${e.at}"]`)?.toggleAttribute('data-got', true); recordActivation(`ferraille:piece:${e.piece}`, 'action', true, e.at); if (!s.finished) say(t.got[e.piece]); }
            else if (e.kind === 'lourd') say(t.heavy);
            else if (e.kind === 'pont') { q('[data-hidden]')?.removeAttribute('data-hidden'); const b = q('[data-button]'); if (b) b.innerHTML = button(true); say(t.bridge); }
            else if (e.kind === 'rapporte') { q('[data-robot] .ferraille-bras')?.classList.add('ferraille-aimant'); void wait(900).then(() => q('[data-robot] .ferraille-bras')?.classList.remove('ferraille-aimant')); say(t.give); }
            else if (e.kind === 'fini') void ending(s);
        }
        goals(s);
        if (!s.finished && hint(s).length && !events.some(e => e.kind === 'piece')) say(t.shine);
        marks();
    };
    const ending = async (s: State): Promise<void> => {
        observed.ending = true;
        q('[data-robot]')?.classList.add('ferraille-repare');
        q('[data-robot] .ferraille-bras')?.classList.add('ferraille-aimant');
        const r = robotBox(levelOf(s.level)); effect((r.x0 + r.x1) / 2, r.y0, confetti());
        q('.ferraille-corps')?.classList.add('ferraille-boubou-joie');
        say(t.won);
        await wait(END_MS); if (gone()) return;
        observed.ending = false;
        session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound());
        draw();
    };
    const step = (): void => {
        const s = session.state; if (!s || session.screen !== 'play') return;
        observed.now++;
        if (observed.moving && observed.now >= s.busy) { const ev = pending; pending = []; landing(ev); }
        place(TICK_MS);
        if (lift(levelOf(s.level))) marks();
    };
    const schedule = (): void => { clock = window.setTimeout(() => { if (disposed) return; if (!observed.ending) step(); schedule(); }, TICK_MS); };
    /** A touch on a platform or the robot, at this instant. */
    const touch = (target: string, how: string): void => {
        const s = session.state; if (!s || s.finished || observed.moving || observed.ending) return;
        const r = play(s, { target, at: observed.now }); if (!r) return;
        session.state = r.state; observed.moving = true;
        const m = r.events[0]!;
        recordActivation(`ferraille:touch:${how}`, 'action', m.kind === 'move' && m.good, target);
        pending = r.events.filter(e => e.kind !== 'move' && e.kind !== 'fail');
        const f = r.events.find(e => e.kind === 'fail');
        if (f?.kind === 'fail') funny(f.fail, target);
        marks();
    };
    const draw = (): void => {
        const s = session.state!, l = levelOf(s.level);
        root.innerHTML = gameView(s, l, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'ferraille:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : hint(st).length ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'ferraille:listen');
        const again = root.querySelector<HTMLElement>('#ferraille-again'), next = root.querySelector<HTMLElement>('#ferraille-next');
        if (again) bindAction(again, () => begin(start(s.level), true), `ferraille:again:${s.level}`);
        if (next) bindAction(next, () => begin(start(s.level + 1), true), `ferraille:next:${s.level}`);
        const z = root.querySelector<HTMLElement>('.ferraille-zone')!;
        z.innerHTML = sceneSvg(l, shown ?? s, locale);
        if (s.finished) { q('[data-robot]')?.classList.add('ferraille-repare'); }
        place(0); marks();
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary) return;
            const st = session.state, b = z.querySelector('svg')?.getBoundingClientRect(); if (!st || !b) return;
            const k = b.width / W, id = touched(levelOf(st.level), (shown ?? st).bridge, (e.clientX - b.x) / k, (e.clientY - b.y) / k, observed.now);
            if (id === null) return;
            e.preventDefault(); touch(id, id === ROBOT ? 'robot' : 'plat');
        });
    };
    function begin(s: State, fresh: boolean): void {
        for (const id of timers) clearTimeout(id); timers.clear();
        observed = { now: s.busy, moving: false, fail: null, ending: false, funny: [] }; pending = []; shown = s;
        session.screen = 'play'; session.state = s;
        if (s.finished) { session.records = complete(session.records, s); writeRecords(storage, session.records); }
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) begin(session.state, false); else levelsScreen();
    schedule();
    return () => { disposed = true; window.clearTimeout(clock); for (const id of timers) clearTimeout(id); timers.clear(); };
}
