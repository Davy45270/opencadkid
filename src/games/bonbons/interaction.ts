import { adjacent, complete, goodSwap, helpOn, isUnlocked, levelOf, parseRecords, start, swap, swappable, type Grid, type Miss, type Records, type Result, type State, type Step } from '../../engines/bonbons';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { CELL, missAnimations, missFace, tileSvg } from './art';
import { cellX, cellY, gameView, goalsHtml, instruction, labels, levelView, tileNode, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.bonbons.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the selected sweet and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; selected: number | null; cursor: number; last: { miss: Miss | null; valid: boolean; shuffled: boolean; spread: number | null } | null }
/** Durations of the little scenes, in ms: the swap slide, sweets popping, sweets falling, a funny try, the mix. */
export const SWAP_MS = 200, POP_MS = 300, FALL_MS = 320, MISS_MS = 1100, MIX_MS = 1000;
/** How far a finger slides, in cells, before it swaps with the neighbour on that side. */
export const SLIDE = 0.4;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { busy: boolean; miss: Miss | null; mixing: boolean } = { busy: false, miss: null, mixing: false };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.bonbons-zone svg')?.getBoundingClientRect(), s = session.state;
    const cells = r && s ? s.grid.map((_, i) => ({ x: r.x + cellX(s, i) / (s.cols * CELL) * r.width, y: r.y + cellY(s, i) / (s.rows * CELL) * r.height })) : [];
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, cell: r && s ? r.width / s.cols : 0, cells, help: s && helpOn(s) ? goodSwap(s) : null, ...observed };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', drag: { cell: number; x: number; y: number; was: boolean } | null = null;
    observed = { busy: false, miss: null, mixing: false };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 60) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null; session.last = null; session.selected = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'bonbons:home');
        root.querySelectorAll<HTMLElement>('[data-bonbons-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.bonbonsLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `bonbons:level:${el.dataset.bonbonsLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#bonbons-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    /** The tile the child moves is drawn above its neighbours. */
    const front = (id: number | undefined): void => { const el = id === undefined ? null : tileEl(id); el?.parentNode?.appendChild(el); };
    const zone = (): HTMLElement | null => root.querySelector<HTMLElement>('.bonbons-zone');
    const tileEl = (id: number): SVGGElement | null => root.querySelector<SVGGElement>(`[data-tile="${id}"]`);
    const place = (el: Element, at: number): void => { const s = session.state!; (el as SVGGElement).style.transform = `translate(${cellX(s, at)}px,${cellY(s, at)}px)`; el.setAttribute('data-at', String(at)); };
    /** The selection, the keyboard cursor and the help: the two sweets of a good swap shine. */
    const marks = (): void => {
        const s = session.state; if (!s) return;
        const sel = root.querySelector('[data-selected]'), cur = root.querySelector('[data-cursor]');
        const at = (el: Element | null, i: number | null, on: boolean): void => { if (!el) return; if (i === null || !on) { el.setAttribute('opacity', '0'); return; } el.setAttribute('x', String((i % s.cols) * CELL)); el.setAttribute('y', String(Math.floor(i / s.cols) * CELL)); el.setAttribute('opacity', '1'); };
        at(sel, session.selected, session.selected !== null && !s.finished);
        at(cur, session.cursor, Boolean(zone()?.matches(':focus-visible')) && !s.finished);
        root.querySelectorAll('.bonbons-hint').forEach(el => el.classList.remove('bonbons-hint'));
        const g = !observed.busy && helpOn(s) ? goodSwap(s) : null;
        zone()?.toggleAttribute('data-help', Boolean(g));
        if (g) for (const i of g) { const tile = s.grid[i]; if (tile) tileEl(tile.id)?.querySelector('.bonbons-inner')?.classList.add('bonbons-hint'); }
    };
    const goals = (s: State): void => { const old = root.querySelector('.bonbons-goals'); if (old) old.outerHTML = goalsHtml(s, locale); };
    /** Brings the tiles on screen to `grid`: moved tiles slide, new ones fall from above their part of the column. */
    const sync = (grid: Grid, spawns: Step['spawns'] = [], fresh = ''): void => {
        const s = session.state!, layer = root.querySelector('[data-tiles]'); if (!layer) return;
        const keep = new Set<number>(), drops = new Map(spawns.map(sp => [sp.tile.id, sp.drop])), added: SVGGElement[] = [];
        grid.forEach((tile, i) => {
            if (!tile) return;
            keep.add(tile.id);
            let el = tileEl(tile.id);
            if (!el) {
                layer.insertAdjacentHTML('beforeend', tileNode(s, tile, i, drops.get(tile.id) ?? 0));
                el = tileEl(tile.id)!; added.push(el);
                if (fresh) el.querySelector('.bonbons-inner')?.classList.add(fresh);
            } else {
                place(el, i);
                const inner = el.querySelector('.bonbons-inner');
                if (tile.kind === 'sucre' && el.dataset.layers !== String(tile.layers) && inner) { inner.innerHTML = tileSvg(tile); el.dataset.layers = String(tile.layers); }
            }
        });
        root.querySelectorAll<SVGGElement>('[data-tile]').forEach(el => { if (!keep.has(Number(el.dataset.tile))) el.remove(); });
        if (added.length) { void (layer as SVGGElement).getBoundingClientRect(); for (const el of added) place(el, Number(el.dataset.at)); }
    };
    /** A funny try: both sweets play their reaction toward each other, then come back; the board does not change. */
    const funny = async (r: Result): Promise<void> => {
        const s = session.state!, miss = r.miss!;
        observed.miss = miss; say(t.miss[miss]);
        recordActivation(`bonbons:try:${miss}`, 'action', false, miss);
        const els: Element[] = [];
        front(s.grid[r.a]?.id);
        for (const [x, y] of [[r.a, r.b], [r.b, r.a]] as const) {
            const tile = s.grid[x]; if (!tile) continue;
            const inner = tileEl(tile.id)?.querySelector<SVGGElement>('.bonbons-inner'); if (!inner) continue;
            inner.style.setProperty('--dx', `${((y % s.cols) - (x % s.cols)) * CELL * 0.32}px`);
            inner.style.setProperty('--dy', `${(Math.floor(y / s.cols) - Math.floor(x / s.cols)) * CELL * 0.32}px`);
            // The sweet plays the reaction and comes on top; a sugar cube or chocolate only trembles where it is.
            if (swappable(tile)) { inner.classList.add(missAnimations[miss]); inner.insertAdjacentHTML('beforeend', missFace(miss)); }
            else inner.classList.add('bonbons-crack');
            els.push(inner);
        }
        await wait(MISS_MS);
        if (gone()) return;
        for (const el of els) { el.classList.remove(missAnimations[miss], 'bonbons-crack'); el.querySelector('[data-miss-face]')?.remove(); }
        observed.miss = null;
    };
    /** A swap that works: the slide, then each step of lines, bursts, melting and falling, then chocolate and the mix. */
    const unfold = async (before: State, r: Result): Promise<void> => {
        const ta = before.grid[r.a]!, tb = before.grid[r.b]!;
        const ea = tileEl(ta.id), eb = tileEl(tb.id);
        front(ta.id);
        if (ea) place(ea, r.b); if (eb) place(eb, r.a);
        await wait(SWAP_MS);
        let pot = { ...before.pot }, out = before.friendsOut, grid = before.grid.slice(); grid[r.a] = tb; grid[r.b] = ta;
        for (const step of r.steps) {
            if (gone()) return;
            for (const c of step.cleared) tileEl(c.tile.id)?.querySelector('.bonbons-inner')?.classList.add(c.tile.wrapped ? 'bonbons-burst' : 'bonbons-pop');
            for (const at of step.eaten) { const tile = grid[at]; if (tile) tileEl(tile.id)?.querySelector('.bonbons-inner')?.classList.add('bonbons-melt'); }
            for (const h of step.hits) { const tile = grid[h.at]; if (tile) tileEl(tile.id)?.querySelector('.bonbons-inner')?.classList.add(h.layers ? 'bonbons-crack' : 'bonbons-melt'); }
            for (const e of step.exits) tileEl(e.tile.id)?.querySelector('.bonbons-inner')?.classList.add('bonbons-exit');
            for (const c of step.cleared) if (c.tile.kind === 'bonbon' && c.tile.color) pot = { ...pot, [c.tile.color]: (pot[c.tile.color] ?? 0) + 1 };
            out += step.exits.length;
            goals({ ...before, pot, friendsOut: out, grid: step.grid });
            root.querySelectorAll('.bonbons-goal').forEach(el => el.classList.add('bonbons-bump'));
            await wait(POP_MS);
            if (gone()) return;
            sync(step.grid, step.spawns, 'bonbons-new');
            for (const c of step.created) tileEl(c.tile.id)?.querySelector('.bonbons-inner')?.classList.add('bonbons-born');
            grid = step.grid;
            await wait(FALL_MS);
        }
        if (gone()) return;
        const s = r.state;
        if (r.spread !== null && !r.shuffled) { sync(s.grid, [], 'bonbons-spread'); await wait(POP_MS); }
        if (r.shuffled) {
            observed.mixing = true; say(t.mix);
            zone()?.classList.add('bonbons-mixing');
            sync(s.grid, [], 'bonbons-spread');
            await wait(MIX_MS);
            zone()?.classList.remove('bonbons-mixing'); observed.mixing = false;
        }
        sync(s.grid);
    };
    const act = async (a: number, b: number, how: string): Promise<void> => {
        const s = session.state;
        if (!s || s.finished || observed.busy) return;
        const r = swap(s, a, b);
        session.selected = null;
        if (!r) { recordActivation(`bonbons:swap:${how}`, 'action', false, 'none'); marks(); return; }
        observed.busy = true; marks();
        if (r.valid) recordActivation(`bonbons:swap:${how}`, 'action', true, 'swap');
        session.last = { miss: r.miss, valid: r.valid, shuffled: Boolean(r.shuffled), spread: r.spread };
        if (r.valid) await unfold(s, r); else await funny(r);
        if (gone()) return;
        session.state = r.state; observed.busy = false;
        if (r.state.finished) {
            session.records = complete(session.records, r.state); writeRecords(storage, session.records); chime(sound());
            message = levelOf(r.state.level).goals.some(g => g.kind === 'ami') ? t.freed : t.won; speak([message]);
            draw(); return;
        }
        goals(r.state);
        if (!r.valid && helpOn(r.state) && r.state.dry === 3) say(t.help);
        marks();
    };
    const cellAt = (x: number, y: number): { cell: number; fx: number; fy: number } | null => {
        const s = session.state, r = root.querySelector('.bonbons-zone svg')?.getBoundingClientRect();
        if (!s || !r) return null;
        const fx = (x - r.x) / r.width * s.cols, fy = (y - r.y) / r.height * s.rows, col = Math.floor(fx), row = Math.floor(fy);
        if (col < 0 || row < 0 || col >= s.cols || row >= s.rows) return null;
        return { cell: row * s.cols + col, fx, fy };
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'bonbons:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.help] : instruction(levelOf(st.level), locale)); }, 'bonbons:listen');
        const again = root.querySelector<HTMLElement>('#bonbons-again'), next = root.querySelector<HTMLElement>('#bonbons-next');
        if (again) bindAction(again, () => play(start(s.level), true), `bonbons:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `bonbons:next:${s.level}`);
        const z = zone()!;
        z.addEventListener('pointerdown', e => {
            if (!e.isPrimary || observed.busy || session.state!.finished || (e.target as Element).closest('.bonbons-reward')) return;
            const hit = cellAt(e.clientX, e.clientY); if (!hit) return;
            e.preventDefault();
            const st = session.state!, sel = session.selected;
            if (sel !== null && sel !== hit.cell && adjacent(st, sel, hit.cell) && !st.holes[hit.cell]) { void act(sel, hit.cell, 'tap'); return; }
            if (!swappable(st.grid[hit.cell] ?? null)) { session.selected = null; marks(); return; }
            drag = { cell: hit.cell, x: hit.fx, y: hit.fy, was: sel === hit.cell };
            session.selected = hit.cell; session.cursor = hit.cell; marks();
            try { z.setPointerCapture(e.pointerId); } catch { /* A finger already gone: the tap still selects. */ }
        });
        z.addEventListener('pointermove', e => {
            if (!drag || !e.isPrimary) return;
            const hit = cellAt(e.clientX, e.clientY) ?? (() => { const s = session.state!, r = z.querySelector('svg')!.getBoundingClientRect(); return { cell: -1, fx: (e.clientX - r.x) / r.width * s.cols, fy: (e.clientY - r.y) / r.height * s.rows }; })();
            const dx = hit.fx - drag.x, dy = hit.fy - drag.y;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < SLIDE) return;
            const s = session.state!, from = drag.cell, col = from % s.cols;
            const to = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? (col + 1 < s.cols ? from + 1 : -1) : (col > 0 ? from - 1 : -1)) : (dy > 0 ? from + s.cols : from - s.cols);
            drag = null;
            if (to < 0 || to >= s.grid.length) { session.selected = null; marks(); return; }
            void act(from, to, 'slide');
        });
        z.addEventListener('pointerup', e => { if (!e.isPrimary || !drag) return; if (drag.was) { session.selected = null; marks(); } drag = null; });
        z.addEventListener('pointercancel', () => { drag = null; });
        z.addEventListener('focus', marks); z.addEventListener('blur', marks);
        z.addEventListener('keydown', e => {
            const st = session.state!;
            const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -st.cols, ArrowDown: st.cols };
            if (e.key in moves) {
                e.preventDefault();
                const to = session.cursor + moves[e.key]!;
                if (to < 0 || to >= st.grid.length || !adjacent(st, session.cursor, to)) return;
                if (session.selected !== null) { void act(session.selected, to, 'key'); session.cursor = to; return; }
                session.cursor = to; marks();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                session.selected = session.selected === session.cursor || !swappable(st.grid[session.cursor] ?? null) ? null : session.cursor; marks();
            } else if (e.key === 'Escape') { session.selected = null; marks(); }
        });
        marks();
    };
    function play(s: State, fresh: boolean): void {
        observed = { busy: false, miss: null, mixing: false };
        for (const id of timers) clearTimeout(id); timers.clear();
        session.screen = 'play'; session.state = s;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { session.selected = null; session.cursor = s.grid.findIndex(x => swappable(x)); session.last = null; message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; for (const id of timers) clearTimeout(id); timers.clear(); };
}
