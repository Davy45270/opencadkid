import { features, handLevels, PATTERNS, type Feature, type LevelDef } from './levels';
export { features, PATTERNS, silhouettes, type Feature, type LevelDef, type SilhouetteName } from './levels';
/** « Les cubes de Lumi »: a piece waits above a little well; the child slides it over a column (or touches one), may turn it
 * with a big button, and lets it go: it comes down gently and rests. Nothing falls by itself and there is no clock. The cubes
 * of a piece are soft: a cube that rests over an empty cell slides down into it, so the well never keeps a hole. A full row
 * turns rainbow and flies away as butterflies. When the well is nearly full, a cloud blows its top row away: the well never
 * overflows and nothing is ever lost. A scene ends on its goals: rows to make fly, a drawing at the bottom of the well to light
 * up (a cell lights up once a cube has been on it), friends to set free (a friend is free when its row flies).
 * One pose is (piece, rotation, column): the piece in hand or the other one (the free swap), turned a quarter `rot` times,
 * its leftmost cube over column `col`. Pure and deterministic. */
export const pieceKinds = ['u', 'd', 't', 'c', 'k', 'T', 'L', 'a', 'b'] as const;
export type PieceKind = typeof pieceKinds[number];
/** Tries that do not happen: nothing in the well changes, the piece goes back up. */
export const fails = ['mur', 'deborde', 'nuage', 'tournis', 'arc', 'bonbon'] as const;
export type Fail = typeof fails[number];
/** Every funny try, the hole included: a piece that rests over a hole is put down, the hole goes « ouh ouh », and the cube
 * above slides into it. */
export const funnies = ['trou', ...fails] as const;
export type Funny = typeof funnies[number];
/** Tries in a row that move no goal forward before a good place pulses. */
export const TRIES_BEFORE_HELP = 3;
/** Turns in a row that make the piece dizzy. */
export const SPINS = 4;
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const width = (level: LevelDef): number => level.rows[0]!.length;
export const height = (level: LevelDef): number => level.rows.length;
/** Ordinary cubes (the candy lifts them), by the piece they came with; `r` is a rainbow cube. */
export const CUBES = 'udtckTLr';
/** The rainbow and the candy cubes. */
const SPECIAL = 'ab';

/** The cells of each piece before it is turned, `[x, y]` with y going up from its lowest cube. */
const BASE: Readonly<Record<PieceKind, readonly (readonly [number, number])[]>> = {
    u: [[0, 0]], d: [[0, 0], [1, 0]], t: [[0, 0], [1, 0], [2, 0]], c: [[0, 0], [1, 0], [0, 1]],
    k: [[0, 0], [1, 0], [0, 1], [1, 1]], T: [[0, 0], [1, 0], [2, 0], [1, 1]], L: [[0, 0], [1, 0], [2, 0], [2, 1]], a: [[0, 0]], b: [[0, 0]]
};
export type Shape = readonly (readonly [number, number])[];
const shapeCache = new Map<string, Shape>();
/** The cells of `kind` turned a quarter (clockwise) `rot` times, moved so that its lowest and leftmost cubes are at 0. */
export function shapeOf(kind: PieceKind, rot: number): Shape {
    const key = `${kind}${rot & 3}`;
    let s = shapeCache.get(key);
    if (!s) {
        let cells = BASE[kind].map(([x, y]) => [x, y] as [number, number]);
        for (let i = 0; i < (rot & 3); i++) cells = cells.map(([x, y]) => [y, -x]);
        const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
        s = cells.map(([x, y]) => [x - mx, y - my] as const).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
        shapeCache.set(key, s);
    }
    return s;
}
export const shapeWidth = (s: Shape): number => Math.max(...s.map(c => c[0])) + 1;
export const shapeHeight = (s: Shape): number => Math.max(...s.map(c => c[1])) + 1;
const shapeKey = (s: Shape): string => s.map(c => c.join(',')).join(' ');
/** The rotations a piece really has (a square has one). */
export function rotationsOf(kind: PieceKind, level: LevelDef): number[] {
    if (!level.rotate) return [0];
    const seen = new Set<string>(), out: number[] = [];
    for (let r = 0; r < 4; r++) { const k = shapeKey(shapeOf(kind, r)); if (!seen.has(k)) { seen.add(k); out.push(r); } }
    return out;
}
/** The height of the sky above the well, where the piece waits: as tall as the tallest piece of the scene can be. */
export function skyOf(level: LevelDef): number {
    let h = 1;
    for (const k of new Set(level.pieces.split('') as PieceKind[])) for (let r = 0; r < (level.rotate ? 4 : 1); r++) h = Math.max(h, shapeHeight(shapeOf(k, r)));
    return h;
}

