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
    { id: 10, mode: 'trier', choices: 2, lowercase: true }
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
    // Each sorting question consumes three words. Reject impossible distinct-word requests.
    if (!spec || !Number.isInteger(count) || count < 1 || count * (spec.mode === 'trier' ? 3 : spec.choices) > lexicon[locale].length) throw new RangeError('Invalid round');
    const rng = makeRng(seed), used = new Set<string>(), round: Question[] = [];
    for (let n = 0; n < count; n++) {
        const available = shuffle(lexicon[locale].filter(w => !used.has(w.word)), rng);
        // Sorting needs two different words from the target family.
        const target = available.find(w => spec.mode !== 'trier' || available.filter(p => p.initial === w.initial).length >= 2);
        if (!target) throw new RangeError('Not enough words');
        const other = available.find(w => compatible(target.initial, w.initial, locale));
        if (!other) throw new RangeError('Not enough sound families');
        const slots = Array.from({ length: spec.choices }, (_, i) => i).filter(i => !(n >= 2 && round[n - 1]!.answer === i && round[n - 2]!.answer === i));
        const answer = slots[Math.floor(rng() * slots.length)]!;
        const candidates: Word[] = [];
        for (const word of available) if (compatible(target.initial, word.initial, locale) && !candidates.some(w => w.initial === word.initial)) candidates.push(word);
        if (candidates.length < spec.choices - 1) throw new RangeError('Not enough sound families');
        const choices = candidates.slice(0, spec.choices - 1); choices.splice(answer, 0, target);
        const letters = choices.map(w => w.initial), boxes: string[] = [];
        if (spec.mode === 'trier') {
            boxes.push(other.initial); boxes.splice(answer, 0, target.initial);
            letters.splice(0, letters.length, ...boxes);
            choices.splice(0, choices.length, ...shuffle([target, available.find(w => w.initial === target.initial && w.word !== target.word)!, other], rng));
        }
        choices.forEach(w => used.add(w.word));
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
