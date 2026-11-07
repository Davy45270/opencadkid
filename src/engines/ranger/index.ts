import { makeRng, shuffle } from '../rng';
import { stars, type Records } from '../compter';
export { stars, isUnlocked } from '../compter';
export type Color = 'rouge' | 'vert' | 'jaune';
export type Shape = 'rond' | 'carre' | 'long';
export type Category = 'fruit' | 'jouet' | 'vetement' | 'animal' | 'cuisine';
export type Size = 'petit' | 'grand';
export interface ObjectItem { id: string; kind: string; color: Color; shape: Shape; size: Size; category: Category; names: { fr: string; en: string } }
const kinds: readonly [string, Shape, Category, string, string][] = [
    ['pomme', 'rond', 'fruit', 'pomme', 'apple'], ['poire', 'long', 'fruit', 'poire', 'pear'],
    ['ballon', 'rond', 'jouet', 'ballon', 'ball'], ['cube', 'carre', 'jouet', 'cube', 'block'],
    ['pull', 'carre', 'vetement', 'pull', 'jumper'], ['chaussette', 'long', 'vetement', 'chaussette', 'sock'],
    ['chat', 'rond', 'animal', 'chat', 'cat'], ['chien', 'long', 'animal', 'chien', 'dog'],
    ['assiette', 'rond', 'cuisine', 'assiette', 'plate'], ['spatule', 'long', 'cuisine', 'spatule', 'spatula'],
    ['puzzle', 'carre', 'jouet', 'puzzle', 'jigsaw'], ['serviette', 'carre', 'cuisine', 'serviette de table', 'napkin'],
    ['citron', 'long', 'fruit', 'citron', 'lemon'], ['peche', 'rond', 'fruit', 'pêche', 'peach'],
    ['prune', 'long', 'fruit', 'prune', 'plum'], ['orange', 'rond', 'fruit', 'orange', 'orange'],
    ['voiture', 'long', 'jouet', 'petite voiture', 'toy car'], ['cerfvolant', 'carre', 'jouet', 'cerf-volant', 'kite'],
    ['tambour', 'rond', 'jouet', 'tambour', 'drum'], ['toupie', 'long', 'jouet', 'toupie', 'spinning top'],
    ['bonnet', 'rond', 'vetement', 'bonnet', 'hat'], ['gant', 'long', 'vetement', 'gant', 'glove'],
    ['pantalon', 'long', 'vetement', 'pantalon', 'trousers'], ['echarpe', 'long', 'vetement', 'écharpe', 'scarf'],
    ['poisson', 'long', 'animal', 'poisson', 'fish'], ['lapin', 'long', 'animal', 'lapin', 'rabbit'],
    ['tortue', 'rond', 'animal', 'tortue', 'turtle'], ['bol', 'rond', 'cuisine', 'bol', 'bowl'],
    ['cuillere', 'long', 'cuisine', 'cuillère', 'spoon'], ['casserole', 'rond', 'cuisine', 'casserole', 'saucepan']
];
export const catalog: readonly ObjectItem[] = kinds.flatMap(([kind, shape, category, fr, en]) => (['rouge', 'vert', 'jaune'] as const).flatMap(color => (['petit', 'grand'] as const).map(size => ({ id: `${kind}-${color}-${size}`, kind, shape, category, color, size, names: { fr, en } }))));
export type Rule = 'color' | 'shape' | 'size' | 'category' | 'two' | 'intrus';
/** `objects`: objects per question (default 4, or 6 with three bins). `mixed`: the colours vary
 * so that every bin holds several colours and every colour spans several bins (a colour lure). */
