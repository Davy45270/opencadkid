import { birdAt, complete, dropsAt, FALL, helpOn, hint, isUnlocked, levelOf, offsetAt, parseRecords, start, throwHeart, type Funny, type Records, type Result, type State } from '../../engines/orbite';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bird, bubble, bubbleWidth, cloud, drop, effects, failAnimations, failWords, heart, thingAnimations, U, umbrella } from './art';
import { boardSvg, cx, gameView, goalsHtml, instruction, labels, layout, levelView, ry, troopSvg, typeset, type Layout } from './view';

export const RECORDS_KEY = 'opencadkid.orbite.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the records, and the tick of the sky. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; now?: number }
/** One tick of the sky, in ms: a swinging troop takes 8 ticks (1.2 s) per column, the bird as long. */
export const TICK_MS = 150;
/** Lumi trots one column, the heart climbs one column's height (it is slow and easy to follow). */
export const TROT_MS = 180, HEART_MS = 170;
/** A funny try, clouds that smile and fly away, the sun coming out. */
export const FAIL_MS = 1400, SMILE_MS = 1000, SUN_MS = 1500;
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { busy: boolean; fail: Funny | null; layout: Layout | null; now: number; col: number } = { busy: false, fail: null, layout: null, now: 0, col: 0 };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.orbite-zone svg')?.getBoundingClientRect(), s = session.state, l = observed.layout;
    let geom = null;
    if (r && s && l) {
        const k = r.width / l.W, lv = levelOf(s.level);
        geom = { x0: r.x + l.ox * k, cell: U * k, cols: lv.cols, top: r.y + l.top * k, row: U * k, birdY: r.y + l.birdY * k, lumiY: r.y + l.lumiY * k, bottom: r.y + r.height };
    }
    const lv = s ? levelOf(s.level) : null;
    return { ...session, now: observed.now, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, geom, busy: observed.busy, fail: observed.fail,
        hint: s && helpOn(s) ? hint(s, observed.now) : null, offset: s && lv ? offsetAt(lv, s.steps, observed.now) : null, bird: lv ? birdAt(lv, observed.now) : null, drops: s && lv ? dropsAt(lv, s, observed.now) : [] };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', down = false;
    observed = { busy: false, fail: null, layout: null, now: 0, col: 0 };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 40) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'orbite:home');
        root.querySelectorAll<HTMLElement>('[data-orbite-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.orbiteLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `orbite:level:${el.dataset.orbiteLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#orbite-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.orbite-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.orbite-zone svg');
    const level = () => levelOf(session.state!.level);
    const layer = (name: string): SVGGElement | null => root.querySelector<SVGGElement>(`[data-${name}]`);
    const effect = (x: number, y: number, inner: string): void => { layer('effects')?.insertAdjacentHTML('beforeend', `<g transform="translate(${x} ${y})">${inner}</g>`); };
    const clearEffects = (): void => { const e = layer('effects'); if (e) e.innerHTML = ''; };
    const place = (el: SVGGElement | null, x: number, y: number, ms = 0): void => { if (!el) return; el.style.transitionDuration = `${reduce ? 0 : ms}ms`; el.style.transform = `translate(${x}px,${y}px)`; };
    /** The troop at the sky's tick: it glides from step to step in quarters. */
    const troopAt = (s: State, ms: number): void => {
        const l = observed.layout, g = layer('troop'); if (!l || !g) return;
        place(g, l.ox + offsetAt(level(), s.steps, observed.now) * U, 0, ms);
    };
    const drawTroop = (s: State): void => { const g = layer('troop')?.querySelector('.orbite-troupe'), l = observed.layout; if (g && l) g.innerHTML = troopSvg(l, s.troop); };
    /** The bird, the drops and the shining column at the sky's tick. */
    const sky = (s: State, ms = TICK_MS): void => {
        const l = observed.layout; if (!l) return;
        const lv = level();
        troopAt(s, lv.move === 'balance' ? ms : 600);
        const b = layer('bird'), bx = birdAt(lv, observed.now);
        if (b) {
            if (bx === null) b.innerHTML = '';
            else {
                if (!b.firstElementChild) b.innerHTML = `<g class="orbite-oiseau"><g transform="scale(${lv.bird!.dir} 1)">${bird()}</g></g>`;
                const prev = Number(b.dataset.x ?? bx);
                place(b, cx(l, bx), l.birdY, Math.abs(prev - bx) > 1.5 ? 0 : ms);
                b.dataset.x = String(bx);
            }
        }
        const d = layer('drops');
        if (d) {
            const drops = dropsAt(lv, s, observed.now), keep = new Set<string>();
            for (const p of drops) {
                const key = `${p.r},${p.j}`; keep.add(key);
                let el = d.querySelector<SVGGElement>(`[data-drop="${key}"]`);
                const y0 = ry(l, p.r) + .55 * U, y1 = l.lumiY - .5 * U, y = y0 + (y1 - y0) * p.fall / FALL;
                if (!el) { d.insertAdjacentHTML('beforeend', `<g data-drop="${key}"><g class="orbite-goutte">${drop(1.4)}</g></g>`); el = d.querySelector<SVGGElement>(`[data-drop="${key}"]`); place(el, cx(l, p.x), y, 0); }
                else place(el, cx(l, p.x), y, ms);
            }
            d.querySelectorAll<SVGGElement>('[data-drop]').forEach(el => { if (!keep.has(el.dataset.drop!)) el.remove(); });
        }
        marks(s);
    };
    /** The help: the good column shines in gold, from the clouds down to Lumi. */
    const marks = (s: State): void => {
        const l = observed.layout, m = layer('hint'); if (!l || !m) return;
        const c = !observed.busy && helpOn(s) ? hint(s, observed.now) : null;
        zone()?.toggleAttribute('data-help', c !== null);
        m.innerHTML = c === null ? '' : `<g data-hint-col="${c}"><g class="orbite-hint"><rect x="${cx(l, c) - .46 * U}" y="${l.top - .3 * U}" width="${.92 * U}" height="${l.lumiY - l.top + .3 * U}" rx="40" fill="#fff3a066" stroke="#f5b400" stroke-width="8" stroke-dasharray="4 14" stroke-linecap="round"/></g></g>`;
    };
    const lumiEl = (): SVGGElement | null => layer('lumi');
    const heartEl = (): SVGGElement | null => layer('heart');
    const wordBubble = (word: string, x: number, y: number): void => {
        const l = observed.layout; if (!l) return;
        const half = bubbleWidth(word) / 2 + 14, below = y - 100 < 0;
        effect(Math.min(l.W - half, Math.max(half, x)), y + (below ? 150 : 0), bubble(word));
    };
    const cloudEls = (r: { r: number; j: number }[]): Element[] => r.flatMap(c => [...root.querySelectorAll(`[data-cloud="${c.r},${c.j}"] .orbite-nuage`)]);
    /** The thing a funny try is about. */
    const things = (kind: Funny, res: Result): Element[] => {
        const all = (sel: string): Element[] => [...root.querySelectorAll(sel)];
        switch (kind) {
            case 'rougit': case 'bisou': return res.hit ? cloudEls([res.hit]) : [];
            case 'lune': return all('[data-moon] .orbite-lune');
            case 'entre': return all('[data-cloud]').filter(el => { const [, j] = (el as HTMLElement).dataset.cloud!.split(',').map(Number); return Math.abs(res.offset + j! - res.x) < 1.2; }).map(el => el.querySelector('.orbite-nuage')!);
            case 'oiseau': return all('[data-bird] .orbite-oiseau');
            case 'bord': return all('[data-frame]');
            default: return all('[data-lumi] .orbite-lumi');
        }
    };
    /** A funny try: the heart (or Lumi) plays its reaction, the thing plays its own, a bubble says the sound word. */
    const funny = async (kind: Funny, res: Result, x: number, y: number): Promise<void> => {
        observed.fail = kind; say(t.fail[kind]);
        recordActivation(`orbite:try:${kind}`, 'action', false, kind);
        const mover = kind === 'pluie' ? lumiEl()?.querySelector('.orbite-lumi') : heartEl()?.querySelector('.orbite-coeur');
        mover?.classList.add(failAnimations[kind]);
        const l = observed.layout!;
        if (kind === 'pluie') {
            const u = root.querySelector('.orbite-ombrelle'); if (u) u.innerHTML = umbrella();
            // The drop in the air over Lumi comes down on her umbrella.
            for (const d of dropsAt(level(), session.state!, res.throw.at)) if (d.x === res.throw.col) place(root.querySelector<SVGGElement>(`[data-drop="${d.r},${d.j}"]`), x, l.lumiY - 1.25 * U, 350);
        }
        // The Moon comes over the heart to bounce it back.
        const moonEl = kind === 'lune' ? layer('moon') : null;
        if (moonEl) { moonEl.style.transition = reduce ? '' : 'transform .3s ease-out'; moonEl.style.transform = `translate(${x}px,${.45 * U}px) scale(.85)`; }
        if (kind === 'rougit' && res.hit) { const el = root.querySelector(`[data-cloud="${res.hit.r},${res.hit.j}"] .orbite-nuage`); if (el) el.innerHTML = cloud('r'); }
        const anim = thingAnimations[kind], targets = things(kind, res);
        targets.forEach(el => el.classList.add(anim));
        effect(x, y, effects[kind]);
        wordBubble(failWords[locale][kind], x, y - .3 * U);
        await wait(FAIL_MS);
        if (gone()) return;
        mover?.classList.remove(failAnimations[kind]);
        targets.forEach(el => el.classList.remove(anim));
        const u = root.querySelector('.orbite-ombrelle'); if (u) u.innerHTML = '';
        if (moonEl) moonEl.style.transform = '';
        clearEffects(); observed.fail = null;
    };
    const throwAt = async (col: number, how: string): Promise<void> => {
        const s = session.state, l = observed.layout;
        if (!s || !l || s.finished || observed.busy) return;
        const res = throwHeart(s, { col, at: observed.now });
        if (!res) return;
        observed.busy = true; observed.col = col; marks(s);
        recordActivation(`orbite:throw:${how}`, 'action', true, String(col));
        const lv = level(), lumi = lumiEl(), h = heartEl();
        // Lumi trots to the column; the sky holds its breath.
        const trot = Math.max(150, Math.abs(col - s.lumi) * TROT_MS);
        place(lumi, cx(l, col), l.lumiY, trot);
        await wait(trot + 30); if (gone()) return;
        if (res.fail === 'pluie') {
            await funny('pluie', res, cx(l, col), l.lumiY - .9 * U); if (gone()) return;
        } else {
            // The heart goes up, on a slant through the wind, then straight.
            const inner = h?.querySelector('.orbite-coeur'); if (inner) inner.innerHTML = heart();
            let hx = cx(l, col), hy = l.lumiY - .85 * U;
            place(h, hx, hy, 0);
            await wait(30); if (gone()) return;
            const leg = async (x: number, y: number): Promise<void> => { const ms = Math.max(120, Math.hypot(x - hx, y - hy) / U * HEART_MS); place(h, x, y, ms); hx = x; hy = y; await wait(ms + 20); };
            if (lv.wind) { await leg(res.fail === 'bord' ? (lv.wind > 0 ? l.W - .35 * U : .35 * U) : cx(l, res.x), l.windY - .35 * U); if (gone()) return; }
            if (res.fail === 'bord') { await funny('bord', res, hx, hy); if (gone()) return; }
            else {
                const ty = res.fail === 'oiseau' ? l.birdY + .2 * U : res.hit ? ry(l, res.hit.r) + .25 * U : .5 * U;
                await leg(hx, ty); if (gone()) return;
                if (res.fail) await funny(res.fail, res, hx, ty);
                else if (res.blushed) await funny('rougit', res, hx, ty);
                else {
                    // The clouds that smile turn rainbow and fly away.
                    res.smiled.forEach((c, i) => { const el = root.querySelector(`[data-cloud="${c.r},${c.j}"] .orbite-nuage`); if (el) { el.innerHTML = cloud('smile'); el.classList.add('orbite-envol'); (el as SVGGElement).style.animationDelay = `${reduce ? 0 : i * 120}ms`; } });
                    if (inner) inner.innerHTML = '';
                    say(res.smiled.length > 1 ? t.smiles : t.smile, false);
                    await wait(SMILE_MS);
                }
                if (gone()) return;
            }
            if (inner) inner.innerHTML = '';
        }
        session.state = res.state; session.now = observed.now;
        drawTroop(res.state);
        const goals = root.querySelector('.orbite-goals'); if (goals) goals.outerHTML = goalsHtml(lv, res.state, locale);
        if (res.state.finished) {
            root.querySelector('[data-sun] .orbite-soleil')?.classList.add('orbite-soleil-sort');
            await wait(SUN_MS); if (gone()) return;
            observed.busy = false;
            session.records = complete(session.records, res.state); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        if (helpOn(res.state) && !helpOn(s)) say(t.shine);
        else if (!res.fail && !res.blushed) say(sentence([t.goal]), false);
        observed.busy = false;
        sky(res.state);
    };
    const columnUnder = (px: number): number | null => {
        const r = svgEl()?.getBoundingClientRect(), l = observed.layout, s = session.state;
        if (!r || !l || !s) return null;
        return Math.max(0, Math.min(levelOf(s.level).cols - 1, Math.floor(((px - r.x) / (r.width / l.W) - l.ox) / U)));
    };
    /** The sky, built once the stage has its size: it takes the whole height left under the goals. */
    const fill = (): void => {
        const s = session.state, z = zone(), stage = root.querySelector('.orbite-stage'); if (!s || !z || !stage) return;
        const box = stage.getBoundingClientRect(), lv = level(), l = layout(lv, box.width, box.height);
        observed.layout = l;
        z.style.width = `${box.width}px`; z.style.height = `${box.height}px`;
        z.innerHTML = boardSvg(lv, l, locale, reduce);
        drawTroop(s);
        if (s.finished) root.querySelector('[data-sun] .orbite-soleil')?.classList.add('orbite-soleil-haut');
        observed.col = s.lumi;
        place(lumiEl(), cx(l, s.lumi), l.lumiY, 0);
        sky(s, 0);
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'orbite:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'orbite:listen');
        const again = root.querySelector<HTMLElement>('#orbite-again'), next = root.querySelector<HTMLElement>('#orbite-next');
        if (again) bindAction(again, () => play(start(s.level), true), `orbite:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `orbite:next:${s.level}`);
        fill();
        const z = zone()!;
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary || observed.busy || session.state!.finished) return;
            e.preventDefault(); down = true;
            try { z.setPointerCapture(e.pointerId); } catch { /* A finger already gone: the touch still counts. */ }
        });
        z.addEventListener('pointerup', e => {
            if (!e.isPrimary || !down) return;
            down = false;
            const c = columnUnder(e.clientX); if (c !== null) void throwAt(c, 'tap');
        });
        z.addEventListener('pointercancel', () => { down = false; });
        z.addEventListener('keydown', e => {
            const s = session.state!, l = observed.layout;
            if (observed.busy || s.finished || !l) return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                observed.col = Math.max(0, Math.min(level().cols - 1, observed.col + (e.key === 'ArrowLeft' ? -1 : 1)));
                place(lumiEl(), cx(l, observed.col), l.lumiY, TROT_MS);
            } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); void throwAt(observed.col, 'key'); }
        });
    };
    const resize = (): void => { if (session.screen === 'play' && session.state && !observed.busy) fill(); };
    window.addEventListener('resize', resize);
    // The sky's clock: it goes on while Lumi waits, and holds still from a touch until the heart has landed.
    const clock = window.setInterval(() => {
        const s = session.state;
        if (disposed || session.screen !== 'play' || !s || s.finished || observed.busy || !observed.layout) return;
        observed.now++; session.now = observed.now;
        sky(s);
    }, TICK_MS);
    function play(s: State, fresh: boolean): void {
        for (const id of timers) clearTimeout(id); timers.clear();
        observed = { busy: false, fail: null, layout: null, now: fresh ? s.t : Math.max(s.t, session.now ?? s.t), col: s.lumi };
        session.screen = 'play'; session.state = s; session.now = observed.now;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; window.clearInterval(clock); window.removeEventListener('resize', resize); for (const id of timers) clearTimeout(id); timers.clear(); };
}
