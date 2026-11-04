import { advance, complete, cut, DT, FIELD, isUnlocked, levels, parseRecords, pop, start, swipeTargets, tapTarget, type Point, type Records, type State } from '../../engines/gouter';
import { bindAction, recordActivation } from '../../shell/activation';
import { screenToZone } from '../../shell/coordinates';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { gameView, labels, levelView, update } from './view';

export const RECORDS_KEY = 'opencadkid.gouter.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the level, its physics state and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records }
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.gouter-zone')?.getBoundingClientRect();
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, field: FIELD, levels: levels.length };
}
/** Pauses after a loss before the same level starts again, long enough to see what happened. */
export const RESTART_TICKS = 70;
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale];
    let frame = 0, last = 0, carry = 0, lostFor = 0, disposed = false;
    let finger: { id: number; start: Point; last: Point; moved: boolean } | undefined;
    const stop = (): void => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const levelsScreen = (): void => {
        stop(); session.screen = 'levels'; session.state = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'gouter:home');
        root.querySelectorAll<HTMLElement>('[data-gouter-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.gouterLevel); if (isUnlocked(id, session.records)) play(start(id)); }, () => `gouter:level:${el.dataset.gouterLevel!}`));
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'gouter:levels');
        bindAction(root.querySelector<HTMLElement>('#gouter-restart')!, () => play(start(s.level)), () => `gouter:restart:${s.level}:${s.tick}`);
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => speak([root.querySelector('#gouter-message')!.textContent]), 'gouter:listen');
        const again = root.querySelector<HTMLElement>('#gouter-again'), next = root.querySelector<HTMLElement>('#gouter-next');
        if (again) bindAction(again, () => play(start(s.level)), `gouter:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1)), `gouter:next:${s.level}`);
        const zone = root.querySelector<HTMLElement>('.gouter-zone')!;
        zone.addEventListener('pointerdown', down); zone.addEventListener('pointermove', move);
        zone.addEventListener('pointerup', up); zone.addEventListener('pointercancel', cancel);
    };
    const point = (event: PointerEvent): Point => screenToZone({ x: event.clientX, y: event.clientY }, root.querySelector('.gouter-zone')!.getBoundingClientRect(), FIELD);
    const apply = (next: State, reason: string): void => {
        if (next === session.state) return;
        session.state = next; recordActivation(`gouter:${reason}`, 'pointer', true, 'cut-or-pop'); update(root, next);
    };
    function down(event: PointerEvent): void {
        if (!session.state || session.state.status !== 'play' || finger || !event.isPrimary) return;
        event.preventDefault(); (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        const p = point(event); finger = { id: event.pointerId, start: p, last: p, moved: false };
    }
    function move(event: PointerEvent): void {
        if (!finger || event.pointerId !== finger.id || !session.state) return;
        event.preventDefault();
        const batch = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : [];
        for (const e of batch.length ? batch : [event]) {
            const p = point(e);
            if (Math.hypot(p.x - finger.start.x, p.y - finger.start.y) >= 10) finger.moved = true;
            if (finger.moved) for (const i of swipeTargets(session.state, finger.last, p)) apply(cut(session.state, i), `rope-${i}`);
            finger.last = p;
        }
        const trail = root.querySelector('[data-swipe]');
        if (trail && finger.moved) trail.setAttribute('d', `M${finger.start.x.toFixed(0)} ${finger.start.y.toFixed(0)}L${finger.last.x.toFixed(0)} ${finger.last.y.toFixed(0)}`);
    }
    function up(event: PointerEvent): void {
        if (!finger || event.pointerId !== finger.id) return;
        const f = finger; finger = undefined; root.querySelector('[data-swipe]')?.setAttribute('d', '');
        if (!session.state) return;
        if (!f.moved) {
            const target = tapTarget(session.state, point(event));
            if (target?.kind === 'bubble') apply(pop(session.state, target.index), `bubble-${target.index}`);
            else if (target) apply(cut(session.state, target.index), `rope-${target.index}`);
            else recordActivation('gouter:miss', event.type, false, 'nothing-in-reach');
        }
    }
    function cancel(event: PointerEvent): void { if (finger?.id === event.pointerId) { finger = undefined; root.querySelector('[data-swipe]')?.setAttribute('d', ''); } }
    const tick = (now: number): void => {
        frame = 0; if (disposed || !session.state) return;
        // A hidden tab or a slow phone never makes the sweet jump: at most six physics steps per frame.
        carry = Math.min(carry + (last ? (now - last) / 1000 : DT), DT * 6); last = now;
        const steps = Math.floor(carry / DT); carry -= steps * DT;
        const before = session.state.status;
        if (before === 'lost') { lostFor += steps; if (lostFor >= RESTART_TICKS) { play(start(session.state.level)); return; } }
        else if (steps) { session.state = advance(session.state, steps); update(root, session.state); }
        if (before === 'play' && session.state.status !== 'play') settle();
        if (session.state.status !== 'won') frame = requestAnimationFrame(tick);
    };
    const settle = (): void => {
        const s = session.state!;
        if (s.status === 'won') { session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound()); speak([t.won]); }
        else speak([t.lost]);
        lostFor = 0; finger = undefined; draw();
    };
    function play(s: State): void {
        stop(); session.screen = 'play'; session.state = s; last = 0; carry = 0; lostFor = 0; finger = undefined; draw();
        if (s.status !== 'won') frame = requestAnimationFrame(tick);
    }
    if (session.screen === 'play' && session.state) play(session.state); else levelsScreen();
    return () => { disposed = true; stop(); };
}
