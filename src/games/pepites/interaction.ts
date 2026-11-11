import { cellXY, complete, DELTA, doorOf, height, helpOn, hint, isUnlocked, levelOf, moves, nuggetsLeft, parseRecords, start, step, undo, width, type Fail, type Move, type Moved, type Records, type Result, type State } from '../../engines/pepites';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bubble, bubbleWidth, effects, failAnimations, failWords, thingAnimations, U } from './art';
import { arrowsSvg, boardSvg, cellSvg, cx, cy, gameView, goalsHtml, instruction, labels, layout, levelView, objectSvg, typeset, type Layout } from './view';

export const RECORDS_KEY = 'opencadkid.pepites.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the steps to go back through, and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; history: State[] }
/** Durations, in ms: one step, a funny try, a bonk on the hat, Lumi going home. */
export const STEP_MS = 220, FAIL_MS = 1300, BONK_MS = 1000, HOME_MS = 1500;
/** How far a finger slides, in cells, before it is a step on that side. */
export const SLIDE = 0.3;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { busy: boolean; fail: Fail | null; layout: Layout | null } = { busy: false, fail: null, layout: null };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.pepites-zone svg')?.getBoundingClientRect(), s = session.state, l = observed.layout;
    let geom = null;
    if (r && s && l) { const scale = r.width / l.W, level = levelOf(s.level); geom = { x0: r.x + l.ox * scale, y0: r.y + l.oy * scale, cell: U * scale, w: width(level), h: height(level) }; }
    const { history, ...rest } = session;
    return { ...rest, back: history.length, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, geom, hint: s && helpOn(s) ? hint(s) : null, busy: observed.busy, fail: observed.fail };
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
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'pepites:home');
        root.querySelectorAll<HTMLElement>('[data-pepites-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.pepitesLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `pepites:level:${el.dataset.pepitesLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#pepites-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.pepites-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.pepites-zone svg');
    const w = (): number => width(levelOf(session.state!.level));
    const put = (el: Element | null, cell: number): void => { const l = observed.layout; if (el && l) (el as SVGGElement).style.transform = `translate(${cx(l, cell % w())}px,${cy(l, Math.floor(cell / w()))}px)`; };
    /** The cells under everything that moves, the door that glows once every nugget is picked up, and the row of goals. */
    const cells = (s: State): void => {
        const layer = root.querySelector('[data-cells]'), l = observed.layout; if (!layer || !l) return;
        const level = levelOf(s.level), width0 = width(level), html: string[] = [];
        for (let i = 0; i < s.grid.length; i++) {
            const c = s.grid[i]!, x = i % width0, y = Math.floor(i / width0), shown = 'oa~'.includes(c) ? '_' : c;
            const tag = c === 'X' ? ` data-hard="${x},${y}"` : c === 'v' ? ` data-worm="${x},${y}"` : c === 'P' ? ' data-door' : c === '*' ? ` data-nugget="${x},${y}"` : c === 'G' || c === 'g' ? ` data-giant="${c}"` : c === '.' ? ' data-earth' : '';
            html.push(`<g transform="translate(${cx(l, x)} ${cy(l, y)})"${tag}>${cellSvg(shown, x, y)}</g>`);
        }
        layer.innerHTML = html.join('');
        root.querySelector('[data-door]')?.toggleAttribute('data-ready', nuggetsLeft(s.grid) === 0);
        const goals = root.querySelector('.pepites-goals');
        if (goals) goals.outerHTML = goalsHtml(level, nuggetsLeft(s.grid), s.basket, locale);
    };
    /** Rocks, apples and water: one group each, which slide from cell to cell. `moved` slides them; anything left over is
     * put back where the state has it (a jump), and what is gone fades away. */
    const things = (s: State, moved: readonly Moved[] = []): void => {
        const layer = root.querySelector('[data-objects]'); if (!layer) return;
        const els = [...layer.querySelectorAll<SVGGElement>('[data-thing]')], used = new Set<SVGGElement>();
        for (const m of moved) {
            const el = els.find(e => !used.has(e) && Number(e.dataset.cell) === m.from && e.dataset.thing === m.kind);
            if (!el) continue;
            used.add(el); el.dataset.cell = String(m.to); el.classList.remove('pepites-saute'); put(el, m.to);
        }
        const wanted = new Map<number, string>();
        for (let i = 0; i < s.grid.length; i++) if ('oa~'.includes(s.grid[i]!)) wanted.set(i, s.grid[i]!);
        for (const el of [...layer.querySelectorAll<SVGGElement>('[data-thing]')]) {
            const cell = Number(el.dataset.cell);
            if (wanted.get(cell) === el.dataset.thing) { wanted.delete(cell); continue; }
            el.removeAttribute('data-thing'); el.classList.add('pepites-parti');
            const id = window.setTimeout(() => { timers.delete(id); el.remove(); }, reduce ? 0 : 400); timers.add(id);
        }
        for (const [cell, c] of wanted) {
            layer.insertAdjacentHTML('beforeend', `<g data-thing="${c}" data-cell="${cell}" class="pepites-saute"><g class="pepites-inner">${objectSvg(c)}</g></g>`);
            put(layer.lastElementChild, cell);
        }
    };
    const lumiEl = (): SVGGElement | null => root.querySelector<SVGGElement>('[data-lumi]');
    /** The arrows around Lumi, and what shines when the help is on. */
    const marks = (): void => {
        const s = session.state, l = observed.layout, layer = root.querySelector('[data-arrows]'); if (!s || !l || !layer) return;
        const busy = observed.busy || s.finished, h0 = cellXY(levelOf(s.level), s.lumi);
        layer.innerHTML = busy ? '' : arrowsSvg(moves.flatMap(m => { const r = step({ ...s, dry: 0, idle: 0 }, m); return r && !r.fail ? [{ action: m, x: h0.x + DELTA[m][0], y: h0.y + DELTA[m][1] }] : []; }), l);
        const h = !busy && helpOn(s) ? hint(s) : null;
        zone()?.toggleAttribute('data-help', Boolean(h));
        if (h) root.querySelector(`[data-arrow="${h}"] .pepites-arrow`)?.classList.add('pepites-hint');
        const back = root.querySelector<HTMLButtonElement>('#pepites-retour');
        if (back) back.disabled = busy || !session.history.length;
    };
    const effect = (cell: number, inner: string): void => {
        const l = observed.layout; if (!l) return;
        root.querySelector('[data-effects]')?.insertAdjacentHTML('beforeend', `<g transform="translate(${cx(l, cell % w())} ${cy(l, Math.floor(cell / w()))})">${inner}</g>`);
    };
    /** The bubble with the sound word, kept inside the garden and below Lumi when she is on the top row. */
    const wordBubble = (kind: Fail, at: number): void => {
        const l = observed.layout; if (!l) return;
        // Below Lumi on the top row, and for a bonk, so the rock on her hat stays in sight.
        const word = failWords[locale][kind], half = bubbleWidth(word) / 2 + 14, x = cx(l, at % w()), below = Math.floor(at / w()) === 0 || kind === 'chapeau';
        effect(at, `<g transform="translate(${Math.min(l.W - half, Math.max(half, x)) - x} ${below ? 150 : -10})">${bubble(word)}</g>`);
    };
    const clearEffects = (): void => { const layer = root.querySelector('[data-effects]'); if (layer) layer.innerHTML = ''; };
    /** The thing on the cell of a funny try: the hard rock, the rock, the worm, the water or the door. */
    const thing = (kind: Fail, x: number, y: number): Element | null =>
        kind === 'dure' ? root.querySelector(`[data-hard="${x},${y}"] .pepites-roc`)
            : kind === 'lourd' ? root.querySelector(`[data-thing="o"][data-cell="${y * w() + x}"] .pepites-inner`)
                : kind === 'ver' ? root.querySelector(`[data-worm="${x},${y}"] .pepites-ver`)
                    : kind === 'plouf' ? root.querySelector(`[data-thing="~"][data-cell="${y * w() + x}"] .pepites-inner`)
                        : kind === 'porte' ? root.querySelector('[data-door] .pepites-porte') : null;
    /** A funny try: Lumi leans towards the cell, plays her reaction, the thing there plays its own, and nothing moves. */
    const funny = async (s: State, fail: { kind: Fail; x: number; y: number }): Promise<void> => {
        observed.fail = fail.kind; say(t.fail[fail.kind]);
        recordActivation(`pepites:try:${fail.kind}`, 'action', false, fail.kind);
        const level = levelOf(s.level), h = cellXY(level, s.lumi), l = observed.layout, el = lumiEl(), inner = el?.querySelector<SVGGElement>('.pepites-inner');
        if (inner && el && l) {
            inner.style.setProperty('--dx', `${(fail.x - h.x) * U * .3}px`); inner.style.setProperty('--dy', `${(fail.y - h.y) * U * .3}px`);
            inner.classList.add(failAnimations[fail.kind]); el.classList.add('pepites-visage-surprise');
        }
        const anim = thingAnimations[fail.kind], target = anim ? thing(fail.kind, fail.x, fail.y) : null;
        if (target && anim) target.classList.add(anim);
        const inside = fail.x >= 0 && fail.y >= 0 && fail.x < width(level) && fail.y < height(level), cell = inside ? fail.y * width(level) + fail.x : s.lumi;
        const fx = effects[fail.kind]; if (fx) effect(cell, fx);
        wordBubble(fail.kind, s.lumi);
        await wait(FAIL_MS);
        if (gone()) return;
        inner?.classList.remove(failAnimations[fail.kind]); el?.classList.remove('pepites-visage-surprise');
        if (target && anim) target.classList.remove(anim);
        clearEffects(); observed.fail = null;
    };
    /** A rock comes down on Lumi's hat: bonk, stars, the rock bounces (and rolls off, when it can). */
    const bonk = async (r: Result): Promise<void> => {
        observed.fail = 'chapeau'; say(t.fail.chapeau);
        recordActivation('pepites:try:chapeau', 'action', true, 'chapeau');
        const el = lumiEl(), inner = el?.querySelector<SVGGElement>('.pepites-inner'), s = r.state;
        inner?.classList.add(failAnimations.chapeau); el?.classList.add('pepites-visage-surprise');
        effect(s.lumi, effects.chapeau!); wordBubble('chapeau', s.lumi);
        await wait(BONK_MS);
        if (gone()) return;
        inner?.classList.remove(failAnimations.chapeau); el?.classList.remove('pepites-visage-surprise');
        clearEffects(); observed.fail = null;
    };
    /** The end: the door opens wide and Lumi goes in. */
    const goHome = async (): Promise<void> => {
        root.querySelector('[data-door] .pepites-porte')?.classList.add('pepites-ouverte');
        lumiEl()?.classList.add('pepites-rentre');
        await wait(HOME_MS);
    };
    const act = async (a: Move, how: string): Promise<void> => {
        const s = session.state;
        if (!s || s.finished || observed.busy) return;
        const r = step(s, a);
        if (!r) return;
        observed.busy = true; marks();
        if (r.fail) {
            await funny(s, r.fail);
            if (gone()) return;
            session.state = r.state; observed.busy = false;
            if (helpOn(r.state) && !helpOn(s)) say(t.shine);
            marks(); return;
        }
        recordActivation(`pepites:step:${how}`, 'action', true, a);
        session.history.push(s); session.state = r.state;
        const el = lumiEl();
        put(el, r.state.lumi);
        if (r.dug) effect(r.state.lumi, '<g class="pepites-eclat"><circle cx="-26" cy="20" r="7" fill="#c58a55"/><circle cx="24" cy="26" r="6" fill="#c58a55"/><circle cx="0" cy="34" r="5" fill="#9c6337"/></g>');
        if (r.pushed) things(s, [r.pushed]);
        const left = nuggetsLeft(r.state.grid), opened = left === 0 && nuggetsLeft(s.grid) > 0;
        const news = opened ? t.ready : r.got === 'geante' ? t.giant : r.got === 'pepite' ? t.nugget : r.crack ? t.crack : r.fed !== null ? t.fed : r.got === 'pomme' ? t.apple : r.caught ? t.caught : r.splash ? t.splash : '';
        if (news) say(news, opened || r.got === 'geante' || r.fed !== null);
        else if (([t.nugget, t.giant, t.crack, t.fed, t.apple, t.caught, t.splash, t.ready, t.undo, t.fail.chapeau] as string[]).includes(message)) say(t.goal, false);
        if (r.crack) root.querySelector('[data-giant]')?.classList.add('pepites-toc');
        await wait(STEP_MS);
        if (gone()) return;
        clearEffects();
        if (r.state.finished) {
            await goHome();
            if (gone()) return;
            observed.busy = false;
            session.records = complete(session.records, r.state); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        cells(r.state);
        things(r.state, r.moved);
        if (r.splash) { el?.classList.add('pepites-mouillee'); const id = window.setTimeout(() => { timers.delete(id); el?.classList.remove('pepites-mouillee'); }, reduce ? 0 : 1200); timers.add(id); }
        if (r.bonk) { await wait(STEP_MS); if (gone()) return; await bonk(r); if (gone()) return; }
        observed.busy = false;
        marks();
    };
    const back = (): void => {
        const s = session.state, before = session.history.pop();
        if (!s || !before || observed.busy || s.finished) return;
        recordActivation('pepites:back', 'action', true, 'back');
        session.state = undo(before, s);
        const el = lumiEl(); el?.classList.add('pepites-saute'); put(el, session.state.lumi);
        cells(session.state); things(session.state); say(t.undo, false); marks();
        const id = window.setTimeout(() => { timers.delete(id); el?.classList.remove('pepites-saute'); }, 30); timers.add(id);
    };
    const cellUnder = (px: number, py: number): number | null => {
        const s = session.state, r = svgEl()?.getBoundingClientRect(), l = observed.layout;
        if (!s || !r || !l) return null;
        const level = levelOf(s.level), scale = r.width / l.W, x = Math.floor(((px - r.x) / scale - l.ox) / U), y = Math.floor(((py - r.y) / scale - l.oy) / U);
        return x < 0 || x >= width(level) || y < 0 || y >= height(level) ? null : y * width(level) + x;
    };
    /** A touch on a cell next to Lumi: she goes there. */
    const touch = (cell: number): void => {
        const s = session.state!, wd = w(), m = moves.find(k => { const x = s.lumi % wd + DELTA[k][0], y = Math.floor(s.lumi / wd) + DELTA[k][1]; return y * wd + x === cell && x >= 0 && x < wd; });
        if (m) void act(m, 'tap');
    };
    /** The board, built once the stage has its size: it takes the whole height left between Lumi and the button. */
    const fill = (): void => {
        const s = session.state, z = zone(), stage = root.querySelector('.pepites-stage'); if (!s || !z || !stage) return;
        const box = stage.getBoundingClientRect(), level = levelOf(s.level), l = layout(level, box.width, box.height);
        observed.layout = l;
        z.style.width = `${box.width}px`; z.style.height = `${box.height}px`;
        z.innerHTML = boardSvg(level, l, locale);
        cells(s); things(s);
        const el = lumiEl(); el?.classList.add('pepites-saute'); put(el, s.finished ? doorOf(level) : s.lumi);
        marks();
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce, nuggetsLeft(s.grid));
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'pepites:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'pepites:listen');
        const again = root.querySelector<HTMLElement>('#pepites-again'), next = root.querySelector<HTMLElement>('#pepites-next');
        if (again) bindAction(again, () => play(start(s.level), true), `pepites:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `pepites:next:${s.level}`);
        bindAction(root.querySelector<HTMLElement>('#pepites-retour')!, back, 'pepites:back-button');
        fill();
        if (s.finished) { root.querySelector('[data-door] .pepites-porte')?.classList.add('pepites-ouverte'); lumiEl()?.classList.add('pepites-rentre'); }
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
            const at = cellUnder(e.clientX, e.clientY); if (at !== null) touch(at);
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
