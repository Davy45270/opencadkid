import { complete, height, helpOn, hint, isUnlocked, levelOf, parseRecords, pose, shapeOf, shapeWidth, start, swap, turn, width, type Funny, type Pose, type Records, type Result, type State } from '../../engines/empilo';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bubble, bubbleWidth, butterfly, cloud, effects, rainbowCube, failAnimations, failWords, RAINBOW, thingAnimations, U, windCloud } from './art';
import { boardSvg, cellsSvg, cx, cy, drawingSvg, gameView, goalsHtml, goalWords, instruction, labels, layout, levelView, pieceSvg, swapContent, typeset, type Layout } from './view';

export const RECORDS_KEY = 'opencadkid.empilo.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the records, and the column the piece waits over. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; col?: number }
/** Durations, in ms: a funny try, the hole's echo, rows that fly, the wind, the candy, the drawing made whole, a chick set free. */
export const FAIL_MS = 1300, HOLE_MS = 900, ROW_MS = 900, WIND_MS = 900, CANDY_MS = 900, DRAWN_MS = 1200, FREE_MS = 900;
/** How long the piece takes to come down one row (it comes down gently), and at least. */
export const ROW_DROP_MS = 70, DROP_MIN_MS = 260;
/** How far a finger slides, in cells, before it drags the piece. */
export const SLIDE = 0.3;
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { busy: boolean; fail: Funny | null; layout: Layout | null; col: number } = { busy: false, fail: null, layout: null, col: 0 };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.empilo-zone svg')?.getBoundingClientRect(), s = session.state, l = observed.layout;
    let geom = null;
    if (r && s && l) { const scale = r.width / l.W, level = levelOf(s.level); geom = { x0: r.x + l.ox * scale, y0: r.y + (l.oy + l.sky * U) * scale, cell: U * scale, w: width(level), h: height(level), sky: l.sky }; }
    return { ...session, col: observed.col, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, geom, hint: s && helpOn(s) ? hint(s) : null, busy: observed.busy, fail: observed.fail };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', down: { x: number; y: number; drag: boolean } | null = null;
    observed = { busy: false, fail: null, layout: null, col: 0 };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 40) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'empilo:home');
        root.querySelectorAll<HTMLElement>('[data-empilo-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.empiloLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `empilo:level:${el.dataset.empiloLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#empilo-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.empilo-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.empilo-zone svg');
    const level = () => levelOf(session.state!.level);
    const W = (): number => width(level());
    const pieceW = (s: State): number => shapeWidth(shapeOf(s.hand, level().rotate ? s.rot : 0));
    const clampCol = (s: State, c: number): number => Math.max(0, Math.min(W() - pieceW(s), c));
    const layer = (name: string): Element | null => root.querySelector(`[data-${name}]`);
    const effect = (x: number, y: number, inner: string): void => {
        const l = observed.layout; if (!l) return;
        layer('effects')?.insertAdjacentHTML('beforeend', `<g transform="translate(${cx(l, x)} ${cy(l, level(), y)})">${inner}</g>`);
    };
    const clearEffects = (): void => { const e = layer('effects'); if (e) e.innerHTML = ''; };
    /** The well, its drawing, the little cloud and the goals, from columns and a state. */
    const well = (cols: readonly string[], s: State): void => {
        const l = observed.layout; if (!l) return;
        const lv = level(), c = layer('cells'), sil = layer('sil-cells'), pic = layer('picture'), cl = layer('cloud');
        if (c) c.innerHTML = cellsSvg(lv, l, cols);
        if (pic) pic.innerHTML = drawingSvg(lv, l, s.lit, false);
        if (sil) sil.innerHTML = drawingSvg(lv, l, s.lit, true);
        if (cl) cl.innerHTML = s.cloud >= 0 ? `<g data-cloud-at="${s.cloud}" style="transform:translate(${cx(l, s.cloud)}px,${cy(l, lv, cols[s.cloud]!.length)}px)"><g class="empilo-nuage">${cloud()}</g></g>` : '';
        const goals = root.querySelector('.empilo-goals');
        if (goals) goals.outerHTML = goalsHtml(lv, s, locale);
    };
    const pieceEl = (): SVGGElement | null => root.querySelector<SVGGElement>('[data-piece]');
    /** The piece in hand, waiting in the sky over column `col` (or the given place), and the other one in the swap button. */
    const hold = (s: State, col: number): void => {
        const l = observed.layout, el = pieceEl(); if (!l || !el) return;
        observed.col = col; session.col = col;
        const inner = el.querySelector('.empilo-inner');
        if (inner) inner.innerHTML = s.finished ? '' : pieceSvg(s.hand, level().rotate ? s.rot : 0);
        el.style.transitionDuration = '';
        el.style.transform = `translate(${l.ox + col * U}px,${l.oy + l.sky * U}px)`;
        const other = root.querySelector('#empilo-echange [data-other]');
        if (other) other.outerHTML = swapContent(s.finished ? null : s.other);
        ghost(s, col);
    };
    /** A soft white outline where the piece would come to rest. */
    const ghost = (s: State, col: number): void => {
        const g = layer('ghost'), l = observed.layout; if (!g || !l) return;
        const r = s.finished || observed.busy ? null : pose({ ...s, dry: 0 }, { piece: 'main', rot: s.rot, col });
        g.innerHTML = r && !r.fail ? r.rest.map(c => `<rect x="${cx(l, c.x) - 42}" y="${cy(l, level(), c.y) - 42}" width="84" height="84" rx="14" fill="#ffffff55" stroke="#ffffff" stroke-width="5" stroke-dasharray="10 8"/>`).join('') : '';
    };
    /** The help: a good place pulses in golden dots; the swap or turn button pulses when it is needed to get there. */
    const marks = (): void => {
        const s = session.state, l = observed.layout, m = layer('marks'); if (!s || !l || !m) return;
        const h = !observed.busy && helpOn(s) ? hint(s) : null;
        zone()?.toggleAttribute('data-help', Boolean(h));
        root.querySelector('#empilo-echange')?.classList.toggle('empilo-hint-button', Boolean(h && h.piece === 'autre'));
        const kind = h ? (h.piece === 'main' ? s.hand : s.other) : null;
        const turned = Boolean(h && kind && JSON.stringify(shapeOf(kind, h.rot)) !== JSON.stringify(shapeOf(kind, h.piece === 'main' ? s.rot : 0)));
        root.querySelector('#empilo-tourne')?.classList.toggle('empilo-hint-button', turned);
        const r = h ? pose({ ...s, dry: 0 }, h) : null;
        m.innerHTML = r && !r.fail ? r.rest.map(c => `<g transform="translate(${cx(l, c.x)} ${cy(l, level(), c.y)})"><g class="empilo-hint"><rect x="-44" y="-44" width="88" height="88" rx="14" fill="#fff3a066" stroke="#f5b400" stroke-width="8" stroke-dasharray="4 12" stroke-linecap="round"/></g></g>`).join('') : '';
        for (const id of ['#empilo-echange', '#empilo-tourne']) { const b = root.querySelector<HTMLButtonElement>(id); if (b) b.disabled = observed.busy || s.finished; }
    };
    /** The bubble with the sound word, kept inside the well. */
    const wordBubble = (word: string, x: number, y: number): void => {
        const l = observed.layout; if (!l) return;
        const half = bubbleWidth(word) / 2 + 14, px = cx(l, x), py = cy(l, level(), y), below = py - 100 < 0;
        effect(x, y, `<g transform="translate(${Math.min(l.W - half, Math.max(half, px)) - px} ${below ? 150 : 0})">${bubble(word)}</g>`);
    };
    /** The thing a funny try is about: the hole, the frame of the well, the cubes of the column, the cloud, the turn button. */
    const things = (kind: Funny, r: Result | null, col: number): Element[] => {
        const all = (sel: string): Element[] => [...root.querySelectorAll(sel)];
        switch (kind) {
            case 'trou':
                for (const c of r?.holes ?? []) effect(c.x, c.y, `<g data-hole="${c.x},${c.y}"><rect x="-40" y="-40" width="80" height="80" rx="12" fill="#3a2f5a" opacity=".55"/><circle class="empilo-anneau" r="26" fill="none" stroke="#fff" stroke-width="5"/></g>`);
                return all('[data-hole] .empilo-anneau');
            case 'mur': return all('[data-frame]');
            case 'nuage': return all('[data-cloud] .empilo-nuage-corps');
            case 'tournis': return all('#empilo-tourne');
            default: return all(`[data-cell^="${col},"] .empilo-cube`);
        }
    };
    /** A funny try: the piece plays its reaction over the column, the thing plays its own, and nothing else moves. */
    const funny = async (s: State, kind: Funny, col: number, r: Result | null): Promise<void> => {
        observed.fail = kind; say(t.fail[kind]);
        recordActivation(`empilo:try:${kind}`, 'action', false, kind);
        const inner = pieceEl()?.querySelector<SVGGElement>('.empilo-inner');
        const lv = level(), x = Math.max(0, Math.min(W() - 1, col)), top = s.cols[x]?.length ?? 0;
        // How far the piece comes down before it bumps: to the top of the column (the cloud sits there).
        inner?.style.setProperty('--fall', `${Math.max(0, height(lv) - top - 1) * U}px`);
        inner?.classList.add(failAnimations[kind]);
        const anim = thingAnimations[kind], targets = things(kind, r, col);
        targets.forEach(el => el.classList.add(anim));
        const at = kind === 'trou' && r?.holes[0] ? r.holes[0] : kind === 'tournis' || kind === 'mur' ? { x, y: height(lv) } : { x, y: Math.min(height(lv) - 1, top) };
        effect(at.x, at.y, effects[kind]);
        wordBubble(failWords[locale][kind], x, height(lv) - 1);
        await wait(kind === 'trou' ? HOLE_MS : FAIL_MS);
        if (gone()) return;
        inner?.classList.remove(failAnimations[kind]);
        targets.forEach(el => el.classList.remove(anim));
        clearEffects(); observed.fail = null;
    };
    /** Butterflies of the rainbow flying off the given cells. */
    const flyAway = (cells: { x: number; y: number }[], cls = 'empilo-envol'): void => cells.forEach((c, i) => effect(c.x, c.y, `<g class="${cls}" style="animation-delay:${reduce ? 0 : (i % 6) * 50}ms">${butterfly(RAINBOW[(c.x + c.y) % RAINBOW.length]!)}</g>`));
    const drop = async (p: Pose, how: string): Promise<void> => {
        const s = session.state, l = observed.layout;
        if (!s || !l || s.finished || observed.busy) return;
        const r = pose(s, p);
        if (!r) return;
        observed.busy = true; marks(); ghost(s, p.col);
        const lv = level(), el = pieceEl();
        if (r.fail) {
            if (r.fail.kind === 'mur' || r.fail.kind === 'nuage' || r.fail.kind === 'deborde') {
                // It goes over the column it was dropped on, bumps, and comes back up.
                if (el) el.style.transform = `translate(${l.ox + p.col * U}px,${l.oy + l.sky * U}px)`;
            }
            await funny(s, r.fail.kind, p.col, r);
            if (gone()) return;
            session.state = r.state;
            if (helpOn(r.state) && !helpOn(s)) say(t.shine);
            observed.busy = false; hold(r.state, clampCol(r.state, observed.col)); marks();
            return;
        }
        recordActivation(`empilo:pose:${how}`, 'action', true, `${r.kind}:${p.col}`);
        // The piece comes down gently to where it rests.
        const base = Math.min(...r.rest.map(c => c.y)), left = Math.min(...r.rest.map(c => c.x)), rows = height(lv) - base;
        const ms = Math.max(DROP_MIN_MS, rows * ROW_DROP_MS);
        if (el) { el.style.transitionDuration = `${ms}ms`; el.style.transform = `translate(${l.ox + left * U}px,${l.oy + (l.sky + height(lv) - base) * U}px)`; }
        await wait(ms + 40);
        if (gone()) return;
        if (r.holes.length) { await funny(s, 'trou', p.col, r); if (gone()) return; }
        const inner = el?.querySelector('.empilo-inner'); if (inner) inner.innerHTML = '';
        const news: string[] = [];
        // The cubes slide into place; the rainbow fills its hole; the candy lifts its column.
        if (r.kind === 'b') {
            well(s.cols, s); flyAway(r.lifted, 'empilo-envol'); news.push(t.candy);
            await wait(CANDY_MS); if (gone()) return; clearEffects();
        }
        const mid: State = { ...r.state, cloud: s.cloud };
        well(r.landed, mid);
        if (r.kind === 'a') { news.push(t.rainbow); r.filled.forEach(c => root.querySelector(`[data-cell="${c.x},${c.y}"] .empilo-cube`)?.classList.add('empilo-pousse')); await wait(500); if (gone()) return; }
        if (r.lit.length) {
            r.state.lit.split('').forEach((v, i) => { if (v === '1') root.querySelector(`[data-sil="${i}"]`)?.classList.add('empilo-allume'); });
            if (!r.state.lit.includes('0')) { news.push(t.drawn); root.querySelector('.empilo-dessin')?.classList.add('empilo-dessin-fini'); await wait(DRAWN_MS); if (gone()) return; }
            else news.push(t.lit);
        }
        if (r.cleared) {
            const cells: { x: number; y: number }[] = [];
            r.landed.forEach((c, x) => { for (let y = 0; y < r.cleared; y++) if (c[y]) cells.push({ x, y }); });
            // The full rows turn rainbow, then fly away as butterflies.
            cells.forEach(c => { const el = root.querySelector(`[data-cell="${c.x},${c.y}"] .empilo-cube`); if (el && r.landed[c.x]![c.y] !== 'A') { el.innerHTML = rainbowCube(); el.classList.add('empilo-arcenciel'); } });
            await wait(ROW_MS / 2); if (gone()) return;
            flyAway(cells.filter(c => r.landed[c.x]![c.y] !== 'A'));
            r.freed.forEach(f => effect(f.x, f.y, '<g class="empilo-libre"><circle r="40" fill="#fff3a0" opacity=".8"/></g>'));
            well(r.afterRows, mid);
            news.push(r.cleared > 1 ? t.rowsMany : t.row);
            await wait(ROW_MS / 2); if (gone()) return; clearEffects();
        }
        if (r.freed.length) news.push(t.free);
        if (r.blown.length) {
            const l2 = observed.layout!, top = r.blown[0]![0]!.y;
            effect(0, top, `<g transform="translate(${-cx(l2, 0) + 40} 0)"><g class="empilo-vent">${windCloud()}</g></g>`);
            flyAway(r.blown.flat(), 'empilo-souffle-rangee');
            await wait(WIND_MS); if (gone()) return; clearEffects();
            news.push(t.wind);
        }
        session.state = r.state;
        well(r.state.cols, r.state);
        if (r.freed.length && !r.cleared) { await wait(FREE_MS); if (gone()) return; }
        if (r.state.finished) {
            observed.busy = false;
            session.records = complete(session.records, r.state); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        const aloud = r.freed.length > 0 || (r.lit.length > 0 && !r.state.lit.includes('0'));
        if (news.length) say(news[news.length - 1]!, aloud);
        else if (helpOn(r.state) && !helpOn(s)) say(t.shine);
        // A funny try is over: the goals again, written only.
        else if (Object.values(t.fail).includes(message)) say(sentence(goalWords(lv, locale)), false);
        observed.busy = false;
        hold(r.state, clampCol(r.state, observed.col)); marks();
    };
    const spin = async (): Promise<void> => {
        const s = session.state; if (!s || observed.busy) return;
        const r = turn(s); if (!r) return;
        recordActivation('empilo:turn', 'action', true, String(r.state.rot));
        session.state = r.state;
        hold(r.state, clampCol(r.state, observed.col));
        if (r.dizzy) {
            observed.busy = true; marks();
            await funny(r.state, 'tournis', observed.col, null);
            if (gone()) return;
            observed.busy = false;
        }
        marks();
    };
    const exchange = (): void => {
        const s = session.state; if (!s || observed.busy || s.finished) return;
        recordActivation('empilo:swap', 'action', true, s.other);
        session.state = swap(s);
        hold(session.state, clampCol(session.state, observed.col)); marks();
    };
    const columnUnder = (px: number): number | null => {
        const r = svgEl()?.getBoundingClientRect(), l = observed.layout;
        if (!r || !l) return null;
        return Math.floor(((px - r.x) / (r.width / l.W) - l.ox) / U);
    };
    /** The piece under the finger: its middle over the finger's column. */
    const fingerCol = (px: number): number | null => { const c = columnUnder(px), s = session.state; return c === null || !s ? null : c - Math.floor((pieceW(s) - 1) / 2); };
    /** The board, built once the stage has its size: the well takes the whole height left between the goals and the buttons. */
    const fill = (): void => {
        const s = session.state, z = zone(), stage = root.querySelector('.empilo-stage'); if (!s || !z || !stage) return;
        const box = stage.getBoundingClientRect(), lv = level(), l = layout(lv, box.width, box.height);
        observed.layout = l;
        z.style.width = `${box.width}px`; z.style.height = `${box.height}px`;
        z.innerHTML = boardSvg(lv, l, locale);
        well(s.cols, s);
        hold(s, clampCol(s, session.col ?? Math.floor((W() - pieceW(s)) / 2)));
        marks();
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'empilo:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'empilo:listen');
        const again = root.querySelector<HTMLElement>('#empilo-again'), next = root.querySelector<HTMLElement>('#empilo-next');
        if (again) bindAction(again, () => play(start(s.level), true), `empilo:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `empilo:next:${s.level}`);
        bindAction(root.querySelector<HTMLElement>('#empilo-echange')!, exchange, 'empilo:swap-button');
        const turnButton = root.querySelector<HTMLElement>('#empilo-tourne');
        if (turnButton) bindAction(turnButton, () => void spin(), 'empilo:turn-button');
        fill();
        const z = zone()!;
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary || observed.busy || session.state!.finished) return;
            e.preventDefault(); down = { x: e.clientX, y: e.clientY, drag: false };
            try { z.setPointerCapture(e.pointerId); } catch { /* A finger already gone: the touch still counts. */ }
        });
        z.addEventListener('pointermove', e => {
            if (!e.isPrimary || !down || observed.busy) return;
            const l = observed.layout, r = svgEl()?.getBoundingClientRect(); if (!l || !r) return;
            if (!down.drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) >= SLIDE * r.width / l.W * U) down.drag = true;
            if (!down.drag) return;
            const c = fingerCol(e.clientX), s = session.state!;
            if (c !== null) { const col = Math.max(-(pieceW(s) - 1), Math.min(W() - 1, c)); if (col !== observed.col) hold(s, col); }
        });
        z.addEventListener('pointerup', e => {
            if (!e.isPrimary || !down) return;
            const was = down; down = null;
            const s = session.state!, c = fingerCol(e.clientX); if (c === null) return;
            if (was.drag) { const col = Math.max(-(pieceW(s) - 1), Math.min(W() - 1, c)); hold(s, col); void drop({ piece: 'main', rot: s.rot, col }, 'slide'); return; }
            const col = clampCol(s, c); hold(s, col); void drop({ piece: 'main', rot: s.rot, col }, 'tap');
        });
        z.addEventListener('pointercancel', () => { down = null; });
        z.addEventListener('keydown', e => {
            const s = session.state!;
            if (observed.busy || s.finished) return;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); hold(s, clampCol(s, observed.col + (e.key === 'ArrowLeft' ? -1 : 1))); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); void spin(); }
            else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void drop({ piece: 'main', rot: s.rot, col: observed.col }, 'key'); }
            else if (e.key === 'e' || e.key === 's' || e.key === 'E' || e.key === 'S') { e.preventDefault(); exchange(); }
        });
    };
    const resize = (): void => { if (session.screen === 'play' && session.state && !observed.busy) fill(); };
    window.addEventListener('resize', resize);
    function play(s: State, fresh: boolean): void {
        observed = { busy: false, fail: null, layout: null, col: 0 };
        for (const id of timers) clearTimeout(id); timers.clear();
        session.screen = 'play'; session.state = s;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { session.col = undefined; message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; window.removeEventListener('resize', resize); for (const id of timers) clearTimeout(id); timers.clear(); };
}
