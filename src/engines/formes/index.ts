import { makeRng, shuffle } from '../rng';
export { stars, isUnlocked } from '../compter';
import { stars, type Records } from '../compter';
export const shapes = ['rond', 'carre', 'triangle', 'rectangle', 'etoile', 'coeur', 'losange', 'ovale'] as const;
export const colors = ['rouge', 'bleu', 'jaune', 'vert', 'orange', 'violet', 'rose', 'marron'] as const;
export type Shape = typeof shapes[number];
export type Color = typeof colors[number];
export type Size = 'petit' | 'grand';
export type Mode = 'forme' | 'couleur' | 'les-deux' | 'taille' | 'trier' | 'les-trois' | 'intrus';
// Conservative exclusions, symmetric. Colour alone cannot cover every visual impairment.
export const forbiddenPairs: readonly (readonly [Color, Color])[] = [['rouge', 'vert'], ['bleu', 'violet'], ['rose', 'orange'], ['rouge', 'marron'], ['vert', 'marron'], ['rouge', 'orange'], ['rouge', 'rose'], ['jaune', 'orange'], ['violet', 'rose']];
export function compatible(a: Color, b: Color): boolean { return !forbiddenPairs.some(p => p.includes(a) && p.includes(b)); }
/** Shapes a child can mistake for each other; the hard odd-one-out level hides one among its look-alikes. */
export const lookalikes: Partial<Record<Shape, readonly Shape[]>> = { rond: ['ovale'], ovale: ['rond'], carre: ['rectangle', 'losange'], rectangle: ['carre'], losange: ['carre'] };
/**
 * Levels 11–20 add optional rules; levels 1–10 keep their exact literal configuration (records are stored by id).
 * sizes: distractors come in both sizes, so size alone never gives the answer. lookalike: the odd one out hides
 * among a look-alike shape. pieces: pieces to sort per question (default 3). melange: each question replays one of
 * the `review` levels, each once per round of six, in a shuffled order (`choices` is then the largest of them).
 */
