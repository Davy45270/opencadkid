import { makeRng, shuffle } from '../rng';
export { stars, isUnlocked } from '../compter';
import { stars, type Records } from '../compter';
export const shapes = ['rond', 'carre', 'triangle', 'rectangle', 'etoile', 'coeur', 'losange', 'ovale'] as const;
export const colors = ['rouge', 'bleu', 'jaune', 'vert', 'orange', 'violet', 'rose', 'marron'] as const;
export type Shape = typeof shapes[number];
export type Color = typeof colors[number];
export type Size = 'petit' | 'grand';
export type Mode = 'forme' | 'couleur' | 'les-deux' | 'taille' | 'trier';
// Conservative exclusions, symmetric. Colour alone cannot cover every visual impairment.
export const forbiddenPairs: readonly (readonly [Color, Color])[] = [['rouge', 'vert'], ['bleu', 'violet'], ['rose', 'orange'], ['rouge', 'marron'], ['vert', 'marron'], ['rouge', 'orange'], ['rouge', 'rose'], ['jaune', 'orange'], ['violet', 'rose']];
export function compatible(a: Color, b: Color): boolean { return !forbiddenPairs.some(p => p.includes(a) && p.includes(b)); }
export interface Level { id: number; mode: Mode; choices: number; mixed: boolean }
export const levels: readonly Level[] = [
    { id: 1, mode: 'forme', choices: 3, mixed: false }, { id: 2, mode: 'forme', choices: 4, mixed: false },
    { id: 3, mode: 'forme', choices: 6, mixed: true }, { id: 4, mode: 'couleur', choices: 3, mixed: false },
    { id: 5, mode: 'couleur', choices: 3, mixed: true }, { id: 6, mode: 'les-deux', choices: 4, mixed: true },
    { id: 7, mode: 'taille', choices: 2, mixed: false }, { id: 8, mode: 'taille', choices: 4, mixed: true },
    { id: 9, mode: 'trier', choices: 2, mixed: true }, { id: 10, mode: 'trier', choices: 3, mixed: true }
];
export interface Piece { shape: Shape; color: Color; size: Size }
export interface Question { mode: Mode; target: Piece; choices: Piece[]; boxes: Color[]; answer: number }
export function matches(q: Question, piece: Piece): boolean {
    return q.mode === 'couleur' ? piece.color === q.target.color : q.mode === 'forme' ? piece.shape === q.target.shape : q.mode === 'taille' ? piece.shape === q.target.shape && piece.size === q.target.size : piece.shape === q.target.shape && piece.color === q.target.color;
}
export function generateRound(level: number, seed: number, count = 6): Question[] {
    const spec = levels.find(l => l.id === level);
    if (!spec || !Number.isInteger(count) || count < 1) throw new RangeError('Invalid round');
    const rng = makeRng(seed), round: Question[] = [];
    for (let n = 0; n < count; n++) {
        const previous = round[n - 1];
        const ordered = shuffle(colors, rng);
        if (spec.mode === 'couleur' && ordered[0] === previous?.target.color) [ordered[0], ordered[1]] = [ordered[1]!, ordered[0]!];
        const palette: Color[] = [];
        for (const c of ordered) if (palette.every(p => compatible(p, c))) palette.push(c);
        // Every maximal palette contains at least three entries with this exclusion graph.
        const shape = shuffle(shapes.filter(s => s !== previous?.target.shape), rng)[0]!;
        const color = palette[0]!, size: Size = rng() < .5 ? 'petit' : 'grand';
        const target: Piece = { shape, color, size };
        const others = shuffle(shapes.filter(s => s !== shape), rng);
        const slots = Array.from({ length: spec.choices }, (_, i) => i).filter(i => !(n >= 2 && previous!.answer === i && round[n - 2]!.answer === i));
        const answer = slots[Math.floor(rng() * slots.length)]!;
        let choices: Piece[];
        let boxes: Color[] = [];
        if (spec.mode === 'trier') {
            boxes = palette.slice(0, spec.choices); [boxes[0], boxes[answer]] = [boxes[answer]!, boxes[0]!];
            choices = Array.from({ length: 3 }, (_, i) => ({ shape: i ? others[i - 1]! : shape, color: boxes[(answer + i) % boxes.length]!, size: 'grand' }));
        } else {
            const distractors: Piece[] = Array.from({ length: spec.choices - 1 }, (_, i) => ({ shape: others[i]!, color: spec.mixed ? palette[i % palette.length]! : color, size: 'grand' }));
            if (spec.mode === 'couleur') distractors.forEach((p, i) => { p.color = palette[i + 1]!; p.shape = spec.mixed ? others[i]! : shape; });
            if (spec.mode === 'les-deux') {
                distractors[0] = { shape, color: palette[1]!, size: 'grand' };
                distractors[1] = { shape: others[0]!, color, size: 'grand' };
            }
            if (spec.mode === 'taille') distractors[0] = { ...target, size: size === 'petit' ? 'grand' : 'petit' };
            // Outside size lessons every SVG is large; size is irrelevant to matching.
            if (spec.mode !== 'taille') target.size = 'grand';
            choices = [...distractors]; choices.splice(answer, 0, target);
        }
        round.push({ mode: spec.mode, target, choices, boxes, answer });
    }
    return round;
}
export interface Session { level: number; questions: Question[]; index: number; errors: number; firstTry: number; solved: boolean; finished: boolean; placed: number[] }
export function start(level: number, seed: number): Session { return { level, questions: generateRound(level, seed), index: 0, errors: 0, firstTry: 0, solved: false, finished: false, placed: [] }; }
export function answer(state: Session, choice: number): { state: Session; correct: boolean; hint: boolean } {
    const q = state.questions[state.index];
    if (!q || q.mode === 'trier' || state.solved || state.finished) return { state, correct: false, hint: false };
    return result(state, choice === q.answer, choice === q.answer);
}
function result(state: Session, correct: boolean, solved: boolean, placed = state.placed): { state: Session; correct: boolean; hint: boolean } {
    const errors = state.errors + (correct ? 0 : 1);
    return { correct, hint: !correct && errors >= 2, state: { ...state, errors, solved, placed, firstTry: state.firstTry + (solved && errors === 0 ? 1 : 0) } };
}
export function drop(state: Session, piece: number, box: number): { state: Session; correct: boolean; hint: boolean; returned: boolean } {
    const q = state.questions[state.index], p = q?.choices[piece];
    if (!q || q.mode !== 'trier' || !Number.isInteger(piece) || !p || state.placed.includes(piece) || state.solved || state.finished) return { state, correct: false, hint: false, returned: false };
    const correct = q.boxes[box] === p.color;
    const placed = correct ? [...state.placed, piece] : state.placed;
    return { ...result(state, correct, placed.length === q.choices.length, placed), returned: !correct };
}
export function advance(state: Session): Session {
    if (!state.solved || state.finished) return state;
    return state.index === state.questions.length - 1 ? { ...state, finished: true } : { ...state, index: state.index + 1, errors: 0, solved: false, placed: [] };
}
export function complete(records: Records, state: Session): Records { return state.finished ? { ...records, [state.level]: Math.max(records[state.level] ?? 0, stars(state.firstTry)) } : { ...records }; }
