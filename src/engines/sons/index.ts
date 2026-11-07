import { makeRng, shuffle } from '../rng';
import { stars, type Records } from '../compter';
import { lexicon, type Word } from './lexicon';
import type { Locale } from '../../shell/i18n';
export { phoneme, lexicon } from './lexicon';
export { stars, isUnlocked } from '../compter';
export type Mode = 'image-lettre' | 'lettre-image' | 'son-lettre' | 'trier';
export interface Level { id: number; mode: Mode; choices: number; lowercase: boolean }
export const levels: readonly Level[] = [
    { id: 1, mode: 'image-lettre', choices: 2, lowercase: false },
    { id: 2, mode: 'image-lettre', choices: 3, lowercase: false },
    { id: 3, mode: 'image-lettre', choices: 4, lowercase: false },
    { id: 4, mode: 'image-lettre', choices: 4, lowercase: true },
    { id: 5, mode: 'lettre-image', choices: 3, lowercase: false },
    { id: 6, mode: 'lettre-image', choices: 3, lowercase: true },
    { id: 7, mode: 'son-lettre', choices: 3, lowercase: false },
    { id: 8, mode: 'son-lettre', choices: 4, lowercase: true },
    { id: 9, mode: 'trier', choices: 2, lowercase: false },
    { id: 10, mode: 'trier', choices: 2, lowercase: true },
    // Second half: every level offers more letters, images or boxes than any earlier level of its mode.
    { id: 11, mode: 'image-lettre', choices: 5, lowercase: false },
    { id: 12, mode: 'image-lettre', choices: 6, lowercase: true },
    { id: 13, mode: 'lettre-image', choices: 4, lowercase: false },
    { id: 14, mode: 'lettre-image', choices: 5, lowercase: true },
    { id: 15, mode: 'son-lettre', choices: 5, lowercase: false },
    { id: 16, mode: 'son-lettre', choices: 5, lowercase: true },
    { id: 17, mode: 'trier', choices: 3, lowercase: false },
    { id: 18, mode: 'trier', choices: 3, lowercase: true },
    { id: 19, mode: 'lettre-image', choices: 6, lowercase: true },
    { id: 20, mode: 'son-lettre', choices: 6, lowercase: true }
];
// Symmetric exclusions include both phonetic neighbours and identical initial sounds.
export const neighbours: Record<Locale, readonly (readonly [string, string])[]> = {
    fr: [['B', 'P'], ['D', 'T'], ['F', 'V'], ['M', 'N'], ['S', 'Z'], ['C', 'K'], ['C', 'Q'], ['K', 'Q'], ['G', 'C'], ['G', 'K'], ['G', 'Q'], ['J', 'G'], ['E', 'I'], ['O', 'U']],
    en: [['B', 'P'], ['D', 'T'], ['F', 'V'], ['M', 'N'], ['S', 'Z'], ['C', 'K'], ['C', 'Q'], ['K', 'Q'], ['G', 'C'], ['G', 'K'], ['G', 'Q'], ['J', 'G'], ['W', 'V'], ['Y', 'J']]
};
export function compatible(a: string, b: string, locale: Locale): boolean {
    return a !== b && !neighbours[locale].some(pair => pair.includes(a) && pair.includes(b));
}
export interface Question { mode: Mode; target: Word; choices: Word[]; letters: string[]; boxes: string[]; answer: number; lowercase: boolean }
export function generateRound(level: number, seed: number, locale: Locale, count = 6): Question[] {
    const spec = levels.find(l => l.id === level);
    // A sorting question uses one box per family and two words of the target family:
    // choices + 1 words. Reject impossible distinct-word requests.
    if (!spec || !Number.isInteger(count) || count < 1 || count * (spec.mode === 'trier' ? spec.choices + 1 : spec.choices) > lexicon[locale].length) throw new RangeError('Invalid round');
    const rng = makeRng(seed), round: Question[] = [];
    const families = shuffle([...new Set(lexicon[locale].map(w => w.initial))], rng);
    const words = families.map(initial => shuffle(lexicon[locale].filter(w => w.initial === initial), rng));
    const remaining = words.map(group => group.length), sorting = spec.mode === 'trier';
    const plan: number[][] = [], failed = new Set<string>();
    // Search capacities before drawing words. Undoing a choice preserves every feasible
    // partition, including full-lexicon rounds. Seeded order breaks equal-capacity ties.
    const search = (left: number): boolean => {
        if (!left) return true;
        const key = `${left}:${remaining.join(',')}`;
        if (failed.has(key)) return false;
        if (sorting ? remaining.reduce((sum, n) => sum + Math.floor(n / 2), 0) < left
            : remaining.reduce((sum, n) => sum + Math.min(n, left), 0) < left * spec.choices) return false;
        const targets = families.map((_, i) => i).filter(i => remaining[i]! >= (sorting ? 2 : 1));
        targets.sort((a, b) => sorting ? remaining[a]! - remaining[b]! : remaining[b]! - remaining[a]!);
        for (const target of targets) {
            const others = families.map((_, i) => i).filter(i => remaining[i]! > 0 && compatible(families[target]!, families[i]!, locale));
            // In sorting, spend singletons first, then spare third words; keep pairs.
            const cost = (i: number): number => remaining[i] === 1 ? 0 : remaining[i] === 3 ? 1 : 2;
            others.sort((a, b) => sorting ? cost(a) - cost(b) : remaining[b]! - remaining[a]!);
            const choose = (start: number, selected: number[]): boolean => {
                if (selected.length === spec.choices - 1) {
                    const group = sorting ? [target, target, ...selected] : [target, ...selected];
                    group.forEach(i => remaining[i]!--);
                    plan.push(group);
                    if (search(left - 1)) return true;
                    plan.pop(); group.forEach(i => remaining[i]!++);
                    return false;
                }
                // Sorting boxes must also be told apart from each other, not only from the target.
                for (let i = start; i < others.length; i++) if (!sorting || selected.every(j => compatible(families[j]!, families[others[i]!]!, locale))) if (choose(i + 1, [...selected, others[i]!])) return true;
                return false;
            };
            if (choose(0, [])) return true;
        }
        failed.add(key); return false;
    };
    if (!search(count)) throw new RangeError('Not enough sound families');
    for (const group of plan) {
        const selected = group.map(i => words[i]!.pop()!), target = selected[0]!;
        const slots = Array.from({ length: spec.choices }, (_, i) => i).filter(i => !(round.length >= 2 && round.at(-1)!.answer === i && round.at(-2)!.answer === i));
        const answer = slots[Math.floor(rng() * slots.length)]!;
        const boxes: string[] = [];
        let choices: Word[], letters: string[];
        if (sorting) {
            boxes.push(...selected.slice(2).map(w => w.initial)); boxes.splice(answer, 0, target.initial);
            letters = [...boxes]; choices = shuffle(selected, rng);
        } else {
            choices = selected.slice(1); choices.splice(answer, 0, target);
            letters = choices.map(w => w.initial);
        }
        round.push({ mode: spec.mode, target, choices, letters, boxes, answer, lowercase: spec.lowercase });
    }
    return round;
}
export interface Session { level: number; locale: Locale; questions: Question[]; index: number; errors: number; firstTry: number; solved: boolean; finished: boolean; placed: number[] }
export function start(level: number, seed: number, locale: Locale): Session { return { level, locale, questions: generateRound(level, seed, locale), index: 0, errors: 0, firstTry: 0, solved: false, finished: false, placed: [] }; }
function result(state: Session, correct: boolean, solved: boolean, placed = state.placed): { state: Session; correct: boolean; hint: boolean } {
    const errors = state.errors + (correct ? 0 : 1);
    return { correct, hint: !correct && errors >= 2, state: { ...state, errors, solved, placed, firstTry: state.firstTry + (solved && errors === 0 ? 1 : 0) } };
}
export function answer(state: Session, choice: number): ReturnType<typeof result> {
    const q = state.questions[state.index];
    if (!q || q.mode === 'trier' || state.solved || state.finished || !Number.isInteger(choice) || choice < 0 || choice >= q.letters.length) return { state, correct: false, hint: false };
    return result(state, choice === q.answer, choice === q.answer);
}
export function drop(state: Session, piece: number, box: number): ReturnType<typeof result> {
    const q = state.questions[state.index], word = q?.choices[piece];
    if (!q || q.mode !== 'trier' || !Number.isInteger(piece) || !word || !Number.isInteger(box) || !q.boxes[box] || state.placed.includes(piece) || state.solved || state.finished) return { state, correct: false, hint: false };
    const correct = q.boxes[box] === word.initial, placed = correct ? [...state.placed, piece] : state.placed;
    return result(state, correct, placed.length === q.choices.length, placed);
}
export function advance(state: Session): Session {
    if (!state.solved || state.finished) return state;
    return state.index === state.questions.length - 1 ? { ...state, finished: true } : { ...state, index: state.index + 1, errors: 0, solved: false, placed: [] };
}
export function complete(records: Records, state: Session): Records { return state.finished ? { ...records, [state.level]: Math.max(records[state.level] ?? 0, stars(state.firstTry)) } : { ...records }; }
