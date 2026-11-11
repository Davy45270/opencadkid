import { features, friendKinds, handLevels, TREASURE_LETTERS, type Feature, type Friend, type LevelDef, type Treasure } from './levels';
export { features, friendKinds, treasureKinds, type Feature, type Friend, type FriendKind, type LevelDef, type Treasure } from './levels';
/** « Les surprises de Tutu »: Tutu walks a little yard full of cartons, one cell a gesture. He puts down a confetti box that
 * counts « 3, 2, 1 », one count per gesture of the child (a step, putting a box down, or « wait »), then goes pouf: confetti
 * fly out in a cross and open the cartons they touch. Some cartons hide a treasure (apples, a kitten, balloons, a teddy
 * bear); once every treasure is found, the yard has a party. No bomb, no fire, no rival, no clock, no lives, nothing to
 * lose: the box always comes back into Tutu's pocket, a treasure is never damaged, and confetti on Tutu only make him
 * sneeze. A gesture that cannot happen (a wall, a carton, the flowers, a box in the way, an empty pocket) is a funny try
 * that changes nothing; a pouf has its own funny reactions (a sneeze, a clown in an empty carton, confetti bouncing off the
 * bricks, a friend dancing, a damp little « pfff » when the cross touches no carton). Pure and deterministic. */
export const moves = ['haut', 'bas', 'gauche', 'droite'] as const;
export type Move = typeof moves[number];
export const actions = [...moves, 'poser', 'attendre'] as const;
export type Action = typeof actions[number];
/** Funny tries: a gesture that does not happen; nothing in the yard changes, the boxes and the friends wait. */
export const fails = ['grimace', 'carton', 'fleurs', 'boite', 'poche'] as const;
export type Fail = typeof fails[number];
/** Funny reactions of a pouf: the yard changes as the pouf says, nothing is ever lost. */
export const reactions = ['eternue', 'coucou', 'rebond', 'danse', 'pfff'] as const;
export type Reaction = typeof reactions[number];
/** Every funny thing, each with its own animation. */
export const funnies: readonly (Fail | Reaction)[] = [...fails, ...reactions];
/** A box shows 3, then 2, then 1, then goes pouf: three gestures after the one that put it down. */
export const COUNTDOWN = 3;
/** Confetti fly this many cells each way; every big box picked up adds one, up to `MAX_RANGE`. */
export const BASE_RANGE = 2;
export const MAX_RANGE = 4;
/** Boxes in the pocket at the start; every « one box more » adds one, up to `MAX_BOXES`. */
export const MAX_BOXES = 3;
/** Poufs in a row that find no treasure before the best cell to put the box down shines. */
export const POUFS_BEFORE_HELP = 3;
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const width = (level: LevelDef): number => level.rows[0]!.length;
export const height = (level: LevelDef): number => level.rows.length;
export const DELTA: Readonly<Record<Move, readonly [number, number]>> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
const LETTER: Readonly<Record<string, Move>> = { h: 'haut', b: 'bas', g: 'gauche', d: 'droite' };
export const FANS: Readonly<Record<string, Move>> = { '→': 'droite', '←': 'gauche', '↑': 'haut', '↓': 'bas' };

/** One character per cell, the same in a scene and in the state (see levels.ts); an opened carton becomes the yard `.`, a
 * double carton touched once becomes the single carton of its letter, a bonus picked up becomes the yard. */
export const isCarton = (c: string | undefined): boolean => c !== undefined && /^[cpkboCPKBO]$/.test(c);
export const isDouble = (c: string | undefined): boolean => c !== undefined && /^[CPKBO]$/.test(c);
export const treasureIn = (c: string | undefined): Treasure | null => (c !== undefined && TREASURE_LETTERS[c.toLowerCase()]) || null;
/** Where Tutu may stand: the yard, a bonus, a fan. */
export const walkable = (c: string | undefined): boolean => c === '.' || c === 'g' || c === 'm' || (c !== undefined && c in FANS);

export function startGrid(level: LevelDef): string { return level.rows.join('').replace('@', '.'); }
export const startCell = (level: LevelDef): { x: number; y: number } => { const i = level.rows.join('').indexOf('@'); return { x: i % width(level), y: Math.floor(i / width(level)) }; };
/** Treasures still hidden in a grid. */
export const treasuresLeft = (grid: string): number => { let n = 0; for (const c of grid) if (treasureIn(c)) n++; return n; };
export const treasuresOf = (level: LevelDef): Treasure[] => startGrid(level).split('').map(treasureIn).filter((t): t is Treasure => t !== null);
export const cartonsOf = (level: LevelDef): number => startGrid(level).split('').filter(isCarton).length;