/** The columns of a scene, each from the bottom up. */
export function startCols(level: LevelDef): string[] {
    const w = width(level), h = height(level);
    return Array.from({ length: w }, (_, x) => { let col = ''; for (let y = h - 1; y >= 0; y--) { const c = level.rows[y]![x]!; if (c !== '.') col += c; } return col; });
}
/** The cells of the drawing to light up, `r` counted from the bottom of the well. */
export function silhouetteCells(level: LevelDef): { x: number; r: number }[] {
    const s = level.silhouette; if (!s) return [];
    const p = PATTERNS[s.name], out: { x: number; r: number }[] = [];
    for (let i = p.length - 1; i >= 0; i--) for (let j = 0; j < p[i]!.length; j++) if (p[i]![j] === '#') out.push({ x: s.x + j, r: (s.y ?? 0) + p.length - 1 - i });
    return out;
}
export const friendsOf = (level: LevelDef): number => level.rows.join('').split('A').length - 1;

export interface State {
    level: number;
    /** Every column from the bottom up: a cube by the letter of its piece (`r` rainbow), `p` a stone, `A` a friend. */
    cols: string[];
    /** One character per cell of the drawing, in `silhouetteCells` order: `1` once lit. */
    lit: string;
    /** The piece in hand and the other one (the swap button), the next to come in the scene's order. */
    hand: PieceKind; other: PieceKind; k: number;
    /** How the piece in hand is turned, and the turns in a row (the fourth makes it dizzy). */
    rot: number; spins: number;
    /** The little cloud: the column it floats over (-1: none) and where it goes next. */
    cloud: number; dir: 1 | -1;
    /** Rows made to fly, friends set free. */
    rows: number; freed: number;
    /** Poses, funny tries that did not happen, poses and tries in a row that moved no goal, helps taken. */
    poses: number; tries: number; dry: number; helps: number; finished: boolean;
}
const at = (pieces: string, i: number): PieceKind => pieces[i % pieces.length]! as PieceKind;
function startState(level: LevelDef): State {
    const cols = startCols(level);
    return { level: level.id, cols, lit: silhouetteCells(level).map(c => cols[c.x]!.length > c.r ? '1' : '0').join(''), hand: at(level.pieces, 0), other: at(level.pieces, 1), k: 2, rot: 0, spins: 0,
        cloud: level.cloud?.x ?? -1, dir: level.cloud?.dir ?? 1, rows: 0, freed: 0, poses: 0, tries: 0, dry: 0, helps: 0, finished: false };
}
export const start = (id: number): State => startState(levelOf(id));
export const done = (level: LevelDef, s: Pick<State, 'rows' | 'lit' | 'freed'>): boolean => s.rows >= level.goal && !s.lit.includes('0') && s.freed >= friendsOf(level);

export interface Pose { piece: 'main' | 'autre'; rot: number; col: number }
export interface Cell { x: number; y: number }
export interface Result {
    pose: Pose; kind: PieceKind; state: State; helped: boolean;
    /** A try that did not happen, and the column it is about. */
    fail: { kind: Fail; x: number } | null;
    /** Where the piece came to rest, whole (`y` from the bottom), and the empty cells it left under it (the « ouh ouh »). */
    rest: Cell[]; holes: Cell[];
    /** The columns once the cubes have slid down, before anything flies. */
    landed: string[];
    /** Cells of the drawing that lit up (their indices), rows that flew, friends set free (where they were). */
    lit: number[]; cleared: number; freed: Cell[];
    /** The columns after the rows flew; the cells the cloud blew away from the top, row by row. */
    afterRows: string[]; blown: Cell[][];
    /** The candy: the cells of its column that flew away. The rainbow: the cells it filled. */
    lifted: Cell[]; filled: Cell[];
    /** The pose moved a goal forward (a row, a lit cell, a friend, or a cube in the lowest column). */
    useful: boolean;
}
export const piecesOf = (s: State, which: Pose['piece']): PieceKind => which === 'main' ? s.hand : s.other;

