import { colors, features, handLevels, type ColorId, type Feature, type Friend, type Goal, type LevelDef } from './levels';
export { colors, features, friends, type ColorId, type Feature, type Friend, type Goal, type LevelDef } from './levels';
/** « Les bonbons de Lumi »: swap two neighbouring sweets; three or more of the same kind in a line jump into Lumi’s jar
 * and the others fall to fill the holes. No clock, no move limit, no lives, nothing to lose: a scene ends on a simple goal
 * shown in pictures. A swap that makes no line changes nothing and gets a funny reaction. The board never gets stuck: with
 * no swap left, it is gently mixed. Pure and deterministic: the random draws live in the state. */
export type Kind = 'bonbon' | 'arc' | 'ami' | 'sucre' | 'choco';
export interface Tile { id: number; kind: Kind; color: ColorId | null; wrapped?: boolean; layers?: number; friend?: Friend }
/** A cell of the board: a tile, or null for a hole (`holes`) or, only while a swap is being resolved, an empty cell. */
export type Grid = (Tile | null)[];
export interface State {
    level: number; cols: number; rows: number; holes: readonly boolean[]; grid: Grid;
    seed: number; nextId: number;
    /** Swaps that made something happen; tries that did not, in all and in a row. */
    swaps: number; tries: number; dry: number;
    helps: number; pot: Partial<Record<ColorId, number>>; friendsOut: number; finished: boolean; chocoCap: number; shuffles: number;
}
/** Funny tries: a swap that makes no line gets one of these, each with its own animation, and the board stays as it was. */
export const misses = ['cogne', 'saute', 'rougit', 'chatouille', 'froisse', 'lourd', 'colle'] as const;
export type Miss = typeof misses[number];
export interface Step {
    cleared: { at: number; tile: Tile }[]; blasts: number[]; hits: { at: number; layers: number }[]; eaten: number[];
    created: { at: number; tile: Tile }[]; exits: { at: number; tile: Tile }[];
    falls: { id: number; from: number; to: number }[]; spawns: { tile: Tile; to: number; drop: number }[]; grid: Grid;
}
export interface Result {
    a: number; b: number; valid: boolean; miss: Miss | null; steps: Step[];
    /** Where the chocolate spread after a swap that left it alone, and the board mixed when no swap was left. */
    spread: number | null; shuffled: Grid | null; helped: boolean; state: State;
}
/** Tries in a row without a line before the help shows a good swap. */
export const DRY_HELP = 3;
/** Chocolate never grows more than this many squares above what the scene started with. */
export const CHOCO_EXTRA = 1;
const MAX_CASCADE = 60;

export const has = (level: LevelDef, f: Feature): boolean => level.features.includes(f);
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const swappable = (t: Tile | null): t is Tile => Boolean(t) && (t!.kind === 'bonbon' || t!.kind === 'arc' || t!.kind === 'ami');
const fixed = (t: Tile | null): boolean => Boolean(t) && (t!.kind === 'sucre' || t!.kind === 'choco');
const colorOf = (t: Tile | null): ColorId | null => t && t.kind === 'bonbon' ? t.color : null;
export const adjacent = (s: { cols: number }, a: number, b: number): boolean => {
    const ra = Math.floor(a / s.cols), rb = Math.floor(b / s.cols), ca = a % s.cols, cb = b % s.cols;
    return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
};

/** Mulberry32 step: same values as rng.ts, but the state stays in the game state. */
function rand(seed: number): [number, number] {
    const value = (seed + 1831565813) | 0;
    let n = Math.imul(value ^ value >>> 15, 1 | value);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return [((n ^ n >>> 14) >>> 0) / 4294967296, value];
}
class Draw { constructor(public seed: number) {} next(): number { const [r, s] = rand(this.seed); this.seed = s; return r; } pick<T>(list: readonly T[]): T { return list[Math.floor(this.next() * list.length)]!; } }
class Ids { constructor(public next: number) {} take(): number { return this.next++; } }

