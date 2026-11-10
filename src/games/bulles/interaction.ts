import { advance, AIM_MAX, center, clampAim, complete, fire, goodAim, has, helpOn, HEIGHT, isUnlocked, LAUNCH, levelOf, parseRecords, snap, start, SWAY, TICK_MS, trace, WIDTH, type Records, type Shot, type State } from '../../engines/bulles';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { ammo } from './art';
import { dotted, effectsSvg, gameView, gridShift, instruction, labels, levelView } from './view';

export const RECORDS_KEY = 'opencadkid.bulles.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the aim and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; aim: number; last: Shot | null }
/** Length of the dotted aim line without help: long enough to show the first bounces. */
export const AIM_LENGTH = 190;
/** Speed of a thrown bubble, in board units per millisecond. */
export const FLIGHT_SPEED = 0.55;
export const EFFECT_MS = 1700;
const KEY_STEP = 3 * Math.PI / 180;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed = { flying: false, aiming: false };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.bulles-zone svg')?.getBoundingClientRect(), s = session.state;
    const toScreen = (x: number, y: number) => r ? { x: r.x + x / WIDTH * r.width, y: r.y + y / HEIGHT * r.height } : null;
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, launch: toScreen(LAUNCH.x, LAUNCH.y), help: s ? helpOn(s) : false, good: s && helpOn(s) ? goodAim(s) : null, ...observed };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale];
    let frame = 0, last = 0, carry = 0, disposed = false, message = '', aiming = false, shown = false, flying = false, goodFor: State | null = null, good: number | null = null, clear = 0;
    observed = { flying: false, aiming: false };
    const reduce = reducedMotion();
    const stop = (): void => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const levelsScreen = (): void => {
        stop(); session.screen = 'levels'; session.state = null; session.last = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'bulles:home');
        root.querySelectorAll<HTMLElement>('[data-bulles-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.bullesLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `bulles:level:${el.dataset.bullesLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#bulles-message'); if (p) p.textContent = text; if (aloud) speak([text]); };
    const goodAimNow = (s: State): number | null => { if (goodFor !== s) { goodFor = s; good = helpOn(s) ? goodAim(s) : null; } return good; };
    /** The dotted aim line, the ghost where the bubble would land (with the help), and the golden line of a good throw. */
    const refreshAim = (): void => {
        const s = session.state, line = root.querySelector('[data-aim]'), ghost = root.querySelector('[data-ghost]'), help = root.querySelector('[data-help]');
        if (!s || !line || !ghost || !help) return;
        const helping = helpOn(s) && !s.finished && !flying, visible = shown && !flying && !s.finished;
        const g = helping ? goodAimNow(s) : null;
        if (g !== null) { help.setAttribute('d', dotted(trace(s, g).path)); help.setAttribute('opacity', '1'); } else help.setAttribute('opacity', '0');
        root.querySelector('.bulles-zone')?.toggleAttribute('data-help', g !== null);
        if (!visible) { line.setAttribute('opacity', '0'); ghost.setAttribute('opacity', '0'); return; }
        const flight = trace(s, session.aim);
        line.setAttribute('d', dotted(flight.path, helping ? Infinity : AIM_LENGTH)); line.setAttribute('opacity', '1');
        if (helping) {
            const c = center(snap(s, flight.end), s.top, SWAY);
            ghost.setAttribute('cx', (c.x + gridShift(s)).toFixed(1)); ghost.setAttribute('cy', c.y.toFixed(1)); ghost.setAttribute('opacity', '1');
        } else ghost.setAttribute('opacity', '0');
    };
    const aimAt = (event: PointerEvent): boolean => {
        const r = root.querySelector('.bulles-zone svg')!.getBoundingClientRect();
        const x = (event.clientX - r.x) / r.width * WIDTH, y = (event.clientY - r.y) / r.height * HEIGHT, dx = x - LAUNCH.x, dy = y - LAUNCH.y;
        session.aim = dy < -4 ? clampAim(Math.atan2(dx, -dy)) : dx < 0 ? -AIM_MAX : AIM_MAX;
        // Letting go well below Boubou's bubble cancels the throw.
        return y <= LAUNCH.y + 12;
    };
    const react = (shot: Shot, s: State): void => {
        const boubou = root.querySelector<HTMLElement>('.bulles-boubou');
        if (s.finished) return;
        if (shot.miss) {
            say(t.miss[shot.miss]);
            if (boubou) { boubou.dataset.react = shot.miss === 'boing' ? 'scratch' : 'laugh'; }
        } else if (shot.lifted.length && !shot.popped.length) say(t.up, false);
        else if (boubou && (shot.popped.length || shot.freed.length || shot.fell.length)) boubou.dataset.react = 'happy';
        if (helpOn(s) && s.dry === 3) say(t.help);
    };
    const land = (before: State, shot: Shot, s: State): void => {
        flying = false; observed.flying = false; session.state = s; session.last = shot; shown = false;
        const focused = document.activeElement?.classList.contains('bulles-zone') ?? false;
        if (s.finished && !before.finished) { session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound()); message = levelOf(s.level).features.includes('ami') ? t.freed : t.won; speak([message]); }
        draw();
        const effects = root.querySelector('[data-effects]');
        if (effects) effects.innerHTML = effectsSvg(shot, s, reduce);
        react(shot, s);
        if (focused) { const z = root.querySelector<HTMLElement>('.bulles-zone'); z?.focus(); shown = true; refreshAim(); }
        clearTimeout(clear);
        clear = window.setTimeout(() => { if (disposed || session.last !== shot) return; const e = root.querySelector('[data-effects]'); if (e) e.innerHTML = ''; const b = root.querySelector<HTMLElement>('.bulles-boubou'); if (b) delete b.dataset.react; }, EFFECT_MS);
        loop();
    };
    const launch = (how: string): void => {
        const s = session.state;
        if (!s || s.finished || flying) return;
        const { state, shot } = fire(s, session.aim);
        recordActivation(`bulles:throw:${how}`, 'action', Boolean(shot), shot?.miss ?? 'throw');
        if (!shot) return;
        flying = true; observed.flying = true; stop(); shown = false; refreshAim();
        const flight = root.querySelector<SVGGElement>('[data-flight]'), current = root.querySelector('[data-current]');
        if (current) current.innerHTML = '';
        const lengths = shot.path.slice(1).map((p, i) => Math.hypot(p.x - shot.path[i]!.x, p.y - shot.path[i]!.y)), total = lengths.reduce((a, b) => a + b, 0);
        if (!flight || reduce) { land(s, shot, state); return; }
        flight.innerHTML = ammo(shot.ammo); flight.style.display = '';
        const began = performance.now();
        const fly = (now: number): void => {
            if (disposed) return;
            let left = Math.min(total, (now - began) * FLIGHT_SPEED), k = 0;
            while (k < lengths.length - 1 && left > lengths[k]!) { left -= lengths[k]!; k++; }
            const a = shot.path[k]!, b = shot.path[k + 1] ?? a, f = lengths[k] ? Math.min(1, left / lengths[k]!) : 1;
            flight.setAttribute('transform', `translate(${(a.x + (b.x - a.x) * f).toFixed(1)} ${(a.y + (b.y - a.y) * f).toFixed(1)})`);
            if ((now - began) * FLIGHT_SPEED >= total) { land(s, shot, state); return; }
            frame = requestAnimationFrame(fly);
        };
        frame = requestAnimationFrame(fly);
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'bulles:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.help] : instruction(levelOf(st.level), locale)); }, 'bulles:listen');
        const again = root.querySelector<HTMLElement>('#bulles-again'), next = root.querySelector<HTMLElement>('#bulles-next');
        if (again) bindAction(again, () => play(start(s.level), true), `bulles:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `bulles:next:${s.level}`);
        const zone = root.querySelector<HTMLElement>('.bulles-zone')!;
        zone.addEventListener('pointerdown', e => {
            if (flying || session.state!.finished || (e.target as Element).closest('.bulles-reward') || !e.isPrimary) return;
            e.preventDefault(); aiming = true; observed.aiming = true; shown = true; try { zone.setPointerCapture(e.pointerId); } catch { /* A finger already gone: aiming goes on without capture. */ } aimAt(e); refreshAim();
        });
        zone.addEventListener('pointermove', e => { if (aiming && e.isPrimary) { aimAt(e); refreshAim(); } });
        zone.addEventListener('pointerup', e => {
            if (!aiming || !e.isPrimary) return;
            aiming = false; observed.aiming = false;
            if (aimAt(e)) launch('finger'); else { shown = false; refreshAim(); recordActivation('bulles:throw:cancel', 'action', false, 'cancel'); }
        });
        zone.addEventListener('pointercancel', () => { aiming = false; observed.aiming = false; shown = false; refreshAim(); });
        zone.addEventListener('focus', () => { if (zone.matches(':focus-visible')) { shown = true; refreshAim(); } });
        zone.addEventListener('blur', () => { if (!aiming) { shown = false; refreshAim(); } });
        zone.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); session.aim = clampAim(session.aim + (e.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP)); shown = true; refreshAim(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); session.aim = 0; shown = true; refreshAim(); }
            else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch('key'); }
        });
        refreshAim();
    };
    /** The swing: time passes only in scenes where the cluster sways, never during a flight, never with reduced motion. */
    const loop = (): void => {
        const s = session.state;
        stop(); last = 0; carry = 0;
        if (!s || s.finished || reduce || !has(levelOf(s.level), 'balance')) return;
        const tick = (now: number): void => {
            frame = 0; if (disposed || flying || !session.state) return;
            carry = Math.min(carry + (last ? now - last : TICK_MS), TICK_MS * 6); last = now;
            const steps = Math.floor(carry / TICK_MS); carry -= steps * TICK_MS;
            if (steps) {
                session.state = advance(session.state, steps);
                root.querySelector('[data-grid]')?.setAttribute('transform', `translate(${gridShift(session.state).toFixed(2)} 0)`);
                if (shown || (helpOn(session.state) && session.state.tick % 5 < steps)) refreshAim();
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
    };
    function play(s: State, fresh: boolean): void {
        stop(); flying = false; observed.flying = false; session.screen = 'play'; session.state = s;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { session.aim = 0; session.last = null; message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw(); loop();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; stop(); clearTimeout(clear); };
}