export interface Level { id: number; mode: Mode | 'melange'; choices: number; mixed: boolean; sizes?: boolean; lookalike?: boolean; pieces?: number; review?: readonly number[] }
export const levels: readonly Level[] = [
    { id: 1, mode: 'forme', choices: 3, mixed: false }, { id: 2, mode: 'forme', choices: 4, mixed: false },
    { id: 3, mode: 'forme', choices: 6, mixed: true }, { id: 4, mode: 'couleur', choices: 3, mixed: false },
    { id: 5, mode: 'couleur', choices: 3, mixed: true }, { id: 6, mode: 'les-deux', choices: 4, mixed: true },
    { id: 7, mode: 'taille', choices: 2, mixed: false }, { id: 8, mode: 'taille', choices: 4, mixed: true },
    { id: 9, mode: 'trier', choices: 2, mixed: true }, { id: 10, mode: 'trier', choices: 3, mixed: true },
    { id: 11, mode: 'couleur', choices: 4, mixed: true }, { id: 12, mode: 'intrus', choices: 4, mixed: true },
    { id: 13, mode: 'les-trois', choices: 4, mixed: true }, { id: 14, mode: 'les-deux', choices: 6, mixed: true },
    { id: 15, mode: 'taille', choices: 6, mixed: true, sizes: true }, { id: 16, mode: 'intrus', choices: 6, mixed: true, lookalike: true },
    { id: 17, mode: 'les-trois', choices: 6, mixed: true }, { id: 18, mode: 'trier', choices: 3, mixed: true, pieces: 4 },
    { id: 19, mode: 'trier', choices: 4, mixed: true, pieces: 4 }, { id: 20, mode: 'melange', choices: 6, mixed: true, review: [11, 14, 15, 16, 17, 19] }
];
export interface Piece { shape: Shape; color: Color; size: Size }
export interface Question { mode: Mode; target: Piece; choices: Piece[]; boxes: Color[]; answer: number }
export function matches(q: Question, piece: Piece): boolean {
    if (q.mode === 'couleur') return piece.color === q.target.color;
    // The odd one out is the only piece of its shape: matching its shape is matching it.
    if (q.mode === 'forme' || q.mode === 'intrus') return piece.shape === q.target.shape;
    if (q.mode === 'taille') return piece.shape === q.target.shape && piece.size === q.target.size;
    if (q.mode === 'les-trois') return piece.shape === q.target.shape && piece.color === q.target.color && piece.size === q.target.size;
    return piece.shape === q.target.shape && piece.color === q.target.color;
}
export function generateRound(level: number, seed: number, count = 6): Question[] {
    const spec = levels.find(l => l.id === level);
    if (!spec || !Number.isInteger(count) || count < 1) throw new RangeError('Invalid round');
    const rng = makeRng(seed), round: Question[] = [];
    // Levels 1–10 never reach the extra random draws added for later levels, so their rounds are unchanged.
    const plan: Level[] = [];
    if (spec.mode === 'melange') while (plan.length < count) plan.push(...shuffle(spec.review!.map(id => levels[id - 1]!), rng));
    for (let n = 0; n < count; n++) {
        const rule = plan[n] ?? spec, mode = rule.mode as Mode;
        const previous = round[n - 1];
        // Colour questions and sorting boxes need `choices` distinct compatible colours. Every maximal palette has at
        // least three, so levels 1–10 draw once; four-colour levels redraw until the greedy palette reaches four.
        const need = mode === 'couleur' || mode === 'trier' ? rule.choices : 0;
        let palette: Color[] = [];
        for (let attempt = 0; palette.length < Math.max(need, 1); attempt++) {
            if (attempt === 1000) throw new RangeError('No palette');
            const ordered = shuffle(colors, rng);
            if (mode === 'couleur' && ordered[0] === previous?.target.color) [ordered[0], ordered[1]] = [ordered[1]!, ordered[0]!];
            palette = [];
            for (const c of ordered) if (palette.every(p => compatible(p, c))) palette.push(c);
        }
        const pool = rule.lookalike ? shapes.filter(s => lookalikes[s]) : shapes;
        const shape = shuffle(pool.filter(s => s !== previous?.target.shape), rng)[0]!;
        const color = palette[0]!, size: Size = rng() < .5 ? 'petit' : 'grand';
        const target: Piece = { shape, color, size };
        const others = shuffle(shapes.filter(s => s !== shape), rng);
        const slots = Array.from({ length: rule.choices }, (_, i) => i).filter(i => !(n >= 2 && previous!.answer === i && round[n - 2]!.answer === i));
        const answer = slots[Math.floor(rng() * slots.length)]!;
        const other = (s: Size): Size => s === 'petit' ? 'grand' : 'petit';
        const anySize = (): Size => rng() < .5 ? 'petit' : 'grand';
        let choices: Piece[];
        let boxes: Color[] = [];
        if (mode === 'trier') {
            boxes = palette.slice(0, rule.choices); [boxes[0], boxes[answer]] = [boxes[answer]!, boxes[0]!];
            choices = Array.from({ length: rule.pieces ?? 3 }, (_, i) => ({ shape: i ? others[i - 1]! : shape, color: boxes[(answer + i) % boxes.length]!, size: 'grand' }));
        } else {
            let distractors: Piece[] = Array.from({ length: rule.choices - 1 }, (_, i) => ({ shape: others[i]!, color: rule.mixed ? palette[i % palette.length]! : color, size: 'grand' }));
            if (mode === 'couleur') distractors.forEach((p, i) => { p.color = palette[i + 1]!; p.shape = rule.mixed ? others[i]! : shape; });
            if (mode === 'les-deux') {
                distractors[0] = { shape, color: palette[1]!, size: 'grand' };
                distractors[1] = { shape: others[0]!, color, size: 'grand' };
                // Six choices: a second same-shape and a second same-colour distractor.
                if (rule.choices >= 6) { distractors[2] = { shape, color: palette[2]!, size: 'grand' }; distractors[3] = { shape: others[1]!, color, size: 'grand' }; }
            }
            if (mode === 'taille') {
                distractors[0] = { ...target, size: other(size) };
                // Varied sizes: one other shape always shares the requested size, so size alone is never enough.
                if (rule.sizes) distractors.forEach((p, i) => { if (i) p.size = i === 1 ? size : anySize(); });
            }
            if (mode === 'les-trois') {
                distractors[0] = { shape, color, size: other(size) };
                distractors[1] = { shape, color: palette[1]!, size };
                distractors[2] = { shape: others[0]!, color, size };
                distractors.forEach((p, i) => { if (i >= 3) p.size = anySize(); });
            }
            if (mode === 'intrus') {
                const crowd = rule.lookalike ? lookalikes[shape]![Math.floor(rng() * lookalikes[shape]!.length)]! : others[0]!;
                // The crowd shares one shape; colours cycle and sizes switch after one lap, so its pieces stay distinct
                // and the odd piece's colour and size always appear in the crowd too.
                distractors = distractors.map((_, i) => ({ shape: crowd, color: palette[i % palette.length]!, size: i < palette.length ? 'grand' : 'petit' }));
            }
            // Outside size lessons every SVG is large; size is irrelevant to matching.
            if (mode !== 'taille' && mode !== 'les-trois') target.size = 'grand';
            choices = [...distractors]; choices.splice(answer, 0, target);
        }
        round.push({ mode, target, choices, boxes, answer });
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