/** Where `kind`, turned `rot` times, comes to rest over column `col`; or the try that does not happen. */
function land(level: LevelDef, s: State, kind: PieceKind, rot: number, col: number): { fail: Fail } | { rest: Cell[]; holes: Cell[]; cols: string[]; lifted: Cell[]; filled: Cell[]; freed: Cell[] } {
    const W = width(level), H = height(level), shape = shapeOf(kind, rot), w = shapeWidth(shape), hs = s.cols.map(c => c.length);
    if (col < 0 || col + w > W) return { fail: 'mur' };
    if (s.cloud >= 0 && s.cloud >= col && s.cloud < col + w) return { fail: 'nuage' };
    if (kind === 'a') {
        const target = Math.max(...[col - 1, col + 1].filter(x => x >= 0 && x < W).map(x => hs[x]!));
        if (target <= hs[col]!) return { fail: 'arc' };
        const filled = Array.from({ length: target - hs[col]! }, (_, i) => ({ x: col, y: hs[col]! + i }));
        const cols = s.cols.slice(); cols[col] = s.cols[col]! + 'r'.repeat(filled.length);
        return { rest: [{ x: col, y: hs[col]! }], holes: [], cols, lifted: [], filled, freed: [] };
    }
    if (kind === 'b') {
        const column = s.cols[col]!, keep: string[] = [], lifted: Cell[] = [], freed: Cell[] = [];
        let stone = false;
        for (let y = column.length - 1; y >= 0; y--) {
            const c = column[y]!;
            if (c === 'p') { stone = true; keep.unshift(c); }
            else if (c === 'A' && stone) keep.unshift(c);
            else { lifted.push({ x: col, y }); if (c === 'A') freed.push({ x: col, y }); }
        }
        if (!lifted.length) return { fail: 'bonbon' };
        const cols = s.cols.slice(); cols[col] = keep.join('');
        return { rest: [{ x: col, y: column.length }], holes: [], cols, lifted, filled: [], freed };
    }
    let base = 0;
    for (const [x, y] of shape) base = Math.max(base, hs[col + x]! - y);
    if (base + shapeHeight(shape) > H) return { fail: 'deborde' };
    const rest = shape.map(([x, y]) => ({ x: col + x, y: base + y })), holes: Cell[] = [], cols = s.cols.slice();
    for (let x = 0; x < w; x++) {
        const mine = shape.filter(c => c[0] === x);
        const low = Math.min(...mine.map(c => c[1]));
        for (let y = hs[col + x]!; y < base + low; y++) holes.push({ x: col + x, y });
        cols[col + x] = s.cols[col + x]! + kind.repeat(mine.length);
    }
    return { rest, holes, cols, lifted: [], filled: [], freed: [] };
}

