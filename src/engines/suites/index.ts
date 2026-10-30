import { makeRng, shuffle } from '../rng';
import { stars, type Records } from '../compter';
export { stars, isUnlocked } from '../compter';
export type Mode = 'suivant' | 'trou' | 'deux-suivants' | 'croissant';
export const shapes = ['perle', 'triangle', 'carre', 'fleur', 'etoile', 'lune'] as const;
export const colors = ['rouge', 'bleu', 'jaune', 'vert', 'violet', 'orange'] as const;
export interface Item { shape: typeof shapes[number] | 'points'; color: typeof colors[number]; dots: number }
export interface Level { id: number; mode: Mode; pattern: string; choices: number }
export const levels: readonly Level[] = [
    { id: 1, mode: 'suivant', pattern: 'AB', choices: 3 },
    { id: 2, mode: 'suivant', pattern: 'AAB', choices: 3 },
    { id: 3, mode: 'suivant', pattern: 'ABB', choices: 4 },
    { id: 4, mode: 'suivant', pattern: 'ABC', choices: 4 },
    { id: 5, mode: 'suivant', pattern: 'AABB', choices: 4 },
    { id: 6, mode: 'suivant', pattern: 'ABCD', choices: 4 },
    { id: 7, mode: 'trou', pattern: 'ABC', choices: 4 },
    { id: 8, mode: 'trou', pattern: 'AABB', choices: 4 },
    { id: 9, mode: 'deux-suivants', pattern: 'ABC', choices: 4 },
    { id: 10, mode: 'croissant', pattern: '', choices: 4 }
];
export const key = (item: Item): string => `${item.shape}:${item.color}:${item.dots}`;
export interface Question { mode: Mode; pattern: Item[]; sequence: (Item | null)[]; slots: number[]; choices: Item[]; answers: number[]; answer: number }
/** Enumerate periods 1…4. A residue may be freely assigned only if no visible
 * item constrains it. This is equivalent to enumerating every base motif. */
export function compatibleChoices(sequence: readonly (Item | null)[], slot: number, choices: readonly Item[]): number[] {
    return choices.flatMap((item, choice) => {
        const possible = [1, 2, 3, 4].some(period => {
            const base = new Map<number, string>();
            for (let i = 0; i < sequence.length; i++) {
                const value = i === slot ? item : sequence[i];
                if (!value) continue;
                const residue = i % period, valueKey = key(value);
                if (base.has(residue) && base.get(residue) !== valueKey) return false;
                base.set(residue, valueKey);
            }
            return true;
        });
        return possible ? [choice] : [];
    });
}
export function generateRound(level: number, seed: number, count = 6): Question[] {
    const spec = levels.find(l => l.id === level);
    if (!spec || !Number.isInteger(count) || count < 1) throw new RangeError('Invalid round');
    const rng = makeRng(seed), round: Question[] = [], positions: number[] = [];
    for (let n = 0; n < count; n++) {
        const palette = shuffle(colors, rng), outlines = shuffle(shapes, rng), mixed = rng() < .65;
        const items: Item[] = outlines.map((shape, i) => ({ shape, color: palette[mixed ? i : 0]!, dots: 0 }));
        const pattern = Array.from(spec.pattern, c => items[c.charCodeAt(0) - 65]!);
        const growing = spec.mode === 'croissant';
        const first = 1 + Math.floor(rng() * 2);
        const dotItem = (dots: number): Item => ({ shape: 'points', color: palette[0]!, dots });
        // Stop at any motif residue after at least two full repetitions.
        const length = growing ? 4 : spec.mode === 'trou' ? 12 : Math.ceil(8 / pattern.length) * pattern.length + (spec.mode === 'suivant' ? Math.floor(rng() * pattern.length) : 0);
        const sequence: (Item | null)[] = Array.from({ length }, (_, i) => growing ? dotItem(first + i) : pattern[i % pattern.length]!);
        const slots = spec.mode === 'trou' ? [4 + Math.floor(rng() * 4)] : Array.from({ length: spec.mode === 'deux-suivants' ? 2 : 1 }, (_, i) => length + i);
        const targets = slots.map(i => growing ? dotItem(first + i) : pattern[i % pattern.length]!);
        for (const slot of slots) sequence[slot] = null;
        // Prefer wrong ranks, then an outside motif. AB with four choices needs
        // a second outside item because duplicate choices would be ambiguous.
        const unique = [...new Map(pattern.map(p => [key(p), p])).values()];
        const outside = items.filter(p => !unique.some(u => key(u) === key(p)));
        let choices = growing ? [dotItem(first + length - 1), dotItem(first + length + 1), dotItem(first + length + 2)] : [...shuffle(unique.filter(p => key(p) !== key(targets[0]!)), rng).slice(0, spec.choices - 2), ...outside];
        choices = choices.slice(0, spec.choices - 1);
        const allowed = Array.from({ length: spec.choices }, (_, i) => i).filter(i => !(positions.at(-1) === i && positions.at(-2) === i));
        const position = allowed[Math.floor(rng() * allowed.length)]!;
        positions.push(position); choices.splice(position, 0, targets[0]!);
        const answers = targets.map(t => choices.findIndex(p => key(p) === key(t)));
        if (answers.some(a => a < 0)) throw new Error('Missing continuation');
        if (!growing) for (const [i, slot] of slots.entries()) {
            const candidates = compatibleChoices(sequence, slot, choices);
            if (candidates.length !== 1 || candidates[0] !== answers[i]) throw new Error('Ambiguous pattern');
        }
        round.push({ mode: spec.mode, pattern, sequence, slots, choices, answers, answer: position });
    }
    return round;
}
export interface Session { level: number; questions: Question[]; index: number; errors: number; firstTry: number; solved: boolean; finished: boolean; placed: number[] }
export function start(level: number, seed: number): Session { return { level, questions: generateRound(level, seed), index: 0, errors: 0, firstTry: 0, solved: false, finished: false, placed: [] }; }
export function answer(state: Session, choice: number, slot = state.placed.length): { state: Session; correct: boolean; hint: boolean } {
    const q = state.questions[state.index];
    if (!q || state.solved || state.finished || slot !== state.placed.length || !Number.isInteger(choice) || !q.choices[choice]) return { state, correct: false, hint: false };
    const correct = choice === q.answers[slot], errors = state.errors + Number(!correct);
    const placed = correct ? [...state.placed, choice] : state.placed, solved = placed.length === q.slots.length;
    return { correct, hint: !correct && errors >= 2, state: { ...state, errors, placed, solved, firstTry: state.firstTry + Number(solved && errors === 0) } };
}
export function advance(state: Session): Session {
    if (!state.solved || state.finished) return state;
    return state.index === state.questions.length - 1 ? { ...state, finished: true } : { ...state, index: state.index + 1, errors: 0, solved: false, placed: [] };
}
export function complete(records: Records, state: Session): Records { return state.finished ? { ...records, [state.level]: Math.max(records[state.level] ?? 0, stars(state.firstTry)) } : { ...records }; }
