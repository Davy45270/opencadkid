import { canDrift, choose, complete, drift, hint, isUnlocked, levelOf, openRoads, parseRecords, screenOf, spotOf, start, tick, type Event, type Fail, type Records, type Spot, type State } from '../../engines/derapage';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bonusStar, bubble, bubbleWidth, confetti, driftSparks, effects, failAnimations, failWords, gift, thingAnimations } from './art';
import { arrowBox, kartAt, signBox, W } from './geometry';
import { gameView, goalsHtml, instruction, labels, levelView, screenSvg, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.derapage.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
/** One tick of the road, in ms: the kart is slow and always at the same speed. A funny try and a delivery hold the road still
 * while they play. */
export const TICK_MS = 90;
export const FAIL_MS = 2300, DELIVER_MS = 1700, DRIFT_MS = 900;
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…»]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { paused: boolean; fail: Fail | null; ending: boolean; shown: string | null; funny: Fail[] } = { paused: false, fail: null, ending: false, shown: null, funny: [] };
export function snapshot(session: Session, root: ParentNode): object {
    const zone = root.querySelector('.derapage-zone svg')?.getBoundingClientRect(), s = session.state;
    const rect = (el: Element): { x: number; y: number; width: number; height: number } => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const arrows = [...root.querySelectorAll('.derapage-zone [data-arrow]')].map(el => ({ road: Number(el.getAttribute('data-arrow')), ...rect(el) }));
    return { ...session, zone: zone ? { x: zone.x, y: zone.y, width: zone.width, height: zone.height } : null, shown: observed.shown, paused: observed.paused, fail: observed.fail, ending: observed.ending, funny: [...observed.funny], arrows, hint: s ? hint(s) : [], canDrift: s ? canDrift(s) && !observed.paused : false };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', clock = 0;
    observed = { paused: false, fail: null, ending: false, shown: null, funny: [] };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 60) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'derapage:home');
        root.querySelectorAll<HTMLElement>('[data-derapage-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.derapageLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `derapage:level:${el.dataset.derapageLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#derapage-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.derapage-zone');
    const layer = (name: string): SVGGElement | null => root.querySelector<SVGGElement>(`.derapage-zone [data-${name}]`);
    const kartEl = (): SVGGElement | null => layer('kart');
    const body = (): SVGGElement | null => root.querySelector<SVGGElement>('.derapage-zone .derapage-corps');
    const effect = (x: number, y: number, inner: string): void => { layer('effects')?.insertAdjacentHTML('beforeend', `<g transform="translate(${x} ${y})">${inner}</g>`); };
    const wordBubble = (word: string, x: number, y: number): void => { const half = bubbleWidth(word) / 2 + 4; effect(Math.min(W - half, Math.max(half, x)), Math.max(48, y), bubble(word)); };
    /** The kart where the state puts it; the chassis turns with the road, Pestouille stays upright. */
    const placeKart = (s: State, ms: number): void => {
        const k = kartEl(), p = kartAt(s); if (!k) return;
        k.style.transitionDuration = `${reduce ? 0 : ms}ms`;
        k.style.transform = `translate(${p.x}px,${p.y}px)`;
        const c = k.querySelector<SVGGElement>('.derapage-chassis'); if (c) { c.style.transitionDuration = k.style.transitionDuration; c.style.transform = `rotate(${Math.round(p.angle)}deg)`; }
    };
    /** The arrows show only while the kart waits; after two wrong roads the good ones shine. */
    const marks = (s: State): void => {
        const z = zone(); if (!z) return;
        z.toggleAttribute('data-waiting', s.waiting && !s.finished);
        const good = hint(s);
        z.toggleAttribute('data-help', good.length > 0);
        z.querySelectorAll<SVGGElement>('[data-arrow]').forEach(el => el.toggleAttribute('data-shine', good.includes(Number(el.dataset.arrow))));
    };
    const driftButton = (): void => { const b = root.querySelector<HTMLButtonElement>('#derapage-derape'), s = session.state; if (b) { const on = Boolean(s && canDrift(s) && !observed.paused); b.disabled = !on; b.toggleAttribute('data-ready', on); } };
    /** The screen of the spot the kart is on, drawn again only when it changes. */
    const screen = (s: State): void => {
        const id = screenOf(s), z = zone(); if (!z) return;
        if (observed.shown !== id || !z.querySelector('svg')) { observed.shown = id; z.innerHTML = screenSvg(levelOf(s.level), id, locale); placeKart(s, 0); }
    };
    const goalsBar = (s: State): void => { const el = root.querySelector('.derapage-goals'); if (el) el.outerHTML = goalsHtml(s, levelOf(s.level), locale); };
    /** A funny try: the kart plays its reaction, the thing its own, a bubble says the sound word; the road holds still. */
    const funny = async (e: Extract<Event, { kind: 'fail' }>): Promise<void> => {
        const kind = e.fail, s = session.state!;
        observed.fail = kind; observed.paused = true; observed.funny.push(kind); driftButton();
        say(kind === 'mauvais' ? (e.again ? t.thanks(e.who!) : t.notMe(e.who!)) : t.fail[kind]);
        recordActivation(`derapage:try:${kind}`, 'action', false, kind);
        const b = body(); b?.classList.add(failAnimations[kind]);
        const thing = kind === 'mauvais' ? root.querySelector('.derapage-zone [data-friend] .derapage-ami') : root.querySelector('.derapage-zone [data-thing] [data-part]');
        thing?.classList.add(thingAnimations[kind]);
        const p = kartAt(s);
        // The bubble stands above the thing, clear of the kart (which drives up into it) and of the friend.
        const at = kind === 'mauvais' ? { x: 150, y: 120 } : { x: p.x, y: kind === 'moutons' ? 150 : 74 };
        effect(p.x, kind === 'mauvais' ? at.y : p.y - 40, effects[kind]);
        wordBubble(failWords[locale][kind], at.x, at.y - 6);
        await wait(FAIL_MS);
        if (gone()) return;
        b?.classList.remove(failAnimations[kind]); thing?.classList.remove(thingAnimations[kind]);
        const fx = layer('effects'); if (fx) fx.innerHTML = '';
        observed.fail = null; observed.paused = false; driftButton();
    };
    /** A delivery: the parcel jumps into the friend's hands, confetti, the friend jumps for joy. */
    const deliver = async (e: Extract<Event, { kind: 'livre' }>, s: State): Promise<void> => {
        observed.paused = true; driftButton();
        recordActivation(`derapage:livre:${e.who}`, 'action', true, e.who);
        const hands = root.querySelector('.derapage-zone [data-gift-in-hands]');
        if (hands) hands.innerHTML = `<g class="derapage-cadeau" transform="translate(-14 4) scale(1.1)">${gift(e.who)}</g>`;
        root.querySelector('.derapage-zone .derapage-colis')?.classList.add('derapage-colis-parti');
        root.querySelector('.derapage-zone [data-friend] .derapage-ami')?.classList.add('derapage-ami-joie');
        effect(150, 120, confetti());
        say(t.delivered(e.who), !s.finished);
        goalsBar(s);
        if (s.finished) { void ending(s); return; }
        await wait(DELIVER_MS);
        if (gone()) return;
        root.querySelector('.derapage-zone .derapage-colis')?.classList.remove('derapage-colis-parti');
        observed.paused = false; driftButton();
    };
    const handle = (events: Event[], s: State): void => {
        for (const e of events) {
            if (e.kind === 'fourche') { marks(s); if (hint(s).length) say(t.shine); else if (s.choices === 0) say(t.pick, false); }
            else if (e.kind === 'fail') void funny(e);
            else if (e.kind === 'livre') void deliver(e, s);
        }
    };
    /** Every parcel delivered: the friend dances, the reward. */
    const ending = async (s: State): Promise<void> => {
        observed.ending = true;
        await wait(DELIVER_MS); if (gone()) return;
        observed.ending = false; observed.paused = false;
        session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound());
        message = t.won; speak([message]); draw();
    };
    const step = (): void => {
        const s = session.state;
        if (!s || s.finished || s.waiting) return;
        const r = tick(s);
        session.state = r.state;
        screen(r.state);
        placeKart(r.state, TICK_MS);
        handle(r.events, r.state);
        driftButton();
    };
    const schedule = (): void => {
        clock = window.setTimeout(() => {
            if (disposed) return;
            if (session.screen === 'play' && session.state && !session.state.finished && !observed.paused) step();
            schedule();
        }, TICK_MS);
    };
    const pick = (road: number, how: string): void => {
        const s = session.state; if (!s || s.finished || !s.waiting || observed.paused) return;
        const r = choose(s, s.spot, road); if (!r) return;
        session.state = r.state;
        recordActivation(`derapage:choix:${how}`, 'action', true, String(road));
        marks(r.state);
    };
    const doDrift = (): void => {
        const s = session.state; if (!s || observed.paused || !canDrift(s)) return;
        const r = drift(s, s.t); if (!r?.drifted) return;
        session.state = r.state;
        recordActivation('derapage:derape', 'action', true, String(r.state.bonus));
        const b = body(); b?.classList.remove('derapage-glisse'); void b?.getBoundingClientRect(); b?.classList.add('derapage-glisse');
        root.querySelector('.derapage-zone [data-drift]')!.innerHTML = driftSparks();
        const p = kartAt(r.state); effect(p.x, p.y - 34, bonusStar());
        say(t.bonus, false); goalsBar(r.state); driftButton();
        window.setTimeout(() => { b?.classList.remove('derapage-glisse'); const d = root.querySelector('.derapage-zone [data-drift]'); if (d) d.innerHTML = ''; }, reduce ? 60 : DRIFT_MS);
    };
    /** The road whose arrow (or sign) is under a finger: the arrow with a margin of a few units, or anywhere on its sign. */
    const roadUnder = (px: number, py: number): { road: number; how: string } | null => {
        const st = session.state, r = zone()?.querySelector('svg')?.getBoundingClientRect(); if (!st?.waiting || !r) return null;
        const sp = spotOf(levelOf(st.level), st.spot) as Extract<Spot, { kind: 'fourche' }>, k = r.width / W, x = (px - r.x) / k, y = (py - r.y) / k;
        for (const i of openRoads(sp)) {
            const a = arrowBox(sp.to.length, i, sp.round), b = signBox(sp.to.length, i);
            if (x >= a.x0 - 6 && x <= a.x1 + 6 && y >= a.y0 - 6 && y <= a.y1 + 6) return { road: i, how: 'arrow' };
            if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return { road: i, how: 'sign' };
        }
        return null;
    };
    const fill = (): void => { const s = session.state; if (!s) return; observed.shown = null; screen(s); marks(s); };
    const draw = (): void => {
        const s = session.state!, l = levelOf(s.level);
        root.innerHTML = gameView(s, l, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'derapage:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : hint(st).length ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'derapage:listen');
        const again = root.querySelector<HTMLElement>('#derapage-again'), next = root.querySelector<HTMLElement>('#derapage-next'), dr = root.querySelector<HTMLElement>('#derapage-derape');
        if (again) bindAction(again, () => play(start(s.level), true), `derapage:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `derapage:next:${s.level}`);
        if (dr) bindAction(dr, doDrift, 'derapage:derape');
        fill(); driftButton();
        const z = zone()!;
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary) return;
            const road = roadUnder(e.clientX, e.clientY);
            if (road === null) return;
            e.preventDefault(); pick(road.road, road.how);
        });
        z.addEventListener('keydown', e => {
            const st = session.state!; if (!st.waiting || st.finished) return;
            const sp = spotOf(levelOf(st.level), st.spot) as Extract<Spot, { kind: 'fourche' }>, open = openRoads(sp);
            const want = e.key === 'ArrowLeft' ? 0 : e.key === 'ArrowRight' ? sp.to.length - 1 : e.key === 'ArrowUp' && sp.to.length === 3 ? 1 : -1;
            if (want < 0 || !open.includes(want)) return;
            e.preventDefault(); pick(want, 'key');
        });
    };
    const resize = (): void => { if (session.screen === 'play' && session.state) placeKart(session.state, 0); };
    window.addEventListener('resize', resize);
    function play(s: State, fresh: boolean): void {
        for (const id of timers) clearTimeout(id); timers.clear();
        observed = { paused: false, fail: null, ending: false, shown: null, funny: [] };
        session.screen = 'play'; session.state = s;
        if (s.finished) { session.records = complete(session.records, s); writeRecords(storage, session.records); }
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    schedule();
    return () => { disposed = true; window.clearTimeout(clock); window.removeEventListener('resize', resize); for (const id of timers) clearTimeout(id); timers.clear(); };
}
