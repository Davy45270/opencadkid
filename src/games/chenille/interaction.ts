import { cellXY, cocoonOf, complete, DELTA, foodsOf, height, helpOn, hint, isUnlocked, levelOf, moves, parseRecords, ready, start, step, undo, width, type Action, type Fail, type Move, type Records, type State } from '../../engines/chenille';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bubble, bubbleWidth, butterfly, effects, failAnimations, failFaces, failWords, head, ring, thingAnimations, U } from './art';
import { arrowsSvg, boardSvg, cx, cy, gameCell, gameView, instruction, labels, layout, levelView, onScreen, typeset, type Layout } from './view';

export const RECORDS_KEY = 'opencadkid.chenille.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the steps to go back through, and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; history: State[] }
/** Durations, in ms: one step, a funny try, the caterpillar turning into a butterfly. */
export const STEP_MS = 220, FAIL_MS = 1300, BUTTERFLY_MS = 1800;
/** How far a finger slides, in cells, before it is a step on that side. */
export const SLIDE = 0.3;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { busy: boolean; fail: Fail | null; layout: Layout | null } = { busy: false, fail: null, layout: null };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.chenille-zone svg')?.getBoundingClientRect(), s = session.state, l = observed.layout;
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
        session.screen = 'levels'; session.state = null; session.history = [];
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'chenille:home');
        root.querySelectorAll<HTMLElement>('[data-chenille-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.chenilleLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `chenille:level:${el.dataset.chenilleLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#chenille-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.chenille-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.chenille-zone svg');
    const put = (el: Element | null, x: number, y: number): void => { const l = observed.layout; if (el && l) (el as SVGGElement).style.transform = `translate(${cx(l, x, y)}px,${cy(l, x, y)}px)`; };
    /** The caterpillar as the state has it: one group per ring, the head last so it is drawn on top. A ring that jumps (the
     * tunnel, turning round) goes straight to its cell; the others crawl. */
    const drawBody = (s: State, crawl: boolean): void => {
        const level = levelOf(s.level), layer = root.querySelector('[data-body]'), l = observed.layout; if (!layer || !l) return;
        const cells = s.body.map(c => cellXY(level, c));
        layer.querySelectorAll<SVGGElement>('[data-seg]').forEach(el => { if (Number(el.dataset.seg) >= cells.length) el.remove(); });
        cells.forEach((p, i) => {
            let el = layer.querySelector<SVGGElement>(`[data-seg="${i}"]`);
            if (!el) { layer.insertAdjacentHTML('afterbegin', `<g data-seg="${i}"><g class="chenille-inner"></g></g>`); el = layer.querySelector<SVGGElement>(`[data-seg="${i}"]`)!; if (crawl) el.classList.add('chenille-pousse'); }
            const role = i === 0 ? 'head' : i === cells.length - 1 ? 'tail' : 'ring';
            const nb = cells[1], look: [number, number] = i === 0 && nb ? [Math.sign(cx(l, p.x, p.y) - cx(l, nb.x, nb.y)), Math.sign(cy(l, p.x, p.y) - cy(l, nb.x, nb.y))] : [0, 0];
            const tag = `${role}:${look.join(',')}`;
            if (el.dataset.role !== tag) { el.dataset.role = tag; el.querySelector('.chenille-inner')!.innerHTML = role === 'head' ? head(look) : ring(role === 'tail'); }
            const [ox, oy] = (el.dataset.pos ?? '').split(',').map(Number), jump = !crawl || el.dataset.pos === undefined || Math.abs(ox! - p.x) + Math.abs(oy! - p.y) > 1;
            el.classList.toggle('chenille-saute', jump);
            el.dataset.pos = `${p.x},${p.y}`;
            // On a bridge holding two rings, the one nearer the head goes over the other.
            const twice = cells.filter(q => q.x === p.x && q.y === p.y).length > 1, first = cells.findIndex(q => q.x === p.x && q.y === p.y) === i;
            el.toggleAttribute('data-over', twice && first); el.toggleAttribute('data-under', twice && !first);
            put(el, p.x, p.y);
        });
    };
    /** Food eaten, the row of leaves to eat and the cocoon. */
    const world = (s: State): void => {
        const level = levelOf(s.level);
        foodsOf(level).forEach((_, i) => {
            const eaten = Boolean(s.eaten & (1 << i));
            root.querySelector(`[data-food="${i}"]`)?.toggleAttribute('data-eaten', eaten);
            root.querySelector(`[data-goal="${i}"]`)?.toggleAttribute('data-eaten', eaten);
        });
        root.querySelector('[data-cocoon]')?.toggleAttribute('data-ready', ready(level, s.eaten));
    };
    /** The arrows around the head, and what shines when the help is on. */
    const marks = (): void => {
        const s = session.state, l = observed.layout, layer = root.querySelector('[data-arrows]'); if (!s || !l || !layer) return;
        const busy = observed.busy || s.finished, h0 = cellXY(levelOf(s.level), s.body[0]!);
        layer.innerHTML = busy ? '' : arrowsSvg(moves.flatMap(m => { const r = step({ ...s, dry: 0, idle: 0 }, m); return r && !r.fail ? [{ action: m, x: h0.x + DELTA[m][0], y: h0.y + DELTA[m][1] }] : []; }), l);
        const h = !busy && helpOn(s) ? hint(s) : null;
        zone()?.toggleAttribute('data-help', Boolean(h));
        root.querySelectorAll('.chenille-hint').forEach(el => el.classList.remove('chenille-hint'));
        if (h === 'retourne') root.querySelector('#chenille-tourne')?.classList.add('chenille-hint');
        else if (h) root.querySelector(`[data-arrow="${h}"] .chenille-arrow`)?.classList.add('chenille-hint');
        const back = root.querySelector<HTMLButtonElement>('#chenille-retour');
        if (back) back.disabled = busy || !session.history.length;
        const turn = root.querySelector<HTMLButtonElement>('#chenille-tourne');
        if (turn) turn.disabled = busy;
    };
    const effect = (x: number, y: number, inner: string): void => {
        const l = observed.layout; if (!l) return;
        root.querySelector('[data-effects]')?.insertAdjacentHTML('beforeend', `<g transform="translate(${cx(l, x, y)} ${cy(l, x, y)})">${inner}</g>`);
    };
    /** The thing on the cell of a funny try: a stone, a rainbow leaf, the cocoon or a flower. */
    const thing = (kind: Fail, x: number, y: number): Element | null =>
        kind === 'caillou' ? root.querySelector(`[data-stone="${x},${y}"] .chenille-caillou`)
            : kind === 'couleur' ? root.querySelector(`[data-food][data-pos="${x},${y}"]:not([data-eaten]) .chenille-inner`)
                : kind === 'cocon' ? root.querySelector('[data-cocoon] .chenille-cocon')
                    : kind === 'fleur' ? root.querySelector(`[data-flower="${x},${y}"] .chenille-fleur`) : null;
    /** A funny try: the head leans towards the cell, plays its reaction, the thing there plays its own, and nothing moves. */
    const funny = async (s: State, fail: { kind: Fail; x: number; y: number }): Promise<void> => {
        observed.fail = fail.kind; say(t.fail[fail.kind]);
        recordActivation(`chenille:try:${fail.kind}`, 'action', false, fail.kind);
        const level = levelOf(s.level), h = cellXY(level, s.body[0]!), l = observed.layout;
        const headEl = root.querySelector<SVGGElement>('[data-seg="0"]'), inner = headEl?.querySelector<SVGGElement>('.chenille-inner');
        const tunnel = Math.abs(fail.x - h.x) + Math.abs(fail.y - h.y) > 1;
        if (inner && headEl && l) {
            const dx = tunnel ? 0 : Math.sign(cx(l, fail.x, fail.y) - cx(l, h.x, h.y)), dy = tunnel ? 0 : Math.sign(cy(l, fail.x, fail.y) - cy(l, h.x, h.y));
            inner.style.setProperty('--dx', `${dx * U * .3}px`); inner.style.setProperty('--dy', `${dy * U * .3}px`);
            inner.classList.add(failAnimations[fail.kind]); headEl.classList.add(`chenille-visage-${failFaces[fail.kind]}`);
        }
        const body = root.querySelector('[data-body]');
        if (fail.kind === 'corps') body?.classList.add('chenille-gigote');
        const anim = thingAnimations[fail.kind], target = anim ? thing(fail.kind, fail.x, fail.y) : null;
        if (target && anim) target.classList.add(anim);
        const fx = effects[fail.kind], onHead = fail.kind === 'corps' || fail.kind === 'demitour';
        if (fx) effect(onHead ? h.x : fail.x, onHead ? h.y : fail.y, fx);
        // The bubble stays inside the garden, leans away from the side of the try, and goes below the head when the try is
        // upwards or on the top row, so the thing tried stays visible.
        const word = failWords[locale][fail.kind], half = bubbleWidth(word) / 2 + 14, at = l ? cx(l, h.x, h.y) : 0, w = l?.W ?? 0;
        const side = l ? -Math.sign(cx(l, fail.x, fail.y) - at) * 30 : 0, top = l ? cy(l, h.x, h.y) - l.oy < U || cy(l, fail.x, fail.y) < cy(l, h.x, h.y) : false;
        effect(h.x, h.y, `<g transform="translate(${Math.min(w - half, Math.max(half, at + side)) - at} ${top ? 140 : 0})">${bubble(word)}</g>`);
        await wait(FAIL_MS);
        if (gone()) return;
        inner?.classList.remove(failAnimations[fail.kind]); headEl?.classList.remove(`chenille-visage-${failFaces[fail.kind]}`);
        body?.classList.remove('chenille-gigote');
        if (target && anim) target.classList.remove(anim);
        const layer = root.querySelector('[data-effects]'); if (layer) layer.innerHTML = '';
        observed.fail = null;
    };
    /** The end: the caterpillar curls up into the cocoon, and a butterfly flies out of it. */
    const butterflyOut = async (s: State): Promise<void> => {
        const level = levelOf(s.level), c = cocoonOf(level);
        root.querySelector('[data-body]')?.classList.add('chenille-rentre');
        root.querySelector('[data-cocoon] .chenille-cocon')?.classList.add('chenille-eclot');
        effect(c.x, c.y, butterfly());
        await wait(BUTTERFLY_MS);
    };
    const act = async (a: Action, how: string): Promise<void> => {
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
        recordActivation(`chenille:step:${how}`, 'action', true, a);
        session.history.push(s); session.state = r.state;
        const level = levelOf(s.level);
        if (a === 'retourne') { root.querySelector('[data-body]')?.classList.add('chenille-tourne'); drawBody(r.state, false); say(t.turned, false); }
        else drawBody(r.state, true);
        if (r.ate) {
            const el = root.querySelector(`[data-food="${foodsOf(level).indexOf(r.ate)}"]`);
            el?.classList.add('chenille-croque');
            const becameReady = ready(level, r.state.eaten) && !ready(level, s.eaten);
            say(becameReady ? t.ready : r.ate.kind === 'sucree' ? t.sweet : r.ate.kind === 'pomme' ? t.apple : t.yum, becameReady);
        }
        else if (a !== 'retourne' && ([t.yum, t.sweet, t.apple, t.ready, t.turned, t.undo] as string[]).includes(message)) say(t.goal, false);
        await wait(STEP_MS);
        if (gone()) return;
        root.querySelector('[data-body]')?.classList.remove('chenille-tourne');
        root.querySelectorAll('.chenille-croque').forEach(e => e.classList.remove('chenille-croque'));
        world(r.state);
        if (r.state.finished) {
            await butterflyOut(r.state);
            if (gone()) return;
            observed.busy = false;
            session.records = complete(session.records, r.state); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        observed.busy = false;
        marks();
    };
    const back = (): void => {
        const s = session.state, before = session.history.pop();
        if (!s || !before || observed.busy || s.finished) return;
        recordActivation('chenille:back', 'action', true, 'back');
        session.state = undo(before, s);
        drawBody(session.state, false); world(session.state); say(t.undo, false); marks();
    };
    const cellUnder = (px: number, py: number): { x: number; y: number } | null => {
        const s = session.state, r = svgEl()?.getBoundingClientRect(), l = observed.layout;
        if (!s || !r || !l) return null;
        const level = levelOf(s.level), scale = r.width / l.W, { x, y } = gameCell(l, Math.floor(((px - r.x) / scale - l.ox) / U), Math.floor(((py - r.y) / scale - l.oy) / U));
        return x < 0 || x >= width(level) || y < 0 || y >= height(level) ? null : { x, y };
    };
    /** A touch on a cell next to the head: the caterpillar goes there. */
    const touch = (p: { x: number; y: number }): void => {
        const s = session.state!, h = cellXY(levelOf(s.level), s.body[0]!), m = moves.find(k => h.x + DELTA[k][0] === p.x && h.y + DELTA[k][1] === p.y);
        if (m) void act(m, 'tap');
    };
    /** The board, built once the stage has its size: it takes the whole height left between Lumi and the buttons. */
    const fill = (): void => {
        const s = session.state, z = zone(), stage = root.querySelector('.chenille-stage'); if (!s || !z || !stage) return;
        const box = stage.getBoundingClientRect(), level = levelOf(s.level), l = layout(level, box.width, box.height);
        observed.layout = l;
        z.style.width = `${box.width}px`; z.style.height = `${box.height}px`;
        z.innerHTML = boardSvg(level, l, locale);
        drawBody(s, false); world(s); marks();
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'chenille:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'chenille:listen');
        const again = root.querySelector<HTMLElement>('#chenille-again'), next = root.querySelector<HTMLElement>('#chenille-next');
        if (again) bindAction(again, () => play(start(s.level), true), `chenille:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `chenille:next:${s.level}`);
        bindAction(root.querySelector<HTMLElement>('#chenille-retour')!, back, 'chenille:back-button');
        bindAction(root.querySelector<HTMLElement>('#chenille-tourne')!, () => void act('retourne', 'button'), 'chenille:turn-button');
        fill();
        if (s.finished) { root.querySelector('[data-body]')?.classList.add('chenille-rentre'); const c = cocoonOf(levelOf(s.level)); effect(c.x, c.y, butterfly()); }
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
            if (Math.max(Math.abs(dx), Math.abs(dy)) >= SLIDE * cell) { void act(onScreen(l, Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut')), 'slide'); return; }
            const at = cellUnder(e.clientX, e.clientY); if (at) touch(at);
        });
        z.addEventListener('pointercancel', () => { down = null; });
        z.addEventListener('keydown', e => {
            const keys: Record<string, Move> = { ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite' };
            const l = observed.layout, k = keys[e.key], m = k && l ? onScreen(l, k) : k;
            if (m) { e.preventDefault(); void act(m, 'key'); }
            else if (e.key === 'Backspace') { e.preventDefault(); back(); }
            else if (e.key === ' ') { e.preventDefault(); void act('retourne', 'key'); }
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
