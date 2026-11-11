import { BASE, complete, fire, flight, cloudAt, groundAt, helpOn, hint, HEIGHT, isUnlocked, launch, levelOf, parseRecords, POWER_MIN, quantize, RATE, start, WIDTH, type Miss, type Point, type Records, type Result, type Shot, type State } from '../../engines/arrosoir';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { apple, bubble, bubbleWidth, butterfly, dot, fish, hand, heart, missAnimations, missWords, rain, rainbow, splashDrops } from './art';
import { flowersSvg, gameView, instruction, labels, levelView, tracesSvg, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.arrosoir.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
/** A pull this long, in board units (about 140 px on a phone), gives full power. */
export const PULL_FULL = 60;
/** How far the balloon follows the finger back from the sling, in board units. */
export const BAND_MAX = 20;
/** Durations, in ms: one step of a flight, a funny try, flowers drinking. */
export const STEP_MS = 1000 / RATE;
export const FAIL_MS = 1500;
export const DRINK_MS = 1100;
/** The keyboard's aim when a scene opens. */
const KEY_AIM: Shot = { angle: 45, power: 50 };
/** The shot a pull gives: the other way from the finger, as strong as the pull is long (board units). Null when the pull is
 * too short to throw (a tap). A finger pulling upwards throws flat, to the side opposite the pull. */
export function shotFromPull(dx: number, dy: number): Shot | null {
    const power = Math.hypot(dx, dy) / PULL_FULL * 100;
    if (power < POWER_MIN) return null;
    let angle = Math.atan2(dy, -dx) * 180 / Math.PI;
    if (angle < 0) angle = -dx >= 0 ? 0 : 180;
    return quantize({ angle, power });
}
/** The pull that gives a shot (board units): what the ghost hand of the help shows. */
export function pullOf(shot: Shot): Point {
    const a = shot.angle * Math.PI / 180, len = shot.power / 100 * PULL_FULL;
    return { x: -Math.cos(a) * len, y: Math.sin(a) * len };
}
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const n = (v: number): string => (Math.round(v * 10) / 10).toString();
let observed: { busy: boolean; funny: Miss[]; aim: Shot | null; last: { miss: Miss | null; drank: number[]; impact: Point } | null } = { busy: false, funny: [], aim: null, last: null };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.arrosoir-zone svg')?.getBoundingClientRect(), s = session.state;
    const scale = r ? r.width / WIDTH : 0, toScreen = (p: Point) => r ? { x: r.x + p.x * scale, y: r.y + p.y * scale } : null;
    const level = s ? levelOf(s.level) : null;
    return {
        ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, scale, launch: level ? toScreen(launch(level)) : null,
        flowers: level ? level.flowers.map(x => toScreen({ x, y: groundAt(level, x) - 22 })) : [], hint: s && helpOn(s) ? hint(s) : null,
        busy: observed.busy, funny: [...observed.funny], aim: observed.aim, last: observed.last
    };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', frame = 0, down: { id: number; x: number; y: number } | null = null, keyAim: Shot = { ...KEY_AIM };
    observed = { busy: false, funny: [], aim: null, last: null };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 60) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        stopFrame(); session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'arrosoir:home');
        root.querySelectorAll<HTMLElement>('[data-arrosoir-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.arrosoirLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `arrosoir:level:${el.dataset.arrosoirLevel!}`));
    };
    const stopFrame = (): void => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#arrosoir-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.arrosoir-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.arrosoir-zone svg');
    const layer = (name: string): Element | null => root.querySelector(`[data-${name}]`);
    const scale = (): number => { const r = svgEl()?.getBoundingClientRect(); return r && r.width ? r.width / WIDTH : 1; };
    const fx = (html: string): void => { layer('effects')?.insertAdjacentHTML('beforeend', html); };
    const putBalloon = (p: Point): void => layer('balloon')?.setAttribute('transform', `translate(${n(p.x)} ${n(p.y)})`);
    /** The dotted line of a shot (as much of it as the scene shows), the balloon pulled back and the rubber bands. */
    const drawAim = (shot: Shot | null): void => {
        const s = session.state; if (!s) return;
        const level = levelOf(s.level), from = launch(level), dots = layer('dots'), band = layer('band');
        observed.aim = shot;
        if (!dots || !band) return;
        if (!shot) { dots.innerHTML = ''; band.innerHTML = ''; putBalloon(from); return; }
        const { points } = flight(level, shot, cloudAt(level, s.turn)), shown = Math.max(8, Math.ceil(points.length * level.dots));
        dots.innerHTML = points.slice(3, shown).filter((_, i) => i % 4 === 0).map(p => dot(p.x, p.y)).join('');
        const pull = pullOf(shot), len = Math.hypot(pull.x, pull.y), k = Math.min(1, BAND_MAX / Math.max(1, len)) * Math.min(1, len / 12 + .4);
        const b = { x: from.x + pull.x * k, y: from.y + pull.y * k };
        band.innerHTML = `<path d="M${n(from.x - 5)} ${n(from.y)}L${n(b.x)} ${n(b.y)}L${n(from.x + 5)} ${n(from.y)}" fill="none" stroke="#c84a6a" stroke-width="1.8" stroke-linecap="round"/>`;
        putBalloon(b);
    };
    /** The help: the good pull's whole flight in golden dots, and a ghost hand pulling back the right way. */
    const drawHelp = (): void => {
        const s = session.state, help = layer('help'); if (!s || !help) return;
        const h = !observed.busy && helpOn(s) ? hint(s) : null;
        zone()?.toggleAttribute('data-helping', Boolean(h));
        if (!h) { help.innerHTML = ''; return; }
        const level = levelOf(s.level), from = launch(level), { points } = flight(level, h, cloudAt(level, s.turn)), pull = pullOf(h), k = Math.min(1, BAND_MAX * 1.6 / Math.hypot(pull.x, pull.y));
        help.innerHTML = points.slice(3).filter((_, i) => i % 4 === 0).map(p => dot(p.x, p.y, true)).join('')
            + `<g transform="translate(${n(from.x)} ${n(from.y)})"><g class="arrosoir-main" style="--hx:${n(pull.x * k)}px;--hy:${n(pull.y * k)}px"><g transform="scale(1.6)">${hand()}</g></g></g>`;
    };
    const bubbleAt = (p: Point, word: string): void => {
        const half = bubbleWidth(word) / 2 + 2, x = Math.min(WIDTH - half, Math.max(half, p.x)), y = Math.max(44, Math.min(HEIGHT - 4, p.y));
        fx(`<g transform="translate(${n(x)} ${n(y)})">${bubble(word)}</g>`);
    };
    const classed: [Element, string][] = [];
    const play_ = (el: Element | null | undefined, cls: string): void => { if (el) { el.classList.add(cls); classed.push([el, cls]); } };
    /** A funny try, drawn where it happens. */
    const reaction = (r: Result): void => {
        const s = r.state, level = levelOf(s.level), m = r.miss!, cls = missAnimations[m], at = r.impact, c = level.caliroux.x;
        recordActivation(`arrosoir:try:${m}`, 'action', false, m);
        if (m === 'court') { play_(root.querySelector('.arrosoir-caliroux'), cls); fx(`<g transform="translate(${n(c - 15)} ${n(groundAt(level, c) - 34)})">${splashDrops(false)}</g>`); }
        if (m === 'loin') { const x = at.x < WIDTH / 2 ? 10 : WIDTH - 10; fx(`<g transform="translate(${x} ${BASE - 30})"><g class="${cls}">${fish()}</g></g>`); }
        if (m === 'pousse') play_(root.querySelector('[data-tuft]:last-of-type'), cls);
        if (m === 'mare') play_(root.querySelector('[data-frog] > g'), cls);
        if (m === 'bisou') for (const i of r.kissed) { const x = level.flowers[i]!; fx(`<g transform="translate(${x} ${n(groundAt(level, x) - 30)})"><g class="${cls}">${heart()}</g></g>`); play_(root.querySelector(`[data-flower="${i}"] .arrosoir-fleur`), 'arrosoir-salut'); }
        if (m === 'vache') play_(root.querySelector(`[data-cow="${at.what}"] .arrosoir-vache`), cls);
        if (m === 'etang') play_(root.querySelector('.arrosoir-canard'), cls);
        if (m === 'arbre') {
            const tr = level.trees[at.what]!, tx = tr.x, ty = groundAt(level, tx) - tr.h + 8, hx = c - 15, hy = groundAt(level, c) - 42;
            fx(`<g transform="translate(${tx} ${n(ty)})"><g class="${cls}" style="--dx:${n(hx - tx)}px;--dy:${n(hy - ty)}px"><g transform="scale(1.8)">${apple()}</g></g></g>`);
            play_(root.querySelector(`[data-tree="${at.what}"] .arrosoir-couronne`), 'arrosoir-secoue');
        }
        if (m === 'nuage') { const cl = cloudAt(level, s.turn - 1)!; fx(`<g transform="translate(${n(cl.x)} ${cl.y})"><g class="${cls}">${rain()}</g></g>`); }
        bubbleAt(m === 'court' ? { x: c, y: groundAt(level, c) - 40 } : m === 'loin' ? { x: at.x < WIDTH / 2 ? 10 : WIDTH - 10, y: BASE - 34 } : at, missWords[locale][m]);
    };
    const clear = (): void => {
        for (const [el, cls] of classed.splice(0)) el.classList.remove(cls);
        const e = layer('effects'); if (e) e.innerHTML = '';
        observed.funny = [];
    };
    /** The flowers and traces of a state, drawn again. */
    const refresh = (s: State): void => {
        const level = levelOf(s.level), f = layer('flowers'), tr = layer('traces');
        if (f) f.innerHTML = flowersSvg(level, s);
        if (tr) tr.innerHTML = tracesSvg(level, s);
        const cl = cloudAt(level, s.turn), cg = layer('cloud');
        if (cl && cg) cg.setAttribute('transform', `translate(${n(cl.x)} ${cl.y})`);
        root.querySelector('[data-can]')?.toggleAttribute('data-taken', s.big);
    };
    const throwIt = async (shot: Shot, how: string): Promise<void> => {
        const s = session.state;
        if (!s || s.finished || observed.busy) return;
        const r = fire(s, shot);
        observed.busy = true; drawAim(null); drawHelp();
        recordActivation(`arrosoir:throw:${how}`, 'action', true, `${r.shot.angle}/${r.shot.power}`);
        // The flight, step by step at RATE steps a second.
        await new Promise<void>(done => {
            const began = performance.now();
            const tick = (now: number): void => {
                if (disposed) return done();
                const k = reduce ? r.points.length - 1 : Math.min(r.points.length - 1, Math.max(0, Math.floor((now - began) / STEP_MS)));
                putBalloon(r.points[k]!);
                if (k >= r.points.length - 1) { frame = 0; done(); return; }
                frame = requestAnimationFrame(tick);
            };
            frame = requestAnimationFrame(tick);
        });
        if (gone()) return;
        const level = levelOf(s.level);
        putBalloon(launch(level));
        session.state = r.state;
        observed.last = { miss: r.miss, drank: r.drank, impact: { x: r.impact.x, y: r.impact.y } };
        if (r.impact.kind !== 'loin') fx(`<g transform="translate(${n(r.impact.x)} ${n(r.impact.y)})">${splashDrops(s.big)}</g>`);
        refresh(r.state);
        if (r.miss) {
            observed.funny = [r.miss]; reaction(r); say(t.miss[r.miss]);
            await wait(FAIL_MS);
        } else {
            for (const i of r.drank) play_(root.querySelector(`[data-flower="${i}"] .arrosoir-fleur`), 'arrosoir-ouvre');
            if (r.bonus) play_(root.querySelector('[data-can] .arrosoir-arrosoir'), 'arrosoir-saute');
            if (r.drank.length) { chime(sound()); recordActivation('arrosoir:drink', 'action', true, String(r.drank.length)); }
            say(r.bonus && !r.drank.length ? t.big : r.drank.length > 1 ? t.drinks : t.drink);
            await wait(DRINK_MS);
        }
        if (gone()) return;
        clear();
        observed.busy = false;
        if (r.state.finished) {
            session.records = complete(session.records, r.state); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        if (helpOn(r.state) && !helpOn(s)) say(t.help);
        drawHelp();
    };
    /** The end: a rainbow over the meadow and butterflies round the open flowers. */
    const party = (s: State): void => {
        const level = levelOf(s.level), rb = layer('rainbow');
        if (rb) rb.innerHTML = `<g class="arrosoir-arc">${rainbow()}</g>`;
        level.flowers.forEach((x, i) => fx(`<g transform="translate(${x} ${n(groundAt(level, x) - 44)})"><g class="arrosoir-papillon" style="animation-delay:${i * 180}ms">${butterfly(['#ff8fc0', '#ffd23f', '#7fc8ff', '#b38cf0'][i % 4]!)}</g></g>`));
    };
    const draw = (): void => {
        const s = session.state!;
        stopFrame();
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'arrosoir:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.help] : instruction(levelOf(st.level), locale)); }, 'arrosoir:listen');
        const again = root.querySelector<HTMLElement>('#arrosoir-again'), next = root.querySelector<HTMLElement>('#arrosoir-next');
        if (again) bindAction(again, () => play(start(s.level), true), `arrosoir:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `arrosoir:next:${s.level}`);
        if (s.finished) { party(s); return; }
        drawHelp();
        const z = zone()!;
        const pull = (e: PointerEvent): Shot | null => { const k = scale(); return down ? shotFromPull((e.clientX - down.x) / k, (e.clientY - down.y) / k) : null; };
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary || observed.busy || session.state!.finished || (e.target as Element).closest('.arrosoir-reward')) return;
            e.preventDefault(); down = { id: e.pointerId, x: e.clientX, y: e.clientY };
            try { z.setPointerCapture(e.pointerId); } catch { /* A finger already gone: the pull still counts. */ }
            recordActivation('arrosoir:pull', 'pointerdown', true, 'pull');
        });
        z.addEventListener('pointermove', e => { if (down && e.pointerId === down.id && !observed.busy) drawAim(pull(e)); });
        z.addEventListener('pointerup', e => {
            if (!down || e.pointerId !== down.id) return;
            const shot = pull(e); down = null;
            if (shot) void throwIt(shot, 'pull'); else { drawAim(null); if (!observed.busy) say(t.gesture); }
        });
        z.addEventListener('pointercancel', () => { down = null; drawAim(null); });
        z.addEventListener('contextmenu', e => e.preventDefault());
        z.addEventListener('keydown', e => {
            if (observed.busy) return;
            const step: Record<string, [number, number]> = { ArrowUp: [2, 0], ArrowDown: [-2, 0], ArrowLeft: [0, -3], ArrowRight: [0, 3] };
            const d = step[e.key];
            if (d) { e.preventDefault(); keyAim = quantize({ angle: keyAim.angle + d[0], power: keyAim.power + d[1] }); drawAim(keyAim); }
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void throwIt(keyAim, 'key'); }
        });
        z.addEventListener('blur', () => { if (!down && !observed.busy) drawAim(null); });
    };
    function play(s: State, fresh: boolean): void {
        stopFrame(); observed = { busy: false, funny: [], aim: null, last: null }; keyAim = { ...KEY_AIM };
        for (const id of timers) clearTimeout(id); timers.clear(); classed.length = 0;
        session.screen = 'play'; session.state = s;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; stopFrame(); for (const id of timers) clearTimeout(id); timers.clear(); };
}