/** Some piece of `kinds` can put a cube into a lowest column without the cloud at `cloud` in the way. */
function lowestReachable(level: LevelDef, cols: string[], cloud: number, kinds: readonly PieceKind[]): boolean {
    const probe = { cols, cloud } as State, hs = cols.map(c => c.length), lo = Math.min(...hs);
    for (const kind of kinds) for (const rot of rotationsOf(kind, level)) for (let col = 0; col < cols.length; col++) {
        const l = land(level, probe, kind, rot, col);
        if (!('fail' in l) && kind !== 'b' && l.rest.some(c => hs[c.x] === lo)) return true;
    }
    return false;
}
/** One pose of the child. A try that does not happen changes nothing but the counters. */
export function pose(s: State, p: Pose): Result | null {
    if (s.finished) return null;
    const level = levelOf(s.level), W = width(level), H = height(level), kind = piecesOf(s, p.piece);
    const rot = level.rotate ? p.rot & 3 : 0;
    const w = shapeWidth(shapeOf(kind, rot));
    if (!Number.isInteger(p.col) || p.col < -(w - 1) || p.col > W - 1) return null;
    const helped = helpOn(s) && sameAsHint(s, kind, rot, p.col);
    const empty: Omit<Result, 'state' | 'fail' | 'useful'> = { pose: { ...p, rot }, kind, helped: false, rest: [], holes: [], landed: s.cols, lit: [], cleared: 0, freed: [], afterRows: s.cols, blown: [], lifted: [], filled: [] };
    const l = land(level, s, kind, rot, p.col);
    if ('fail' in l) return { ...empty, fail: { kind: l.fail, x: Math.max(0, Math.min(W - 1, p.col)) }, useful: false, state: { ...s, tries: s.tries + 1, dry: s.dry + 1 } };
    const before = s.cols.map(c => c.length), low = Math.min(...before);
    const lowest = kind !== 'b' && l.rest.some(c => before[c.x] === low);
    // The drawing lights up where cubes now are.
    const cells = silhouetteCells(level), lit = s.lit.split(''), newly: number[] = [];
    cells.forEach((c, i) => { if (lit[i] === '0' && l.cols[c.x]!.length > c.r) { lit[i] = '1'; newly.push(i); } });
    const freed: Cell[] = [...l.freed];
    // Full rows fly away: with soft cubes, they are always the lowest ones. While the drawing is not all lit, its cubes stay.
    const m = lit.includes('0') ? 0 : Math.min(...l.cols.map(c => c.length));
    let cols = l.cols;
    if (m > 0) {
        cols.forEach((c, x) => { for (let y = 0; y < m; y++) if (c[y] === 'A') freed.push({ x, y }); });
        cols = cols.map(c => c.slice(m));
    }
    const afterRows = cols, blown: Cell[][] = [];
    // The well nearly full: the cloud blows the top row away until two rows are free at the top.
    for (let top = Math.max(...cols.map(c => c.length)); top > H - 2; top--) {
        const row: Cell[] = [];
        cols = cols.map((c, x) => { if (c.length !== top) return c; row.push({ x, y: top - 1 }); if (c[top - 1] === 'A') freed.push({ x, y: top - 1 }); return c.slice(0, -1); });
        blown.push(row);
    }
    // The piece kept comes in hand, the next of the order is the other one; never two special cubes at once.
    const kept = p.piece === 'main' ? s.other : s.hand;
    let k = s.k;
    if (SPECIAL.includes(kept) && SPECIAL.includes(at(level.pieces, k))) k++;
    const next = at(level.pieces, k);
    // The little cloud floats on, one column, or further when it would stand in the way of every cube that could go into the
    // lowest column.
    let cloud = s.cloud, dir = s.dir;
    if (cloud >= 0) {
        const first = { cloud: -1, dir };
        for (let n = 0; n < 2 * W; n++) {
            if (cloud + dir < 0 || cloud + dir >= W) dir = -dir as 1 | -1;
            cloud += dir;
            if (first.cloud < 0) { first.cloud = cloud; first.dir = dir; }
            if (lowestReachable(level, cols, cloud, [kept, next])) break;
            if (n === 2 * W - 1) { cloud = first.cloud; dir = first.dir; }
        }
    }
    const rows = s.rows + m, total = s.freed + freed.length, litStr = lit.join('');
    const useful = m > 0 || newly.length > 0 || freed.length > 0 || lowest;
    const finished = done(level, { rows, lit: litStr, freed: total });
    return {
        ...empty, helped, fail: null, rest: l.rest, holes: l.holes, landed: l.cols, lit: newly, cleared: m, freed, afterRows, blown, lifted: l.lifted, filled: l.filled, useful,
        state: { ...s, cols, lit: litStr, hand: kept, other: at(level.pieces, k), k: (k + 1) % level.pieces.length, rot: 0, spins: 0, cloud, dir, rows, freed: total,
            poses: s.poses + 1, dry: useful ? 0 : s.dry + 1, helps: s.helps + (helped ? 1 : 0), finished }
    };
}
/** The big turn button: a quarter turn of the piece in hand; the fourth turn in a row makes it dizzy (a funny try). */
export function turn(s: State): { state: State; dizzy: boolean } | null {
    if (s.finished || !levelOf(s.level).rotate) return null;
    const spins = s.spins + 1, dizzy = spins >= SPINS;
    return { dizzy, state: { ...s, rot: (s.rot + 1) & 3, spins: dizzy ? 0 : spins, tries: s.tries + (dizzy ? 1 : 0), dry: s.dry + (dizzy ? 1 : 0) } };
}
/** The free swap button: the other piece comes in hand. */
export function swap(s: State): State { return s.finished ? s : { ...s, hand: s.other, other: s.hand, rot: 0, spins: 0 }; }

