import { complete, DELTA, height, helpOn, hint, isUnlocked, levelOf, parseRecords, slide, start, step, width, type Action, type Fail, type Records, type Slide, type State } from '../../engines/eclosion';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { confetti, dizzy, failAnimations, failWords, shells, sulk, U, wind } from './art';
import { cellCenter, chainHtml, gameView, instruction, labels, levelView, nestSvg, tileSvg, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.eclosion.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
/** How long the creatures take to slide, a hatching to pop, a funny try to play, the breeze to blow, the end to dance. */
export const SLIDE_MS = 190;
export const POP_MS = 260;
export const FAIL_MS = 900;
export const BREEZE_MS = 1100;
export const END_MS = 2000;
/** A finger that moves at least this far is a slide; under it, a touch. */
export const SLIDE_PX = 28;
/** A slide is diagonal when its smaller side is at least this share of the bigger one (between about 35° and 55°). */
export const DIAGONAL = 0.7;
/** Two slides the opposite way within this time are a shake. */
export const SHAKE_MS = 650;
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…»]$/.test(w) ? `${w}.` : w).join(' ');
const OPPOSITE: Readonly<Record<Slide, Slide>> = { haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' };
/** Which slide a finger made: the bigger side wins, unless the two are nearly equal (a diagonal). */
export function gestureOf(dx: number, dy: number): Slide | 'diagonale' | null {
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < SLIDE_PX) return null;
    if (Math.min(ax, ay) >= DIAGONAL * Math.max(ax, ay)) return 'diagonale';
    return ax > ay ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut');
}
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed: { busy: boolean; fail: Fail | null; funny: Fail[]; breezes: number; laid: number[] } = { busy: false, fail: null, funny: [], breezes: 0, laid: [] };
export function snapshot(session: Session, root: ParentNode): object {
    const rect = (el: Element | null | undefined): { x: number; y: number; width: number; height: number } | null => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const s = session.state, l = s ? levelOf(s.level) : null, zone = rect(root.querySelector('.eclosion-zone svg'));
    return { ...session, ...observed, funny: [...observed.funny], laid: [...observed.laid], zone, hint: s && helpOn(s) ? hint(s) : null,
        geom: zone && l ? { w: width(l), h: height(l), cell: zone.width / (width(l) * U + 12) * U, x0: zone.x + zone.width / (width(l) * U + 12) * 6, y0: zone.y + zone.width / (width(l) * U + 12) * 6 } : null };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let disposed = false, message = '', last: { d: Slide; at: number } | null = null, shakeLater = false;
    observed = { busy: false, fail: null, funny: [], breezes: 0, laid: [] };
    const timers = new Set<number>(), gone = (): boolean => disposed;
    const wait = (ms: number): Promise<void> => new Promise(done => { const id = window.setTimeout(() => { timers.delete(id); done(); }, reduce ? Math.min(ms, 60) : ms); timers.add(id); });
    const levelsScreen = (): void => {
        session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'eclosion:home');
        root.querySelectorAll<HTMLElement>('[data-eclosion-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.eclosionLevel); if (isUnlocked(id, session.records)) begin(start(id), true); }, () => `eclosion:level:${el.dataset.eclosionLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#eclosion-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const q = (sel: string): HTMLElement | null => root.querySelector<HTMLElement>(sel);
    const effect = (x: number, y: number, inner: string): void => { q('.eclosion-zone [data-effects]')?.insertAdjacentHTML('beforeend', `<g transform="translate(${x} ${y})">${inner}</g>`); };
    const word = (w: string): void => { q('.eclosion-mot')?.remove(); q('.eclosion-stage')?.insertAdjacentHTML('beforeend', `<span class="eclosion-mot" aria-hidden="true">${typeset(w)}</span>`); };
    /** The arrow of the right next slide shines after three funny tries, or after slides that hatch nothing. */
    const marks = (): void => {
        const s = session.state, h = s && helpOn(s) && !observed.busy ? hint(s) : null;
        root.querySelectorAll<HTMLElement>('[data-arrow]').forEach(el => el.toggleAttribute('data-shine', el.dataset.arrow === h));
    };
    const tilesOf = (board: string): string => { const l = levelOf(session.state!.level); return board.split('').map((ch, i) => ch >= '0' && ch <= '9' ? tileSvg(l, i, Number(ch)) : '').join(''); };
    const chain = (): void => { const s = session.state!, el = q('.eclosion-chaine'); if (el) { el.outerHTML = chainHtml(levelOf(s.level), s, locale); bindTarget(); } };
    /** A funny try: its animation on the creatures (or on Lumi, or on the target), its word and its sentence. */
    const funny = (kind: Fail, d: Slide | null, before: State): void => {
        observed.fail = kind; observed.funny.push(kind); observed.busy = true;
        say(t.fail[kind]); word(failWords[locale][kind]);
        recordActivation(`eclosion:try:${kind}`, 'action', false, kind);
        const l = levelOf(before.level), w = width(l), cls = failAnimations[kind];
        let things: Element[] = [];
        if (kind === 'saut') things = [q('#eclosion-lumi svg')].filter((e): e is HTMLElement => !!e);
        else if (kind === 'coucou') things = [q('#eclosion-cible')].filter((e): e is HTMLElement => !!e);
        else {
            const all = [...root.querySelectorAll('.eclosion-zone [data-tile]')];
            const front = (el: Element): string | null => { if (!d) return null; const i = Number(el.getAttribute('data-tile')), x = i % w + DELTA[d][0], y = Math.floor(i / w) + DELTA[d][1]; return x < 0 || y < 0 || x >= w || y >= height(l) ? 'bord' : before.board[y * w + x]!; };
            things = kind === 'tete' ? all.filter(el => /[0-9]/.test(front(el) ?? '')) : kind === 'pierre' ? all.filter(el => front(el) === '#') : all;
            things = things.map(el => el.querySelector('.eclosion-bete')!);
            for (const el of all) { const i = Number(el.getAttribute('data-tile')), c = cellCenter(l, i); if (kind === 'tete' && /[0-9]/.test(front(el) ?? '')) effect(c.x, c.y, sulk); if (kind === 'pierre' && front(el) === '#') effect(c.x, c.y, dizzy); }
            if (kind === 'pierre') root.querySelectorAll('.eclosion-zone [data-stone] .eclosion-caillou').forEach(el => things.push(el));
            const zone = q('.eclosion-zone');
            if (zone && d) { zone.style.setProperty('--dx', String(DELTA[d][0])); zone.style.setProperty('--dy', String(DELTA[d][1])); }
        }
        for (const el of things) el.classList.add(cls);
        void wait(FAIL_MS).then(() => {
            if (gone()) return;
            for (const el of things) el.classList.remove(cls);
            const fx = q('.eclosion-zone [data-effects]'); if (fx) fx.innerHTML = '';
            q('.eclosion-mot')?.remove();
            observed.busy = false; observed.fail = null; marks();
            if (shakeLater) { shakeLater = false; act('secoue', 'secoue'); }
        });
    };
    /** A slide that changes the nest: the creatures go, the pairs hatch, Lumi lays, the breeze blows, maybe the end. */
    const play = async (before: State, d: Slide, s: State, r: NonNullable<ReturnType<typeof step>>): Promise<void> => {
        observed.busy = true; marks();
        const l = levelOf(s.level);
        for (const wy of r.ways) {
            const el = q(`.eclosion-zone [data-tile="${wy.from}"]`), c = cellCenter(l, wy.to);
            if (!el) continue;
            el.style.transition = `transform ${reduce ? 0 : SLIDE_MS}ms ease-in`; el.style.transform = `translate(${c.x}px,${c.y}px)`;
            if (wy.merged && wy.from !== wy.to) el.style.zIndex = '1';
        }
        await wait(SLIDE_MS); if (gone()) return;
        // The nest after the slide and the new egg, before the breeze.
        let board = slide(l, before.board, d).board;
        if (r.laid >= 0) board = board.slice(0, r.laid) + '0' + board.slice(r.laid + 1);
        const tiles = q('.eclosion-zone [data-tiles]'); if (tiles) tiles.innerHTML = tilesOf(board);
        for (const i of r.hatched) { q(`.eclosion-zone [data-tile="${i}"] .eclosion-bete`)?.classList.add('eclosion-eclot'); const c = cellCenter(l, i); effect(c.x, c.y, shells); }
        if (r.laid >= 0) { q(`.eclosion-zone [data-tile="${r.laid}"] .eclosion-bete`)?.classList.add('eclosion-pond'); observed.laid.push(r.laid); }
        const top = r.hatched.length ? Math.max(...r.hatched.map(i => Number(board[i]))) : 0;
        if (r.hatched.length && !s.finished) say(t.hatch[top]!);
        else if (r.laid >= 0 && !r.gone.length) say(t.laid, false);
        chain();
        await wait(POP_MS); if (gone()) return;
        if (r.gone.length) {
            observed.breezes++; say(t.breeze);
            effect(0, 0, wind(width(l), height(l)));
            for (const i of r.gone) q(`.eclosion-zone [data-tile="${i}"] .eclosion-bete`)?.classList.add('eclosion-envole');
            recordActivation('eclosion:breeze', 'action', true, String(r.gone.length));
            await wait(BREEZE_MS); if (gone()) return;
            if (tiles) tiles.innerHTML = tilesOf(s.board);
        }
        const fx = q('.eclosion-zone [data-effects]'); if (fx) fx.innerHTML = '';
        if (s.finished) { await ending(s); return; }
        observed.busy = false;
        if (helpOn(s)) say(t.shine);
        marks();
        if (shakeLater) { shakeLater = false; act('secoue', 'secoue'); }
    };
    const ending = async (s: State): Promise<void> => {
        const l = levelOf(s.level);
        for (const i of Array.from({ length: s.board.length }, (_, k) => k).filter(k => s.board[k] === String(l.target))) { q(`.eclosion-zone [data-tile="${i}"] .eclosion-bete`)?.classList.add('eclosion-danse'); const c = cellCenter(l, i); effect(c.x, c.y, confetti()); }
        q('#eclosion-lumi svg')?.classList.add('eclosion-saut');
        say(t.won);
        await wait(END_MS); if (gone()) return;
        observed.busy = false;
        session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound());
        draw();
    };
    /** Any gesture of the child, by any way (finger, arrow, keyboard, touch on Lumi or on the target). */
    function act(gesture: Action, how: string): void {
        const s = session.state; if (!s || s.finished) return;
        let a = gesture;
        if (a === 'haut' || a === 'bas' || a === 'gauche' || a === 'droite') {
            const now = performance.now(), shake = last !== null && now - last.at < SHAKE_MS && OPPOSITE[last.d] === a;
            last = { d: a, at: now };
            if (shake) { last = null; if (observed.busy) { shakeLater = true; return; } a = 'secoue'; }
        }
        if (observed.busy) return;
        const r = step(s, a); if (!r) return;
        recordActivation(`eclosion:${how}`, 'action', !r.fail, a);
        session.state = r.state;
        const d = a === 'haut' || a === 'bas' || a === 'gauche' || a === 'droite' ? a : null;
        if (r.fail) { funny(r.fail, d, s); return; }
        if (d) void play(s, d, r.state, r);
    }
    const bindTarget = (): void => { const c = q('#eclosion-cible'); if (c) bindAction(c, () => act('cible', 'cible'), 'eclosion:cible'); };
    const draw = (): void => {
        const s = session.state!, l = levelOf(s.level);
        root.innerHTML = gameView(s, l, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'eclosion:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.shine] : instruction(levelOf(st.level), locale)); }, 'eclosion:listen');
        bindAction(root.querySelector<HTMLElement>('#eclosion-lumi')!, () => act('lumi', 'lumi'), 'eclosion:lumi');
        bindTarget();
        const again = root.querySelector<HTMLElement>('#eclosion-again'), next = root.querySelector<HTMLElement>('#eclosion-next');
        if (again) bindAction(again, () => begin(start(s.level), true), `eclosion:again:${s.level}`);
        if (next) bindAction(next, () => begin(start(s.level + 1), true), `eclosion:next:${s.level}`);
        root.querySelectorAll<HTMLElement>('[data-arrow]').forEach(el => bindAction(el, () => act(el.dataset.arrow as Slide, 'fleche'), `eclosion:arrow:${el.dataset.arrow!}`));
        const z = root.querySelector<HTMLElement>('.eclosion-zone')!;
        z.innerHTML = nestSvg(l, s.board, locale);
        z.style.setProperty('--ratio', String((width(l) * U + 12) / (height(l) * U + 12)));
        marks();
        let from: { x: number; y: number; id: number } | null = null;
        z.addEventListener('pointerdown', e => { if (!e.isPrimary) return; e.preventDefault(); from = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { z.setPointerCapture(e.pointerId); } catch { /* Synthetic pointers cannot be captured. */ } });
        const move = (e: PointerEvent): void => {
            if (!from || e.pointerId !== from.id) return;
            const g = gestureOf(e.clientX - from.x, e.clientY - from.y);
            if (!g) return;
            from = null; act(g, g === 'diagonale' ? 'diagonale' : 'doigt');
        };
        z.addEventListener('pointermove', move);
        z.addEventListener('pointerup', e => { move(e); from = null; });
        z.addEventListener('pointercancel', () => { from = null; });
        z.addEventListener('keydown', e => { const k = ({ ArrowUp: 'haut', ArrowDown: 'bas', ArrowLeft: 'gauche', ArrowRight: 'droite' } as Record<string, Slide>)[e.key]; if (k) { e.preventDefault(); act(k, 'clavier'); } });
    };
    function begin(s: State, fresh: boolean): void {
        for (const id of timers) clearTimeout(id); timers.clear();
        observed = { busy: false, fail: null, funny: [], breezes: 0, laid: [] }; last = null; shakeLater = false;
        session.screen = 'play'; session.state = s;
        if (s.finished) { session.records = complete(session.records, s); writeRecords(storage, session.records); }
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) begin(session.state, false); else levelsScreen();
    return () => { disposed = true; for (const id of timers) clearTimeout(id); timers.clear(); };
}
