import { carrotsOn, complete, countAt, height, helpOn, hint, isUnlocked, levelOf, molesOf, parseRecords, play as playEngine, start, width, type Action, type Event, type Fail, type Records, type State } from '../../engines/taupes';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { bubble, bubbleWidth, carrot, confetti, funnyAnimations, funnyWords, ladybird, mole, pollen, rabbit, shine, sparkle, tutuAnimations, U, worm } from './art';
import { boardSvg, cellKind, cellSvg, cx, cy, gameView, instruction, labels, layout, levelView, pocketHtml, typeset, type Layout } from './view';

export const RECORDS_KEY = 'opencadkid.taupes.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the tool chosen and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; mode?: 'creuser' | 'carotte' }
/** Durations, in ms: a funny try, the cells opening one after the other, a carrot put down. */
export const FAIL_MS = 1400, OPEN_STEP_MS = 70, OPEN_MS = 380, CARROT_MS = 350;
/** A finger kept this long on a clod puts a carrot on it (once the carrot has come in). */
export const LONG_PRESS_MS = 450;
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { busy: boolean; funny: Fail[]; layout: Layout | null } = { busy: false, funny: [], layout: null };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.taupes-zone svg')?.getBoundingClientRect(), s = session.state, l = observed.layout;
    let geom = null;
    if (r && s && l) { const scale = r.width / l.W, level = levelOf(s.level); geom = { x0: r.x + l.ox * scale, y0: r.y + l.oy * scale, cell: U * scale, w: width(level), h: height(level) }; }
    return { ...session, mode: session.mode ?? 'creuser', zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, geom, hint: s ? hint(s) : null, busy: observed.busy, funny: [...observed.funny] };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', press: { id: number; x: number; y: number; timer: number; long: boolean } | null = null;
    observed = { busy: false, funny: [], layout: null };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const later = (ms: number, f: () => void): number => { const id = window.setTimeout(() => { timers.delete(id); f(); }, ms); timers.add(id); return id; };
    const wait = (ms: number): Promise<void> => new Promise(done => { later(reduce ? Math.min(ms, 40) : ms, done); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'taupes:home');
        root.querySelectorAll<HTMLElement>('[data-taupes-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.taupesLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `taupes:level:${el.dataset.taupesLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#taupes-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.taupes-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.taupes-zone svg');
    const mode = (): 'creuser' | 'carotte' => session.mode ?? 'creuser';
    const at = (i: number): string => { const l = observed.layout!, w = width(levelOf(session.state!.level)); return `transform="translate(${cx(l, i % w)} ${cy(l, Math.floor(i / w))})"`; };
    /** Redraws one cell from the state. */
    const redraw = (s: State, i: number): void => {
        const el = root.querySelector(`[data-cell="${i}"]`), level = levelOf(s.level);
        if (!el) return;
        el.setAttribute('data-kind', cellKind(level, s, i));
        const inner = el.querySelector('.taupes-inner'); if (inner) inner.innerHTML = cellSvg(level, s, i);
    };
    const pocket = (s: State): void => { const p = root.querySelector('.taupes-poche'); if (p) p.outerHTML = pocketHtml(levelOf(s.level), s, locale); };
    /** The shining clod, once the help is on. */
    const marks = (): void => {
        const s = session.state, layer = root.querySelector('[data-marks]'); if (!s || !layer || !observed.layout) return;
        const h = !observed.busy ? hint(s) : null;
        layer.innerHTML = h !== null ? `<g data-hint="${h}" ${at(h)}>${shine()}</g>` : '';
        zone()?.toggleAttribute('data-help', h !== null);
    };
    const effect = (i: number | null, inner: string, point?: { x: number; y: number }): void => {
        const l = observed.layout; if (!l) return;
        const place = point ? `transform="translate(${point.x} ${point.y})"` : i !== null ? at(i) : '';
        root.querySelector('[data-effects]')?.insertAdjacentHTML('beforeend', `<g ${place}>${inner}</g>`);
    };
    /** A bubble with a sound word above a point, kept inside the garden. */
    const bubbleAt = (p: { x: number; y: number }, word: string): void => {
        const l = observed.layout; if (!l) return;
        const half = bubbleWidth(word) / 2 + 14, shift = Math.min(l.W - half, Math.max(half, p.x)) - p.x, below = p.y < 110;
        effect(null, `<g transform="translate(${shift} ${below ? 130 : 0})">${bubble(word)}</g>`, p);
    };
    const centre = (i: number): { x: number; y: number } => { const l = observed.layout!, w = width(levelOf(session.state!.level)); return { x: cx(l, i % w), y: cy(l, Math.floor(i / w)) }; };
    const guide = (): HTMLElement | null => root.querySelector<HTMLElement>('.taupes-tutu');
    /** A funny try: the thing touched plays its animation (the mole yawns, a rabbit runs off with the carrot, the flower
     * sneezes, the carrot jumps, the worm waves, the rock rings), Tutu reacts in his corner; nothing changes. */
    const funny = async (fail: Fail, cell: number | null, point: { x: number; y: number } | null): Promise<void> => {
        observed.funny = [fail]; say(t.funny[fail]);
        recordActivation(`taupes:try:${fail}`, 'action', false, fail);
        const cls = funnyAnimations[fail], played: [Element, string][] = [];
        const add = (el: Element | null | undefined, c: string): void => { if (el) { el.classList.add(c); played.push([el, c]); } };
        const cellEl = cell !== null ? root.querySelector(`[data-cell="${cell}"] .taupes-inner`) : null;
        const p = cell !== null ? centre(cell) : point ?? { x: observed.layout!.W / 2, y: observed.layout!.oy };
        switch (fail) {
            case 'baille': effect(cell, `<g class="${cls}">${mole(false)}</g>`); break;
            case 'lapin': effect(cell, `<g class="${cls}">${rabbit()}</g>`); break;
            case 'pollen': add(cellEl, cls); effect(cell, `<g class="taupes-nuage">${pollen()}</g>`); break;
            case 'saute': add(root.querySelector(`[data-cell="${cell}"] .taupes-carotte`), cls); effect(cell, `<g class="taupes-etoiles">${sparkle()}</g>`); break;
            case 'rocher': add(cellEl?.querySelector('.taupes-caillou'), cls); effect(cell, `<g class="taupes-coccinelle">${ladybird()}</g>`); break;
            case 'ver': effect(null, `<g class="${cls}">${worm()}</g>`, p); break;
            case 'galipette': add(guide(), cls); break;
        }
        if (fail !== 'galipette') add(guide(), tutuAnimations[fail]);
        bubbleAt(fail === 'galipette' ? { x: observed.layout!.W / 2, y: observed.layout!.oy + 20 } : p, funnyWords[locale][fail]);
        await wait(FAIL_MS);
        if (gone()) return;
        for (const [el, c] of played) el.classList.remove(c);
        const layer = root.querySelector('[data-effects]'); if (layer) layer.innerHTML = '';
        observed.funny = [];
    };
    /** The party: every mole comes out awake, gets its carrot (Tutu gives the missing ones) and dances in confetti. */
    const party = (s: State): void => {
        const level = levelOf(s.level);
        const face = guide(); if (face) face.classList.add('taupes-tutu-fete');
        molesOf(level).forEach((i, k) => {
            const el = root.querySelector(`[data-cell="${i}"] .taupes-inner`); if (el) el.innerHTML = '';
            effect(i, `<g class="taupes-fete" style="animation-delay:${k * 120}ms">${mole(true)}<g transform="translate(26 18) rotate(-60) scale(.5)">${carrot()}</g></g><g class="taupes-confettis">${confetti(k + 2)}</g>`);
        });
    };
    const act = async (a: Action, how: string, point: { x: number; y: number } | null = null): Promise<void> => {
        const s = session.state;
        if (!s || s.finished || observed.busy) return;
        const r = playEngine(s, a);
        if (!r) return;
        observed.busy = true; marks();
        const fail = r.events.find((e): e is Extract<Event, { kind: 'fail' }> => e.kind === 'fail');
        if (fail) {
            await funny(fail.fail, fail.cell, point);
            if (gone()) return;
            session.state = r.state; observed.busy = false; if (helpOn(r.state) && !helpOn(s)) say(t.shine); marks(); return;
        }
        recordActivation(`taupes:${a.kind}:${how}`, 'action', true, a.kind);
        session.state = r.state;
        for (const e of r.events) {
            if (e.kind === 'carotte' || e.kind === 'reprise') {
                redraw(r.state, e.cell); pocket(r.state);
                if (e.kind === 'carotte') root.querySelector(`[data-cell="${e.cell}"] .taupes-carotte`)?.classList.add('taupes-plante');
                say(e.kind === 'carotte' ? t.placed : t.taken);
                await wait(CARROT_MS); if (gone()) return;
            }
            if (e.kind === 'ouvre') {
                const level = levelOf(r.state.level);
                e.cells.forEach((c, k) => later(reduce ? 0 : k * OPEN_STEP_MS, () => { redraw(r.state, c); root.querySelector(`[data-cell="${c}"] .taupes-inner`)?.classList.add('taupes-ouvre'); }));
                if (!r.state.finished) say(t.near(countAt(level, e.cells[0]!)));
                await wait(OPEN_MS + Math.min(e.cells.length, 12) * OPEN_STEP_MS); if (gone()) return;
            }
        }
        observed.busy = false;
        if (r.state.finished) {
            session.records = complete(session.records, r.state); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        marks();
    };
    const cellUnder = (px: number, py: number): number | null => {
        const s = session.state, r = svgEl()?.getBoundingClientRect(), l = observed.layout;
        if (!s || !r || !l) return null;
        const level = levelOf(s.level), scale = r.width / l.W, x = Math.floor(((px - r.x) / scale - l.ox) / U), y = Math.floor(((py - r.y) / scale - l.oy) / U);
        return x < 0 || x >= width(level) || y < 0 || y >= height(level) ? null : y * width(level) + x;
    };
    const toUnits = (px: number, py: number): { x: number; y: number } => { const r = svgEl()!.getBoundingClientRect(), l = observed.layout!, scale = r.width / l.W; return { x: (px - r.x) / scale, y: (py - r.y) / scale }; };
    /** A touch: a cell is dug (or gets a carrot, with the carrot tool); the lawn round the garden is the earthworms'. */
    const touch = (px: number, py: number, long: boolean): void => {
        const s = session.state; if (!s) return;
        const i = cellUnder(px, py);
        if (i === null) { void act({ kind: 'bord' }, 'tap', toUnits(px, py)); return; }
        const kind = (long || mode() === 'carotte') && carrotsOn(s.level) ? 'carotte' : 'creuser';
        void act({ kind, cell: i }, long ? 'long' : 'tap');
    };
    const setMode = (m: 'creuser' | 'carotte'): void => {
        session.mode = m;
        root.querySelector('#taupes-creuser')?.setAttribute('aria-pressed', String(m === 'creuser'));
        root.querySelector('#taupes-carotte')?.setAttribute('aria-pressed', String(m === 'carotte'));
        zone()?.setAttribute('data-mode', m);
    };
    const fill = (): void => {
        const s = session.state, z = zone(), stage = root.querySelector('.taupes-stage'); if (!s || !z || !stage) return;
        const rect = stage.getBoundingClientRect(), level = levelOf(s.level), l = layout(level, rect.width, rect.height);
        observed.layout = l;
        z.style.width = `${rect.width}px`; z.style.height = `${rect.height}px`;
        z.innerHTML = boardSvg(level, s, l, locale);
        z.setAttribute('data-mode', mode());
        marks();
        if (s.finished) party(s);
    };
    const draw = (): void => {
        const s = session.state!;
        if (!carrotsOn(s.level)) session.mode = 'creuser';
        root.innerHTML = gameView(s, levelOf(s.level), locale, message, mode(), reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'taupes:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) && hint(st) !== null ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'taupes:listen');
        bindAction(root.querySelector<HTMLElement>('#guide')!, () => void act({ kind: 'tutu' }, 'tap'), 'taupes:tutu');
        const again = root.querySelector<HTMLElement>('#taupes-again'), next = root.querySelector<HTMLElement>('#taupes-next');
        if (again) bindAction(again, () => play(start(s.level), true), `taupes:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `taupes:next:${s.level}`);
        const dig = root.querySelector<HTMLElement>('#taupes-creuser'), car = root.querySelector<HTMLElement>('#taupes-carotte');
        if (dig) bindAction(dig, () => setMode('creuser'), 'taupes:mode-creuser');
        if (car) bindAction(car, () => setMode(mode() === 'carotte' ? 'creuser' : 'carotte'), 'taupes:mode-carotte');
        fill();
        const z = zone()!;
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary || observed.busy || session.state!.finished) return;
            e.preventDefault();
            const x = e.clientX, y = e.clientY, i = cellUnder(x, y);
            const p = { id: e.pointerId, x, y, long: false, timer: 0 };
            // A finger kept on a clod: the carrot, straight away, so the child feels it.
            if (i !== null && carrotsOn(session.state!.level)) p.timer = later(LONG_PRESS_MS, () => { if (press === p) { p.long = true; touch(x, y, true); } });
            press = p;
            try { z.setPointerCapture(e.pointerId); } catch { /* A finger already gone: the tap still counts. */ }
        });
        z.addEventListener('pointerup', e => {
            if (!e.isPrimary || !press || press.id !== e.pointerId) return;
            const p = press; press = null; clearTimeout(p.timer); timers.delete(p.timer);
            if (!p.long) touch(p.x, p.y, false);
        });
        z.addEventListener('pointercancel', () => { if (press) { clearTimeout(press.timer); press = null; } });
        z.addEventListener('keydown', e => {
            // Keyboard: a focus cell moved with the arrows, Space digs, C puts a carrot.
            const s = session.state; if (!s) return;
            const level = levelOf(s.level), w = width(level), h = height(level);
            const cur = Number(z.dataset.focus ?? 0), x = cur % w, y = Math.floor(cur / w);
            const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
            const m = moves[e.key];
            if (m) { e.preventDefault(); const nx = Math.min(w - 1, Math.max(0, x + m[0])), ny = Math.min(h - 1, Math.max(0, y + m[1])); z.dataset.focus = String(ny * w + nx); focusMark(); }
            else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); void act({ kind: mode() === 'carotte' && carrotsOn(s.level) ? 'carotte' : 'creuser', cell: cur }, 'key'); }
            else if (e.key === 'c' || e.key === 'C') { if (carrotsOn(s.level)) { e.preventDefault(); void act({ kind: 'carotte', cell: cur }, 'key'); } }
        });
        z.addEventListener('focus', focusMark);
    };
    const focusMark = (): void => {
        const z = zone(), layer = root.querySelector('[data-effects]'); if (!z || !layer || !observed.layout) return;
        layer.querySelector('[data-focus-ring]')?.remove();
        layer.insertAdjacentHTML('beforeend', `<g data-focus-ring ${at(Number(z.dataset.focus ?? 0))}><rect x="-48" y="-48" width="96" height="96" rx="14" fill="none" stroke="#8d68a0" stroke-width="6"/></g>`);
    };
    const resize = (): void => { if (session.screen === 'play' && session.state && !observed.busy) fill(); };
    window.addEventListener('resize', resize);
    function play(s: State, fresh: boolean): void {
        observed = { busy: false, funny: [], layout: null };
        for (const id of timers) clearTimeout(id); timers.clear();
        session.screen = 'play'; session.state = s;
        if (fresh) session.mode = 'creuser';
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; window.removeEventListener('resize', resize); for (const id of timers) clearTimeout(id); timers.clear(); };
}
