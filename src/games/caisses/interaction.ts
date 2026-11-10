import { cellAt, complete, DELTA, doorOpen, filled, height, helpOn, hint, isPull, isUnlocked, levelOf, moveOf, moves, OPPOSITE, parseRecords, pullOf, start, step, undo, width, type Action, type Fail, type Move, type Records, type State } from '../../engines/caisses';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bubble, bubbleWidth, crate, crateAnimations, effects, failAnimations, failWords, sunk, U } from './art';
import { arrowsSvg, boardSvg, crateSvg, cx, cy, gameCell, gameView, instruction, labels, layout, levelView, onScreen, typeset, type Layout } from './view';

export const RECORDS_KEY = 'opencadkid.caisses.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** What Boubou holds: nothing, the crate on one side of him (touched), or « whatever is behind » (the pull button). */
export type Grip = Move | 'any' | null;
/** Survives a remount (page hidden then shown): the scene in progress, the steps to go back through, and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; history: State[]; grip: Grip }
/** Durations, in ms: one step, one cell of a slide, a funny try. */
export const STEP_MS = 220, SLIDE_MS = 110, FAIL_MS = 1300;
/** How far a finger slides, in cells, before it is a step on that side. */
export const SLIDE = 0.3;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The step a move becomes with what Boubou holds: a pull when he steps away from the crate he holds. */
export function actionFor(m: Move, grip: Grip): Action {
    return grip === 'any' || (grip && m === OPPOSITE[grip]) ? pullOf(m) : m;
}
let observed: { busy: boolean; fail: Fail | null; layout: Layout | null } = { busy: false, fail: null, layout: null };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.caisses-zone svg')?.getBoundingClientRect(), s = session.state, l = observed.layout;
    let geom = null;
    if (r && s && l) { const scale = r.width / l.W, level = levelOf(s.level); geom = { x0: r.x + l.ox * scale, y0: r.y + l.oy * scale, cell: U * scale, w: width(level), h: height(level), flip: l.flip }; }
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
        session.screen = 'levels'; session.state = null; session.history = []; session.grip = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'caisses:home');
        root.querySelectorAll<HTMLElement>('[data-caisses-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.caissesLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `caisses:level:${el.dataset.caissesLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#caisses-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.caisses-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.caisses-zone svg');
    const put = (el: Element | null, x: number, y: number): void => { const l = observed.layout; if (el && l) (el as SVGGElement).style.transform = `translate(${cx(l, x, y)}px,${cy(l, x, y)}px)`; };
    /** Crates, sunk crates, the gate and the button, as the state has them. */
    const world = (s: State): void => {
        const level = levelOf(s.level), layer = root.querySelector('[data-crates]'), under = root.querySelector('[data-sunk]'), l = observed.layout;
        if (!layer || !under || !l) return;
        s.crates.forEach((c, i) => {
            let el = root.querySelector<SVGGElement>(`[data-crate="${i}"]`);
            if (!el) { layer.insertAdjacentHTML('beforeend', crateSvg(i, c.motif)); el = root.querySelector<SVGGElement>(`[data-crate="${i}"]`)!; }
            const into = c.sunk ? under : layer;
            if (el.parentNode !== into) { into.appendChild(el); el.querySelector('.caisses-inner')!.innerHTML = c.sunk ? sunk(c.motif) : crate(c.motif); }
            el.toggleAttribute('data-sunk', c.sunk);
            el.dataset.pos = `${c.x},${c.y}`;
            const sl = cellAt(level, c.x, c.y);
            el.toggleAttribute('data-home', !c.sunk && sl.ground === 'place' && (sl.motif === null || sl.motif === c.motif));
            put(el, c.x, c.y);
        });
        const open = doorOpen(level, s);
        root.querySelectorAll('[data-gate]').forEach(g => g.toggleAttribute('data-open', open));
        root.querySelectorAll('[data-button]').forEach(b => { const [x, y] = b.getAttribute('data-button')!.split(',').map(Number); b.toggleAttribute('data-pressed', s.crates.some(c => !c.sunk && c.x === x && c.y === y)); });
        root.querySelectorAll('[data-hole]').forEach(h => { const [x, y] = h.getAttribute('data-hole')!.split(',').map(Number); h.toggleAttribute('data-filled', filled(s, x!, y!)); });
    };
    const heroAt = (s: State): void => put(root.querySelector('[data-hero]'), s.x, s.y);
    /** The arrows around Boubou, the crate he holds, and what shines when the help is on. */
    const marks = (): void => {
        const s = session.state, l = observed.layout, layer = root.querySelector('[data-arrows]'); if (!s || !l || !layer) return;
        const busy = observed.busy || s.finished;
        layer.innerHTML = busy ? '' : arrowsSvg(moves.flatMap(m => { const a = actionFor(m, session.grip), r = step({ ...s, dry: 0, idle: 0 }, a); return r && !r.fail ? [{ action: m, pull: isPull(a), x: s.x + DELTA[m][0], y: s.y + DELTA[m][1] }] : []; }), l);
        root.querySelectorAll('[data-crate]').forEach(el => el.removeAttribute('data-held'));
        const g = session.grip;
        if (g && g !== 'any') root.querySelector(`[data-crate][data-pos="${s.x + DELTA[g][0]},${s.y + DELTA[g][1]}"]`)?.setAttribute('data-held', '');
        root.querySelector('[data-hero]')?.toggleAttribute('data-grip', Boolean(g));
        const pullButton = root.querySelector('#caisses-tire');
        pullButton?.setAttribute('aria-pressed', String(g === 'any'));
        const h = !busy && helpOn(s) ? hint(s) : null;
        zone()?.toggleAttribute('data-help', Boolean(h));
        root.querySelectorAll('.caisses-hint').forEach(el => el.classList.remove('caisses-hint'));
        if (h) {
            const m = moveOf(h);
            if (actionFor(m, session.grip) === h) root.querySelector(`[data-arrow="${m}"] .caisses-arrow`)?.classList.add('caisses-hint');
            else root.querySelector(`[data-crate][data-pos="${s.x - DELTA[m][0]},${s.y - DELTA[m][1]}"] .caisses-inner`)?.classList.add('caisses-hint');
        }
        const back = root.querySelector<HTMLButtonElement>('#caisses-retour');
        if (back) back.disabled = busy || !session.history.length;
    };
    const effect = (x: number, y: number, inner: string): void => {
        const l = observed.layout; if (!l) return;
        root.querySelector('[data-effects]')?.insertAdjacentHTML('beforeend', `<g transform="translate(${cx(l, x, y)} ${cy(l, x, y)})">${inner}</g>`);
    };
    /** A funny try: Boubou leans towards the cell, plays his reaction, the crate plays its own, and nothing moves. */
    const funny = async (s: State, fail: { kind: Fail; x: number; y: number; crate: number }): Promise<void> => {
        observed.fail = fail.kind; say(t.fail[fail.kind]);
        recordActivation(`caisses:try:${fail.kind}`, 'action', false, fail.kind);
        const hero = root.querySelector<SVGGElement>('[data-hero]'), inner = hero?.querySelector<SVGGElement>('.caisses-inner'), l = observed.layout;
        if (inner && hero && l) {
            const dx = Math.sign(cx(l, fail.x, fail.y) - cx(l, s.x, s.y)), dy = Math.sign(cy(l, fail.x, fail.y) - cy(l, s.x, s.y));
            inner.style.setProperty('--dx', `${dx * U * .3}px`); inner.style.setProperty('--dy', `${dy * U * .3}px`);
            inner.classList.add(failAnimations[fail.kind]); hero.classList.add('caisses-surpris', `caisses-essai-${fail.kind}`);
        }
        const crateAnim = crateAnimations[fail.kind];
        const box = fail.crate >= 0 ? root.querySelector(`[data-crate="${fail.crate}"] .caisses-inner`) : null;
        if (box && crateAnim) box.classList.add(crateAnim);
        const fx = effects[fail.kind];
        if (fx) effect(fail.kind === 'mur' ? s.x : fail.x, fail.kind === 'mur' ? s.y : fail.y, fx);
        // The bubble stays inside the garden, even over a cell at its edge.
        // It leans away from the side of the try and goes below Boubou when the try is upwards or on the top row, so the
        // crate stays visible.
        const word = failWords[locale][fail.kind], half = bubbleWidth(word) / 2 + 14, at = l ? cx(l, s.x, s.y) : 0, w = l?.W ?? 0;
        const side = l ? -Math.sign(cx(l, fail.x, fail.y) - at) * 30 : 0, top = l ? cy(l, s.x, s.y) - l.oy < U || cy(l, fail.x, fail.y) < cy(l, s.x, s.y) : false;
        effect(s.x, s.y, `<g transform="translate(${Math.min(w - half, Math.max(half, at + side)) - at} ${top ? 140 : 0})">${bubble(word)}</g>`);
        await wait(FAIL_MS);
        if (gone()) return;
        inner?.classList.remove(failAnimations[fail.kind]); hero?.classList.remove('caisses-surpris', `caisses-essai-${fail.kind}`);
        if (box && crateAnim) box.classList.remove(crateAnim);
        const layer = root.querySelector('[data-effects]'); if (layer) layer.innerHTML = '';
        observed.fail = null;
    };
    const act = async (a: Action, how: string): Promise<void> => {
        const s = session.state;
        if (!s || s.finished || observed.busy) return;
        const r = step(s, a);
        if (!r) return;
        session.grip = null;
        observed.busy = true; marks();
        if (r.fail) {
            await funny(s, r.fail);
            if (gone()) return;
            session.state = r.state; observed.busy = false;
            if (helpOn(r.state) && !helpOn(s)) say(t.shine);
            marks(); return;
        }
        recordActivation(`caisses:step:${how}`, 'action', true, a);
        session.history.push(s); session.state = r.state;
        if (message === t.grab || message === t.pullOn) say(t.goal, false);
        const inner = root.querySelector('[data-hero] .caisses-inner');
        inner?.classList.remove('caisses-pas'); void (inner as SVGGElement | null)?.getBoundingClientRect(); inner?.classList.add('caisses-pas');
        heroAt(r.state);
        if (r.crate) {
            // The crate goes to its first cell with Boubou, then along the ice or the belt, one cell at a time.
            const el = root.querySelector(`[data-crate="${r.crate.index}"]`);
            put(el, r.crate.x, r.crate.y);
            if (r.crate.slide.path.length) {
                await wait(STEP_MS);
                for (const p of r.crate.slide.path) { if (gone()) return; el?.classList.add('caisses-glisse'); put(el, p.x, p.y); await wait(SLIDE_MS); }
                el?.classList.remove('caisses-glisse');
            }
        }
        if (gone()) return;
        world(r.state);
        if (r.tidied && !r.state.finished) { root.querySelector(`[data-crate="${r.crate?.index ?? -1}"] .caisses-inner`)?.classList.add('caisses-range'); say(t.tidy); }
        await wait(STEP_MS);
        if (gone()) return;
        root.querySelectorAll('.caisses-range').forEach(e => e.classList.remove('caisses-range'));
        observed.busy = false;
        if (r.state.finished) {
            session.records = complete(session.records, r.state); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        marks();
    };
    const back = (): void => {
        const s = session.state, before = session.history.pop();
        if (!s || !before || observed.busy || s.finished) return;
        recordActivation('caisses:back', 'action', true, 'back');
        session.state = undo(before, s); session.grip = null;
        world(session.state); heroAt(session.state); say(t.undo, false); marks();
    };
    const grip = (g: Grip): void => {
        session.grip = g; marks();
        if (g) say(g === 'any' ? t.pullOn : t.grab);
    };
    const cellUnder = (px: number, py: number): { x: number; y: number } | null => {
        const s = session.state, r = svgEl()?.getBoundingClientRect(), l = observed.layout;
        if (!s || !r || !l) return null;
        const level = levelOf(s.level), scale = r.width / l.W, { x, y } = gameCell(l, Math.floor(((px - r.x) / scale - l.ox) / U), Math.floor(((py - r.y) / scale - l.oy) / U));
        return x < 0 || x >= width(level) || y < 0 || y >= height(level) ? null : { x, y };
    };
    /** A touch on a neighbouring cell: a crate there is held first (touch it again to push it), otherwise Boubou steps. */
    const touch = (at: { x: number; y: number }): void => {
        const s = session.state!, m = moves.find(k => s.x + DELTA[k][0] === at.x && s.y + DELTA[k][1] === at.y);
        if (!m) return;
        const crateThere = s.crates.some(c => !c.sunk && c.x === at.x && c.y === at.y);
        if (crateThere && session.grip !== m && session.grip !== 'any') { grip(m); recordActivation('caisses:grip', 'action', true, m); return; }
        void act(actionFor(m, session.grip === m ? null : session.grip), 'tap');
    };
    /** The board, built once the stage has its size: it takes the whole height left between Boubou and the buttons. */
    const fill = (): void => {
        const s = session.state, z = zone(), stage = root.querySelector('.caisses-stage'); if (!s || !z || !stage) return;
        const box = stage.getBoundingClientRect(), level = levelOf(s.level), l = layout(level, box.width, box.height);
        observed.layout = l;
        z.style.width = `${box.width}px`; z.style.height = `${box.height}px`;
        z.innerHTML = boardSvg(level, l, locale);
        world(s); heroAt(s); marks();
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'caisses:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'caisses:listen');
        const again = root.querySelector<HTMLElement>('#caisses-again'), next = root.querySelector<HTMLElement>('#caisses-next');
        if (again) bindAction(again, () => play(start(s.level), true), `caisses:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `caisses:next:${s.level}`);
        bindAction(root.querySelector<HTMLElement>('#caisses-retour')!, back, 'caisses:back-button');
        bindAction(root.querySelector<HTMLElement>('#caisses-tire')!, () => { if (!observed.busy && !session.state!.finished) grip(session.grip === 'any' ? null : 'any'); }, 'caisses:pull-button');
        fill();
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
            if (Math.max(Math.abs(dx), Math.abs(dy)) >= SLIDE * cell) { const m = onScreen(l, Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut')); void act(actionFor(m, session.grip), 'slide'); return; }
            const at = cellUnder(e.clientX, e.clientY); if (at) touch(at);
        });
        z.addEventListener('pointercancel', () => { down = null; });
        z.addEventListener('keydown', e => {
            const keys: Record<string, Move> = { ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite' };
            const l = observed.layout, k = keys[e.key], m = k && l ? onScreen(l, k) : k;
            if (m) { e.preventDefault(); void act(e.shiftKey ? pullOf(m) : actionFor(m, session.grip), 'key'); }
            else if (e.key === 'Backspace') { e.preventDefault(); back(); }
            else if (e.key === ' ') { e.preventDefault(); grip(session.grip === 'any' ? null : 'any'); }
        });
    };
    const resize = (): void => { if (session.screen === 'play' && session.state && !observed.busy) fill(); };
    window.addEventListener('resize', resize);
    function play(s: State, fresh: boolean): void {
        observed = { busy: false, fail: null, layout: null };
        for (const id of timers) clearTimeout(id); timers.clear();
        session.screen = 'play'; session.state = s;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { session.history = []; session.grip = null; message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; window.removeEventListener('resize', resize); for (const id of timers) clearTimeout(id); timers.clear(); };
}
