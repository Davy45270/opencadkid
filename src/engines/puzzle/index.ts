import { makeRng, shuffle } from '../rng';
import { isUnlocked, type Records } from '../compter';
export { isUnlocked };
export interface Level {
    id: number; columns: number; rows: number; model: boolean; wavy: boolean;
    /** False removes the eye button: the picture is never shown before the end (true when absent). */
    eye?: boolean;
}
export const levels: readonly Level[] = [
    { id: 1, columns: 2, rows: 1, model: true, wavy: false },
    { id: 2, columns: 3, rows: 1, model: true, wavy: false },
    { id: 3, columns: 2, rows: 2, model: false, wavy: false },
    { id: 4, columns: 3, rows: 2, model: false, wavy: false },
    { id: 5, columns: 3, rows: 2, model: false, wavy: false },
    { id: 6, columns: 3, rows: 3, model: false, wavy: false },
    { id: 7, columns: 4, rows: 3, model: false, wavy: false },
    { id: 8, columns: 3, rows: 3, model: false, wavy: true },
    // Each size first with the eye button, then without it. Twenty-four pieces (50 × 60) is the most the
    // 320 × 270 reserve holds without overlap; curved edges stay on three columns for the same reason.
    { id: 9, columns: 3, rows: 3, model: false, wavy: true, eye: false },
    { id: 10, columns: 4, rows: 3, model: false, wavy: false, eye: false },
    { id: 11, columns: 4, rows: 4, model: false, wavy: false },
    { id: 12, columns: 4, rows: 4, model: false, wavy: false, eye: false },
    { id: 13, columns: 5, rows: 4, model: false, wavy: false },
    { id: 14, columns: 5, rows: 4, model: false, wavy: false, eye: false },
    { id: 15, columns: 6, rows: 4, model: false, wavy: false },
    { id: 16, columns: 6, rows: 4, model: false, wavy: false, eye: false }
];
export function hasEye(level: number): boolean { return levels[level - 1]?.eye !== false; }
export const vectorSceneIds = ['castle', 'bamboo', 'rainbow', 'jungle', 'autumn', 'picnic'] as const;
/** Painted scenes: a WebP over a vector fallback, fetched only when a puzzle shows them. */
export const paintedSceneIds = ['zen', 'ardennes', 'volcano', 'islands', 'galaxy', 'valley'] as const;
export const sceneIds = [...vectorSceneIds, ...paintedSceneIds] as const;
export type PaintedScene = typeof paintedSceneIds[number];
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
    // Five cubics form a rounded head wider than its neck; maximum depth is 6 stage pixels.
    return { points: wavy ? [a, p(.15), p(.46), p(.44), p(.44, sign * 1.8), p(.38, sign * 1.2), p(.38, sign * 2.4), p(.30, sign * 7.2), p(.70, sign * 7.2), p(.62, sign * 2.4), p(.62, sign * 1.2), p(.56, sign * 1.8), p(.56), p(.54), p(.85), b] : [a, b], straight: !wavy, reverse: false };
}
export function edgePoints(e: Edge): readonly Point[] { return e.reverse ? [...e.points].reverse() : e.points; }
export function piecePath(edges: readonly Edge[]): string {
    const first = edgePoints(edges[0]!)[0]!;
    return `M${first[0]} ${first[1]}` + edges.map(e => {
        const p = edgePoints(e);
        return e.straight ? `L${p[1]![0]} ${p[1]![1]}` : Array.from({ length: (p.length - 1) / 3 }, (_, i) => 1 + i * 3).map(i => `C${p.slice(i, i + 3).map(v => v.join(' ')).join(' ')}`).join('');
    }).join('') + 'Z';
}
/** Tight painted-path bounds; unlike control points these include the cubic extrema. */
export function pieceFrame(piece: Pick<Piece, 'edges'>): { x: number; y: number; width: number; height: number } {
    const samples: Point[] = [];
    for (const edge of piece.edges) {
        const points = edgePoints(edge);
        if (edge.straight) { samples.push(...points); continue; }
        for (let i = 0; i < points.length - 1; i += 3) for (let step = 0; step <= 32; step++) {
            const t = step / 32, u = 1 - t;
            const coordinate = (axis: 0 | 1): number => u ** 3 * points[i]![axis] + 3 * u * u * t * points[i + 1]![axis] + 3 * u * t * t * points[i + 2]![axis] + t ** 3 * points[i + 3]![axis];
            samples.push([coordinate(0), coordinate(1)]);
        }
    }
    const x = Math.min(...samples.map(p => p[0])), y = Math.min(...samples.map(p => p[1]));
    // The 1.5-unit outline is painted on both sides of the path.
    return { x: x - .75, y: y - .75, width: Math.max(...samples.map(p => p[0])) - x + 1.5, height: Math.max(...samples.map(p => p[1])) - y + 1.5 };
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
    if (wavy) {
        // Each original row has complementary side extents totalling <=316.5 px including strokes.
        // Shuffle within these rows, then shuffle the rows: deep tabs fit without overlap.
        const bands = shuffle(Array.from({ length: rows }, (_, row) => shuffle(pieces.filter(p => p.row === row), rng)), rng);
        let top = 280;
        for (const band of bands) {
            const frames = band.map(pieceFrame), bandHeight = Math.max(...frames.map(f => f.height));
            let left = (320 - frames.reduce((sum, f) => sum + f.width, 0) - 1.5) / 2;
            for (const [i, piece] of band.entries()) {
                const f = frames[i]!;
                piece.x = left + piece.column * width + width / 2 - f.x;
                piece.y = top + piece.row * height + height / 2 - f.y;
                left += f.width + .75;
            }
            top += bandHeight + .75;
        }
    }
    return { level, scene, width: 320, height: 550, board: { x: 10, y: 8, width: 300, height: 240 }, reserve: { x: 0, y: 280, width: 320, height: 270 }, snap: 32, pieces, finished: false, aids: 0, hintPiece: null };
}
/** Coordinates denote the centre, in the same board units as homeX/homeY. */
export function drop(state: Puzzle, id: number, x: number, y: number): Puzzle {
    const piece = state.pieces[id];
    if (!piece || piece.placed || !Number.isFinite(x) || !Number.isFinite(y)) return state;
    const placed = Math.hypot(x - piece.homeX, y - piece.homeY) < state.snap;
    const frame = pieceFrame(piece);
    const left = piece.column * piece.width - frame.x, top = piece.row * piece.height - frame.y;
    const right = frame.width - piece.width - left, bottom = frame.height - piece.height - top;
    const pieces = state.pieces.map(p => p.id === id ? { ...p, placed,
        x: placed ? p.homeX : Math.max(p.width / 2 + left, Math.min(state.width - p.width / 2 - right, x)),
        y: placed ? p.homeY : Math.max(p.height / 2 + top, Math.min(state.height - p.height / 2 - bottom, y)) } : p);
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
