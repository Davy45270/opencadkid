import { aimLine, ballAt, ballColor, clampAim, complete, fire, goodAim, HEIGHT, helpOn, isUnlocked, LAUNCH, levelOf, parseRecords, start, STEP, WIDTH, type Brick, type Point, type Records, type Shot, type State } from '../../engines/briques';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { ballSvg, brickColor, brickSvg, burst, grassBoing, headStars, missAnimations, sneezeCloud } from './art';
import { at, bricksSvg, centre, gameView, handSvg, instruction, labels, levelView, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.briques.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the aim (whole degrees) and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; aim: number; last: Shot | null }
/** Speed of the ball, in board units per millisecond: slow enough for a five-year-old to follow it with the eyes. */
export const FLIGHT_SPEED = 0.17;
/** How long the funny faces and Lumi's reactions last. */
export const EFFECT_MS = 1800;
/** Letting go this close to Lumi's ball cancels the throw. */
export const CANCEL = 12;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed = { flying: false, aiming: false };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.briques-zone svg')?.getBoundingClientRect(), s = session.state;
    const toScreen = (p: Point) => r ? { x: r.x + p.x / WIDTH * r.width, y: r.y + p.y / HEIGHT * r.height } : null;
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, launch: s ? toScreen(LAUNCH) : null, help: s ? helpOn(s) : false, good: s && helpOn(s) ? goodAim(s) : null, ...observed };
}
const dotted = (points: readonly Point[]): string => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let frame = 0, disposed = false, message = '', aiming = false, shown = false, flying = false, clear = 0;
    observed = { flying: false, aiming: false };
    const stop = (): void => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const levelsScreen = (): void => {
        stop(); session.screen = 'levels'; session.state = null; session.last = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'briques:home');
        root.querySelectorAll<HTMLElement>('[data-briques-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.briquesLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `briques:level:${el.dataset.briquesLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#briques-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const hand = (s: State, dizzy = false): void => {
        const h = root.querySelector('[data-hand]');
        if (h) h.innerHTML = s.finished || flying ? '' : dizzy ? `<g class="${missAnimations.tournis}">${ballSvg(ballColor(s), true)}</g>` : handSvg(s.balls, ballColor(s));
    };
    /** The dotted aim line, and, with the help, the golden line. */
    const refreshAim = (): void => {
        const s = session.state, line = root.querySelector('[data-aim]'), help = root.querySelector('[data-help]');
        if (!s || !line || !help) return;
        const good = helpOn(s) && !flying ? goodAim(s) : null;
        if (good !== null) { help.setAttribute('d', dotted(aimLine(s, good, 60))); help.setAttribute('opacity', '1'); } else help.setAttribute('opacity', '0');
        root.querySelector('.briques-zone')?.toggleAttribute('data-help', good !== null);
        if (!shown || flying || s.finished) { line.setAttribute('opacity', '0'); return; }
        line.setAttribute('d', dotted(aimLine(s, session.aim))); line.setAttribute('opacity', '1');
    };
    const point = (event: PointerEvent): Point => { const r = root.querySelector('.briques-zone svg')!.getBoundingClientRect(); return { x: (event.clientX - r.x) / r.width * WIDTH, y: (event.clientY - r.y) / r.height * HEIGHT }; };
    /** Aim at the finger; false when the finger is on Lumi's ball (letting go there cancels). Below the ball, the aim
     * goes as far to the side as it can. */
    const aimAt = (event: PointerEvent): boolean => {
        const p = point(event), dx = p.x - LAUNCH.x, dy = p.y - LAUNCH.y;
        if (Math.hypot(dx, dy) < CANCEL) return false;
        session.aim = clampAim(Math.atan2(dx, -dy) * 180 / Math.PI);
        return true;
    };
    const drawBricks = (s: State): void => {
        const layer = root.querySelector('[data-bricks]'); if (!layer) return;
        const keep = new Set(s.bricks.map(b => String(b.id)));
        layer.querySelectorAll<SVGGElement>('[data-brick]').forEach(el => { if (!keep.has(el.dataset.brick!)) el.remove(); });
        for (const b of s.bricks) {
            let el = layer.querySelector<SVGGElement>(`[data-brick="${b.id}"]`);
            if (!el) { layer.insertAdjacentHTML('beforeend', bricksSvg([b])); el = layer.querySelector<SVGGElement>(`[data-brick="${b.id}"]`)!; }
            el.style.transform = at(b.row, b.col);
            const inner = el.querySelector<SVGGElement>('.briques-inner')!;
            inner.innerHTML = brickSvg(b); inner.setAttribute('class', 'briques-inner');
        }
    };
    const fx = (html: string): void => { root.querySelector('[data-effects]')?.insertAdjacentHTML('beforeend', html); };
    const motion = (): string => reduce ? ' data-still' : '';
    /** What a moment of the flight does to the board: a brick breaks into confetti, cracks, booms, or an iron or jelly brick reacts. */
    const happen = (shot: Shot, e: Shot['events'][number], before: readonly Brick[]): void => {
        const b = before.find(x => x.id === e.id); if (!b) return;
        const el = root.querySelector<SVGGElement>(`[data-brick="${e.id}"]`), c = centre(b.row, b.col);
        if (e.kind === 'break' || e.kind === 'boom' || e.kind === 'sweet') {
            el?.remove();
            fx(`<g transform="translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})"><g class="${e.kind === 'boom' ? 'briques-boom' : 'briques-burst'}"${motion()}>${burst(brickColor(b))}</g></g>`);
        } else if (e.kind === 'crack') {
            const inner = el?.querySelector('.briques-inner'); if (inner) { inner.innerHTML = brickSvg({ ...b, hits: 1 }); inner.setAttribute('class', 'briques-inner briques-crac'); }
        } else {
            const inner = el?.querySelector('.briques-inner'); if (inner) { inner.setAttribute('class', `briques-inner ${e.kind === 'metal' ? 'briques-toc' : missAnimations.tremble}`); }
        }
        void shot;
    };
    /** The funny try, drawn where it happens. */
    const funny = (shot: Shot, s: State): void => {
        const m = shot.miss; if (!m) return;
        if (m === 'rigole') for (const id of shot.metal) { const b = s.bricks.find(x => x.id === id), inner = root.querySelector(`[data-brick="${id}"] .briques-inner`); if (b && inner) { inner.innerHTML = brickSvg(b, true); inner.setAttribute('class', `briques-inner ${missAnimations.rigole}`); } }
        if (m === 'tremble') for (const id of shot.jelly) root.querySelector(`[data-brick="${id}"] .briques-inner`)?.setAttribute('class', `briques-inner ${missAnimations.tremble}`);
        if (m === 'tete') { fx(`<g transform="translate(${LAUNCH.x} ${LAUNCH.y + 4})" data-miss="tete"${motion()}>${headStars()}</g>`); root.querySelector('.briques-lumi')?.setAttribute('data-react', 'tete'); }
        if (m === 'atchoum' && shot.ceiling) fx(`<g transform="translate(${shot.ceiling.x.toFixed(1)} 10)" data-miss="atchoum"${motion()}>${sneezeCloud()}</g>`);
        if (m === 'boing' && shot.grass) fx(`<g transform="translate(${shot.grass.x.toFixed(1)} ${shot.grass.y})" data-miss="boing"${motion()}>${grassBoing()}</g>`);
        if (m === 'tournis') hand(s, true);
        root.querySelector('.briques-zone')?.setAttribute('data-miss', m);
    };
    const react = (shot: Shot, s: State): void => {
        if (s.finished) return;
        const lumi = root.querySelector<SVGGElement>('.briques-lumi');
        if (shot.miss) { say(t.miss[shot.miss]); if (lumi && shot.miss !== 'tete') lumi.dataset.react = 'laugh'; }
        else {
            if (lumi) lumi.dataset.react = 'happy';
            const boom = shot.events.some(e => e.kind === 'boom');
            say(shot.sweet ? t.two : boom ? t.boom : shot.broken.length ? t.broke : t.crack, shot.sweet || boom);
        }
        if (helpOn(s) && s.dry === 3) say(t.help);
    };
    const land = (before: State, shot: Shot, s: State): void => {
        flying = false; observed.flying = false; session.state = s; session.last = shot;
        const focused = document.activeElement?.classList.contains('briques-zone') ?? false;
        root.querySelector('[data-flight]')!.innerHTML = '';
        if (s.finished && !before.finished) { session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound()); message = t.won; speak([message]); draw(); return; }
        drawBricks(s); hand(s); funny(shot, s); react(shot, s);
        shown = focused; refreshAim();
        clearTimeout(clear);
        clear = window.setTimeout(() => {
            if (disposed || session.last !== shot) return;
            const e = root.querySelector('[data-effects]'); if (e) e.innerHTML = '';
            root.querySelector('.briques-lumi')?.removeAttribute('data-react'); root.querySelector('.briques-zone')?.removeAttribute('data-miss');
            if (session.state && !session.state.finished && !flying) { drawBricks(session.state); hand(session.state); }
        }, EFFECT_MS);
    };
    const launch = (how: string): void => {
        const s = session.state;
        if (!s || s.finished || flying) return;
        const { state, shot } = fire(s, session.aim);
        recordActivation(`briques:throw:${how}`, 'action', Boolean(shot), shot?.miss ?? 'throw');
        if (!shot) return;
        clearTimeout(clear);
        const e = root.querySelector('[data-effects]'); if (e) e.innerHTML = '';
        root.querySelector('.briques-lumi')?.removeAttribute('data-react'); root.querySelector('.briques-zone')?.removeAttribute('data-miss');
        drawBricks(s);
        flying = true; observed.flying = true; stop(); shown = false; refreshAim(); hand(s);
        const layer = root.querySelector<SVGGElement>('[data-flight]');
        if (!layer || reduce) { for (const ev of shot.events) happen(shot, ev, s.bricks); land(s, shot, state); return; }
        layer.innerHTML = shot.flights.map((f, k) => `<g data-ball="${k}" transform="translate(${LAUNCH.x} ${LAUNCH.y})">${ballSvg(f.color)}</g>`).join('');
        const balls = [...layer.querySelectorAll<SVGGElement>('[data-ball]')], end = Math.max(...shot.flights.map(f => f.landed));
        const pending = [...shot.events].sort((a, b) => a.t - b.t);
        const began = performance.now();
        const fly = (now: number): void => {
            if (disposed) return;
            const step = (now - began) * FLIGHT_SPEED / STEP;
            while (pending.length && pending[0]!.t <= step) happen(shot, pending.shift()!, s.bricks);
            shot.flights.forEach((f, k) => { const p = ballAt(f, step); balls[k]?.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`); balls[k]?.toggleAttribute('data-home', step >= f.landed); });
            if (step >= end) { frame = 0; while (pending.length) happen(shot, pending.shift()!, s.bricks); land(s, shot, state); return; }
            frame = requestAnimationFrame(fly);
        };
        frame = requestAnimationFrame(fly);
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'briques:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.help] : instruction(levelOf(st.level), locale)); }, 'briques:listen');
        const again = root.querySelector<HTMLElement>('#briques-again'), next = root.querySelector<HTMLElement>('#briques-next');
        if (again) bindAction(again, () => play(start(s.level), true), `briques:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `briques:next:${s.level}`);
        const zone = root.querySelector<HTMLElement>('.briques-zone')!;
        zone.addEventListener('pointerdown', e => {
            if (flying || session.state!.finished || (e.target as Element).closest('.briques-reward') || !e.isPrimary) return;
            e.preventDefault(); aiming = true; observed.aiming = true; try { zone.setPointerCapture(e.pointerId); } catch { /* A finger already gone: aiming goes on without capture. */ }
            shown = aimAt(e); refreshAim();
        });
        zone.addEventListener('pointermove', e => { if (aiming && e.isPrimary) { shown = aimAt(e); refreshAim(); } });
        zone.addEventListener('pointerup', e => {
            if (!aiming || !e.isPrimary) return;
            aiming = false; observed.aiming = false;
            if (aimAt(e)) launch('finger'); else { shown = false; refreshAim(); recordActivation('briques:throw:cancel', 'action', false, 'cancel'); }
        });
        zone.addEventListener('pointercancel', () => { aiming = false; observed.aiming = false; shown = false; refreshAim(); });
        zone.addEventListener('focus', () => { if (zone.matches(':focus-visible')) { shown = true; refreshAim(); } });
        zone.addEventListener('blur', () => { if (!aiming) { shown = false; refreshAim(); } });
        zone.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); session.aim = clampAim(session.aim + (e.key === 'ArrowLeft' ? -3 : 3)); shown = true; refreshAim(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); session.aim = 0; shown = true; refreshAim(); }
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch('key'); }
        });
        refreshAim();
    };
    function play(s: State, fresh: boolean): void {
        stop(); flying = false; observed.flying = false; session.screen = 'play'; session.state = s;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { session.aim = 0; session.last = null; message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; stop(); clearTimeout(clear); };
}
