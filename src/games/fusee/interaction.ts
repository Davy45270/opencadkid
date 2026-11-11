import { carrying, complete, helpOn, HEIGHT, isUnlocked, levelOf, padAt, parseRecords, RATE, start, step, WIDTH, world, type Command, type Event, type Point, type Records, type State } from '../../engines/fusee';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { boingLines, dust, laughMarks, missAnimations, rocketSvg, sparkle, tocMark, waveHand } from './art';
import { gameView, helpSvg, instruction, inward, labels, levelView, padGroup, typeset } from './view';

export const RECORDS_KEY = 'opencadkid.fusee.v1';
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }
/** Survives a remount (page hidden then shown): the scene in progress, the last thing that happened and the records. */
export interface Session { screen: 'levels' | 'play'; state: State | null; records: Records; last: Event | null }
/** Milliseconds per engine step. */
export const STEP_MS = 1000 / RATE;
/** How long a bounce takes on screen, and how long the funny faces stay. */
export const BOUNCE_MS = 1300;
export const EFFECT_MS = 1800;
/** A finger slid this far from where it pressed moves the rocket to that side. */
export const SLIDE_PX = 14;
/** The written line under the guide: a title without its own full stop gets one before what follows. */
export const sentence = (words: readonly string[]): string => words.map((w, i) => i < words.length - 1 && !/[.!?…]$/.test(w) ? `${w}.` : w).join(' ');
const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let observed = { bouncing: false, pressing: false, side: 0 };
export function snapshot(session: Session, root: ParentNode): object {
    const r = root.querySelector('.fusee-zone svg')?.getBoundingClientRect(), s = session.state;
    const toScreen = (p: Point) => r ? { x: r.x + p.x / WIDTH * r.width, y: r.y + p.y / HEIGHT * r.height } : null;
    const pads = s ? levelOf(s.level).pads.map((_, i) => { const p = padAt(world(levelOf(s.level)), i, s.t); return toScreen({ x: p.x, y: p.top }); }) : [];
    return { ...session, zone: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, rocket: s ? toScreen(s) : null, pads, help: s ? helpOn(s) : false, carrying: s ? carrying(s) : false, ...observed };
}
export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, home: () => void): () => void {
    const t = labels[locale], reduce = reducedMotion();
    let frame = 0, disposed = false, message = '', clear = 0, last = 0, acc = 0;
    /** What the child holds: a finger on the sky (with where it pressed), the big buttons, the keys. */
    let finger: { id: number; x: number } | null = null, slide: -1 | 0 | 1 = 0, puffButton = false, sideButton: -1 | 0 | 1 = 0, keyPuff = false, keySide: -1 | 0 | 1 = 0;
    let bounce: { from: Point; to: Point; began: number; ms: number; kind: 'miss' | 'land' } | null = null;
    observed = { bouncing: false, pressing: false, side: 0 };
    const command = (): Command => {
        const puff = finger !== null || puffButton || keyPuff, side = slide || sideButton || keySide;
        observed.pressing = puff; observed.side = side;
        return { puff, side };
    };
    const bouncing = (): boolean => bounce !== null;
    const stop = (): void => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const release = (): void => { finger = null; slide = 0; puffButton = false; sideButton = 0; keyPuff = false; keySide = 0; command(); };
    const levelsScreen = (): void => {
        stop(); release(); session.screen = 'levels'; session.state = null; session.last = null;
        root.innerHTML = levelView(session.records, locale);
        bindAction(root.querySelector<HTMLElement>('#back')!, home, 'fusee:home');
        root.querySelectorAll<HTMLElement>('[data-fusee-level]').forEach(el => bindAction(el, () => { const id = Number(el.dataset.fuseeLevel); if (isUnlocked(id, session.records)) play(start(id), true); }, () => `fusee:level:${el.dataset.fuseeLevel!}`));
    };
    const say = (text: string, aloud = true): void => { message = text; const p = root.querySelector('#fusee-message'); if (p) p.textContent = typeset(text); if (aloud) speak([text]); };
    const fx = (html: string): void => { root.querySelector('[data-effects]')?.insertAdjacentHTML('beforeend', html); };
    const still = (): string => reduce ? ' data-still' : '';
    const rocketEl = (): SVGGElement | null => root.querySelector<SVGGElement>('[data-rocket]');
    const drawRocket = (s: State, at: Point = s, dizzy = false): void => {
        const r = rocketEl(); if (!r) return;
        r.setAttribute('transform', `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`);
        const inner = r.querySelector('.fusee-rocket');
        const key = `${carrying(s)}|${dizzy}|${s.finished}`;
        if (inner && inner.getAttribute('data-look') !== key) { inner.innerHTML = rocketSvg({ passenger: carrying(s), dizzy, happy: s.finished }); inner.setAttribute('data-look', key); }
        r.toggleAttribute('data-puff', observed.pressing && !bounce && !s.finished);
    };
    /** The runways move (a sliding one), and the one to visit next glows; the help arrow points at it. */
    const drawPads = (s: State): void => {
        const level = levelOf(s.level), w = world(level), layer = root.querySelector('[data-pads]');
        if (!layer) return;
        level.pads.forEach((p, i) => {
            const el = layer.querySelector(`[data-pad="${i}"]`), active = !s.finished && s.visited === i;
            if (!el) return;
            if (el.hasAttribute('data-active') !== active || el.hasAttribute('data-done') !== i < s.visited) { el.outerHTML = padGroup(s, i); return; }
            if (p.swing) { const at = padAt(w, i, s.t); el.setAttribute('transform', `translate(${at.x.toFixed(1)} ${at.top.toFixed(1)})`); }
        });
        const help = root.querySelector('g[data-help]');
        if (help) {
            const on = helpOn(s) && !s.finished;
            help.setAttribute('opacity', on ? '1' : '0');
            if (on) { const at = padAt(w, s.visited, s.t); if (!help.innerHTML) help.innerHTML = helpSvg(); help.setAttribute('transform', `translate(${at.x.toFixed(1)} ${(at.top - 26).toFixed(1)})`); }
            root.querySelector('.fusee-zone')?.toggleAttribute('data-help', on);
        }
    };
    /** The funny try, drawn where it happens. */
    const funny = (e: Extract<Event, { kind: 'miss' }>, s: State): void => {
        const level = levelOf(s.level), w = world(level), m = e.miss, at = `translate(${e.at.x.toFixed(1)} ${(e.at.y + 9).toFixed(1)})`;
        root.querySelector('.fusee-zone')?.setAttribute('data-miss', m);
        if (m === 'boing') fx(`<g transform="${at}" data-miss="boing"${still()}><g class="${missAnimations.boing}">${boingLines()}</g></g>`);
        if (m === 'pouf') fx(`<g transform="${at}" data-miss="pouf"${still()}><g class="${missAnimations.pouf}">${dust()}</g></g>`);
        if (m === 'tournis') fx(`<g transform="${at}" data-miss="tournis"${still()}><g class="${missAnimations.tournis}">${dust()}</g></g>`);
        if (m === 'cratere') {
            const c = level.craters[e.what]!;
            root.querySelector(`[data-crater="${e.what}"] .fusee-inner`)?.setAttribute('class', `fusee-inner ${missAnimations.cratere}`);
            fx(`<g transform="translate(${c.x} ${e.at.y + 9})" data-miss="cratere"${still()}><g class="fusee-puff">${dust(true)}</g></g>`);
        }
        if (m === 'toc') {
            root.querySelector(`[data-rock="${e.what}"] .fusee-inner`)?.setAttribute('class', `fusee-inner ${missAnimations.toc}`);
            fx(`<g transform="translate(${e.at.x.toFixed(1)} ${e.at.y.toFixed(1)})" data-miss="toc"${still()}>${tocMark()}</g>`);
        }
        if (m === 'rigole') {
            const a = w.aliens[e.what]!;
            root.querySelector(`[data-alien="${e.what}"] .fusee-inner`)?.setAttribute('class', `fusee-inner ${missAnimations.rigole}`);
            fx(`<g transform="translate(${a.x + a.w / 2} ${a.y + a.h})" data-miss="rigole"${still()}>${laughMarks()}</g>`);
        }
        if (m === 'coucou') {
            const p = padAt(w, e.what, s.t), dir = inward(level.pads[e.what]!.x), next = padAt(w, s.visited, s.t);
            fx(`<g transform="translate(${(p.x + dir * (p.w / 2 + 8)).toFixed(1)} ${(p.top - 14).toFixed(1)})" data-miss="coucou"${still()}><g class="${missAnimations.coucou}">${waveHand(next.x > p.x ? 1 : -1)}</g></g>`);
        }
    };
    const clearEffects = (): void => {
        const e = root.querySelector('[data-effects]'); if (e) e.innerHTML = '';
        root.querySelector('.fusee-zone')?.removeAttribute('data-miss');
        root.querySelectorAll('.fusee-inner').forEach(el => el.setAttribute('class', 'fusee-inner'));
    };
    /** What happened in this step, drawn and said. */
    const happen = (before: State, e: Event, s: State): void => {
        session.last = e;
        if (e.kind === 'star') {
            root.querySelector(`[data-star="${e.id}"]`)?.remove();
            const p = levelOf(s.level).stars[e.id]!;
            fx(`<g transform="translate(${p.x} ${p.y})"${still()}>${sparkle()}</g>`); say(t.star); chime(sound());
            return;
        }
        clearTimeout(clear); clearEffects();
        bounce = { from: e.at, to: e.to, began: performance.now(), ms: reduce ? 500 : e.kind === 'land' && s.finished ? 1 : BOUNCE_MS, kind: e.kind };
        observed.bouncing = true;
        if (e.kind === 'miss') {
            funny(e, s); say(t.miss[e.miss]);
            if (helpOn(s) && s.dry === 3) say(t.help);
        } else if (s.finished) {
            session.records = complete(session.records, s); writeRecords(storage, session.records); chime(sound());
            message = levelOf(s.level).passenger ? t.home : t.won; speak([message]); bounce = null; observed.bouncing = false; release(); draw(); return;
        } else {
            chime(sound());
            say(levelOf(s.level).passenger && carrying(s) ? t.aboard : t.hello);
        }
        void before;
        clear = window.setTimeout(() => { if (!disposed && session.last === e) clearEffects(); }, EFFECT_MS);
    };
    const tick = (now: number): void => {
        if (disposed) return;
        const s0 = session.state;
        if (!s0 || s0.finished) { frame = 0; return; }
        const dt = Math.min(100, now - last); last = now;
        if (bounce) {
            const k = Math.min(1, (now - bounce.began) / bounce.ms);
            // A ball's bounce: up past the new place, then settling into it.
            const e = reduce ? 1 : 1 - Math.pow(1 - k, 2), hop = reduce ? 0 : Math.sin(Math.PI * k) * 14;
            const at = { x: bounce.from.x + (bounce.to.x - bounce.from.x) * e, y: bounce.from.y + (bounce.to.y - bounce.from.y) * e - hop };
            drawRocket(s0, at, bounce.kind === 'miss' && session.last?.kind === 'miss' && session.last.miss === 'tournis');
            if (k >= 1) { bounce = null; observed.bouncing = false; acc = 0; drawRocket(s0); }
        } else {
            acc += dt;
            while (acc >= STEP_MS && !bouncing()) {
                acc -= STEP_MS;
                const before = session.state!, { state, event } = step(before, command());
                session.state = state;
                if (event) happen(before, event, state);
                if (state.finished) return;
            }
            if (!bouncing()) drawRocket(session.state!);
        }
        drawPads(session.state!);
        frame = requestAnimationFrame(tick);
    };
    const run = (): void => { stop(); last = performance.now(); acc = 0; frame = requestAnimationFrame(tick); };
    /** A big button held down: the puff, or one side. */
    const hold = (el: HTMLElement | null, on: () => void, off: () => void, key: string): void => {
        if (!el) return;
        el.addEventListener('pointerdown', e => { if (!e.isPrimary && e.pointerType !== 'touch') return; e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch { /* Holding goes on without capture. */ } el.setAttribute('data-held', ''); on(); recordActivation(`fusee:${key}`, 'pointerdown', true, 'hold'); });
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) el.addEventListener(name, () => { el.removeAttribute('data-held'); off(); });
        el.addEventListener('contextmenu', e => e.preventDefault());
        el.onclick = e => { if (e.detail === 0) recordActivation(`fusee:${key}`, 'click', false, 'keyboard-on-hold'); };
    };
    const draw = (): void => {
        const s = session.state!;
        root.innerHTML = gameView(s, locale, message, reduce);
        bindAction(root.querySelector<HTMLElement>('#back')!, levelsScreen, 'fusee:levels');
        bindAction(root.querySelector<HTMLElement>('#listen')!, () => { const st = session.state!; speak(st.finished ? [message] : helpOn(st) ? [t.help] : instruction(levelOf(st.level), locale)); }, 'fusee:listen');
        const again = root.querySelector<HTMLElement>('#fusee-again'), next = root.querySelector<HTMLElement>('#fusee-next');
        if (again) bindAction(again, () => play(start(s.level), true), `fusee:again:${s.level}`);
        if (next) bindAction(next, () => play(start(s.level + 1), true), `fusee:next:${s.level}`);
        hold(root.querySelector('#fusee-puff'), () => { puffButton = true; }, () => { puffButton = false; }, 'puff');
        hold(root.querySelector('#fusee-left'), () => { sideButton = -1; }, () => { if (sideButton === -1) sideButton = 0; }, 'left');
        hold(root.querySelector('#fusee-right'), () => { sideButton = 1; }, () => { if (sideButton === 1) sideButton = 0; }, 'right');
        const zone = root.querySelector<HTMLElement>('.fusee-zone')!;
        zone.addEventListener('pointerdown', e => {
            if (session.state!.finished || (e.target as Element).closest('.fusee-reward') || !e.isPrimary) return;
            e.preventDefault(); finger = { id: e.pointerId, x: e.clientX }; slide = 0;
            try { zone.setPointerCapture(e.pointerId); } catch { /* A finger already gone: the puff goes on without capture. */ }
            recordActivation('fusee:sky', 'pointerdown', true, 'hold');
        });
        zone.addEventListener('pointermove', e => { if (finger && e.pointerId === finger.id) { const dx = e.clientX - finger.x; slide = dx > SLIDE_PX ? 1 : dx < -SLIDE_PX ? -1 : 0; } });
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) zone.addEventListener(name, e => { if (finger && e.pointerId === finger.id) { finger = null; slide = 0; } });
        zone.addEventListener('contextmenu', e => e.preventDefault());
        zone.addEventListener('keydown', e => {
            if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); keyPuff = true; }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); keySide = -1; }
            else if (e.key === 'ArrowRight') { e.preventDefault(); keySide = 1; }
        });
        zone.addEventListener('keyup', e => {
            if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'Enter') keyPuff = false;
            else if (e.key === 'ArrowLeft' && keySide === -1) keySide = 0;
            else if (e.key === 'ArrowRight' && keySide === 1) keySide = 0;
        });
        zone.addEventListener('blur', () => { keyPuff = false; keySide = 0; });
        drawPads(s); drawRocket(s);
        if (!s.finished) run();
    };
    function play(s: State, fresh: boolean): void {
        stop(); release(); bounce = null; observed.bouncing = false; session.screen = 'play'; session.state = s;
        const words = instruction(levelOf(s.level), locale);
        if (fresh) { session.last = null; message = sentence(words); speak(words); }
        else if (!message) message = sentence(words);
        draw();
    }
    if (session.screen === 'play' && session.state) play(session.state, false); else levelsScreen();
    return () => { disposed = true; stop(); clearTimeout(clear); };
}
