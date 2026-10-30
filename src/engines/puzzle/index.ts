import { makeRng, shuffle } from '../rng';
import { isUnlocked, type Records } from '../compter';
export { isUnlocked };
export const levels = [
    { id: 1, columns: 2, rows: 1, model: true, wavy: false },
    { id: 2, columns: 3, rows: 1, model: true, wavy: false },
    { id: 3, columns: 2, rows: 2, model: false, wavy: false },
    { id: 4, columns: 3, rows: 2, model: false, wavy: false },
    { id: 5, columns: 3, rows: 2, model: false, wavy: false },
    { id: 6, columns: 3, rows: 3, model: false, wavy: false },
    { id: 7, columns: 4, rows: 3, model: false, wavy: false },
    { id: 8, columns: 3, rows: 3, model: false, wavy: true }
] as const;
export const sceneIds = ['castle', 'bamboo', 'rainbow', 'jungle', 'autumn', 'picnic'] as const;
export type Scene = typeof sceneIds[number];
export type Point = readonly [number, number];
/** Canonical cubic: neighbours share this geometry, traversed in opposite directions. */
export interface Edge { points: readonly Point[]; reverse: boolean; straight: boolean }
export interface Piece {
    id: number; column: number; row: number; width: number; height: number;
    homeX: number; homeY: number; x: number; y: number; placed: boolean;
    edges: readonly Edge[]; path: string;
}
export interface Puzzle {
    level: number; scene: Scene; width: number; height: number; board: { x: number; y: number; width: number; height: number };
    reserve: { x: number; y: number; width: number; height: number }; snap: number;
    pieces: Piece[]; finished: boolean; aids: number; hintPiece: number | null;
}
function edge(a: Point, b: Point, wavy: boolean, rng: () => number): Edge {
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    const sign = rng() < .5 ? -1 : 1;
    const p = (t: number, n = 0): Point => [a[0] + dx * t - dy / length * n, a[1] + dy * t + dx / length * n];
    // Cubic endpoints and controls; a single shallow rounded tab, at most 3 px deep.
    return { points: wavy ? [a, p(.3), p(.36), p(.4), p(.42, sign * 3), p(.58, sign * 3), p(.6), p(.64), p(.7), b] : [a, b], straight: !wavy, reverse: false };
}
export function edgePoints(e: Edge): readonly Point[] { return e.reverse ? [...e.points].reverse() : e.points; }
export function piecePath(edges: readonly Edge[]): string {
    const first = edgePoints(edges[0]!)[0]!;
    return `M${first[0]} ${first[1]}` + edges.map(e => {
        const p = edgePoints(e);
        return e.straight ? `L${p[1]![0]} ${p[1]![1]}` : [1, 4, 7].map(i => `C${p.slice(i, i + 3).map(v => v.join(' ')).join(' ')}`).join('');
    }).join('') + 'Z';
}
export function newPuzzle(level: number, seed: number): Puzzle {
    const config = levels[level - 1]; if (!config) throw new RangeError('Unknown puzzle level');
    const rng = makeRng(seed), scene = sceneIds[Math.floor(rng() * sceneIds.length)]!;
    const { columns, rows, wavy } = config, width = 300 / columns, height = 240 / rows;
    const horizontal = Array.from({ length: rows + 1 }, (_, r) => Array.from({ length: columns }, (_, c) => edge([c * width, r * height], [(c + 1) * width, r * height], wavy && r > 0 && r < rows, rng)));
    const vertical = Array.from({ length: rows }, (_, r) => Array.from({ length: columns + 1 }, (_, c) => edge([c * width, r * height], [c * width, (r + 1) * height], wavy && c > 0 && c < columns, rng)));
    const slots = shuffle(Array.from({ length: columns * rows }, (_, i) => i), rng);
    const pieces = slots.map((slot, id): Piece => {
        const column = id % columns, row = Math.floor(id / columns);
        const edges = [horizontal[row]![column]!, vertical[row]![column + 1]!, { ...horizontal[row + 1]![column]!, reverse: true }, { ...vertical[row]![column]!, reverse: true }];
        return { id, column, row, width, height, homeX: 10 + (column + .5) * width, homeY: 8 + (row + .5) * height,
            x: (slot % columns + .5) * 320 / columns, y: 280 + (Math.floor(slot / columns) + .5) * (height + 8), placed: false, edges, path: piecePath(edges) };
    });
    return { level, scene, width: 320, height: 550, board: { x: 10, y: 8, width: 300, height: 240 }, reserve: { x: 0, y: 280, width: 320, height: 270 }, snap: 32, pieces, finished: false, aids: 0, hintPiece: null };
}
/** Coordinates denote the centre, in the same board units as homeX/homeY. */
export function drop(state: Puzzle, id: number, x: number, y: number): Puzzle {
    const piece = state.pieces[id];
    if (!piece || piece.placed || !Number.isFinite(x) || !Number.isFinite(y)) return state;
    const placed = Math.hypot(x - piece.homeX, y - piece.homeY) < state.snap;
    const margin = levels[state.level - 1]!.wavy ? 3 : 0;
    const pieces = state.pieces.map(p => p.id === id ? { ...p, placed,
        x: placed ? p.homeX : Math.max(p.width / 2 + margin, Math.min(state.width - p.width / 2 - margin, x)),
        y: placed ? p.homeY : Math.max(p.height / 2 + margin, Math.min(state.height - p.height / 2 - margin, y)) } : p);
    return { ...state, pieces, finished: pieces.every(p => p.placed), hintPiece: placed && state.hintPiece === id ? null : state.hintPiece };
}
export function hint(state: Puzzle, idleMs: number): Puzzle {
    if (idleMs < 25_000 || state.finished || state.hintPiece !== null) return state;
    return { ...state, hintPiece: state.pieces.find(p => !p.placed)!.id, aids: state.aids + 1 };
}
export function stars(state: Pick<Puzzle, 'aids'>): 1 | 2 | 3 { return state.aids === 0 ? 3 : state.aids === 1 ? 2 : 1; }
export function complete(records: Records, state: Puzzle): Records {
    if (!state.finished) return { ...records };
    return { ...records, [state.level]: Math.max(records[state.level] ?? 0, stars(state)) };
}
