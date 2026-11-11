import { complete, cross, DELTA, friendsAt, height, helpOn, hint, isCarton, isUnlocked, levelOf, moves, parseRecords, start, step, width, type Action, type Fail, type Move, type Reaction, type Records, type Result, type State } from '../../engines/cartons';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { arrow, box, bubble, bubbleWidth, clown, confetti, friend, funnyAnimations, funnyWords, reach, shine, treasure, tutu, U } from './art';
import { boardSvg, cx, cy, gameView, instruction, labels, layout, levelView, shelfHtml, thing, typeset, type Layout } from './view';

export const RECORDS_KEY = 'opencadkid.cartons.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
/** Durations, in ms: one step, a funny try, a pouf and its reactions. */
export const STEP_MS = 220, FAIL_MS = 1300, POUF_MS = 1400;
/** How far a finger slides, in cells, before it is a step on that side. */
export const SLIDE = 0.3;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** The reaction said aloud when a pouf has several: the most surprising first. */
const ORDER: readonly Reaction[] = ['coucou', 'danse', 'eternue', 'rebond', 'pfff'];
let observed: { busy: boolean; funny: (Fail | Reaction)[]; layout: Layout | null } = { busy: false, funny: [], layout: null };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.cartons-zone svg')?.getBoundingClientRect(), s = session.state, l = observed.layout;
    let geom = null;
    if (r && s && l) { const scale = r.width / l.W, level = levelOf(s.level); geom = { x0: r.x + l.ox * scale, y0: r.y + l.oy * scale, cell: U * scale, w: width(level), h: height(level) }; }
    const h = s && helpOn(s) ? hint(s) : null;
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, geom, hint: h ? { kind: h.kind, x: h.x, y: h.y } : null, busy: observed.busy, funny: [...observed.funny] };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', down: { x: number; y: number } | null = null;
    observed = { busy: false, funny: [], layout: null };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 40) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'cartons:home');
        root.querySelectorAll<HTMLElement>('[data-cartons-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.cartonsLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `cartons:level:${el.dataset.cartonsLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#cartons-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.cartons-zone');
    const svgEl = (): SVGSVGElement | null => root.querySelector<SVGSVGElement>('.cartons-zone svg');
    const at = (x: number, y: number): string => { const l = observed.layout!; return `transform="translate(${cx(l, x)} ${cy(l, y)})"`; };
    const put = (el: Element | null, x: number, y: number): void => { const l = observed.layout; if (el && l) (el as SVGGElement).style.transform = `translate(${cx(l, x)}px,${cy(l, y)}px)`; };
    /** Cartons and bonuses, the boxes with their count, and the dotted cross each box will cover. */
    const world = (s: State): void => {
        const level = levelOf(s.level), w = width(level), l = observed.layout;
        const things = root.querySelector('[data-things]'), boxes = root.querySelector('[data-boxes]'), marks = root.querySelector('[data-reach]');
        if (!things || !boxes || !marks || !l) return;
        things.innerHTML = s.grid.split('').map((c, i) => { const inner = thing(c); return inner ? `<g data-cell="${i % w},${Math.floor(i / w)}" data-kind="${isCarton(c) ? 'carton' : 'bonus'}" ${at(i % w, Math.floor(i / w))}><g class="cartons-inner">${inner}</g></g>` : ''; }).join('');
        boxes.innerHTML = s.boxes.map(b => `<g data-box="${b.x},${b.y}" data-count="${b.count}" ${at(b.x, b.y)}><g class="cartons-inner">${box(b.count)}</g></g>`).join('');
        const covered = new Set<string>();
        for (const b of s.boxes) { const c = cross(level, s.grid, b.x, b.y, s.range); for (const p of [...c.cells, ...c.cartons]) covered.add(`${p.x},${p.y}`); }
        marks.innerHTML = [...covered].map(k => { const [x, y] = k.split(',').map(Number); return `<g data-reach="${k}" ${at(x!, y!)}>${reach()}</g>`; }).join('');
        const shelf = root.querySelector('.cartons-shelf');
        if (shelf) shelf.outerHTML = shelfHtml(level, s, locale);
    };
    const heroAt = (s: State): void => put(root.querySelector('[data-hero]'), s.x, s.y);
    const friendsOf = (s: State): void => {
        const level = levelOf(s.level), layer = root.querySelector('[data-friends]'); if (!layer) return;
        friendsAt(level, s.t).forEach((p, i) => {
            let el = root.querySelector(`[data-friend="${i}"]`);
            if (!el) { layer.insertAdjacentHTML('beforeend', `<g data-friend="${i}" data-pal="${level.friends[i]!.kind}"><g class="cartons-inner">${friend(level.friends[i]!.kind)}</g></g>`); el = root.querySelector(`[data-friend="${i}"]`); }
            put(el, p.x, p.y);
        });
    };
    /** The arrows around Tutu and, once the help is on, the cell that shines. */
    const marks = (): void => {
        const s = session.state, l = observed.layout, layer = root.querySelector('[data-arrows]'); if (!s || !l || !layer) return;
        const busy = observed.busy || s.finished, h = !busy && helpOn(s) ? hint(s) : null;
        const ways = busy ? [] : moves.filter(m => { const r = step({ ...s, dry: 0 }, m); return r && !r.fail; });
        layer.innerHTML = (h ? `<g data-hint="${h.x},${h.y}" ${at(h.x, h.y)}>${shine()}</g>` : '')
            + ways.map(m => `<g data-arrow="${m}" ${at(s.x + DELTA[m][0], s.y + DELTA[m][1])}><g class="cartons-fleche">${arrow({ haut: -90, bas: 90, gauche: 180, droite: 0 }[m])}</g></g>`).join('');
        zone()?.toggleAttribute('data-help', Boolean(h));
        for (const id of ['#cartons-poser', '#cartons-attendre']) { const b = root.querySelector<HTMLButtonElement>(id); if (b) b.disabled = busy; }
        root.querySelector('#cartons-poser')?.toggleAttribute('data-hint', Boolean(h && h.kind === 'poser' && h.x === s.x && h.y === s.y));
    };
    const effect = (x: number, y: number, inner: string): void => {
        const l = observed.layout; if (!l) return;
        root.querySelector('[data-effects]')?.insertAdjacentHTML('beforeend', `<g ${at(x, y)}>${inner}</g>`);
    };
    /** A bubble with a sound word above a cell, kept inside the yard. */
    const bubbleAt = (x: number, y: number, word: string, under = false): void => {
        const l = observed.layout; if (!l) return;
        // Under the cell when the clown springs up out of it, or when the cell is on the top row.
        const half = bubbleWidth(word) / 2 + 14, px = cx(l, x), shift = Math.min(l.W - half, Math.max(half, px)) - px, below = under || cy(l, y) - l.oy < U;
        effect(x, y, `<g transform="translate(${shift} ${below ? 140 : 0})">${bubble(word)}</g>`);
    };
    const hero = (): { el: SVGGElement | null; inner: SVGGElement | null } => { const el = root.querySelector<SVGGElement>('[data-hero]'); return { el, inner: el?.querySelector<SVGGElement>('.cartons-inner') ?? null }; };
    const face = (expression: 'joie' | 'surprise' | 'celebration'): void => { const f = root.querySelector('.cartons-tutu'); if (f) f.innerHTML = tutu(expression); };
    /** A funny try: Tutu leans towards the cell and plays his reaction; nothing moves. */
    const funny = async (s: State, fail: { kind: Fail; x: number; y: number }): Promise<void> => {
        observed.funny = [fail.kind]; say(t.funny[fail.kind]);
        recordActivation(`cartons:try:${fail.kind}`, 'action', false, fail.kind);
        const { el, inner } = hero(), l = observed.layout, cls = funnyAnimations[fail.kind];
        if (inner && l) { inner.style.setProperty('--dx', `${Math.sign(fail.x - s.x) * U * .3}px`); inner.style.setProperty('--dy', `${Math.sign(fail.y - s.y) * U * .3}px`); inner.classList.add(cls); }
        face('surprise');
        // The thing touched plays too: the carton shakes, the box giggles.
        const other = fail.kind === 'carton' ? root.querySelector(`[data-cell="${fail.x},${fail.y}"] .cartons-inner`) : fail.kind === 'boite' ? root.querySelector(`[data-box="${fail.x},${fail.y}"] .cartons-inner`) : null;
        other?.classList.add('cartons-secoue');
        el?.classList.add(`cartons-essai-${fail.kind}`);
        bubbleAt(s.x, s.y, funnyWords[locale][fail.kind]);
        await wait(FAIL_MS);
        if (gone()) return;
        inner?.classList.remove(cls); other?.classList.remove('cartons-secoue'); el?.classList.remove(`cartons-essai-${fail.kind}`); face('joie');
        const layer = root.querySelector('[data-effects]'); if (layer) layer.innerHTML = '';
        observed.funny = [];
    };
    /** The poufs of a gesture: confetti on every cell of each cross, cartons opening, treasures jumping out, and the funny
     * reactions (a sneeze, a clown, a rain of confetti on the bricks, a dancing friend, a damp « pfff »). */
    const poufs = async (r: Result): Promise<void> => {
        observed.funny = [...r.reactions];
        const { inner } = hero();
        const classes: [Element, string][] = [];
        const play = (el: Element | null | undefined, cls: string): void => { if (el) { el.classList.add(cls); classes.push([el, cls]); } };
        let seed = 0;
        for (const p of r.poufs) {
            const boxEl = root.querySelector(`[data-box="${p.x},${p.y}"]`);
            if (boxEl) boxEl.querySelector('.cartons-pastille')?.remove();
            if (p.pfff) { play(boxEl?.querySelector('.cartons-inner'), funnyAnimations.pfff); effect(p.x, p.y, '<g class="cartons-fumee"><circle cx="-10" cy="-30" r="12" fill="#d8d0c8"/><circle cx="8" cy="-40" r="9" fill="#e6dfd8"/></g>'); continue; }
            boxEl?.remove();
            for (const c of p.cells) effect(c.x, c.y, `<g class="cartons-confettis">${confetti(seed++)}</g>`);
            for (const h of p.hits) {
                const cell = root.querySelector(`[data-cell="${h.x},${h.y}"] .cartons-inner`);
                effect(h.x, h.y, `<g class="cartons-confettis">${confetti(seed++)}</g>`);
                if (!h.opened) { play(cell, 'cartons-secoue'); continue; }
                cell?.remove();
                effect(h.x, h.y, h.treasure ? `<g class="cartons-sort">${treasure(h.treasure)}</g>` : `<g class="${funnyAnimations.coucou}">${clown()}</g>`);
            }
            for (const b of p.bricks) effect(b.x, b.y, `<g class="${funnyAnimations.rebond}">${confetti(seed++)}</g>`);
            for (const f of p.friends) play(root.querySelector(`[data-friend="${f}"] .cartons-inner`), funnyAnimations.danse);
            if (p.tutu) { play(inner, funnyAnimations.eternue); face('surprise'); }
        }
        // What is said: a treasure first, otherwise the most surprising reaction.
        const main = ORDER.find(x => r.reactions.includes(x));
        if (r.found.length) say(r.found.map(k => t.found[k]).join(' '));
        else if (main) say(t.funny[main]);
        if (main) { bubbleAt(...where(r, main), funnyWords[locale][main], main === 'coucou'); recordActivation(`cartons:pouf:${main}`, 'action', true, main); }
        await wait(POUF_MS);
        if (gone()) return;
        for (const [el, cls] of classes) el.classList.remove(cls);
        face('joie');
        const layer = root.querySelector('[data-effects]'); if (layer) layer.innerHTML = '';
        observed.funny = [];
    };
    /** Where the bubble of a reaction goes: on the clown, the friend, the bricks, Tutu or the damp box. */
    const where = (r: Result, main: Reaction): [number, number] => {
        const s = r.state, level = levelOf(s.level);
        for (const p of r.poufs) {
            if (main === 'pfff' && p.pfff) return [p.x, p.y];
            if (main === 'eternue' && p.tutu) return [s.x, s.y];
            if (main === 'danse' && p.friends.length) { const f = friendsAt(level, s.t)[p.friends[0]!]!; return [f.x, f.y]; }
            if (main === 'rebond' && p.bricks.length) return [p.bricks[0]!.x, p.bricks[0]!.y];
            const c = p.hits.find(h => h.opened && !h.treasure);
            if (main === 'coucou' && c) return [c.x, c.y];
        }
        return [s.x, s.y];
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
            session.state = r.state; observed.busy = false; marks(); return;
        }
        recordActivation(`cartons:${a}:${how}`, 'action', true, a);
        session.state = r.state;
        const { inner } = hero();
        if (a !== 'poser' && a !== 'attendre') { inner?.classList.remove('cartons-pas'); void inner?.getBoundingClientRect(); inner?.classList.add('cartons-pas'); }
        heroAt(r.state); friendsOf(r.state);
        // The boxes before the pouf: the new one put down (blown by a fan), the others counting down, the ones at zero still there.
        const showing: State = { ...r.state, grid: s.grid, boxes: [...r.state.boxes, ...r.poufs.map(p => ({ x: p.x, y: p.y, count: 0 }))] };
        if (r.placed?.blown) {
            const first: State = { ...showing, boxes: showing.boxes.map(b => b.x === r.placed!.to.x && b.y === r.placed!.to.y && b.count === 3 ? { ...b, x: r.placed!.x, y: r.placed!.y } : b) };
            world(first); await wait(STEP_MS); if (gone()) return;
            const el = root.querySelector(`[data-box="${r.placed.x},${r.placed.y}"]`);
            el?.classList.add('cartons-souffle'); put(el, r.placed.to.x, r.placed.to.y);
        } else world(showing);
        if (r.picked) say(r.picked === 'g' ? t.bigBox : t.moreBox);
        await wait(STEP_MS);
        if (gone()) return;
        if (r.poufs.length) { await poufs(r); if (gone()) return; }
        world(r.state);
        if (!r.poufs.length && r.placed) root.querySelector(`[data-box="${r.placed.to.x},${r.placed.to.y}"] .cartons-inner`)?.classList.add('cartons-pose');
        observed.busy = false;
        if (r.state.finished) {
            session.records = complete(session.records, r.state); writeRecords(storage, session.records); chime(sound());
            message = t.won; speak([message]); draw(); return;
        }
        if (helpOn(r.state) && !helpOn(s)) say(t.shine);
        marks();
    };
    const cellUnder = (px: number, py: number): { x: number; y: number } | null => {
        const s = session.state, r = svgEl()?.getBoundingClientRect(), l = observed.layout;
        if (!s || !r || !l) return null;
        const level = levelOf(s.level), scale = r.width / l.W, x = Math.floor(((px - r.x) / scale - l.ox) / U), y = Math.floor(((py - r.y) / scale - l.oy) / U);
        return x < 0 || x >= width(level) || y < 0 || y >= height(level) ? null : { x, y };
    };
    /** A touch on a cell next to Tutu walks there; a touch on Tutu himself puts the box down. */
    const touch = (p: { x: number; y: number }): void => {
        const s = session.state!;
        if (p.x === s.x && p.y === s.y) { void act('poser', 'tap'); return; }
        const m = moves.find(k => s.x + DELTA[k][0] === p.x && s.y + DELTA[k][1] === p.y);
        if (m) void act(m, 'tap');
    };
    /** The board, built once the stage has its size: it takes the whole height left between Tutu and the buttons. */
    const fill = (): void => {
        const s = session.state, z = zone(), stage = root.querySelector('.cartons-stage'); if (!s || !z || !stage) return;
        const rect = stage.getBoundingClientRect(), level = levelOf(s.level), l = layout(level, rect.width, rect.height);
        observed.layout = l;
        z.style.width = `${rect.width}px`; z.style.height = `${rect.height}px`;
        z.innerHTML = boardSvg(level, l, locale);
        world(s); heroAt(s); friendsOf(s); marks();
        if (s.finished) party(s);
    };
    /** The party at the end: confetti all over the yard, Tutu cheering, and every treasure found dancing round him. */
    const party = (s: State): void => {
        const level = levelOf(s.level), w = width(level), h = height(level);
        face('celebration');
        const free: [number, number][] = [];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (s.grid[y * w + x] === '.' && !(x === s.x && y === s.y)) free.push([x, y]);
        free.sort((a, b) => Math.hypot(a[0] - s.x, a[1] - s.y) - Math.hypot(b[0] - s.x, b[1] - s.y));
        free.forEach(([x, y], i) => effect(x, y, `<g class="cartons-fete">${confetti(i + 3)}</g>`));
        s.found.forEach((k, i) => { const p = free[i]; if (p) effect(p[0], p[1], `<g class="cartons-fete-tresor" style="animation-delay:${i * 120}ms">${treasure(k)}</g>`); });
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, levelOf(s.level), locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'cartons:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'cartons:listen');
        const again = root.querySelector<HTMLElement>('#cartons-again'), next = root.querySelector<HTMLElement>('#cartons-next');
        if (again) bindAction(again, () => play(start(s.level), true), `cartons:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `cartons:next:${s.level}`);
        bindAction(root.querySelector<HTMLElement>('#cartons-poser')!, () => void act('poser', 'button'), 'cartons:poser-button');
        bindAction(root.querySelector<HTMLElement>('#cartons-attendre')!, () => void act('attendre', 'button'), 'cartons:attendre-button');
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
            if (Math.max(Math.abs(dx), Math.abs(dy)) >= SLIDE * cell) { const m: Move = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut'); void act(m, 'slide'); return; }
            const p = cellUnder(e.clientX, e.clientY); if (p) touch(p);
        });
        z.addEventListener('pointercancel', () => { down = null; });
        z.addEventListener('keydown', e => {
            const keys: Record<string, Move> = { ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite' };
            const m = keys[e.key];
            if (m) { e.preventDefault(); void act(m, 'key'); }
            else if (e.key === ' ') { e.preventDefault(); void act('poser', 'key'); }
            else if (e.key === 'Enter') { e.preventDefault(); void act('attendre', 'key'); }
        });
    };
    const resize = (): void => { if (session.screen === 'play' && session.state && !observed.busy) fill(); };
    window.addEventListener('resize', resize);
    function play(s: State, fresh: boolean): void {
        observed = { busy: false, funny: [], layout: null };
        for (const id of timers) clearTimeout(id); timers.clear();
        session.screen = 'play'; session.state = s;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; window.removeEventListener('resize', resize); for (const id of timers) clearTimeout(id); timers.clear(); };
}