/** Lines of three or more sweets of one colour, across and down. */
export function runs(grid: Grid, cols: number, rows: number): { cells: number[]; color: ColorId }[] {
    const out: { cells: number[]; color: ColorId }[] = [];
    const scan = (line: number[]): void => {
        let i = 0;
        while (i < line.length) {
            const c = colorOf(grid[line[i]!]!);
            let j = i + 1;
            while (c && j < line.length && colorOf(grid[line[j]!]!) === c) j++;
            if (c && j - i >= 3) out.push({ cells: line.slice(i, j), color: c });
            i = Math.max(j, i + 1);
        }
    };
    for (let r = 0; r < rows; r++) scan(Array.from({ length: cols }, (_, c) => r * cols + c));
    for (let c = 0; c < cols; c++) scan(Array.from({ length: rows }, (_, r) => r * cols + c));
    return out;
}
/** Is there a line through cell `i`? */
function lineAt(grid: Grid, cols: number, rows: number, i: number): boolean {
    const c = colorOf(grid[i]!);
    if (!c) return false;
    const r = Math.floor(i / cols), k = i % cols, same = (rr: number, kk: number): boolean => rr >= 0 && rr < rows && kk >= 0 && kk < cols && colorOf(grid[rr * cols + kk]!) === c;
    let h = 1; for (let x = k - 1; same(r, x); x--) h++; for (let x = k + 1; same(r, x); x++) h++;
    if (h >= 3) return true;
    let v = 1; for (let y = r - 1; same(y, k); y--) v++; for (let y = r + 1; same(y, k); y++) v++;
    return v >= 3;
}
/** Does swapping a and b make something happen? A rainbow goes with any sweet; otherwise a line must appear. */
export function works(grid: Grid, cols: number, rows: number, a: number, b: number): boolean {
    const ta = grid[a]!, tb = grid[b]!;
    if (!swappable(ta) || !swappable(tb)) return false;
    if ((ta.kind === 'arc' && (tb.kind === 'arc' || tb.kind === 'bonbon')) || (tb.kind === 'arc' && ta.kind === 'bonbon')) return true;
    if (ta.kind === 'arc' || tb.kind === 'arc') return false;
    const g = grid.slice(); g[a] = tb; g[b] = ta;
    return lineAt(g, cols, rows, a) || lineAt(g, cols, rows, b);
}
/** Every swap that makes something happen, each pair once (the cell first, then its right or lower neighbour). */
export function moves(s: Pick<State, 'grid' | 'cols' | 'rows'>): [number, number][] {
    const out: [number, number][] = [];
    for (let i = 0; i < s.grid.length; i++) {
        const c = i % s.cols;
        if (c + 1 < s.cols && works(s.grid, s.cols, s.rows, i, i + 1)) out.push([i, i + 1]);
        if (i + s.cols < s.grid.length && works(s.grid, s.cols, s.rows, i, i + s.cols)) out.push([i, i + s.cols]);
    }
    return out;
}
const playable = (s: Pick<State, 'grid' | 'cols' | 'rows'>): boolean => runs(s.grid, s.cols, s.rows).length === 0 && moves(s).length > 0;