/** The cells of a friend's round, from where it starts; it comes back there after the last one. */
export function roundOf(level: LevelDef, f: Friend): { x: number; y: number }[] {
    const out = [{ x: f.x, y: f.y }];
    let x = f.x, y = f.y;
    for (const ch of f.route.slice(0, -1)) { const [dx, dy] = DELTA[LETTER[ch]!]; x += dx; y += dy; out.push({ x, y }); }
    return out;
}
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
/** After this many gestures, every friend is back where it started. */
export const periodOf = (level: LevelDef): number => level.friends.reduce((p, f) => p / gcd(p, f.route.length) * f.route.length, 1);
const roundCache = new WeakMap<LevelDef, { x: number; y: number }[][]>();
const rounds = (level: LevelDef): { x: number; y: number }[][] => { let r = roundCache.get(level); if (!r) { r = level.friends.map(f => roundOf(level, f)); roundCache.set(level, r); } return r; };
/** Where every friend is at clock `t`. Friends walk through Tutu and the boxes: nobody is ever in anybody's way. */
export const friendsAt = (level: LevelDef, t: number): { x: number; y: number }[] => rounds(level).map(r => r[t % r.length]!);

/** A confetti box on the yard: where it stands and what it shows (3, 2, 1). */
export interface Box { x: number; y: number; count: number }
export interface State {
    level: number;
    /** Every cell, row by row (`y * width + x`). */
    grid: string;
    x: number; y: number;
    boxes: readonly Box[];
    /** How far the confetti fly, how many boxes the pocket holds. */
    range: number; capacity: number;
    /** The clock of the friends: gestures that happened. */
    t: number;
    /** Treasures found, in the order they came out. */
    found: readonly Treasure[];
    /** Gestures (funny tries included), funny tries, poufs in a row without a treasure, helps taken. */
    steps: number; tries: number; dry: number; helps: number; finished: boolean;
}
function startState(level: LevelDef): State {
    const s = startCell(level);
    return { level: level.id, grid: startGrid(level), x: s.x, y: s.y, boxes: [], range: BASE_RANGE, capacity: 1, t: 0, found: [], steps: 0, tries: 0, dry: 0, helps: 0, finished: false };
}
export const start = (id: number): State => startState(levelOf(id));

/** What a pouf did: the cells the confetti covered (the box's own cell first), the cartons touched (`opened` when it came
 * open, with what it hid), the bricks the confetti bounced on, the friends who danced, whether Tutu was in it, and
 * `pfff` when the cross touched no carton at all (then nothing flies out). */
export interface Pouf {
    x: number; y: number; cells: { x: number; y: number }[];
    hits: { x: number; y: number; opened: boolean; treasure: Treasure | null }[];
    bricks: { x: number; y: number }[]; friends: number[]; tutu: boolean; pfff: boolean;
}
/** The cells a box at x, y would cover with the grid as it is, and what stops each arm. */
export function cross(level: LevelDef, grid: string, x: number, y: number, range: number): { cells: { x: number; y: number }[]; cartons: { x: number; y: number }[]; bricks: { x: number; y: number }[] } {
    const w = width(level), h = height(level), cells = [{ x, y }], cartons: { x: number; y: number }[] = [], bricks: { x: number; y: number }[] = [];
    for (const m of moves) {
        const [dx, dy] = DELTA[m];
        for (let k = 1; k <= range; k++) {
            const cx = x + dx * k, cy = y + dy * k;
            if (cx < 0 || cy < 0 || cx >= w || cy >= h) break;
            const c = grid[cy * w + cx];
            if (c === '#') { bricks.push({ x: cx, y: cy }); break; }
            if (isCarton(c)) { cartons.push({ x: cx, y: cy }); break; }
            cells.push({ x: cx, y: cy });
        }
    }
    return { cells, cartons, bricks };
}
/** Where a box put down on x, y ends up: a fan blows it one cell, onto the yard or a flower bed, when nothing is there. */
export function landing(level: LevelDef, grid: string, boxes: readonly Box[], x: number, y: number): { x: number; y: number; blown: boolean } {
    const w = width(level), h = height(level), fan = FANS[grid[y * w + x]!];
    if (!fan) return { x, y, blown: false };
    const nx = x + DELTA[fan][0], ny = y + DELTA[fan][1], c = grid[ny * w + nx];
    if (nx < 0 || ny < 0 || nx >= w || ny >= h || (c !== '.' && c !== '*') || boxes.some(b => b.x === nx && b.y === ny)) return { x, y, blown: false };
    return { x: nx, y: ny, blown: true };
}

