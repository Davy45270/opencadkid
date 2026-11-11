import { cellXY, complete, DELTA, friendsAt, goalsLeft, height, helpOn, hint, isUnlocked, levelOf, moves, parseRecords, run, start, step, undo, width, type Fail, type Move, type Records, type Result, type State } from '../../engines/dedale';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bloom, bubble, bubbleWidth, effects, failAnimations, failWords, seed, thingAnimations, U } from './art';
import { arrowsSvg, boardSvg, cellSvg, cx, cy, gameView, goalsHtml, instruction, labels, layout, levelView, typeset, type Layout } from './view';

export const RECORDS_KEY = 'opencadkid.dedale.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the steps to go back through, the records, and
 * whether a slide makes Boubou go on by himself to the next crossing. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; history: State[]; run?: boolean }
/** Durations, in ms: one step, a funny try, the friends' dance, the flowers growing at the end. */
export const STEP_MS = 220, FAIL_MS = 1300, DANCE_MS = 900, BLOOM_MS = 1500;
/** How far a finger slides, in cells, before it is a step on that side. */
export const SLIDE = 0.3;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { busy: boolean; fail: Fail | null; layout: Layout | null } = { busy: false, fail: null, layout: null };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.dedale-zone svg')?.getBoundingClientRect(), s = session.state, l = observed.layout;
    let geom = null;
    if (r && s && l) { const scale = r.width / l.W, level = levelOf(s.level); geom = { x0: r.x + l.ox * scale, y0: r.y + l.oy * scale, cell: U * scale, w: width(level), h: height(level) }; }
    const { history, ...rest } = session;
    return { ...rest, run: Boolean(session.run), back: history.length, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, geom, hint: s && helpOn(s) ? hint(s) : null, busy: observed.busy, fail: observed.fail };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', down: { x: number; y: number } | null = null;
    observed = { busy: false, fail: null, layout: null };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 40) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null; session.history = [];
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'dedale:home');
        root.querySelectorAll<HTMLElement>('[data-dedale-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.dedaleLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `dedale:level:${el.dataset.dedaleLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#dedale-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.dedale-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.dedale-zone svg');
    const w = (): number => width(levelOf(session.state!.level));
    const put = (el: Element | null, cell: number): void => { const l = observed.layout; if (el && l) (el as SVGGElement).style.transform = `translate(${cx(l, cell % w())}px,${cy(l, Math.floor(cell / w()))}px)`; };
    /** The cells, and the row of goals. */
    const cells = (s: State): void => {
        const layer = root.querySelector('[data-cells]'), l = observed.layout; if (!layer || !l) return;
        const level = levelOf(s.level), wd = width(level), html: string[] = [];
        for (let i = 0; i < s.grid.length; i++) {
            const c = s.grid[i]!, x = i % wd, y = Math.floor(i / wd);
            const tag = c === '#' ? ` data-hedge="${x},${y}"` : c === 'o' ? ` data-puddle="${x},${y}"` : c === '~' || c === '-' || c === '|' ? ` data-water="${x},${y}"` : c === 'D' ? ` data-gate="${x},${y}"` : c === '*' ? ` data-seed="${x},${y}"` : c === 'S' ? ` data-sun="${x},${y}"` : c === 'k' ? ' data-key' : c === 'f' ? ' data-leaves' : c === '=' ? ' data-tunnel' : '';
            html.push(`<g transform="translate(${cx(l, x)} ${cy(l, y)})"${tag}>${cellSvg(level, c, x, y)}</g>`);
        }
        layer.innerHTML = html.join('');
        const goals = root.querySelector('.dedale-goals');
        if (goals) goals.outerHTML = goalsHtml(level, goalsLeft(s.grid), s.bonus, locale);
    };
    const friendEls = (): SVGGElement[] => [...root.querySelectorAll<SVGGElement>('[data-friend]')];
    /** The friends where the clock of the state has them; dancing while the dance lasts. */
    const friends = (s: State, jump = false): void => {
        const level = levelOf(s.level), at = friendsAt(level, s.t);
        friendEls().forEach((el, i) => { if (jump) el.classList.add('dedale-saute'); put(el, at[i]!); el.dataset.cell = String(at[i]); el.querySelector('.dedale-inner')?.classList.toggle('dedale-danse', s.dance > 0); });
        if (jump) { const id = window.setTimeout(() => { timers.delete(id); friendEls().forEach(el => el.classList.remove('dedale-saute')); }, 30); timers.add(id); }
    };
    const boubouEl = (): SVGGElement | null => root.querySelector<SVGGElement>('[data-boubou]');
    /** The arrows around Boubou, and the one that pulses when the help is on. */
    const marks = (): void => {
        const s = session.state, l = observed.layout, layer = root.querySelector('[data-arrows]'); if (!s || !l || !layer) return;
        const busy = observed.busy || s.finished, h0 = cellXY(levelOf(s.level), s.boubou);
        layer.innerHTML = busy ? '' : arrowsSvg(moves.flatMap(m => { const r = step({ ...s, dry: 0, idle: 0 }, m); const x = h0.x + DELTA[m][0], y = h0.y + DELTA[m][1]; return r && !r.fail && x >= 0 && y >= 0 && x < w() && y < height(levelOf(s.level)) ? [{ action: m, x, y }] : []; }), l);
        const h = !busy && helpOn(s) ? hint(s) : null;
        zone()?.toggleAttribute('data-help', Boolean(h));
        if (h) {
            const shown = root.querySelector(`[data-arrow="${h}"] .dedale-arrow`);
            if (shown) shown.classList.add('dedale-hint');
            // The way out through a tunnel has no cell next to Boubou: its arrow is drawn on his own cell.
            else { const [dx, dy] = DELTA[h]; layer.insertAdjacentHTML('beforeend', arrowsSvg([{ action: h, x: h0.x, y: h0.y }], l).replace('class="dedale-arrow"', 'class="dedale-arrow dedale-hint"').replace('<g data-arrow', `<g data-tunnel-arrow data-dx="${dx}" data-dy="${dy}" data-arrow`)); }
        }
        const back = root.querySelector<HTMLButtonElement>('#dedale-retour');
        if (back) back.disabled = busy || !session.history.length;
    };
    const effect = (cell: number, inner: string): void => {
        const l = observed.layout; if (!l) return;
        root.querySelector('[data-effects]')?.insertAdjacentHTML('beforeend', `<g transform="translate(${cx(l, cell % w())} ${cy(l, Math.floor(cell / w()))})">${inner}</g>`);
    };
    /** The bubble with the sound word, kept inside the garden. */
    const wordBubble = (kind: Fail, at: number, up: boolean): void => {
        const l = observed.layout; if (!l) return;
        // Below Boubou when the try goes up (the bubble would hide what he bumped into) and when there is no room above.
        const y = cy(l, Math.floor(at / w())), room = y + 150 < l.H;
        const word = failWords[locale][kind], half = bubbleWidth(word) / 2 + 14, x = cx(l, at % w()), below = room && (up || y - 100 < 0);
        effect(at, `<g transform="translate(${Math.min(l.W - half, Math.max(half, x)) - x} ${below ? 150 : -10})">${bubble(word)}</g>`);
    };
    const clearEffects = (): void => { const layer = root.querySelector('[data-effects]'); if (layer) layer.innerHTML = ''; };
    /** The thing on the cell of a funny try: the hedge, the puddle, the water, the gate or the friend there. */
    const thing = (kind: Fail, x: number, y: number): Element | null => {
        if (kind === 'papillon' || kind === 'herisson' || kind === 'coccinelle') return friendEls().find(el => el.dataset.kind === kind && Number(el.dataset.cell) === y * w() + x)?.querySelector('.dedale-inner') ?? null;
        return kind === 'haie' ? root.querySelector(`[data-hedge="${x},${y}"] .dedale-haie`)
            : kind === 'flaque' ? root.querySelector(`[data-puddle="${x},${y}"] .dedale-flaque`)
                : kind === 'ruisseau' ? root.querySelector(`[data-water="${x},${y}"]`)
                    : root.querySelector(`[data-gate="${x},${y}"] .dedale-porte`);
    };
    /** A funny try: Boubou leans towards the cell, plays his reaction, the thing there plays its own, and nothing moves. */
    const funny = async (s: State, fail: { kind: Fail; x: number; y: number }): Promise<void> => {
        observed.fail = fail.kind; say(t.fail[fail.kind]);
        recordActivation(`dedale:try:${fail.kind}`, 'action', false, fail.kind);
        const level = levelOf(s.level), h = cellXY(level, s.boubou), el = boubouEl(), inner = el?.querySelector<SVGGElement>('.dedale-inner');
        const dx = Math.sign(fail.x - h.x), dy = Math.sign(fail.y - h.y);
        if (inner && el) {
            inner.style.setProperty('--dx', `${dx * U * .3}px`); inner.style.setProperty('--dy', `${dy * U * .3}px`);
            inner.classList.add(failAnimations[fail.kind]); el.classList.add('dedale-visage-surprise');
        }
        const anim = thingAnimations[fail.kind], target = thing(fail.kind, fail.x, fail.y);
        target?.classList.add(anim);
        const inside = fail.x >= 0 && fail.y >= 0 && fail.x < width(level) && fail.y < height(level), cell = inside ? fail.y * width(level) + fail.x : s.boubou;
        effect(cell, effects[fail.kind]);
        wordBubble(fail.kind, s.boubou, dy < 0);
        await wait(FAIL_MS);
        if (gone()) return;
        inner?.classList.remove(failAnimations[fail.kind]); el?.classList.remove('dedale-visage-surprise');
        target?.classList.remove(anim);
        clearEffects(); observed.fail = null;
    };
    /** The end: flowers grow all at once on every path, and Boubou jumps for joy. */
    const blossom = async (s: State): Promise<void> => {
        const layer = root.querySelector('[data-blooms]'), l = observed.layout; if (!layer || !l) return;
        const wd = width(levelOf(s.level));
        layer.innerHTML = s.grid.split('').map((c, i) => c === '~' || c === '-' || c === '|' || i === s.boubou ? '' : `<g transform="translate(${cx(l, i % wd)} ${cy(l, Math.floor(i / wd))})"><g class="dedale-pousse" style="animation-delay:${reduce ? 0 : (i % 7) * 60}ms">${bloom(i)}</g></g>`).join('');
        boubouEl()?.querySelector('.dedale-inner')?.classList.add('dedale-joie');
        const goals = root.querySelector('.dedale-goals');
        if (goals) goals.outerHTML = goalsHtml(levelOf(s.level), goalsLeft(s.grid), s.bonus, locale);
        await wait(BLOOM_MS);
    };
    /** One step of Boubou, drawn; returns the result, or null when nothing happened. */
    const once = async (a: Move, how: string): Promise<Result | null> => {
        const s = session.state;
        if (!s || s.finished) return null;
        const r = step(s, a);
        if (!r) return null;
        if (r.fail) {
            await funny(s, r.fail);
            if (gone()) return null;
            session.state = r.state;
            if (helpOn(r.state) && !helpOn(s)) say(t.shine);
            return r;
        }
        recordActivation(`dedale:step:${how}`, 'action', true, a);
        session.history.push(s); session.state = r.state;
        const el = boubouEl();
        if (r.tunnel) { el?.classList.add('dedale-saute'); const id = window.setTimeout(() => { timers.delete(id); el?.classList.remove('dedale-saute'); }, 30); timers.add(id); }
        if (el) el.style.transitionDuration = r.slid ? `${0.2 * r.path.length}s` : '';
        put(el, r.state.boubou);
        friends(r.state);
        const kinds = r.got.map(g => g.kind), opened = r.opened;
        const news = r.state.finished ? '' : kinds.includes('soleil') ? t.sun : opened ? t.key : kinds.includes('graine') ? t.seed : r.tunnel ? t.tunnel : r.slid ? t.slide : '';
        if (news) say(news, kinds.includes('soleil') || opened);
        else if (([t.seed, t.sun, t.bonus, t.key, t.tunnel, t.slide, t.undo] as string[]).includes(message) || Object.values(t.fail).includes(message)) say(t.goal, false);
        for (const g of r.got) effect(g.cell, '<g class="dedale-eclat"><circle r="40" fill="none" stroke="#fff3a0" stroke-width="8"/></g>');
        await wait(r.slid ? 200 * r.path.length : STEP_MS);
        if (gone()) return null;
        if (el) el.style.transitionDuration = '';
        clearEffects();
        if (r.state.finished) return r;
        cells(r.state);
        if (r.danced) {
            friendEls().forEach(f => effect(Number(f.dataset.cell), `<g class="dedale-cadeau">${seed()}</g>`));
            await wait(DANCE_MS);
            if (gone()) return null;
            clearEffects(); say(t.bonus, false);
        }
        return r;
    };
    const act = async (a: Move, how: string): Promise<void> => {
        const s = session.state;
        if (!s || s.finished || observed.busy) return;
        observed.busy = true; marks();
        // A slide with « by himself » on: Boubou goes on along the alley to the next crossing.
        const plan = how === 'slide' && session.run ? run(s, a) : [a];
        let last: Result | null = null;
        for (const m of plan) {
            last = await once(m, how);
            if (gone()) return;
            if (!last || last.fail || last.state.finished || last.got.length) break;
        }
        const now = session.state!;
        if (now.finished && last && !last.fail) {
            await blossom(now);
            if (gone()) return;
            observed.busy = false;
            session.records = complete(session.records, now); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        if (last?.fail) clearEffects();
        observed.busy = false;
        marks();
    };
    const back = (): void => {
        const s = session.state, before = session.history.pop();
        if (!s || !before || observed.busy || s.finished) return;
        recordActivation('dedale:back', 'action', true, 'back');
        session.state = undo(before, s);
        const el = boubouEl(); el?.classList.add('dedale-saute'); put(el, session.state.boubou);
        cells(session.state); friends(session.state, true); say(t.undo, false); marks();
        const id = window.setTimeout(() => { timers.delete(id); el?.classList.remove('dedale-saute'); }, 30); timers.add(id);
    };
    const toggleRun = (): void => {
        session.run = !session.run;
        recordActivation('dedale:run', 'action', true, session.run ? 'on' : 'off');
        root.querySelector('#dedale-seul')?.setAttribute('aria-pressed', String(session.run));
    };
    const cellUnder = (px: number, py: number): { x: number; y: number } | null => {
        const s = session.state, r = svgEl()?.getBoundingClientRect(), l = observed.layout;
        if (!s || !r || !l) return null;
        const scale = r.width / l.W;
        return { x: Math.floor(((px - r.x) / scale - l.ox) / U), y: Math.floor(((py - r.y) / scale - l.oy) / U) };
    };
    /** A touch on a cell next to Boubou (or on his own cell when a tunnel arrow shows there): he goes there. */
    const touch = (at: { x: number; y: number }): void => {
        const s = session.state!, h = cellXY(levelOf(s.level), s.boubou);
        const m = moves.find(k => h.x + DELTA[k][0] === at.x && h.y + DELTA[k][1] === at.y);
        if (m) { void act(m, 'tap'); return; }
        const arrowHere = root.querySelector<SVGGElement>('[data-tunnel-arrow]');
        if (arrowHere && at.x === h.x && at.y === h.y) void act(arrowHere.dataset.arrow as Move, 'tap');
    };
    /** The board, built once the stage has its size: it takes the whole height left between the goals and the buttons. */
    const fill = (): void => {
        const s = session.state, z = zone(), stage = root.querySelector('.dedale-stage'); if (!s || !z || !stage) return;
        const box = stage.getBoundingClientRect(), level = levelOf(s.level), l = layout(level, box.width, box.height);
        observed.layout = l;
        z.style.width = `${box.width}px`; z.style.height = `${box.height}px`;
        z.innerHTML = boardSvg(level, l, locale);
        cells(s); friends(s, true);
        const el = boubouEl(); el?.classList.add('dedale-saute'); put(el, s.boubou);
        const id = window.setTimeout(() => { timers.delete(id); el?.classList.remove('dedale-saute'); }, 30); timers.add(id);
        marks();
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce, goalsLeft(s.grid), Boolean(session.run));
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'dedale:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'dedale:listen');
        const again = root.querySelector<HTMLElement>('#dedale-again'), next = root.querySelector<HTMLElement>('#dedale-next');
        if (again) bindAction(again, () => play(start(s.level), true), `dedale:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `dedale:next:${s.level}`);
        bindAction(root.querySelector<HTMLElement>('#dedale-retour')!, back, 'dedale:back-button');
        bindAction(root.querySelector<HTMLElement>('#dedale-seul')!, toggleRun, 'dedale:run-button');
        fill();
        if (s.finished) void blossom(s);
        const z = zone()!;
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary || observed.busy || session.state!.finished) return;
            e.preventDefault(); down = { x: e.clientX, y: e.clientY };
            try { z.setPointerCapture(e.pointerId); } catch { /* A finger already gone: the tap still counts. */ }
        });
        z.addEventListener('pointerup', e => {
            if (!e.isPrimary || !down) return;
            const from = down; down = null;
            const l = observed.layout, r = svgEl()?.getBoundingClientRect(); if (!l || !r) return;
            const dx = e.clientX - from.x, dy = e.clientY - from.y, cell = r.width / l.W * U;
            if (Math.max(Math.abs(dx), Math.abs(dy)) >= SLIDE * cell) { void act(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut'), 'slide'); return; }
            const at = cellUnder(e.clientX, e.clientY); if (at) touch(at);
        });
        z.addEventListener('pointercancel', () => { down = null; });
        z.addEventListener('keydown', e => {
            const keys: Record<string, Move> = { ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite' };
            const m = keys[e.key];
            if (m) { e.preventDefault(); void act(m, 'key'); }
            else if (e.key === 'Backspace') { e.preventDefault(); back(); }
        });
    };
    const resize = (): void => { if (session.screen === 'play' && session.state && !observed.busy) fill(); };
    window.addEventListener('resize', resize);
    function play(s: State, fresh: boolean): void {
        observed = { busy: false, fail: null, layout: null };
        for (const id of timers) clearTimeout(id); timers.clear();
        session.screen = 'play'; session.state = s;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { session.history = []; message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; window.removeEventListener('resize', resize); for (const id of timers) clearTimeout(id); timers.clear(); };
}