/** The lowest cell of each column that is not a hole: where a friend leaves the board. */
function bottoms(holes: readonly boolean[], cols: number, rows: number): number[] {
    return Array.from({ length: cols }, (_, c) => { for (let r = rows - 1; r >= 0; r--) if (!holes[r * cols + c]) return r * cols + c; return -1; });
}
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], rows = level.rows.length, cols = level.rows[0]?.length ?? 0, all = level.rows.join('');
    if (rows < 5 || rows > 9) out.push('five to nine rows');
    if (cols < 5 || cols > 7) out.push('five to seven columns');
    if (level.rows.some(r => r.length !== cols)) out.push('rows of the same length');
    if (!/^[.#AESCco]+$/.test(all)) out.push('known cells');
    if (all.replace(/#/g, '').length < 20) out.push('at least twenty cells');
    if (level.colors.length < 3 || level.colors.length > 4 || new Set(level.colors).size !== level.colors.length || level.colors.some(c => !colors.includes(c))) out.push('three or four colours');
    for (const [a, b] of closeColors) if (level.colors.includes(a) && level.colors.includes(b)) out.push(`${a} and ${b} look alike`);
    const marks: Record<Feature, RegExp> = { arc: /A/, emballe: /E/, sucre: /S/, ami: /[co]/, trou: /#/, choco: /C/ };
    for (const f of features) if (has(level, f) !== marks[f].test(all)) out.push(`${f} where the scene says so`);
    if (new Set(level.features).size !== level.features.length || level.features.some(f => !features.includes(f))) out.push('known features once');
    if (!level.goals.length) out.push('a goal');
    const kinds = level.goals.map(g => g.kind);
    if (new Set(kinds.filter(k => k !== 'pot')).size !== kinds.filter(k => k !== 'pot').length) out.push('each goal once');
    if (kinds.includes('ami') !== /[co]/.test(all)) out.push('friends are a goal');
    if (kinds.includes('sucre') && !/S/.test(all)) out.push('sugar to melt');
    if (kinds.includes('choco') && !/C/.test(all)) out.push('chocolate to eat');
    for (const g of level.goals) if (g.kind === 'pot' && (!level.colors.includes(g.color) || g.count < 4 || g.count > 30)) out.push('a jar of four to thirty sweets of the scene');
    const holes = all.split('').map(ch => ch === '#'), low = new Set(bottoms(holes, cols, rows));
    all.split('').forEach((ch, i) => { if ((ch === 'c' || ch === 'o') && low.has(i)) out.push('a friend starts above the bottom'); });
    return out;
}
/** Pairs of colours too close to share a scene (the test measures them in CIELAB). */
export const closeColors: readonly (readonly [ColorId, ColorId])[] = [['rouge', 'orange'], ['orange', 'jaune'], ['bleu', 'violet']];

/** Colours for every sweet cell, never three in a row; drawn again until a swap exists. */
function fill(level: LevelDef, draw: Draw, ids: Ids): Grid {
    const rows = level.rows.length, cols = level.rows[0]!.length, chars = level.rows.join('').split('');
    for (let attempt = 0; ; attempt++) {
        const grid: Grid = [];
        chars.forEach((ch, i) => {
            if (ch === '#') { grid.push(null); return; }
            if (ch === 'A') { grid.push({ id: ids.take(), kind: 'arc', color: null }); return; }
            if (ch === 'S') { grid.push({ id: ids.take(), kind: 'sucre', color: null, layers: 2 }); return; }
            if (ch === 'C') { grid.push({ id: ids.take(), kind: 'choco', color: null }); return; }
            if (ch === 'c' || ch === 'o') { grid.push({ id: ids.take(), kind: 'ami', color: null, friend: ch === 'c' ? 'cerise' : 'ourson' }); return; }
            const r = Math.floor(i / cols), k = i % cols;
            const bad = new Set<ColorId>();
            if (k >= 2 && colorOf(grid[i - 1]!) && colorOf(grid[i - 1]!) === colorOf(grid[i - 2]!)) bad.add(colorOf(grid[i - 1]!)!);
            if (r >= 2 && colorOf(grid[i - cols]!) && colorOf(grid[i - cols]!) === colorOf(grid[i - 2 * cols]!)) bad.add(colorOf(grid[i - cols]!)!);
            const color = draw.pick(level.colors.filter(c => !bad.has(c)));
            grid.push({ id: ids.take(), kind: 'bonbon', color, ...(ch === 'E' ? { wrapped: true } : {}) });
        });
        if (playable({ grid, cols, rows }) || attempt > 200) return grid;
    }
}
export function start(id: number): State {
    const level = levelOf(id), rows = level.rows.length, cols = level.rows[0]!.length, draw = new Draw(id * 7919 + 13), ids = new Ids(1);
    const grid = fill(level, draw, ids), holes = level.rows.join('').split('').map(ch => ch === '#');
    return { level: id, cols, rows, holes, grid, seed: draw.seed, nextId: ids.next, swaps: 0, tries: 0, dry: 0, helps: 0, pot: {}, friendsOut: 0, finished: false,
        chocoCap: grid.filter(t => t?.kind === 'choco').length + CHOCO_EXTRA, shuffles: 0 };
}

/** How far each goal is: `left` is what remains to do (0 when done), counted as the child sees it: sweets, friends, cubes, squares. */
export function progress(s: State): { goal: Goal; done: number; total: number; left: number }[] {
    const level = levelOf(s.level), count = (k: Kind): number => s.grid.filter(t => t?.kind === k).length;
    return level.goals.map(goal => {
        if (goal.kind === 'pot') { const done = Math.min(goal.count, s.pot[goal.color] ?? 0); return { goal, done, total: goal.count, left: goal.count - done }; }
        if (goal.kind === 'ami') { const left = count('ami'); return { goal, done: s.friendsOut, total: s.friendsOut + left, left }; }
        if (goal.kind === 'sucre') { const left = count('sucre'), total = levelOf(s.level).rows.join('').split('S').length - 1; return { goal, done: total - left, total, left }; }
        const left = count('choco'); return { goal, done: 0, total: left, left };
    });
}
const done = (s: State): boolean => progress(s).every(p => p.left === 0);

/** Sweets fall in each column, across holes, down to the next sugar cube or chocolate; new sweets fill the top of each
 * part. A new sweet never makes a line where it lands when another colour can avoid it: lines come from the child’s swap
 * and from sweets that fall, so that what happens follows what the child did. */
function gravity(grid: Grid, s: State, level: LevelDef, draw: Draw, ids: Ids): Pick<Step, 'falls' | 'spawns'> {
    const falls: Step['falls'] = [], slots: { to: number; drop: number }[] = [];
    for (let c = 0; c < s.cols; c++) {
        const column = Array.from({ length: s.rows }, (_, r) => r * s.cols + c).filter(i => !s.holes[i]);
        let part: number[] = [];
        const settle = (): void => {
            if (!part.length) return;
            const tiles = part.map(i => grid[i]).filter((t): t is Tile => Boolean(t)), from = new Map(part.filter(i => grid[i]).map(i => [grid[i]!.id, i]));
            const empty = part.length - tiles.length;
            part.forEach((i, k) => {
                if (k < empty) { grid[i] = null; slots.push({ to: i, drop: empty }); }
                else { const t = tiles[k - empty]!; grid[i] = t; if (from.get(t.id) !== i) falls.push({ id: t.id, from: from.get(t.id)!, to: i }); }
            });
            part = [];
        };
        for (const i of column) { if (fixed(grid[i]!)) settle(); else part.push(i); }
        settle();
    }
    slots.sort((a, b) => b.to - a.to);
    const spawns: Step['spawns'] = slots.map(({ to, drop }) => {
        const quiet = level.colors.filter(color => { grid[to] = { id: 0, kind: 'bonbon', color }; return !lineAt(grid, s.cols, s.rows, to); });
        const tile: Tile = { id: ids.take(), kind: 'bonbon', color: draw.pick(quiet.length ? quiet : level.colors) };
        grid[to] = tile;
        return { tile, to, drop };
    });
    return { falls, spawns };
}
/** Clears what a step takes away, with what it touches: wrapped sweets burst their 3 × 3 neighbourhood, sugar next to a
 * cleared cell loses a layer, chocolate next to it is eaten, friends at the bottom leave. */
function apply(grid: Grid, s: State, clear: Set<number>, created: Step['created'], exits: number[], pot: State['pot']): Omit<Step, 'falls' | 'spawns' | 'grid'> {
    const blasts: number[] = [], hit = new Set<number>(), eaten = new Set<number>(), queue = [...clear].filter(i => grid[i]?.wrapped);
    const touch = (i: number): void => { const t = grid[i]; if (t?.kind === 'sucre') hit.add(i); else if (t?.kind === 'choco') eaten.add(i); };
    while (queue.length) {
        const at = queue.shift()!, r = Math.floor(at / s.cols), k = at % s.cols;
        blasts.push(at);
        for (let y = r - 1; y <= r + 1; y++) for (let x = k - 1; x <= k + 1; x++) {
            if (y < 0 || y >= s.rows || x < 0 || x >= s.cols) continue;
            const i = y * s.cols + x, t = grid[i];
            if (!t || clear.has(i)) continue;
            if (t.kind === 'bonbon' || t.kind === 'arc') { clear.add(i); if (t.wrapped) queue.push(i); } else touch(i);
        }
    }
    for (const i of clear) {
        const r = Math.floor(i / s.cols), k = i % s.cols;
        for (const [y, x] of [[r - 1, k], [r + 1, k], [r, k - 1], [r, k + 1]] as const) if (y >= 0 && y < s.rows && x >= 0 && x < s.cols) touch(y * s.cols + x);
    }
    const cleared = [...clear].sort((a, b) => a - b).map(at => ({ at, tile: grid[at]! }));
    for (const { tile } of cleared) if (tile.kind === 'bonbon' && tile.color) pot[tile.color] = (pot[tile.color] ?? 0) + 1;
    const hits = [...hit].sort((a, b) => a - b).map(at => { const t = grid[at]!, layers = (t.layers ?? 1) - 1; grid[at] = layers > 0 ? { ...t, layers } : null; return { at, layers }; });
    for (const at of eaten) grid[at] = null;
    for (const at of clear) grid[at] = null;
    const out = exits.map(at => ({ at, tile: grid[at]! }));
    for (const at of exits) grid[at] = null;
    for (const c of created) grid[c.at] = c.tile;
    return { cleared, blasts, hits, eaten: [...eaten].sort((a, b) => a - b), created, exits: out };
}
/** The lines on the board, and the special sweets four or five in a row make in the scenes that know them. */
function lines(grid: Grid, s: State, level: LevelDef, prefer: readonly number[], ids: Ids): { clear: Set<number>; created: Step['created'] } {
    const clear = new Set<number>(), created: Step['created'] = [], used = new Set<number>();
    for (const run of runs(grid, s.cols, s.rows)) {
        run.cells.forEach(i => clear.add(i));
        const rainbow = run.cells.length >= 5 && has(level, 'arc'), wrap = run.cells.length >= 4 && has(level, 'emballe');
        if (!rainbow && !wrap) continue;
        const at = run.cells.find(i => prefer.includes(i)) ?? run.cells[1]!;
        if (used.has(at)) continue;
        used.add(at);
        created.push({ at, tile: rainbow ? { id: ids.take(), kind: 'arc', color: null } : { id: ids.take(), kind: 'bonbon', color: run.color, wrapped: true } });
    }
    return { clear, created };
}
/** The funny reaction to a swap that makes no line: chosen by what is swapped, so a child can find each one again. */
export function missOf(s: State, a: number, b: number): Miss {
    const ta = s.grid[a]!, tb = s.grid[b]!;
    if (tb.kind === 'sucre' || ta.kind === 'sucre') return 'lourd';
    if (tb.kind === 'choco' || ta.kind === 'choco') return 'colle';
    if (ta.kind === 'ami' || tb.kind === 'ami') return 'chatouille';
    if (ta.wrapped || tb.wrapped) return 'froisse';
    if (ta.color && ta.color === tb.color) return 'rougit';
    return Math.abs(a - b) === 1 ? 'cogne' : 'saute';
}
export const helpOn = (s: State): boolean => !s.finished && s.dry >= DRY_HELP;
/** Mixes the board when no swap is left: the sweets change places (friends stay), no line appears, a swap exists. */
export function mix(s: State, grid: Grid, draw: Draw | number, ids?: Ids): Grid {
    const d = typeof draw === 'number' ? new Draw(draw) : draw, view = { cols: s.cols, rows: s.rows };
    const spots = grid.map((t, i) => t && (t.kind === 'bonbon' || t.kind === 'arc') ? i : -1).filter(i => i >= 0);
    for (let attempt = 0; attempt < 200; attempt++) {
        const tiles = spots.map(i => grid[i]!);
        for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(d.next() * (i + 1)); [tiles[i], tiles[j]] = [tiles[j]!, tiles[i]!]; }
        const g = grid.slice(); spots.forEach((at, k) => { g[at] = tiles[k]!; });
        if (playable({ ...view, grid: g })) return g;
    }
    // Hardly ever: new colours for the plain sweets, then a rainbow sweet as a last resort.
    const level = levelOf(s.level), plainSpots = spots.filter(i => grid[i]!.kind === 'bonbon' && !grid[i]!.wrapped);
    for (let attempt = 0; attempt < 200; attempt++) {
        const g = grid.slice(); for (const at of plainSpots) g[at] = { ...grid[at]!, color: d.pick(level.colors) };
        if (playable({ ...view, grid: g })) return g;
    }
    const g = grid.slice(), at = plainSpots.find(i => [i - 1, i + 1, i - s.cols, i + s.cols].some(n => n >= 0 && n < g.length && adjacent(s, i, n) && g[n]?.kind === 'bonbon')) ?? plainSpots[0];
    if (at !== undefined) g[at] = { id: ids ? ids.take() : g[at]!.id, kind: 'arc', color: null };
    return g;
}
/** Where chocolate may spread: the squares it starts on and the cells right next to them, so that it never climbs into a
 * corner a line cannot reach. */
export function chocoField(level: LevelDef, cols: number): Set<number> {
    const cells = level.rows.join('').split(''), out = new Set<number>();
    cells.forEach((ch, i) => {
        if (ch !== 'C') return;
        for (const n of [i, i - 1, i + 1, i - cols, i + cols]) if (n >= 0 && n < cells.length && (n === i || adjacent({ cols }, i, n)) && cells[n] !== '#') out.add(n);
    });
    return out;
}
/** The child swaps cells a and b. Null when it is not a swap at all (not neighbours, a hole, or a cell that cannot move). */
export function swap(s: State, a: number, b: number): Result | null {
    if (s.finished || a < 0 || b < 0 || a >= s.grid.length || b >= s.grid.length || !adjacent(s, a, b)) return null;
    const ta = s.grid[a], tb = s.grid[b];
    if (!swappable(ta ?? null) || !tb) return null;
    const helped = helpOn(s);
    if (!works(s.grid, s.cols, s.rows, a, b)) {
        return { a, b, valid: false, miss: missOf(s, a, b), steps: [], spread: null, shuffled: null, helped: false, state: { ...s, tries: s.tries + 1, dry: s.dry + 1 } };
    }
    const level = levelOf(s.level), grid = s.grid.slice(), draw = new Draw(s.seed), ids = new Ids(s.nextId), pot = { ...s.pot }, steps: Step[] = [];
    grid[a] = tb; grid[b] = ta!;
    let first: { clear: Set<number>; created: Step['created'] };
    if (ta!.kind === 'arc' || tb.kind === 'arc') {
        const arcAt = ta!.kind === 'arc' ? b : a, other = ta!.kind === 'arc' ? tb : ta!, clear = new Set<number>([arcAt]);
        if (other.kind === 'arc') clear.add(arcAt === a ? b : a);
        grid.forEach((t, i) => { if (t?.kind === 'bonbon' && (other.kind === 'arc' || t.color === other.color)) clear.add(i); });
        first = { clear, created: [] };
    } else first = lines(grid, s, level, [a, b], ids);
    const bottom = bottoms(s.holes, s.cols, s.rows);
    let friendsOut = s.friendsOut, eatenAll = 0;
    for (let k = 0; k < MAX_CASCADE; k++) {
        const found = k === 0 ? first : lines(grid, s, level, [], ids);
        const exits = bottom.filter(i => i >= 0 && grid[i]?.kind === 'ami');
        if (!found.clear.size && !exits.length) break;
        const part = apply(grid, s, found.clear, found.created, exits, pot);
        friendsOut += part.exits.length; eatenAll += part.eaten.length;
        const moved = gravity(grid, s, level, draw, ids);
        steps.push({ ...part, ...moved, grid: grid.slice() });
    }
    let next: State = { ...s, grid, pot, friendsOut, swaps: s.swaps + 1, dry: 0, helps: s.helps + (helped ? 1 : 0), seed: draw.seed, nextId: ids.next };
    let spread: number | null = null;
    const chocolate = grid.filter(t => t?.kind === 'choco').length;
    if (!eatenAll && chocolate > 0 && chocolate < s.chocoCap) {
        const field = chocoField(level, s.cols);
        const near = grid.map((t, i) => field.has(i) && t?.kind === 'bonbon' && !t.wrapped && [i - 1, i + 1, i - s.cols, i + s.cols].some(n => n >= 0 && n < grid.length && adjacent(s, i, n) && grid[n]?.kind === 'choco') ? i : -1).filter(i => i >= 0);
        if (near.length) { spread = draw.pick(near); grid[spread] = { id: ids.take(), kind: 'choco', color: null }; }
    }
    next = { ...next, grid, seed: draw.seed, nextId: ids.next, finished: false };
    next.finished = done(next);
    let shuffled: Grid | null = null;
    if (!next.finished && !playable(next)) {
        shuffled = mix(next, grid, draw, ids);
        next = { ...next, grid: shuffled, seed: draw.seed, nextId: ids.next, shuffles: next.shuffles + 1 };
    }
    return { a, b, valid: true, miss: null, steps, spread, shuffled, helped, state: next };
}
/** How good a swap is for the greedy player and for the help: friends leaving and going down first, then the goals. */
export function score(before: State, r: Result): number {
    if (!r.valid) return -1;
    const level = levelOf(before.level), after = r.state, rowOf = (g: Grid, id: number): number => { const i = g.findIndex(t => t?.id === id); return i < 0 ? before.rows : Math.floor(i / before.cols); };
    let v = 0;
    for (const t of before.grid) if (t?.kind === 'ami') v += 3 * (rowOf(after.grid, t.id) - rowOf(before.grid, t.id));
    for (const g of level.goals) if (g.kind === 'pot') v += Math.min(Math.max(0, g.count - (before.pot[g.color] ?? 0)), (after.pot[g.color] ?? 0) - (before.pot[g.color] ?? 0));
    const sugar = (s: State): number => s.grid.reduce((n, t) => n + (t?.kind === 'sucre' ? t.layers ?? 1 : 0), 0), choc = (s: State): number => s.grid.filter(t => t?.kind === 'choco').length;
    v += 2 * (sugar(before) - sugar(after)) + 2 * (choc(before) - choc(after));
    v += 0.05 * r.steps.reduce((n, st) => n + st.cleared.length, 0);
    return v;
}
/** The best swap from here: what the help shows. */
export function goodSwap(s: State): [number, number] | null {
    if (s.finished) return null;
    let best: [number, number] | null = null, top = -Infinity;
    for (const m of moves(s)) { const r = swap(s, m[0], m[1])!, v = score(s, r); if (v > top + 1e-9) { top = v; best = m; } }
    return best;
}
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
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 4;
/** Cells that differ once both boards are laid over each other from the top left (a missing cell is a hole), plus two per
 * colour more or less, three per goal one scene has and the other not, one per three sweets of difference in a shared
 * jar, plus four per feature one scene has and the other not. The colours themselves do not count: a recolouring is the same scene. */
export function distance(a: LevelDef, b: LevelDef): number {
    const rows = Math.max(a.rows.length, b.rows.length), cols = Math.max(a.rows[0]!.length, b.rows[0]!.length);
    const at = (l: LevelDef, r: number, c: number): string => l.rows[r]?.[c] ?? '#';
    let d = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (at(a, r, c) !== at(b, r, c)) d++;
    d += 2 * Math.abs(a.colors.length - b.colors.length);
    const kinds = (l: LevelDef): string[] => l.goals.map(g => g.kind === 'pot' ? `pot${l.goals.filter(x => x.kind === 'pot').indexOf(g)}` : g.kind);
    const ka = kinds(a), kb = kinds(b);
    for (const k of new Set([...ka, ...kb])) {
        if (ka.includes(k) !== kb.includes(k)) { d += 3; continue; }
        const ga = a.goals[ka.indexOf(k)]!, gb = b.goals[kb.indexOf(k)]!;
        if (ga.kind === 'pot' && gb.kind === 'pot') d += Math.floor(Math.abs(ga.count - gb.count) / 3);
    }
    for (const f of features) if (has(a, f) !== has(b, f)) d += 4;
    return d;
}