/** Every pose that can be asked for, the tries against the wall included. */
export function allPoses(s: State): Pose[] {
    const level = levelOf(s.level), W = width(level), out: Pose[] = [];
    for (const piece of ['main', 'autre'] as const) for (const rot of rotationsOf(piecesOf(s, piece), level)) {
        const w = shapeWidth(shapeOf(piecesOf(s, piece), rot));
        for (let col = -(w - 1); col <= W - 1; col++) out.push({ piece, rot, col });
    }
    return out;
}
/** The poses that happen (a hole included), with their result. */
export const possible = (s: State): Result[] => allPoses(s).map(p => pose({ ...s, dry: 0 }, p)!).filter(r => !r.fail);
/** How good a pose is for the help: a friend set free, the end of the scene, rows, lit cells, the lowest column; a hole, a
 * high well and the swap count a little against it. */
function score(r: Result): number {
    const top = Math.max(...r.state.cols.map(c => c.length));
    return (r.state.finished ? 10_000 : 0) + r.freed.length * 1000 + r.cleared * 100 + r.lit.length * 40 + (r.useful ? 20 : 0)
        - r.holes.length * 3 - top * 2 - r.lifted.length - (r.pose.piece === 'autre' ? 1 : 0);
}
const hintCache = new Map<string, Pose | null>();
const keyOf = (s: State): string => `${s.level}|${s.cols.join('/')}|${s.lit}|${s.hand}${s.other}${s.k}|${s.cloud}${s.dir}|${s.rows}|${s.freed}`;
/** The good place that pulses: the best useful pose of the piece in hand or the other one. */
export function hint(s: State): Pose | null {
    if (s.finished) return null;
    const k = keyOf(s);
    if (!hintCache.has(k)) {
        if (hintCache.size > 20_000) hintCache.clear();
        let best: Result | null = null;
        for (const r of possible(s)) if (!best || (r.useful && !best.useful) || (r.useful === best.useful && score(r) > score(best))) best = r;
        hintCache.set(k, best ? best.pose : null);
    }
    return hintCache.get(k)!;
}
/** The pose lands where the help shows (a turn that gives the same shape is the same place). */
function sameAsHint(s: State, kind: PieceKind, rot: number, col: number): boolean {
    const h = hint(s);
    return Boolean(h && piecesOf(s, h.piece) === kind && h.col === col && shapeKey(shapeOf(kind, h.rot)) === shapeKey(shapeOf(kind, rot)));
}
export const helpOn = (s: State): boolean => !s.finished && s.dry >= TRIES_BEFORE_HELP;
export function stars(s: State): 1 | 2 | 3 { return s.helps === 0 ? 3 : s.helps === 1 ? 2 : 1; }
export type Records = Partial<Record<number, number>>;
export function complete(records: Records, s: State): Records { return s.finished ? { ...records, [s.level]: Math.max(records[s.level] ?? 0, stars(s)) } : { ...records }; }
export function isUnlocked(id: number, records: Records): boolean { return id === 1 || (records[id - 1] ?? 0) > 0; }
export function parseRecords(raw: string | null): Records {
    try {
        const v: unknown = JSON.parse(raw ?? 'null'); const out: Records = {};
        if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
        for (const [k, score] of Object.entries(v)) if (/^\d+$/.test(k) && Number(k) >= 1 && Number(k) <= levels.length && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) out[Number(k)] = score;
        return out;
    } catch { return {}; }
}

