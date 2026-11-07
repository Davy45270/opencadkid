import { makeRng, shuffle } from '../rng';
export const motifs = ['apple', 'banana', 'cherry', 'carrot', 'fish', 'cat', 'butterfly', 'snail', 'car', 'boat', 'rocket', 'house', 'star', 'heart', 'moon', 'umbrella'] as const;
export type Motif = typeof motifs[number];
/** silhouettes (levels 11, 12, 14): both cards of every pair are dark silhouettes, so only the outline matches. */
export interface Level { id: number; pairs: number; columns: number; rows: number; preview: number; shadows: boolean; silhouettes?: boolean }
export const levels: readonly Level[] = [
    { id: 1, pairs: 2, columns: 2, rows: 2, preview: 2000, shadows: false },
    { id: 2, pairs: 3, columns: 3, rows: 2, preview: 2000, shadows: false },
    { id: 3, pairs: 4, columns: 4, rows: 2, preview: 2000, shadows: false },
    { id: 4, pairs: 6, columns: 4, rows: 3, preview: 0, shadows: false },
    { id: 5, pairs: 8, columns: 4, rows: 4, preview: 0, shadows: false },
    { id: 6, pairs: 10, columns: 4, rows: 5, preview: 0, shadows: false },
    { id: 7, pairs: 6, columns: 4, rows: 3, preview: 0, shadows: true },
    { id: 8, pairs: 8, columns: 4, rows: 4, preview: 0, shadows: true },
    { id: 9, pairs: 10, columns: 4, rows: 5, preview: 0, shadows: true },
    { id: 10, pairs: 12, columns: 4, rows: 6, preview: 0, shadows: false },
    { id: 11, pairs: 8, columns: 4, rows: 4, preview: 0, shadows: true, silhouettes: true },
    { id: 12, pairs: 10, columns: 4, rows: 5, preview: 0, shadows: true, silhouettes: true },
    { id: 13, pairs: 12, columns: 4, rows: 6, preview: 0, shadows: true },
    { id: 14, pairs: 12, columns: 4, rows: 6, preview: 0, shadows: true, silhouettes: true }
];
export interface Card { motif: Motif; shadow: boolean; found: boolean }
export interface Board {
    level: number; cards: Card[]; columns: number; rows: number; preview: boolean;
    visible: number[]; seen: boolean[]; misses: number[]; moves: number;
    mismatch: boolean; hint: number[]; finished: boolean;
}
export function newBoard(level: number, seed: number): Board {
    const spec = levels.find(l => l.id === level);
    if (!spec) throw new RangeError('Unknown level');
    const rng = makeRng(seed);
    // The introductory palette has eight shapes; later boards explore all sixteen.
    const selected = shuffle(spec.pairs <= 4 ? motifs.slice(0, 8) : motifs, rng).slice(0, spec.pairs);
    const cards = shuffle(selected.flatMap(motif => [{ motif, shadow: spec.silhouettes ?? false, found: false }, { motif, shadow: spec.shadows, found: false }]), rng);
    return { level, cards, columns: spec.columns, rows: spec.rows, preview: spec.preview > 0, visible: [], seen: cards.map(() => false), misses: cards.map(() => 0), moves: 0, mismatch: false, hint: [], finished: false };
}
export function endPreview(state: Board): Board { return state.preview ? { ...state, preview: false } : state; }
export function flip(state: Board, index: number): Board {
    const card = state.cards[index];
    if (!Number.isInteger(index) || !card || card.found || state.preview || state.finished) return state;
    if (state.mismatch) return state.visible.includes(index) ? settle(state) : flip(settle(state), index);
    if (state.visible.includes(index)) return state;
    const visible = [...state.visible, index], seen = [...state.seen];
    if (visible.length === 1) return { ...state, visible };
    for (const i of visible) seen[i] = true;
    const first = visible[0]!, matched = state.cards[first]!.motif === card.motif;
    const cards = state.cards.map((c, i) => matched && visible.includes(i) ? { ...c, found: true } : c);
    const misses = [...state.misses];
    for (const i of visible) misses[i] = matched ? 0 : misses[i]! + (state.seen[i] ? 1 : 0);
    const candidates = cards.map((c, i) => ({ c, i })).filter(({ c, i }) => !c.found && seen[i]);
    const needy = candidates.find(({ i }) => misses[i]! >= 3 && candidates.some(other => other.i !== i && other.c.motif === cards[i]!.motif));
    const hint = needy ? candidates.filter(({ c }) => c.motif === needy.c.motif).map(({ i }) => i) : [];
    return { ...state, cards, visible: matched ? [] : visible, seen, misses, moves: state.moves + 1, mismatch: !matched, hint, finished: cards.every(c => c.found) };
}
export function settle(state: Board): Board { return state.mismatch ? { ...state, mismatch: false, visible: [] } : state; }
export function stars(state: Pick<Board, 'moves' | 'cards'>): 1 | 2 | 3 {
    const pairs = state.cards.length / 2;
    return state.moves <= Math.ceil(1.5 * pairs) ? 3 : state.moves <= Math.ceil(2.5 * pairs) ? 2 : 1;
}
export type Records = Partial<Record<number, number>>;
export function isUnlocked(level: number, records: Records): boolean { return level === 1 || Boolean(records[level - 1]); }
export function complete(records: Records, state: Board): Records { return state.finished ? { ...records, [state.level]: Math.max(records[state.level] ?? 0, stars(state)) } : records; }