export interface Result {
    action: Action; state: State; helped: boolean;
    /** A gesture that did not happen, and the cell it is about. */
    fail: { kind: Fail; x: number; y: number } | null;
    /** A bonus Tutu picked up on his new cell. */
    picked: 'g' | 'm' | null;
    /** The box put down: where Tutu stood, and where it landed (a fan may blow it one cell). */
    placed: { x: number; y: number; to: { x: number; y: number }; blown: boolean } | null;
    /** The poufs of this gesture, in the order the boxes were put down. */
    poufs: Pouf[];
    /** Treasures found by this gesture, and every funny reaction of its poufs. */
    found: Treasure[]; reactions: Reaction[];
}
const boxAt = (boxes: readonly Box[], x: number, y: number): boolean => boxes.some(b => b.x === x && b.y === y);

/** One gesture of the child. A funny try changes nothing but the counters; any other gesture makes the boxes count down
 * once and the friends take a step. */
export function step(s: State, a: Action): Result | null {
    if (s.finished) return null;
    const level = levelOf(s.level), w = width(level), h = height(level);
    const miss = (kind: Fail, x: number, y: number): Result => ({
        action: a, helped: false, fail: { kind, x, y }, picked: null, placed: null, poufs: [], found: [], reactions: [],
        state: { ...s, steps: s.steps + 1, tries: s.tries + 1 }
    });
    const g = s.grid.split('');
    let x = s.x, y = s.y, range = s.range, capacity = s.capacity, picked: Result['picked'] = null, placed: Result['placed'] = null, helped = false;
    let boxes = s.boxes.map(b => ({ ...b, count: b.count - 1 }));
    if (a === 'poser') {
        if (boxAt(s.boxes, x, y)) return miss('boite', x, y);
        if (s.boxes.length >= s.capacity) return miss('poche', x, y);
        const to = landing(level, s.grid, s.boxes, x, y);
        helped = helpOn(s) && hint(s)?.kind === 'poser' && hint(s)!.x === x && hint(s)!.y === y;
        placed = { x, y, to: { x: to.x, y: to.y }, blown: to.blown };
        boxes.push({ x: to.x, y: to.y, count: COUNTDOWN });
    } else if (a !== 'attendre') {
        const [dx, dy] = DELTA[a], nx = x + dx, ny = y + dy, c = g[ny * w + nx];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || c === '#') return miss('grimace', nx, ny);
        if (c === '*') return miss('fleurs', nx, ny);
        if (isCarton(c)) return miss('carton', nx, ny);
        if (boxAt(s.boxes, nx, ny)) return miss('boite', nx, ny);
        x = nx; y = ny;
        if (c === 'g' || c === 'm') {
            helped = helpOn(s) && hint(s)?.kind === 'prendre' && hint(s)!.x === x && hint(s)!.y === y;
            picked = c; g[ny * w + nx] = '.';
            if (c === 'g') range = Math.min(MAX_RANGE, range + 1); else capacity = Math.min(MAX_BOXES, capacity + 1);
        }
    }
    const t = (s.t + 1) % periodOf(level), pals = friendsAt(level, t);
    const poufs: Pouf[] = [], found: Treasure[] = [];
    let dry = helped ? 0 : s.dry;
    for (const b of boxes.filter(b => b.count <= 0)) {
        const grid = g.join(''), c = cross(level, grid, b.x, b.y, range);
        if (!c.cartons.length) { poufs.push({ x: b.x, y: b.y, cells: [{ x: b.x, y: b.y }], hits: [], bricks: [], friends: [], tutu: false, pfff: true }); dry++; continue; }
        const hits = c.cartons.map(p => {
            const i = p.y * w + p.x, ch = g[i]!, treasure = treasureIn(ch);
            if (isDouble(ch)) { g[i] = ch.toLowerCase(); return { ...p, opened: false, treasure }; }
            g[i] = '.'; if (treasure) found.push(treasure);
            return { ...p, opened: true, treasure };
        });
        const on = (p: { x: number; y: number }): boolean => c.cells.some(q => q.x === p.x && q.y === p.y);
        poufs.push({ x: b.x, y: b.y, cells: c.cells, hits, bricks: c.bricks, friends: pals.flatMap((p, i) => on(p) ? [i] : []), tutu: on({ x, y }), pfff: false });
        dry = hits.some(p => p.treasure) ? 0 : dry + 1;
    }
    boxes = boxes.filter(b => b.count > 0);
    const out: Reaction[] = [];
    const add = (r: Reaction, yes: boolean): void => { if (yes && !out.includes(r)) out.push(r); };
    for (const p of poufs) {
        add('pfff', p.pfff); add('coucou', p.hits.some(q => q.opened && !q.treasure)); add('rebond', p.bricks.length > 0);
        add('danse', p.friends.length > 0); add('eternue', p.tutu);
    }
    const grid = g.join('');
    return {
        action: a, helped, fail: null, picked, placed, poufs, found, reactions: out,
        state: { ...s, grid, x, y, boxes, range, capacity, t, found: [...s.found, ...found], steps: s.steps + 1, dry, helps: s.helps + (helped ? 1 : 0), finished: treasuresLeft(grid) === 0 }
    };
}

