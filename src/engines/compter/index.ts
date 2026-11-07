import { makeRng, shuffle } from '../rng';
export type Mode = 'combien' | 'remplir' | 'plus';
export const objects = ['apple', 'pear', 'berry', 'carrot', 'star', 'fish', 'flower'] as const;
export type ObjectKind = typeof objects[number];
/**
 * Levels 9–16 add optional rules; levels 1–8 keep their exact literal configuration (records are stored by id).
 * min: lowest quantity (default 1). close: wrong cards are the target's ±1 neighbours whenever the range allows.
 * gap: the two baskets differ by at most gap. decoys: count one kind among ten objects of two kinds (target 3–7).
 * melange: each round reviews counting (close), filling, more, fewer and decoys in a shuffled order.
 */
export interface Level { id: number; mode: Mode | 'melange'; max: number; comparison?: 'more' | 'less'; min?: number; close?: boolean; gap?: number; decoys?: boolean }
export const levels: readonly Level[] = [
    { id: 1, mode: 'combien', max: 3 }, { id: 2, mode: 'combien', max: 5 },
    { id: 3, mode: 'combien', max: 10 }, { id: 4, mode: 'remplir', max: 5 },
    { id: 5, mode: 'remplir', max: 10 }, { id: 6, mode: 'plus', max: 5, comparison: 'more' },
    { id: 7, mode: 'plus', max: 10, comparison: 'more' }, { id: 8, mode: 'plus', max: 10, comparison: 'less' },
    { id: 9, mode: 'combien', min: 6, max: 10 }, { id: 10, mode: 'remplir', min: 6, max: 10 },
    { id: 11, mode: 'plus', min: 6, max: 10, comparison: 'more' }, { id: 12, mode: 'combien', min: 6, max: 10, close: true },
    { id: 13, mode: 'plus', min: 6, max: 10, comparison: 'more', gap: 1 }, { id: 14, mode: 'plus', min: 6, max: 10, comparison: 'less', gap: 1 },
    { id: 15, mode: 'combien', min: 3, max: 7, close: true, decoys: true }, { id: 16, mode: 'melange', min: 6, max: 10, close: true, gap: 1 }
];
/** Every decoy scene holds exactly this many objects, so the total never gives the answer away. */
export const DECOY_SCENE = 10;
export interface Question {
    mode: Mode; object: ObjectKind; target: number; choices: number[];
    left: number; right: number; answer: number; reserve: number; comparison?: 'more' | 'less'; seed: number;
    /** Present only when other objects share the scene: their kind and number (target + count = DECOY_SCENE). */
    decoy?: { object: ObjectKind; count: number };
}
interface Rule { mode: Mode; min: number; max: number; comparison?: 'more' | 'less'; close: boolean; gap?: number; decoys: boolean }
function rules(spec: Level, rng: () => number, count: number): Rule[] {
    const base = { min: spec.min ?? 1, max: spec.max, close: spec.close ?? false, gap: spec.gap, decoys: false };
    if (spec.mode !== 'melange') return Array.from({ length: count }, () => ({ ...base, mode: spec.mode as Mode, comparison: spec.comparison, decoys: spec.decoys ?? false }));
    const review: Rule[] = [
        { ...base, mode: 'combien' }, { ...base, mode: 'remplir' }, { ...base, mode: 'plus', comparison: 'more' },
        { ...base, mode: 'plus', comparison: 'less' }, { ...base, mode: 'combien', min: 3, max: 7, decoys: true }
    ];
    const order: Rule[] = [];
    // Every round of six covers the five reviewed tasks once, plus one more.
    while (order.length < count) order.push(...shuffle(review, rng));
    return order.slice(0, count);
}
export function generateRound(level: number, seed: number, count = 6): Question[] {
    const spec = levels.find(l => l.id === level);
    if (!spec) throw new RangeError('Unknown level');
    if (!Number.isInteger(count) || count < 1) throw new RangeError('Invalid count');
    const rng = makeRng(seed);
    // Levels 1–8 never reach the extra random draws below, so their rounds are unchanged.
    const plan = rules(spec, rng, count);
    const within = (r: Rule): number => r.min + Math.floor(rng() * (r.max - r.min + 1));
    const round: Question[] = [];
    const positions: number[] = [];
    for (let index = 0; index < count; index++) {
        const r = plan[index]!;
        let target = within(r);
        const previous = round.at(-1);
        // Adjacent targets differ even if the object changes.
        if (target === previous?.target) target = target === r.max ? r.min : target + 1;
        const object = objects[Math.floor(rng() * objects.length)]!;
        const deltas = r.close ? [...shuffle([-1, 1], rng), ...shuffle([-2, 2], rng)] : shuffle([-1, 1, -2, 2], rng);
        const candidates = deltas.map(d => target + d).filter(n => n >= r.min && n <= r.max);
        const distractors = [...new Set(candidates)].slice(0, 2);
        // Every range spans at least three values; near neighbours always supply two distractors.
        const choices = [...distractors];
        const allowed = [0, 1, 2].filter(position => !(positions.at(-1) === position && positions.at(-2) === position));
        const position = allowed[Math.floor(rng() * allowed.length)]!;
        positions.push(position);
        choices.splice(position, 0, target);
        const left = target;
        let right: number;
        if (r.gap) {
            const step = (1 + Math.floor(rng() * r.gap)) * (rng() < .5 ? -1 : 1);
            right = target + step >= r.min && target + step <= r.max ? target + step : target - step;
        } else {
            right = within(r);
            if (right === left) right = right === r.max ? r.min : right + 1;
        }
        const answer = r.mode === 'plus' ? (r.comparison === 'less' ? (left < right ? 0 : 1) : (left > right ? 0 : 1)) : target;
        const question: Question = { mode: r.mode, object, target, choices, left, right, answer, reserve: target + 2 + Math.floor(rng() * 3), comparison: r.comparison, seed: Math.floor(rng() * 1000000) };
        if (r.decoys) {
            const others = objects.filter(o => o !== object);
            question.decoy = { object: others[Math.floor(rng() * others.length)]!, count: DECOY_SCENE - target };
        }
        round.push(question);
    }
    return round;
}
export const OBJECT_DIAMETER = 68;
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
