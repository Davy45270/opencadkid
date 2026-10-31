import { makeRng } from '../rng';
import { stars as commonStars, type Records } from '../compter';
export { isUnlocked } from '../compter';
export type Mode = 'repeter' | 'rythme' | 'libre';
export interface Level { id: number; mode: Mode; drums: number; min: number; max: number }
export const levels: readonly Level[] = [
    { id: 1, mode: 'repeter', drums: 4, min: 2, max: 3 },
    { id: 2, mode: 'repeter', drums: 4, min: 2, max: 4 },
    { id: 3, mode: 'repeter', drums: 5, min: 3, max: 5 },
    { id: 4, mode: 'repeter', drums: 6, min: 3, max: 6 },
    { id: 5, mode: 'rythme', drums: 4, min: 3, max: 3 },
    { id: 6, mode: 'rythme', drums: 5, min: 4, max: 4 },
    { id: 7, mode: 'rythme', drums: 6, min: 6, max: 6 },
    { id: 8, mode: 'libre', drums: 6, min: 8, max: 8 }
];
// C major pentatonic, with the octave as the sixth voice.
export const notes = [261.63, 293.66, 329.63, 392, 440, 523.25] as const;
export const BASE_TEMPO = 650;
export const MAX_TEMPO = 1600;
export interface Question { mode: Mode; sequence: number[]; intervals: number[] }
export function generateRound(level: number, seed: number, count = 5): Question[] {
    const spec = levels.find(l => l.id === level);
    if (!spec || !Number.isInteger(count) || count < 1 || count > 16) throw new RangeError('Invalid round');
    const rng = makeRng(seed), result: Question[] = [], used = new Set<string>();
    for (let n = 0; n < count; n++) {
        let q: Question, signature: string;
        do {
            const sequence: number[] = [];
            for (let i = 0; i < spec.max; i++) {
                const allowed = Array.from({ length: spec.drums }, (_, d) => d).filter(d => i < 2 || sequence[i - 1] !== d || sequence[i - 2] !== d);
                sequence.push(allowed[Math.floor(rng() * allowed.length)]!);
            }
            // The rhythm uses one drum; long/short intervals carry its identity.
            const intervals = Array.from({ length: spec.max - 1 }, () => rng() < .5 ? 1 : 2);
            if (spec.mode === 'rythme') sequence.fill(sequence[0]!);
            q = { mode: spec.mode, sequence, intervals };
            signature = JSON.stringify(spec.mode === 'rythme' ? [sequence[0], intervals] : sequence.slice(0, spec.min));
        } while (used.has(signature));
        used.add(signature); result.push(q);
    }
    return result;
}
export interface Session { level: number; questions: Question[]; index: number; cursor: number; length: number; errors: number; firstTry: number; tempo: number; hint: boolean; last: number | null; composed: { drum: number; t: number }[]; solved: boolean; finished: boolean }
export function start(level: number, seed: number): Session {
    const questions = generateRound(level, seed), spec = levels[level - 1]!;
    return { level, questions, index: 0, cursor: 0, length: spec.min, errors: 0, firstTry: 0, tempo: BASE_TEMPO, hint: false, last: null, composed: [], solved: false, finished: false };
}
export function sequence(state: Session): number[] { return state.questions[state.index]!.sequence.slice(0, state.length); }
export function hit(state: Session, drum: number, t: number): { state: Session; correct: boolean; replay: boolean } {
    const spec = levels[state.level - 1]!, q = state.questions[state.index];
    if (!q || state.solved || state.finished || !Number.isInteger(drum) || drum < 0 || drum >= spec.drums || !Number.isFinite(t) || (state.last !== null && t < state.last)) return { state, correct: false, replay: false };
    const expected = state.tempo * q.intervals[state.cursor - 1]!;
    const correct = spec.mode === 'libre' || (drum === q.sequence[state.cursor] && (spec.mode !== 'rythme' || state.last === null || Math.abs(t - state.last - expected) <= expected * .35 + 1e-7));
    if (!correct) {
        const errors = state.errors + 1, length = spec.mode === 'repeter' && errors % 2 === 0 ? Math.max(spec.min, state.length - 1) : state.length;
        return { correct, replay: true, state: { ...state, errors, length, cursor: 0, last: null, tempo: Math.min(MAX_TEMPO, state.tempo * 1.3), hint: errors >= 2 } };
    }
    const cursor = state.cursor + 1, solved = cursor === state.length;
    return { correct, replay: false, state: { ...state, cursor, last: t, solved, composed: spec.mode === 'libre' ? [...state.composed, { drum, t }] : state.composed, firstTry: state.firstTry + Number(solved && state.errors === 0) } };
}
export function advance(state: Session): Session {
    if (!state.solved || state.finished) return state;
    if (state.index === state.questions.length - 1) return { ...state, finished: true };
    const spec = levels[state.level - 1]!;
    return { ...state, index: state.index + 1, cursor: 0, length: spec.mode === 'repeter' ? Math.min(spec.max, state.length + 1) : state.length, errors: 0, tempo: BASE_TEMPO, hint: false, last: null, composed: [], solved: false };
}
export function stars(state: Session): 1 | 2 | 3 { return levels[state.level - 1]!.mode === 'libre' ? 3 : commonStars(state.firstTry); }
export function complete(records: Records, state: Session): Records { return state.finished ? { ...records, [state.level]: Math.max(records[state.level] ?? 0, stars(state)) } : { ...records }; }