/** What the greedy plan aims at next: the nearest cell (in steps) where a box finds a treasure; failing that, the nearest
 * bonus; failing that, the nearest cell where a box opens any carton (to clear the way). `way` is the walk there. */
export interface Plan { kind: 'poser' | 'prendre'; x: number; y: number; way: Move[] }
export function plan(s: State): Plan | null {
    if (s.finished) return null;
    const level = levelOf(s.level), w = width(level), h = height(level);
    const from = new Map<number, { prev: number; move: Move | null }>(), queue = [s.y * w + s.x];
    from.set(queue[0]!, { prev: -1, move: null });
    for (let i = 0; i < queue.length; i++) {
        const at = queue[i]!, ax = at % w, ay = Math.floor(at / w);
        for (const m of moves) {
            const nx = ax + DELTA[m][0], ny = ay + DELTA[m][1], n = ny * w + nx;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || from.has(n) || !walkable(s.grid[n]) || boxAt(s.boxes, nx, ny)) continue;
            from.set(n, { prev: at, move: m }); queue.push(n);
        }
    }
    const way = (cell: number): Move[] => { const out: Move[] = []; for (let c = cell; from.get(c)!.move; c = from.get(c)!.prev) out.unshift(from.get(c)!.move!); return out; };
    let anyCarton = -1, bonus = -1;
    for (const cell of queue) {
        const x = cell % w, y = Math.floor(cell / w);
        if (bonus < 0 && (s.grid[cell] === 'g' && s.range < MAX_RANGE || s.grid[cell] === 'm' && s.capacity < MAX_BOXES)) bonus = cell;
        if (boxAt(s.boxes, x, y)) continue;
        const to = landing(level, s.grid, s.boxes, x, y), c = cross(level, s.grid, to.x, to.y, s.range);
        if (c.cartons.some(p => treasureIn(s.grid[p.y * w + p.x]))) return { kind: 'poser', x, y, way: way(cell) };
        if (anyCarton < 0 && c.cartons.length) anyCarton = cell;
    }
    if (bonus >= 0) return { kind: 'prendre', x: bonus % w, y: Math.floor(bonus / w), way: way(bonus) };
    if (anyCarton >= 0) return { kind: 'poser', x: anyCarton % w, y: Math.floor(anyCarton / w), way: way(anyCarton) };
    return null;
}
/** The next gesture of the greedy player: walk to the planned cell, put the box down, wait for its pouf. */
export function greedyAction(s: State): Action | null {
    if (s.finished) return null;
    if (s.boxes.length >= s.capacity) return 'attendre';
    const p = plan(s);
    if (!p) return s.boxes.length ? 'attendre' : null;
    if (p.way.length) return p.way[0]!;
    return p.kind === 'poser' ? 'poser' : 'attendre';
}
export const helpOn = (s: State): boolean => !s.finished && s.dry >= POUFS_BEFORE_HELP;
const hintCache = new Map<string, Plan | null>();
const keyOf = (s: State): string => `${s.level}|${s.x},${s.y}|${s.range},${s.capacity}|${s.boxes.map(b => `${b.x},${b.y},${b.count}`).join(';')}|${s.grid}`;
/** The cell that shines once the help is on: where to put the box down (or the bonus to pick up). */
export function hint(s: State): Plan | null {
    const k = keyOf(s);
    if (!hintCache.has(k)) { if (hintCache.size > 5000) hintCache.clear(); hintCache.set(k, plan(s)); }
    return hintCache.get(k)!;
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

/** The new things a scene uses. */
export function featuresOf(level: LevelDef): Feature[] {
    const all = startGrid(level);
    const has: Record<Feature, boolean> = {
        mur: all.includes('#'), double: /[CPKBO]/.test(all), fleurs: all.includes('*'), grande: all.includes('g'),
        ami: level.friends.length > 0, ventilo: /[→←↑↓]/.test(all), boites: all.includes('m')
    };
    return features.filter(f => has[f]);
}
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], w = width(level), h = height(level), all = level.rows.join(''), count = (c: string): number => all.split(c).length - 1;
    // Seven columns at most: cells stay wider than 44 px on a 320 px wide phone, with the hedge around.
    if (w < 4 || w > 7) out.push('four to seven columns');
    if (h < 4 || h > 9) out.push('four to nine rows');
    if (level.rows.some(r => r.length !== w)) out.push('rows of the same length');
    for (const ch of all) if (!/^[.#*@gmcpkboCPKBO→←↑↓]$/u.test(ch)) out.push(`unknown cell ${ch}`);
    if (count('@') !== 1) out.push('one Tutu');
    const t = treasuresOf(level).length;
    if (t < 1 || t > 6) out.push('one to six treasures');
    if (cartonsOf(level) > 16) out.push('sixteen cartons at most');
    if (count('g') > 2 || count('m') > 2) out.push('two bonuses of a kind at most');
    if (level.friends.length > 2) out.push('two friends at most');
    const g = startGrid(level);
    for (const [i, f] of level.friends.entries()) {
        if (!/^[hbgd]{2,12}$/.test(f.route)) { out.push(`friend ${i}: a round of 2 to 12 steps`); continue; }
        let x = f.x, y = f.y;
        const cells = [[x, y]];
        for (const ch of f.route) { const [dx, dy] = DELTA[LETTER[ch]!]; x += dx; y += dy; cells.push([x, y]); }
        if (x !== f.x || y !== f.y) out.push(`friend ${i}: a round comes back where it starts`);
        if (cells.some(([cx, cy]) => cx! < 0 || cy! < 0 || cx! >= w || cy! >= h || g[cy! * w + cx!] !== '.')) out.push(`friend ${i}: walks on the yard`);
    }
    if (periodOf(level) > 24) out.push('the friends are all back within 24 gestures');
    if (level.title.fr.length > 28 || level.title.en.length > 28) out.push('a short title');
    return out;
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts. Measured: 7 (scenes 1 and 2). */
export const MIN_GAP = 7;
const drawn = (l: LevelDef): string[] => {
    const rows = l.rows.map(r => r.split(''));
    for (const f of l.friends) rows[f.y]![f.x] = f.kind[0]!.toUpperCase();
    return rows.map(r => r.join(''));
};
/** How far apart two scenes are: the yards (friends on their first cell) laid over each other from the top left corner, one
 * per cell that differs, two per row or column more or less, three per new thing one has and not the other, one per step
 * of a friend's round that differs. */
export function distance(a: LevelDef, b: LevelDef): number {
    const wa = width(a), wb = width(b), ha = height(a), hb = height(b), ra = drawn(a), rb = drawn(b);
    let d = 2 * Math.abs(wa - wb) + 2 * Math.abs(ha - hb);
    for (let y = 0; y < Math.min(ha, hb); y++) for (let x = 0; x < Math.min(wa, wb); x++) if (ra[y]![x] !== rb[y]![x]) d++;
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    for (const k of friendKinds) {
        const x = a.friends.find(f => f.kind === k)?.route ?? '', y = b.friends.find(f => f.kind === k)?.route ?? '';
        for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) d++;
    }
    return d;
}