export interface Level { id: number; rule: Rule; bins: number; objects?: number; mixed?: boolean }
export const levels: readonly Level[] = [
    { id: 1, rule: 'color', bins: 2 }, { id: 2, rule: 'shape', bins: 2 },
    { id: 3, rule: 'size', bins: 2 }, { id: 4, rule: 'category', bins: 2 },
    { id: 5, rule: 'color', bins: 3 }, { id: 6, rule: 'category', bins: 3 },
    { id: 7, rule: 'two', bins: 2 }, { id: 8, rule: 'intrus', bins: 2 },
    // Second half: more objects, all three shapes, then colours that no longer help.
    { id: 9, rule: 'intrus', bins: 2, objects: 5 }, { id: 10, rule: 'shape', bins: 3 },
    { id: 11, rule: 'size', bins: 2, objects: 6 }, { id: 12, rule: 'two', bins: 2, objects: 6 },
    { id: 13, rule: 'category', bins: 2, objects: 6, mixed: true }, { id: 14, rule: 'category', bins: 3, mixed: true },
    { id: 15, rule: 'shape', bins: 3, mixed: true }, { id: 16, rule: 'intrus', bins: 2, objects: 6, mixed: true }
];
export interface Question { rule: Rule; bins: string[]; objects: ObjectItem[]; color: Color; category: Category }
export function belongs(q: Question, object: ObjectItem, bin: string): boolean {
    if (q.rule === 'two') return bin === (object.color === q.color && object.category === q.category ? 'oui' : 'non');
    if (q.rule === 'intrus') return bin === (object.category === q.category ? 'ensemble' : 'intrus');
    return bin === object[q.rule];
}
export function generateRound(level: number, seed: number, count = 4): Question[] {
    const spec = levels.find(l => l.id === level);
    if (!spec || !Number.isInteger(count) || count < 1) throw new RangeError('Invalid round');
    const rng = makeRng(seed), total = spec.objects ?? (spec.bins === 3 ? 6 : 4);
    return Array.from({ length: count }, () => {
        const color = shuffle(['rouge', 'vert', 'jaune'] as const, rng)[0]!;
        const category = shuffle(['fruit', 'jouet', 'vetement', 'animal', 'cuisine'] as const, rng)[0]!;
        const values = spec.rule === 'color' ? ['rouge', 'vert', 'jaune'] : spec.rule === 'shape' ? ['rond', 'carre', 'long'] : spec.rule === 'size' ? ['petit', 'grand'] : ['fruit', 'jouet', 'vetement', 'animal', 'cuisine'];
        const q: Question = { rule: spec.rule, bins: spec.rule === 'two' ? ['oui', 'non'] : spec.rule === 'intrus' ? ['ensemble', 'intrus'] : shuffle(values, rng).slice(0, spec.bins), objects: [], color, category };
        const pick = (predicate: (o: ObjectItem) => boolean): ObjectItem => {
            const item = shuffle(catalog.filter(o => predicate(o) && !q.objects.includes(o)), rng)[0];
            if (!item) throw new Error('Empty object pool');
            q.objects.push(item); return item;
        };
        if (q.rule === 'two') {
            pick(o => o.category === category && o.color === color);
            pick(o => o.category === category && o.color !== color);
            pick(o => o.category !== category && o.color === color);
            pick(o => o.category !== category && o.color !== color);
            while (q.objects.length < total) pick(() => true);
        } else if (q.rule === 'intrus') {
            // Mixed: the family shows two colours or more and the intruder wears one of them.
            // First family member wears the intruder's colour, the second another one, the rest any.
            const shade = (o: ObjectItem, i: number): boolean => i > 1 || (o.color === color) === (i === 0);
            for (let i = 0; i < total - 1; i++) pick(o => o.category === category && (spec.mixed ? shade(o, i) : o.color === color));
            pick(o => o.category !== category && o.color === color);
        } else {
            // A shared colour crosses every non-colour bin, preventing colour-only sorting. Mixed
            // levels rotate a drawn palette instead: bin b, round r wears palette[(r + b) % 3].
            const palette = spec.mixed ? shuffle(['rouge', 'vert', 'jaune'] as const, rng) : [];
            for (let i = 0; i < total; i++) {
                const bin = q.bins[i % q.bins.length]!, shade = spec.mixed ? palette[(Math.floor(i / q.bins.length) + i % q.bins.length) % 3]! : color;
                pick(o => belongs(q, o, bin) && (q.rule === 'color' || o.color === shade) && (q.rule !== 'shape' || ['ballon', 'assiette', 'cube', 'puzzle', 'serviette', 'spatule', 'chaussette', 'poire'].includes(o.kind)));
            }
        }
        q.objects = shuffle(q.objects, rng); q.bins = shuffle(q.bins, rng);
        if (q.objects.some(o => q.bins.filter(b => belongs(q, o, b)).length !== 1) || q.bins.some(b => !q.objects.some(o => belongs(q, o, b)))) throw new Error('Ambiguous sorting');
        return q;
    });
}
export interface Session { level: number; questions: Question[]; index: number; errors: number; objectErrors: Record<string, number>; placed: string[]; hint: string | null; firstTry: number; solved: boolean; finished: boolean }
export function start(level: number, seed: number): Session { return { level, questions: generateRound(level, seed, 6), index: 0, errors: 0, objectErrors: {}, placed: [], hint: null, firstTry: 0, solved: false, finished: false }; }
export function place(state: Session, object: string, bin: string): { state: Session; correct: boolean; returned: boolean; hint: boolean } {
    const q = state.questions[state.index], item = q?.objects.find(o => o.id === object);
    if (!q || !item || state.solved || state.finished || state.placed.includes(object) || !q.bins.includes(bin) || (q.rule === 'intrus' && bin !== 'intrus')) return { state, correct: false, returned: false, hint: false };
    const correct = belongs(q, item, bin), errors = state.errors + Number(!correct);
    const objectErrors = { ...state.objectErrors, [object]: (state.objectErrors[object] ?? 0) + Number(!correct) };
    const placed = correct ? [...state.placed, object] : state.placed;
    const solved = q.rule === 'intrus' ? correct : placed.length === q.objects.length;
    const hint = !correct && objectErrors[object]! >= 2;
    return { correct, returned: !correct, hint, state: { ...state, errors, objectErrors, placed, solved, hint: hint ? object : correct && state.hint === object ? null : state.hint, firstTry: state.firstTry + Number(solved && errors === 0) } };
}
export function advance(state: Session): Session {
    if (!state.solved || state.finished) return state;
    return state.index === state.questions.length - 1 ? { ...state, finished: true } : { ...state, index: state.index + 1, errors: 0, objectErrors: {}, placed: [], hint: null, solved: false };
}
export function complete(records: Records, state: Session): Records { return state.finished ? { ...records, [state.level]: Math.max(records[state.level] ?? 0, stars(state.firstTry)) } : { ...records }; }
