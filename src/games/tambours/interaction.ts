import { advance, hit, levels, notes, sequence, type Session } from '../../engines/tambours';
import { bindAction, bindBeat } from '../../shell/activation';
import { drumNote } from '../../shell/sound';
import { icon, svg } from '../../ui/svg';
import { text, type Locale } from '../../shell/i18n';
import { instruction } from './view';
export const hand = svg('<path d="M22 48V22Q22 15 28 15Q34 15 34 22V37V10Q34 3 40 3Q46 3 46 10V36V15Q46 8 52 8Q58 8 58 15V39V25Q58 18 64 18Q70 18 70 25V61Q70 86 49 89Q33 92 22 76L8 55Q3 46 11 43Q16 41 22 48Z" fill="#edc59f" stroke="#58443b" stroke-width="3"/>', '0 0 90 96');
export function bindDrums(app: HTMLElement, initial: Session, locale: Locale, sound: boolean, update: (state: Session) => void, speak: (parts: string[]) => void): () => void {
    let state = initial, phase = 'listening', disposed = false;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const lights = new Map<number, ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, delay: number): void => { timers.push(setTimeout(() => { if (!disposed && !document.hidden) fn(); }, delay)); };
    const zone = app.querySelector<HTMLElement>('.tambours-zone');
    const setPhase = (value: string): void => {
        phase = value; if (zone) { zone.dataset.phase = value; zone.dataset.tempo = String(state.tempo); }
        const listening = value === 'listening';
        app.querySelector('#drums-cue')!.innerHTML = listening ? icon('ear') : hand;
        app.querySelector('#drums-instruction')!.textContent = instruction(state, locale, listening);
    };
    const light = (d: number): void => {
        const button = app.querySelector<HTMLElement>(`[data-drum="${d}"]`)!;
        clearTimeout(lights.get(d)); button.dataset.lit = 'true';
        drumNote(sound, notes[d]!);
        const timer = setTimeout(() => { button.dataset.lit = 'false'; }, 230);
        lights.set(d, timer);
    };
    const ready = (): void => { setPhase('playing'); speak([instruction(state, locale)]); };
    const playback = (composition = false): void => {
        timers.forEach(clearTimeout); timers = [];
        setPhase('listening'); speak([text(locale, 'drumsListen')]);
        const drums = composition ? state.composed.map(b => b.drum) : sequence(state);
        let at = 500;
        drums.forEach((drum, i) => {
            if (i) at += composition ? Math.min(2000, Math.max(100, state.composed[i]!.t - state.composed[i - 1]!.t)) : state.tempo * (levels[state.level - 1]!.mode === 'rythme' ? state.questions[state.index]!.intervals[i - 1]! : 1);
            later(() => light(drum), at);
        });
        later(() => {
            if (state.solved) { setPhase('solved'); app.querySelector<HTMLButtonElement>('#continue')!.hidden = false; speak([text(locale, 'bravo')]); }
            else ready();
        }, at + state.tempo);
    };
    if (zone) {
        app.querySelectorAll<HTMLElement>('[data-drum]').forEach(button => bindBeat(button, () => {
            if (phase !== 'playing' || document.hidden || disposed) return;
            const drum = Number(button.dataset.drum), result = hit(state, drum, performance.now());
            if (result.state === state) return;
            state = result.state; update(state); light(drum);
            app.querySelectorAll<HTMLElement>('[data-beat]').forEach(el => { el.dataset.played = String(Number(el.dataset.beat) < state.cursor); });
            app.querySelectorAll<HTMLElement>('[data-drum]').forEach(el => { el.dataset.hint = String(state.hint && sequence(state)[state.cursor] === Number(el.dataset.drum)); });
            if (result.replay) { app.querySelector('#feedback')!.textContent = text(locale, 'tryAgain'); playback(); }
            else if (state.solved) {
                if (levels[state.level - 1]!.mode === 'libre') playback(true);
                else { setPhase('solved'); app.querySelector<HTMLButtonElement>('#continue')!.hidden = false; speak([text(locale, 'bravo')]); }
            }
        }, `tambours:${state.index}:${button.dataset.drum}`));
        bindAction(app.querySelector('#continue')!, () => update(advance(state)), `tambours:${state.index}:continue`);
        bindAction(app.querySelector('#listen')!, () => { if (state.solved && state.composed.length) playback(true); else if (!state.solved && levels[state.level - 1]!.mode === 'libre') speak([instruction(state, locale)]); else if (!state.solved) { state = { ...state, cursor: 0, last: null }; update(state); playback(); } }, 'tambours:listen');
        if (levels[state.level - 1]!.mode === 'libre') { if (state.solved) playback(true); else ready(); } else playback();
    }
    return () => { disposed = true; timers.forEach(clearTimeout); lights.forEach(clearTimeout); };
}
