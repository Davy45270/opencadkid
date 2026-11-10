import { clockOf, closed, complete, friendOf, height, helpOn, hint, homeOf, isUnlocked, landing, laneAt, levelOf, lightOf, lilyUp, moves, offset, parseRecords, start, step, trainHere, width, type Action, type Fail, type Lane, type Records, type State } from '../../engines/traverse';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bubble, bubbleWidth, crossing, car, duck, failAnimations, failWords, light, lily, log, PAINT, splash, tractor, train, truck, U } from './art';
import { arrowsSvg, boardSvg, centerX, centerY, gameView, instruction, labels, layout, levelView, typeset, type Layout } from './view';

export const RECORDS_KEY = 'opencadkid.traverse.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; last: { fail: Fail | null } | null }
/** Durations, in ms: one step (the hop and the world moving), a funny try. */
export const STEP_MS = 280, FAIL_MS = 1300;
/** How far a finger slides, in cells, before it is a step on that side. */
export const SLIDE = 0.3;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const DELTA = { haut: [0, 1], bas: [0, -1], gauche: [-1, 0], droite: [1, 0] } as const;
let observed: { busy: boolean; fail: Fail | null; layout: Layout | null } = { busy: false, fail: null, layout: null };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.traverse-zone svg')?.getBoundingClientRect(), s = session.state, l = observed.layout;
    let geom = null;
    if (r && s && l) { const level = levelOf(s.level), scale = r.width / (width(level) * U); geom = { x0: r.x, y0: r.y + l.pad * scale, cw: U * scale, ch: l.ch * scale, h: height(level) }; }
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, geom, hint: s && helpOn(s) ? hint(s) : null, busy: observed.busy, fail: observed.fail };
}
/** The things of a moving lane: each car, truck, tractor, duck or log, by the ring index where it starts. */
function things(lane: Lane): { i: number; ch: string; len: number }[] {
    const r = lane.ring, L = r.length, out: { i: number; ch: string; len: number }[] = [];
    for (let i = 0; i < L; i++) {
        const ch = r[i]!;
        if (ch === '.') continue;
        if ((ch === 'T' || ch === 'l') && r[(i - 1 + L) % L] === ch) continue;
        let len = 1;
        if (ch === 'T' || ch === 'l') while (len < L && r[(i + len) % L] === ch) len++;
        out.push({ i, ch, len });
    }
    return out;
}
const moving = (lane: Lane): boolean => lane.dir !== 0 && lane.kind !== 'herbe' && lane.kind !== 'rail';
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', down: { x: number; y: number; id: number } | null = null, trail: { x: number; y: number } | null = null;
    observed = { busy: false, fail: null, layout: null };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 60) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null; session.last = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'traverse:home');
        root.querySelectorAll<HTMLElement>('[data-traverse-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.traverseLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `traverse:level:${el.dataset.traverseLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#traverse-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.traverse-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.traverse-zone svg');
    const put = (el: Element | null, x: number, y: number): void => { if (el) (el as SVGGElement).style.transform = `translate(${x}px,${y}px)`; };
    /** The moving world at the state's clock: things slide, lilies dive or come up, the barrier and the train. */
    const world = (s: State): void => {
        const layer = root.querySelector('[data-world]'), l = observed.layout; if (!layer || !l) return;
        const level = levelOf(s.level), w = width(level), c = clockOf(s), keep = new Set<string>();
        for (let y = 0; y < height(level); y++) {
            const lane = laneAt(level, y), cy = centerY(level, y, l);
            if (moving(lane)) {
                const L = lane.ring.length, o = offset(lane, c);
                for (const th of things(lane)) {
                    const u = th.i + lane.dir * o;
                    for (let m = Math.ceil((-5 - u) / L); u + m * L < w + 1; m++) {
                        const pos = u + m * L, key = `${y}:${th.i}:${m}`;
                        keep.add(key);
                        let el = layer.querySelector<SVGGElement>(`[data-thing="${key}"]`);
                        if (!el) {
                            const art = th.ch === 'c' ? car(lane.dir, th.i % 2 ? PAINT.voiture2 : PAINT.voiture) : th.ch === 'T' ? truck(lane.dir, th.len) : th.ch === 'r' ? tractor(lane.dir) : th.ch === 'd' ? duck(lane.dir) : log(th.len);
                            layer.insertAdjacentHTML(th.ch === 'l' ? 'afterbegin' : 'beforeend', `<g data-thing="${key}" data-y="${y}" data-len="${th.len}" data-kind="${th.ch}"><g class="traverse-inner">${art}</g></g>`);
                            el = layer.querySelector<SVGGElement>(`[data-thing="${key}"]`)!;
                        }
                        el.dataset.pos = String(pos);
                        put(el, centerX(pos), cy);
                    }
                }
            } else if (lane.kind === 'riviere') {
                for (let x = 0; x < w; x++) {
                    const ch = lane.ring[x]!; if (ch === '.') continue;
                    const key = `${y}:lily:${x}`; keep.add(key);
                    let el = layer.querySelector<SVGGElement>(`[data-thing="${key}"]`);
                    if (!el) { layer.insertAdjacentHTML('afterbegin', `<g data-thing="${key}" data-lily data-y="${y}" data-pos="${x}" style="transform:translate(${centerX(x)}px,${cy}px)"><g class="traverse-inner">${lily()}</g></g>`); el = layer.querySelector<SVGGElement>(`[data-thing="${key}"]`)!; }
                    const now = lilyUp(ch, s.t), next = lilyUp(ch, s.t + 1);
                    el.dataset.state = now ? (next ? 'up' : 'dive') : (next ? 'rise' : 'down');
                }
            } else if (lane.kind === 'rail') {
                const key = `${y}:rail`; keep.add(key);
                let el = layer.querySelector<SVGGElement>(`[data-thing="${key}"]`);
                if (!el) { layer.insertAdjacentHTML('beforeend', `<g data-thing="${key}" data-rail data-y="${y}" style="transform:translate(0px,${cy}px)"><g data-train>${train(w)}</g>${crossing(w * U, l.ch)}</g>`); el = layer.querySelector<SVGGElement>(`[data-thing="${key}"]`)!; }
                // The barrier is down whenever a step onto the rails would meet it: the child sees it before trying.
                const shut = closed(lane, s.t) || closed(lane, s.t + 1), here = trainHere(lane, s.t), k = lane.ring.indexOf('X'), at = here ? s.t % lane.ring.length - k : -1;
                el.toggleAttribute('data-closed', shut);
                const tr = el.querySelector<SVGGElement>('[data-train]')!, runs = lane.ring.length - k;
                // The train comes in from the left on its first tick and leaves on the right after its last one.
                tr.style.transform = `translateX(${here ? (at - (runs - 1) / 2) * w * U * .35 : -(w + 1) * U}px)`;
                tr.toggleAttribute('data-gone', !here);
            }
        }
        layer.querySelectorAll<SVGGElement>('[data-thing]').forEach(el => { if (!keep.has(el.dataset.thing!)) el.remove(); });
        const lt = root.querySelector('[data-light]');
        if (lt && lt.getAttribute('data-red') !== String(s.red > 0)) { lt.innerHTML = `<g class="traverse-inner">${light(s.red > 0)}</g>`; lt.setAttribute('data-red', String(s.red > 0)); }
    };
    const heroAt = (s: State): void => {
        const l = observed.layout; if (!l) return;
        const level = levelOf(s.level);
        put(root.querySelector('[data-hero]'), centerX(s.x), centerY(level, s.y, l));
        const f = root.querySelector('[data-follower]');
        if (f && s.friend && trail) put(f, centerX(trail.x) + (trail.x === s.x && trail.y === s.y ? -28 : 0), centerY(level, trail.y, l) + 10);
    };
    /** The arrows around the little one, and what shines when the help is on. */
    const marks = (): void => {
        const s = session.state, l = observed.layout, layer = root.querySelector('[data-arrows]'); if (!s || !l || !layer) return;
        const level = levelOf(s.level);
        layer.innerHTML = observed.busy || s.finished ? '' : arrowsSvg(moves.filter(a => landing(level, s, a)).map(a => ({ action: a, x: s.x + DELTA[a][0], y: s.y + DELTA[a][1] })), level, l);
        const h = !observed.busy && helpOn(s) ? hint(s) : null;
        zone()?.toggleAttribute('data-help', Boolean(h));
        root.querySelector(`[data-arrow="${h}"] .traverse-arrow`)?.classList.add('traverse-hint');
        root.querySelector('[data-light] .traverse-inner')?.classList.toggle('traverse-hint', h === 'feu');
        root.querySelector('#traverse-wait')?.classList.toggle('traverse-hint', h === 'attendre');
    };
    const effect = (x: number, y: number, inner: string): void => {
        const l = observed.layout, s = session.state; if (!l || !s) return;
        root.querySelector('[data-effects]')?.insertAdjacentHTML('beforeend', `<g transform="translate(${centerX(x)} ${centerY(levelOf(s.level), y, l)})">${inner}</g>`);
    };
    /** A funny try: the little one goes towards the cell, the car brakes or the water splashes, and back it comes. */
    const funny = async (s: State, fail: Fail, tx: number, ty: number): Promise<void> => {
        observed.fail = fail; say(t.fail[fail]);
        recordActivation(`traverse:try:${fail}`, 'action', false, fail);
        const hero = root.querySelector<SVGGElement>('[data-hero]'), inner = hero?.querySelector<SVGGElement>('.traverse-inner');
        if (inner && hero) {
            inner.style.setProperty('--dx', `${(tx - s.x) * U * .55}px`); inner.style.setProperty('--dy', `${(s.y - ty) * (observed.layout?.ch ?? U) * .55}px`);
            inner.classList.add(failAnimations[fail]); hero.classList.add('traverse-surpris');
            if (fail === 'plouf' || fail === 'nenuphar') hero.classList.add('traverse-mouille');
        }
        // The culprit brakes and shakes: the car, the truck, the tractor or the duck on that cell, or the water lily.
        root.querySelectorAll<SVGGElement>(`[data-thing][data-y="${ty}"]`).forEach(el => {
            const p = Number(el.dataset.pos), len = Number(el.dataset.len ?? 1);
            if (tx >= p - 1 && tx <= p + len) el.querySelector('.traverse-inner')?.classList.add(fail === 'nenuphar' ? 'traverse-plonge' : 'traverse-freine');
        });
        if (fail === 'train') root.querySelector(`[data-thing="${ty}:rail"] .traverse-lamps`)?.classList.add('traverse-sonne');
        if (fail === 'plouf' || fail === 'nenuphar') effect(tx, ty, splash());
        // The bubble stays inside the board, even over a cell at its edge.
        const word = failWords[locale][fail], half = bubbleWidth(word) / 2 + 14, w = width(levelOf(s.level)) * U;
        effect(tx, ty, `<g transform="translate(${Math.min(w - half, Math.max(half, centerX(tx))) - centerX(tx)} 0)">${bubble(word)}</g>`);
        await wait(FAIL_MS);
        if (gone()) return;
        inner?.classList.remove(failAnimations[fail]); hero?.classList.remove('traverse-surpris', 'traverse-mouille');
        root.querySelectorAll('.traverse-freine, .traverse-plonge, .traverse-sonne').forEach(el => el.classList.remove('traverse-freine', 'traverse-plonge', 'traverse-sonne'));
        const fx = root.querySelector('[data-effects]'); if (fx) fx.innerHTML = '';
        observed.fail = null;
    };
    const act = async (a: Action, how: string): Promise<void> => {
        const s = session.state;
        if (!s || s.finished || observed.busy) return;
        const r = step(s, a);
        if (!r) { recordActivation(`traverse:step:${how}`, 'action', false, 'none'); return; }
        observed.busy = true; marks();
        session.last = { fail: r.landing && !r.landing.ok ? r.landing.fail : null };
        if (r.landing && !r.landing.ok) {
            await funny(s, r.landing.fail, r.landing.x, r.landing.y);
            if (gone()) return;
            session.state = r.state; observed.busy = false;
            if (helpOn(r.state) && r.state.dry === 3) say(t.shine);
            marks(); return;
        }
        recordActivation(`traverse:step:${how}`, 'action', true, a);
        if (a === 'feu') { session.state = r.state; world(r.state); say(t.red); observed.busy = false; marks(); return; }
        if (a !== 'attendre') trail = { x: s.x, y: s.y };
        session.state = r.state;
        const inner = root.querySelector('[data-hero] .traverse-inner');
        inner?.classList.remove('traverse-saut'); void (inner as SVGGElement | null)?.getBoundingClientRect(); if (a !== 'attendre') inner?.classList.add('traverse-saut');
        world(r.state); heroAt(r.state);
        if (r.picked === 'gouter') { root.querySelectorAll('[data-snack]').forEach(el => { if (r.state.picked[Number((el as HTMLElement).dataset.snack)]) el.querySelector('.traverse-inner')?.classList.add('traverse-cueilli'); }); say(t.yum); }
        if (r.picked === 'ami') { say(t.found); root.querySelector('[data-follower]')?.classList.add('traverse-ami'); }
        await wait(STEP_MS);
        if (gone()) return;
        observed.busy = false;
        const level = levelOf(r.state.level), h = homeOf(level);
        if (r.state.finished) {
            session.records = complete(session.records, r.state); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        if (r.state.x === h.x && r.state.y === h.y) say(!r.state.friend && friendOf(level) ? t.missing.friend : t.missing.snack);
        marks();
    };
    const cellAt = (px: number, py: number): { x: number; y: number } | null => {
        const s = session.state, r = svgEl()?.getBoundingClientRect(), l = observed.layout;
        if (!s || !r || !l) return null;
        const level = levelOf(s.level), scale = r.width / (width(level) * U), ux = (px - r.x) / scale, uy = (py - r.y) / scale - l.pad;
        const x = Math.floor(ux / U), row = Math.floor(uy / l.ch), y = height(level) - 1 - row;
        return x < 0 || x >= width(level) || y < 0 || y >= height(level) ? null : { x, y };
    };
    /** The board, built once the stage has its size: it takes the whole height left between Lumi and the bottom. */
    const fill = (): void => {
        const s = session.state, z = zone(), stage = root.querySelector('.traverse-stage'); if (!s || !z || !stage) return;
        const box = stage.getBoundingClientRect(), level = levelOf(s.level), l = layout(level, box.width, box.height);
        observed.layout = l;
        z.style.width = `${width(level) * l.px}px`; z.style.height = `${box.height}px`;
        z.innerHTML = boardSvg(s, l, locale);
        const fr = root.querySelector('[data-follower]');
        if (fr && s.friend) fr.classList.add('traverse-ami');
        world(s); heroAt(s); marks();
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'traverse:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'traverse:listen');
        const again = root.querySelector<HTMLElement>('#traverse-again'), next = root.querySelector<HTMLElement>('#traverse-next'), eye = root.querySelector<HTMLElement>('#traverse-wait');
        if (again) bindAction(again, () => play(start(s.level), true), `traverse:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `traverse:next:${s.level}`);
        if (eye) bindAction(eye, () => void act('attendre', 'eye'), 'traverse:wait');
        fill();
        const z = zone()!;
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary || observed.busy || session.state!.finished) return;
            e.preventDefault(); down = { x: e.clientX, y: e.clientY, id: e.pointerId };
            try { z.setPointerCapture(e.pointerId); } catch { /* A finger already gone: the tap still counts. */ }
        });
        z.addEventListener('pointerup', e => {
            if (!e.isPrimary || !down) return;
            const from = down; down = null;
            const st = session.state!, l = observed.layout, r = svgEl()?.getBoundingClientRect(); if (!l || !r) return;
            const dx = e.clientX - from.x, dy = e.clientY - from.y, cell = r.width / width(levelOf(st.level));
            if (Math.max(Math.abs(dx), Math.abs(dy)) >= SLIDE * cell) { void act(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut'), 'slide'); return; }
            const at = cellAt(e.clientX, e.clientY); if (!at) return;
            const lt = lightOf(levelOf(st.level));
            if (lt && at.x === lt.x && at.y === lt.y) { void act('feu', 'light'); return; }
            const a = moves.find(m => st.x + DELTA[m][0] === at.x && st.y + DELTA[m][1] === at.y);
            if (a) void act(a, 'tap'); else if (at.x === st.x && at.y === st.y && levelOf(st.level).wait) void act('attendre', 'tap');
        });
        z.addEventListener('pointercancel', () => { down = null; });
        z.addEventListener('keydown', e => {
            const keys: Record<string, Action> = { ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite', ' ': 'attendre' };
            const a = keys[e.key];
            if (a) { e.preventDefault(); void act(a, 'key'); }
            else if (e.key === 'Enter' && lightOf(levelOf(session.state!.level))) { e.preventDefault(); void act('feu', 'key'); }
        });
    };
    const resize = (): void => { if (session.screen === 'play' && session.state && !observed.busy) fill(); };
    window.addEventListener('resize', resize);
    function play(s: State, fresh: boolean): void {
        observed = { busy: false, fail: null, layout: null };
        for (const id of timers) clearTimeout(id); timers.clear();
        session.screen = 'play'; session.state = s; trail = null;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { session.last = null; message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; window.removeEventListener('resize', resize); for (const id of timers) clearTimeout(id); timers.clear(); };
}
