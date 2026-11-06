import { makeRng, shuffle } from '../rng';
import type { Records } from '../compter';
export { isUnlocked } from '../compter';
export const levels = [
    { id: 1, columns: 3, rows: 3, min: 3, max: 3, bonuses: 0 },
    { id: 2, columns: 4, rows: 3, min: 4, max: 4, bonuses: 0 },
    { id: 3, columns: 5, rows: 4, min: 7, max: 20, bonuses: 0 },
    { id: 4, columns: 6, rows: 4, min: 9, max: 24, bonuses: 2 },
    { id: 5, columns: 7, rows: 5, min: 11, max: 35, bonuses: 2 },
    { id: 6, columns: 7, rows: 6, min: 11, max: 42, bonuses: 3 },
    { id: 7, columns: 8, rows: 6, min: 12, max: 48, bonuses: 3 },
    { id: 8, columns: 9, rows: 7, min: 14, max: 63, bonuses: 3 }
] as const;
export const directions = ['N', 'E', 'S', 'W'] as const;
export type Direction = typeof directions[number];
export interface Point { x: number; y: number }
export interface Maze {
    level: number; columns: number; rows: number; grid: Direction[][]; start: number; goal: number;
    solution: number[]; trace: number[]; bonuses: number[]; collected: number[]; finished: boolean;
}
export function neighbour(state: Pick<Maze, 'columns' | 'rows'>, cell: number, direction: Direction): number | null {
    const x = cell % state.columns, y = Math.floor(cell / state.columns);
    const [dx, dy] = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] }[direction] as [number, number];
    return x + dx < 0 || x + dx >= state.columns || y + dy < 0 || y + dy >= state.rows ? null : (y + dy) * state.columns + x + dx;
}
/** Unique tree route, also valid when the head is in a side branch. */
export function route(state: Pick<Maze, 'columns' | 'rows' | 'grid'>, start: number, goal: number): number[] {
    const visit = (cell: number, previous: number): number[] | null => {
        if (cell === goal) return [cell];
        for (const d of state.grid[cell]!) {
            const next = neighbour(state, cell, d)!;
            if (next === previous) continue;
            const tail = visit(next, cell); if (tail) return [cell, ...tail];
        }
        return null;
    };
    return visit(start, -1) ?? [];
}
export function newMaze(level: number, seed: number): Maze {
    const config = levels[level - 1]; if (!config) throw new RangeError('Unknown maze level');
    const { columns, rows } = config, rng = makeRng(seed);
    const grid: Direction[][] = Array.from({ length: columns * rows }, () => []);
    const start = (level <= 2 ? Math.floor(rng() * rows) : rng() < .5 ? 0 : rows - 1) * columns;
    const goal = start + columns - 1;
    const state: Maze = { level, columns, rows, grid, start, goal, solution: [], trace: [start], bonuses: [], collected: [], finished: false };
    const seen = new Set<number>([start]);
    const open = (a: number, b: number, d: Direction): void => {
        grid[a]!.push(d); grid[b]!.push(directions[(directions.indexOf(d) + 2) % 4]!); seen.add(b);
    };
    // Seed a simple route before attaching branches: a direct corridor for beginners,
    // otherwise a U-shaped detour whose depth guarantees the configured minimum.
    const roots = [start];
    if (level <= 2) for (let c = start; c < goal; c++) { open(c, c + 1, 'E'); roots.push(c + 1); }
    else {
        const minimumDepth = Math.ceil((config.min - columns) / 2);
        const depth = minimumDepth + Math.floor(rng() * (rows - minimumDepth));
        const down = start === 0, step = down ? columns : -columns;
        let cell = start;
        const stepTo = (next: number, direction: Direction): void => { open(cell, next, direction); roots.push(next); cell = next; };
        for (let i = 0; i < depth; i++) stepTo(cell + step, down ? 'S' : 'N');
        for (let i = 1; i < columns; i++) stepTo(cell + 1, 'E');
        for (let i = 0; i < depth; i++) stepTo(cell - step, down ? 'N' : 'S');
    }
    const grow = (cell: number): void => {
        for (const d of shuffle(directions, rng)) {
            const next = neighbour(state, cell, d);
            if (next === null || seen.has(next)) continue;
            open(cell, next, d); grow(next);
        }
    };
    for (const root of shuffle(roots, rng)) grow(root);
    state.solution = route(state, start, goal);
    // Optional detours end at most two edges away from the solution.
    const side = grid.map((edges, cell) => ({ edges, cell })).filter(({ edges, cell }) => {
        if (edges.length !== 1 || state.solution.includes(cell)) return false;
        const path = route(state, cell, goal), junction = path.findIndex(c => state.solution.includes(c));
        // Finishing must not block access to an optional star beyond the goal.
        return junction <= 2 && path[junction] !== goal;
    }).map(v => v.cell);
    const candidates = [...shuffle(side, rng), ...shuffle(state.solution.slice(1, -1), rng)];
    state.bonuses = candidates.slice(0, config.bonuses);
    return state;
}
export function extend(state: Maze, cell: number): Maze {
    const head = state.trace.at(-1)!;
    if (state.finished || !Number.isInteger(cell) || cell === head || !state.grid[head]!.some(d => neighbour(state, head, d) === cell)) return state;
    const trace = state.trace.at(-2) === cell ? state.trace.slice(0, -1) : [...state.trace, cell];
    const collected = state.bonuses.includes(cell) && !state.collected.includes(cell) ? [...state.collected, cell] : state.collected;
    return { ...state, trace, collected, finished: cell === state.goal };
}
/** Board coordinates are cell units; the outer quarter-cell margin snaps inward. */
export function fromPoint(state: Pick<Maze, 'columns' | 'rows'>, x: number, y: number): number | null {
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < -.25 || y < -.25 || x > state.columns + .25 || y > state.rows + .25) return null;
    return Math.max(0, Math.min(state.rows - 1, Math.floor(y))) * state.columns + Math.max(0, Math.min(state.columns - 1, Math.floor(x)));
}
export function centre(state: Pick<Maze, 'columns'>, cell: number): Point { return { x: cell % state.columns + .5, y: Math.floor(cell / state.columns) + .5 }; }
/** Exact grid traversal. Corner ties cross X then Y, so diagonal wall cutting is impossible. */
export function segmentCells(state: Pick<Maze, 'columns' | 'rows'>, a: Point, b: Point): number[] {
    const first = fromPoint(state, a.x, a.y);
    if (first === null || !Number.isFinite(b.x) || !Number.isFinite(b.y)) return [];
    const clamp = (p: Point): Point => ({ x: Math.max(0, Math.min(state.columns - 1e-9, p.x)), y: Math.max(0, Math.min(state.rows - 1e-9, p.y)) });
    a = clamp(a);
    // Clip along the original segment, rather than clamping each end coordinate
    // independently (which would change the slope and the cells traversed).
    const vx = b.x - a.x, vy = b.y - a.y;
    let exit = 1;
    if (vx > 0) exit = Math.min(exit, (state.columns - a.x) / vx);
    if (vx < 0) exit = Math.min(exit, -a.x / vx);
    if (vy > 0) exit = Math.min(exit, (state.rows - a.y) / vy);
    if (vy < 0) exit = Math.min(exit, -a.y / vy);
    const end = exit < 1 ? exit * (1 - 1e-10) : exit;
    b = clamp({ x: a.x + end * vx, y: a.y + end * vy });
    const last = fromPoint(state, b.x, b.y)!;
    let x = Math.floor(a.x), y = Math.floor(a.y);
    const dx = vx, dy = vy, sx = Math.sign(dx), sy = Math.sign(dy);
    let tx = dx === 0 ? Infinity : ((sx > 0 ? x + 1 : x) - a.x) / dx;
    let ty = dy === 0 ? Infinity : ((sy > 0 ? y + 1 : y) - a.y) / dy;
    const cells = [first];
    while (cells.at(-1) !== last && cells.length <= state.columns + state.rows + 1) {
        if (tx <= ty) { x += sx; tx += 1 / Math.abs(dx); } else { y += sy; ty += 1 / Math.abs(dy); }
        cells.push(y * state.columns + x);
    }
    return cells;
}
export function interpolate(state: Maze, a: Point, b: Point): Maze {
    const cells = segmentCells(state, a, b);
    if (cells[0] !== state.trace.at(-1)) return state;
    for (const cell of cells.slice(1)) {
        const next = extend(state, cell);
        if (next === state) break;
        state = next;
        if (state.finished) break;
    }
    return state;
}
/** Direction of the solution's first step from the start: what the start sign points to. */
export function firstStep(state: Pick<Maze, 'columns' | 'rows' | 'grid' | 'start' | 'solution'>): Direction {
    const next = state.solution[1];
    return state.grid[state.start]!.find(d => neighbour(state, state.start, d) === next) ?? 'E';
}
export function hint(state: Maze): number[] { return state.finished ? [] : route(state, state.trace.at(-1)!, state.goal).slice(1, 4); }
export function stars(): 3 { return 3; }
export function medal(state: Maze): boolean { return state.finished && state.bonuses.length > 0 && state.bonuses.every(c => state.collected.includes(c)); }
export function complete(records: Records, state: Maze): Records { return state.finished ? { ...records, [state.level]: Math.max(records[state.level] ?? 0, stars()) } : { ...records }; }
