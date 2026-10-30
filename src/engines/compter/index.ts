import { makeRng, shuffle } from '../rng';
export type Mode = 'combien' | 'remplir' | 'plus';
export const objects = ['apple', 'pear', 'berry', 'carrot', 'star', 'fish', 'flower'] as const;
export type ObjectKind = typeof objects[number];
export interface Level { id: number; mode: Mode; max: number; comparison?: 'more' | 'less' }
export const levels: readonly Level[] = [
    { id: 1, mode: 'combien', max: 3 }, { id: 2, mode: 'combien', max: 5 },
    { id: 3, mode: 'combien', max: 10 }, { id: 4, mode: 'remplir', max: 5 },
    { id: 5, mode: 'remplir', max: 10 }, { id: 6, mode: 'plus', max: 5, comparison: 'more' },
    { id: 7, mode: 'plus', max: 10, comparison: 'more' }, { id: 8, mode: 'plus', max: 10, comparison: 'less' }
];
export interface Question {
    mode: Mode; object: ObjectKind; target: number; choices: number[];
    left: number; right: number; answer: number; reserve: number; comparison?: 'more' | 'less'; seed: number;
}
export function generateRound(level: number, seed: number, count = 6): Question[] {
    const spec = levels.find(l => l.id === level);
    if (!spec) throw new RangeError('Unknown level');
    if (!Number.isInteger(count) || count < 1) throw new RangeError('Invalid count');
    const rng = makeRng(seed);
    const integer = (max: number): number => 1 + Math.floor(rng() * max);
    const round: Question[] = [];
    const positions: number[] = [];
    for (let index = 0; index < count; index++) {
        let target = integer(spec.max);
        const previous = round.at(-1);
        // Adjacent targets differ even if the object changes.
        if (target === previous?.target) target = target % spec.max + 1;
        const object = objects[Math.floor(rng() * objects.length)]!;
        const candidates = shuffle([-1, 1, -2, 2], rng).map(d => target + d).filter(n => n >= 1 && n <= spec.max);
        const distractors = [...new Set(candidates)].slice(0, 2);
        // max is at least three; near neighbours always supply two distractors.
        const choices = [...distractors];
        const allowed = [0, 1, 2].filter(position => !(positions.at(-1) === position && positions.at(-2) === position));
        const position = allowed[Math.floor(rng() * allowed.length)]!;
        positions.push(position);
        choices.splice(position, 0, target);
        const left = target;
        let right = integer(spec.max);
        if (right === left) right = right % spec.max + 1;
        const answer = spec.mode === 'plus' ? (spec.comparison === 'less' ? (left < right ? 0 : 1) : (left > right ? 0 : 1)) : target;
        round.push({ mode: spec.mode, object, target, choices, left, right, answer, reserve: target + 2 + Math.floor(rng() * 3), comparison: spec.comparison, seed: Math.floor(rng() * 1000000) });
    }
    return round;
}
export const OBJECT_DIAMETER = 48;
export interface Position { x: number; y: number }
/** Shuffled grid cells with bounded jitter; separation is guaranteed, not probabilistic. */
export function layoutObjects(n: number, width: number, height: number, seed: number): Position[] {
    if (!Number.isInteger(n) || n < 0 || n > 10) throw new RangeError('Invalid quantity');
    if (n === 0) return [];
    let cols = Math.min(5, Math.floor(width / OBJECT_DIAMETER));
    while (cols > 1 && Math.ceil(n / cols) * OBJECT_DIAMETER > height) cols--;
    const rows = Math.ceil(n / cols);
    if (cols < 1 || rows * OBJECT_DIAMETER > height) throw new RangeError('Area too small');
    const dx = width / cols, dy = height / rows;
    const rng = makeRng(seed);
    return shuffle(Array.from({ length: cols * rows }, (_, i) => ({
        x: (i % cols + 0.5) * dx + (rng() - 0.5) * Math.max(0, dx - OBJECT_DIAMETER),
        y: (Math.floor(i / cols) + 0.5) * dy + (rng() - 0.5) * Math.max(0, dy - OBJECT_DIAMETER)
    })), rng).slice(0, n);
}
export interface Session {
    level: number; questions: Question[]; index: number; errors: number; firstTry: number;
    solved: boolean; basket: number; finished: boolean;
}
export function start(level: number, seed: number): Session {
    return { level, questions: generateRound(level, seed), index: 0, errors: 0, firstTry: 0, solved: false, basket: 0, finished: false };
}
export function moveObject(state: Session, delta: 1 | -1): Session {
    const q = state.questions[state.index];
    if (!q || q.mode !== 'remplir' || state.solved || state.finished) return state;
    return { ...state, basket: Math.max(0, Math.min(q.reserve, state.basket + delta)) };
}
export function answer(state: Session, choice: number): { state: Session; correct: boolean; hint: boolean } {
    const q = state.questions[state.index];
    if (!q || state.solved || state.finished) return { state, correct: false, hint: false };
    const correct = choice === q.answer;
    const errors = state.errors + (correct ? 0 : 1);
    return { correct, hint: !correct && errors >= 2, state: { ...state, errors, solved: correct, firstTry: state.firstTry + (correct && errors === 0 ? 1 : 0) } };
}
export function advance(state: Session): Session {
    if (!state.solved || state.finished) return state;
    if (state.index === state.questions.length - 1) return { ...state, finished: true };
    return { ...state, index: state.index + 1, errors: 0, solved: false, basket: 0 };
}
export function stars(firstTry: number): 1 | 2 | 3 { return firstTry >= 5 ? 3 : firstTry >= 3 ? 2 : 1; }
export type Records = Partial<Record<number, number>>;
export function isUnlocked(level: number, records: Records): boolean { return level === 1 || Boolean(records[level - 1]); }
export function complete(records: Records, state: Session): Records {
    if (!state.finished) return { ...records };
    return { ...records, [state.level]: Math.max(records[state.level] ?? 0, stars(state.firstTry)) };
}