/** The new things a scene uses. */
export function featuresOf(level: LevelDef): Feature[] {
    const p = level.pieces, all = level.rows.join('');
    const has: Record<Feature, boolean> = {
        deux: p.includes('d'), trois: /[tc]/.test(p), tourner: level.rotate, rangee: /[udtckTLr]/.test(all), silhouette: Boolean(level.silhouette),
        quatre: /[kTL]/.test(p), ami: all.includes('A'), nuage: Boolean(level.cloud), arc: p.includes('a'), bonbon: p.includes('b')
    };
    return features.filter(f => has[f]);
}
/** What a new thing needs to be shown at all: a piece to turn, cubes already there to make a hole or a tower. */
export const NEEDS: Readonly<Partial<Record<Feature, readonly Feature[]>>> = { tourner: ['deux'], arc: ['rangee'], bonbon: ['rangee'] };
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], W = width(level), H = height(level), all = level.rows.join('');
    // Six columns at most: the cells stay at least 44 px wide on a 320 px phone; eight rows at most, under the sky.
    if (W < 3 || W > 6) out.push('three to six columns');
    if (H < 5 || H > 8) out.push('five to eight rows');
    if (level.rows.some(r => r.length !== W)) out.push('rows of the same length');
    for (const ch of new Set(all)) if (!/^[.udtckTLrpA]$/.test(ch)) out.push(`unknown cell ${ch}`);
    const cols = startCols(level), hs = cols.map(c => c.length);
    for (let x = 0; x < W; x++) for (let y = 0; y < H - 1; y++) if (level.rows[y]![x] !== '.' && level.rows[y + 1]![x] === '.') out.push(`column ${x}: rests on what is under it`);
    if (Math.min(...hs) !== 0) out.push('no full row at the start');
    if (Math.max(...hs) > H - 2) out.push('two free rows at the top');
    const friends = friendsOf(level);
    if (friends > 2) out.push('two friends at most');
    cols.forEach((c, x) => { const i = c.indexOf('A'); if (i >= 0 && i === c.length - 1) out.push(`column ${x}: a friend stuck under something`); });
    if (!/^[udtckTLab]{1,8}$/.test(level.pieces)) out.push('one to eight pieces');
    const n = level.pieces.length;
    for (let i = 0; i < n; i++) if (SPECIAL.includes(level.pieces[i]!) && SPECIAL.includes(level.pieces[(i + 1) % n]!)) out.push('never two special cubes in a row');
    if (level.goal < 0 || level.goal > 8) out.push('zero to eight rows to make');
    if (level.goal === 0 && !level.silhouette && friends === 0) out.push('a goal');
    if (level.silhouette) {
        const p = PATTERNS[level.silhouette.name];
        if (level.silhouette.x < 0 || level.silhouette.x + p[0]!.length > W) out.push('the drawing inside the well');
        for (const c of silhouetteCells(level)) {
            if (c.r > H - 3) out.push('the drawing low enough to be lit');
            if (hs[c.x]! > c.r) out.push('the drawing not covered at the start');
        }
    }
    if (level.cloud && (level.cloud.x < 0 || level.cloud.x >= W)) out.push('the cloud over the well');
    if (level.rotate && level.id < 6) out.push('no turning before scene 6');
    if (level.title.fr.length > 32 || level.title.en.length > 32) out.push('a short title');
    return out;
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 8;
/** The well of a scene as it starts, from the bottom: the drawing as `o`, the cloud as `n` on top of its column. */
function drawn(l: LevelDef): string[] {
    const W = width(l), H = height(l), cols = startCols(l), grid = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => cols[x]![y] ?? '.'));
    for (const c of silhouetteCells(l)) if (grid[c.r]![c.x] === '.') grid[c.r]![c.x] = 'o';
    if (l.cloud) { const y = cols[l.cloud.x]!.length; if (y < H) grid[y]![l.cloud.x] = 'n'; }
    return grid.map(r => r.join(''));
}
/** How far apart two scenes are: the wells laid over each other from the bottom left corner, one per cell that differs, two
 * per row or column more or less, three per new thing one has and not the other, one per piece of the order that differs,
 * two per row to make more or less. */
export function distance(a: LevelDef, b: LevelDef): number {
    const ga = drawn(a), gb = drawn(b);
    let d = 2 * Math.abs(width(a) - width(b)) + 2 * Math.abs(height(a) - height(b)) + 2 * Math.abs(a.goal - b.goal);
    for (let y = 0; y < Math.min(ga.length, gb.length); y++) for (let x = 0; x < Math.min(width(a), width(b)); x++) if (ga[y]![x] !== gb[y]![x]) d++;
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    for (let i = 0; i < Math.max(a.pieces.length, b.pieces.length); i++) if (a.pieces[i] !== b.pieces[i]) d++;
    return d;
}
