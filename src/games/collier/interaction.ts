import { complete, fire, goodPlace, HEIGHT, helpOn, isUnlocked, launchOf, layout, levelOf, parseRecords, start, swap, trace, WIDTH, type Bead, type Point, type Records, type Shot, type State } from '../../engines/collier';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { svg } from '../../ui/svg';
import { ammo, bead, beadOf, butterfly, confetti, missAnimations, missFace } from './art';
import { at, beadsSvg, gameView, instruction, labels, levelView, placePoint, threadD, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.collier.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the aim and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; aim: number; last: Shot | null }
/** Speed of a thrown bead, in board units per millisecond. */
export const FLIGHT_SPEED = 0.5;
/** How long the butterflies, the funny faces and Boubou's reactions last. */
export const EFFECT_MS = 1700;
/** Letting go this close to Boubou's bead cancels the throw. */
export const CANCEL = 14;
const KEY_STEP = 3 * Math.PI / 180;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed = { flying: false, aiming: false };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.collier-zone svg')?.getBoundingClientRect(), s = session.state;
    const toScreen = (p: Point) => r ? { x: r.x + p.x / WIDTH * r.width, y: r.y + p.y / HEIGHT * r.height } : null;
    const good = s && helpOn(s) ? goodPlace(s) : null;
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, launch: s ? toScreen(launchOf(levelOf(s.level))) : null, help: s ? helpOn(s) : false, good, ...observed };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let frame = 0, disposed = false, message = '', aiming = false, shown = false, flying = false, clear = 0;
    observed = { flying: false, aiming: false };
    const stop = (): void => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const levelsScreen = (): void => {
        stop(); session.screen = 'levels'; session.state = null; session.last = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'collier:home');
        root.querySelectorAll<HTMLElement>('[data-collier-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.collierLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `collier:level:${el.dataset.collierLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#collier-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    /** Boubou's bead, and the next one shown in the big swap button. */
    const hands = (s: State): void => {
        const current = root.querySelector('[data-current]'), hand = root.querySelector('[data-hand]');
        if (current) current.innerHTML = s.finished || flying ? '' : ammo(s.queue[0]);
        if (hand) hand.innerHTML = s.finished ? '' : svg(`<g transform="translate(32 32) scale(2.6)">${ammo(s.queue[1])}</g>`);
    };
    /** The dotted aim line, and, with the help, the golden line and the pulsing place. */
    const refreshAim = (): void => {
        const s = session.state, line = root.querySelector('[data-aim]'), help = root.querySelector('[data-help]'), mark = root.querySelector<SVGGElement>('[data-place]');
        if (!s || !line || !help || !mark) return;
        const level = levelOf(s.level), good = helpOn(s) && !flying ? goodPlace(s) : null;
        if (good) {
            help.setAttribute('d', dotted(trace(s, good.aim).path)); help.setAttribute('opacity', '1');
            const p = placePoint(level, s.necks, good.place); mark.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`); mark.setAttribute('opacity', '1');
        } else { help.setAttribute('opacity', '0'); mark.setAttribute('opacity', '0'); }
        root.querySelector('.collier-zone')?.toggleAttribute('data-help', Boolean(good));
        if (!shown || flying || s.finished) { line.setAttribute('opacity', '0'); return; }
        line.setAttribute('d', dotted(trace(s, session.aim).path)); line.setAttribute('opacity', '1');
    };
    const point = (event: PointerEvent): Point => { const r = root.querySelector('.collier-zone svg')!.getBoundingClientRect(); return { x: (event.clientX - r.x) / r.width * WIDTH, y: (event.clientY - r.y) / r.height * HEIGHT }; };
    /** Aim at the finger; false when the finger is on Boubou's bead (letting go there cancels). */
    const aimAt = (event: PointerEvent): boolean => {
        const p = point(event), l = launchOf(levelOf(session.state!.level)), dx = p.x - l.x, dy = p.y - l.y;
        if (Math.hypot(dx, dy) < CANCEL) return false;
        session.aim = Math.atan2(dx, -dy);
        return true;
    };
    /** The necklaces as the state has them: each bead keeps its element, so that it slides to its new place. */
    const drawBeads = (s: State, face?: { id: number; miss: NonNullable<Shot['miss']> }, woke: readonly Bead[] = []): void => {
        const level = levelOf(s.level), layer = root.querySelector('[data-beads]'); if (!layer) return;
        const pos = layout(level, s.necks), keep = new Set<string>();
        s.necks.forEach((list, k) => list.forEach((b, i) => {
            const id = String(b.id); keep.add(id);
            let el = layer.querySelector<SVGGElement>(`[data-bead="${id}"]`);
            if (!el) { layer.insertAdjacentHTML('beforeend', beadsSvg(level, [list.slice(i, i + 1)]).replace(/data-neck="0" data-index="0"/, `data-neck="${k}" data-index="${i}"`)); el = layer.querySelector<SVGGElement>(`[data-bead="${id}"]`)!; el.classList.add('collier-new'); }
            el.dataset.neck = String(k); el.dataset.index = String(i);
            el.toggleAttribute('data-asleep', b.asleep);
            el.style.transform = at(pos[k]![i]!.p);
            const inner = el.querySelector<SVGGElement>('.collier-inner')!;
            if (face?.id === b.id) { inner.innerHTML = bead(b.color, missFace(face.miss)); inner.setAttribute('class', `collier-inner ${missAnimations[face.miss]}`); }
            else if (woke.some(w => w.id === b.id)) { inner.innerHTML = beadOf(b); inner.setAttribute('class', 'collier-inner collier-reveil'); }
            else if (inner.dataset.asleep !== String(b.asleep) || inner.classList.length > 1) { inner.innerHTML = beadOf(b); inner.setAttribute('class', 'collier-inner'); }
            inner.dataset.asleep = String(b.asleep);
        }));
        layer.querySelectorAll<SVGGElement>('[data-bead]').forEach(el => { if (!keep.has(el.dataset.bead!)) el.remove(); });
        level.necklaces.forEach((_, k) => root.querySelector(`[data-thread="${k}"]`)?.setAttribute('d', threadD(level, k, s.necks[k]!.length)));
    };
    /** Butterflies for a line, confetti for the ends meeting, a butterfly for a bead sliding off the end, a boing on the edge. */
    const effects = (before: State, shot: Shot): string => {
        const level = levelOf(before.level), motion = reduce ? ' data-still' : '', out: string[] = [];
        // Where each bead stood once the thrown one was in: the beads that fly away start from there.
        const inserted = before.necks.map((list, k) => k === shot.place?.neck ? [...list.slice(0, shot.place.index), shot.bead!, ...list.slice(shot.place.index)] : list);
        const pos = layout(level, inserted), where = new Map<number, Point>();
        inserted.forEach((list, k) => list.forEach((b, i) => where.set(b.id, pos[k]![i]!.p)));
        for (const pop of shot.pops) pop.beads.forEach((b, i) => {
            const p = where.get(b.id) ?? shot.path[shot.path.length - 1]!;
            out.push(`<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><g class="${pop.chain ? 'collier-confetti' : 'collier-fly'}" style="animation-delay:${pop.chain * 260 + i * 40}ms"${motion}>${pop.chain ? confetti(b.color) : butterfly(b.color)}</g></g>`);
        });
        if (shot.dropped) { const p = where.get(shot.dropped.id)!; out.push(`<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})" data-dropped><g class="collier-fly"${motion}>${butterfly(shot.dropped.color)}</g></g>`); }
        if (!shot.place) { const p = shot.path[shot.path.length - 1]!; out.push(`<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})" data-miss="boing"><g class="${missAnimations.boing}"${motion}>${shot.ammo === 'arc' ? ammo('arc') : bead(shot.ammo, missFace('boing'))}</g></g>`); }
        return out.join('');
    };
    const react = (shot: Shot, s: State): void => {
        const boubou = root.querySelector<SVGGElement>('.collier-boubou');
        if (s.finished) return;
        if (shot.miss) { say(t.miss[shot.miss]); if (boubou) boubou.dataset.react = shot.miss === 'boing' ? 'scratch' : 'laugh'; }
        else {
            if (boubou) boubou.dataset.react = 'happy';
            say(shot.pops.some(p => p.chain > 0) ? t.chain : shot.woke.length ? t.woke : t.fly, shot.pops.some(p => p.chain > 0) || shot.woke.length > 0);
        }
        if (helpOn(s) && s.dry === 3) say(t.help);
    };
    const land = (before: State, shot: Shot, s: State): void => {
        flying = false; observed.flying = false; session.state = s; session.last = shot;
        const focused = document.activeElement?.classList.contains('collier-zone') ?? false;
        if (s.finished && !before.finished) { session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound()); message = t.won; speak([message]); draw(); }
        else {
            const flight = root.querySelector<SVGGElement>('[data-flight]'); if (flight) { flight.style.display = 'none'; flight.innerHTML = ''; }
            drawBeads(s, shot.miss && shot.bead ? { id: shot.bead.id, miss: shot.miss } : undefined, shot.woke);
            hands(s);
            const echange = root.querySelector<HTMLButtonElement>('#collier-echange'); if (echange) echange.disabled = false;
        }
        const fx = root.querySelector('[data-effects]');
        if (fx) fx.innerHTML = effects(before, shot);
        react(shot, s);
        shown = focused; refreshAim();
        clearTimeout(clear);
        clear = window.setTimeout(() => {
            if (disposed || session.last !== shot) return;
            const e = root.querySelector('[data-effects]'); if (e) e.innerHTML = '';
            const b = root.querySelector<SVGGElement>('.collier-boubou'); if (b) delete b.dataset.react;
            if (session.state && !session.state.finished) drawBeads(session.state);
        }, EFFECT_MS);
    };
    const launch = (how: string): void => {
        const s = session.state;
        if (!s || s.finished || flying) return;
        const { state, shot } = fire(s, session.aim);
        recordActivation(`collier:throw:${how}`, 'action', Boolean(shot), shot?.miss ?? 'throw');
        if (!shot) return;
        flying = true; observed.flying = true; stop(); shown = false; refreshAim();
        const echange = root.querySelector<HTMLButtonElement>('#collier-echange'); if (echange) echange.disabled = true;
        // Into the void, the bead goes boing on the edge and comes back to Boubou's hand.
        const path = shot.place ? shot.path : [...shot.path, shot.path[0]!];
        const lengths = path.slice(1).map((p, i) => Math.hypot(p.x - path[i]!.x, p.y - path[i]!.y)), total = lengths.reduce((a, b) => a + b, 0);
        const flight = root.querySelector<SVGGElement>('[data-flight]'), current = root.querySelector('[data-current]');
        if (current) current.innerHTML = '';
        if (!flight || reduce) { land(s, shot, state); return; }
        flight.innerHTML = ammo(shot.ammo); flight.style.display = '';
        const began = performance.now();
        const fly = (now: number): void => {
            if (disposed) return;
            let left = Math.min(total, (now - began) * FLIGHT_SPEED), k = 0;
            while (k < lengths.length - 1 && left > lengths[k]!) { left -= lengths[k]!; k++; }
            const a = path[k]!, b = path[k + 1] ?? a, f = lengths[k] ? Math.min(1, left / lengths[k]!) : 1;
            flight.setAttribute('transform', `translate(${(a.x + (b.x - a.x) * f).toFixed(1)} ${(a.y + (b.y - a.y) * f).toFixed(1)})`);
            if ((now - began) * FLIGHT_SPEED >= total) { frame = 0; land(s, shot, state); return; }
            frame = requestAnimationFrame(fly);
        };
        frame = requestAnimationFrame(fly);
    };
    const exchange = (): void => {
        const s = session.state;
        if (!s || s.finished || flying) return;
        session.state = swap(s); hands(session.state);
        const c = root.querySelector('[data-current]'); c?.classList.remove('collier-swap'); c?.getBoundingClientRect(); c?.classList.add('collier-swap');
        refreshAim();
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'collier:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.help] : instruction(levelOf(st.level), locale)); }, 'collier:listen');
        bindAction(root.querySelector<HTMLElement>('#collier-echange')!, exchange, 'collier:swap');
        const again = root.querySelector<HTMLElement>('#collier-again'), next = root.querySelector<HTMLElement>('#collier-next');
        if (again) bindAction(again, () => play(start(s.level), true), `collier:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `collier:next:${s.level}`);
        const zone = root.querySelector<HTMLElement>('.collier-zone')!;
        zone.addEventListener('pointerdown', e => {
            if (flying || session.state!.finished || (e.target as Element).closest('.collier-reward') || !e.isPrimary) return;
            e.preventDefault(); aiming = true; observed.aiming = true; try { zone.setPointerCapture(e.pointerId); } catch { /* A finger already gone: aiming goes on without capture. */ }
            shown = aimAt(e); refreshAim();
        });
        zone.addEventListener('pointermove', e => { if (aiming && e.isPrimary) { shown = aimAt(e); refreshAim(); } });
        zone.addEventListener('pointerup', e => {
            if (!aiming || !e.isPrimary) return;
            aiming = false; observed.aiming = false;
            if (aimAt(e)) launch('finger'); else { shown = false; refreshAim(); recordActivation('collier:throw:cancel', 'action', false, 'cancel'); }
        });
        zone.addEventListener('pointercancel', () => { aiming = false; observed.aiming = false; shown = false; refreshAim(); });
        zone.addEventListener('focus', () => { if (zone.matches(':focus-visible')) { shown = true; refreshAim(); } });
        zone.addEventListener('blur', () => { if (!aiming) { shown = false; refreshAim(); } });
        zone.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); session.aim += e.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP; session.aim = Math.atan2(Math.sin(session.aim), Math.cos(session.aim)); shown = true; refreshAim(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); session.aim = 0; shown = true; refreshAim(); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); session.aim = Math.PI; shown = true; refreshAim(); }
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch('key'); }
            else if (e.key === 's' || e.key === 'S' || e.key === 'e' || e.key === 'E') { e.preventDefault(); exchange(); }
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
/** A dotted line along `points`. */
export function dotted(points: readonly Point[]): string {
    return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
}
