import { features, handLevels, type Feature, type LevelDef } from './levels';
export { features, type Feature, type LevelDef } from './levels';
/** « Les pépites de Lumi »: Lumi digs a garden under the ground, picks up every shining nugget, then the door of her burrow
 * opens and she goes home. Turn by turn: nothing moves until the child moves Lumi. One step is one turn of the world: Lumi
 * acts, then every rock, apple and drop of water that is no longer held up falls one cell. No crushing, no lives, no losing:
 * a rock that comes down on Lumi bounces on her hat (bonk) and rolls to a free side, or stays there, held up by her. A step
 * that does not work is a funny try that changes nothing: the hard rock goes bzzz, the rock is too heavy, the worm yawns…
 * Pure and deterministic. */
export const moves = ['haut', 'bas', 'gauche', 'droite'] as const;
export type Move = typeof moves[number];
/** Funny tries. All but `chapeau` are steps that do not happen: nothing on the board changes. `chapeau` is a rock coming
 * down on Lumi's hat during a step: bonk, it rolls to a free side or stays held up by her; nothing is lost. */
export const fails = ['racine', 'dure', 'lourd', 'ver', 'plouf', 'porte', 'chapeau'] as const;
export type Fail = typeof fails[number];
/** Funny tries in a row before the right next step pulses. */
export const TRIES_BEFORE_HELP = 3;
/** Steps without a new nugget before the right next step pulses. */
export const IDLE_BEFORE_HELP = 30;
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const width = (level: LevelDef): number => level.rows[0]!.length;
export const height = (level: LevelDef): number => level.rows.length;
export const DELTA: Readonly<Record<Move, readonly [number, number]>> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };

/** One character per cell, the same in a scene and in the state:
 *   `.` soft earth (dug as Lumi goes)   `_` an empty gallery   `#` roots (never dug)   `X` hard rock (never dug: bzzz)
 *   `o` a rock (falls, pushed sideways)   `a` an apple (falls, rolls off rocks, picked up)   `~` water (falls, runs off edges)
 *   `*` a nugget   `G` a giant nugget (two knocks: `g` once cracked)   `v` a worm (leaves when given an apple)   `P` the door
 * A scene also has `@`, where Lumi starts, on an empty gallery. */
export type Cell = '.' | '_' | '#' | 'X' | 'o' | 'a' | '~' | '*' | 'G' | 'g' | 'v' | 'P';
const OBJECTS = 'oa~';
const PERMANENT = '#XP';
const isNugget = (c: string): boolean => c === '*' || c === 'G' || c === 'g';

/** The cells of a scene at the start, `@` turned into a gallery. */
export function startGrid(level: LevelDef): string { return level.rows.join('').replace('@', '_'); }
export const startCell = (level: LevelDef): number => level.rows.join('').indexOf('@');
export const doorOf = (level: LevelDef): number => level.rows.join('').indexOf('P');
export const cellXY = (level: LevelDef, i: number): { x: number; y: number } => ({ x: i % width(level), y: Math.floor(i / width(level)) });
/** Nuggets to pick up in a scene (a giant one counts once). */
export const nuggetsOf = (level: LevelDef): number => startGrid(level).split('').filter(isNugget).length;
export const nuggetsLeft = (grid: string): number => { let n = 0; for (const c of grid) if (isNugget(c)) n++; return n; };
export const ready = (grid: string): boolean => nuggetsLeft(grid) === 0;

export interface State {
    level: number;
    /** Every cell, row by row (`y * width + x`); the cell under Lumi is always `_`. */
    grid: string;
    lumi: number;
    /** Apples Lumi carries, to give to the earthworms. */
    basket: number;
    /** Steps (funny tries included), funny tries, funny tries in a row, steps since the last nugget, helps. */
    steps: number; tries: number; dry: number; idle: number; helps: number; finished: boolean;
}
function startState(level: LevelDef): State {
    return { level: level.id, grid: startGrid(level), lumi: startCell(level), basket: 0, steps: 0, tries: 0, dry: 0, idle: 0, helps: 0, finished: false };
}
export const start = (id: number): State => startState(levelOf(id));

/** Something that moved in the turn of the world: a rock pushed or falling, an apple rolling, water running. */
export interface Moved { from: number; to: number; kind: 'o' | 'a' | '~' }
export interface Result {
    action: Move; state: State; helped: boolean;
    /** A step that did not happen, and the cell it is about. */
    fail: { kind: Exclude<Fail, 'chapeau'>; x: number; y: number } | null;
    /** A rock came down on Lumi's hat this turn: the cell above her, and the side it rolled to (0: it stays on her hat). */
    bonk: { x: number; y: number; roll: -1 | 0 | 1 } | null;
    /** Lumi dug soft earth; what she picked up; the giant nugget she cracked; the worm she fed (its cell). */
    dug: boolean; got: 'pepite' | 'geante' | 'pomme' | null; crack: boolean; fed: number | null;
    /** The rock Lumi pushed, then everything that moved in the turn of the world, in order. */
    pushed: Moved | null; moved: Moved[];
    /** An apple fell on Lumi's hat and she caught it; some water came onto her hat and splashed away (it is gone). */
    caught: boolean; splash: boolean;
}
export interface Rules { push?: boolean }

/** The turn of the world, bottom row first, left to right; each thing moves once. Lumi holds up what is on her head. */
function world(g: string[], w: number, lumi: number): { moved: Moved[]; bonk: { cell: number; roll: -1 | 0 | 1 } | null; caught: boolean; splash: boolean } {
    const moved: Moved[] = [], done = new Set<number>(), h = g.length / w;
    let bonk: { cell: number; roll: -1 | 0 | 1 } | null = null, caught = false, splash = false;
    const free = (i: number): boolean => g[i] === '_' && i !== lumi;
    for (let y = h - 1; y >= 0; y--) for (let x = 0; x < w; x++) {
        const i = y * w + x, c = g[i]!;
        if (!OBJECTS.includes(c) || done.has(i)) continue;
        const kind = c as Moved['kind'], below = y + 1 < h ? i + w : -1;
        if (below >= 0 && free(below)) {
            g[i] = '_';
            if (below + w === lumi && kind === 'a') { caught = true; moved.push({ from: i, to: below, kind }); continue; }
            let to = below;
            if (below + w === lumi && kind === 'o') {
                const side = ([-1, 1] as const).find(d => x + d >= 0 && x + d < w && free(below + d));
                if (side) to = below + side;
                bonk = { cell: below, roll: side ?? 0 };
            }
            g[to] = c; done.add(to); moved.push({ from: i, to, kind });
            continue;
        }
        if (below < 0) continue;
        const rolls = kind === 'a' ? g[below] === 'o' : kind === '~' ? !free(below) : false;
        if (!rolls) continue;
        for (const d of [-1, 1]) {
            if (x + d < 0 || x + d >= w || !free(i + d) || !free(below + d)) continue;
            g[i] = '_'; g[i + d] = c; done.add(i + d); moved.push({ from: i, to: i + d, kind });
            break;
        }
    }
    // Water on Lumi's hat at the end of the turn splashes away: water never keeps her in a hole.
    if (lumi >= w && g[lumi - w] === '~') { g[lumi - w] = '_'; splash = true; }
    return { moved, bonk, caught, splash };
}

/** One step of the child. A step that does not work is a funny try that changes nothing but the counters. `rules` switches
 * pushing off, to tell which scenes need it. */
export function step(s: State, a: Move, rules: Rules = {}): Result | null {
    if (s.finished) return null;
    const level = levelOf(s.level), w = width(level), h = height(level), helped = helpOn(s) && hint(s) === a;
    const x0 = s.lumi % w, y0 = Math.floor(s.lumi / w), [dx, dy] = DELTA[a], x = x0 + dx, y = y0 + dy;
    const miss = (kind: Exclude<Fail, 'chapeau'>): Result => ({
        action: a, helped: false, fail: { kind, x, y }, bonk: null, dug: false, got: null, crack: false, fed: null, pushed: null, moved: [], caught: false, splash: false,
        state: { ...s, steps: s.steps + 1, tries: s.tries + 1, dry: s.dry + 1, idle: s.idle + 1 }
    });
    if (x < 0 || y < 0 || x >= w || y >= h) return miss('racine');
    const t = y * w + x, c = s.grid[t]!, g = s.grid.split('');
    let lumi = s.lumi, basket = s.basket, dug = false, got: Result['got'] = null, crack = false, fed: number | null = null, pushed: Moved | null = null;
    switch (c) {
        case '#': return miss('racine');
        case 'X': return miss('dure');
        case '~': return miss('plouf');
        case 'P': {
            if (!ready(s.grid)) return miss('porte');
            return { action: a, helped, fail: null, bonk: null, dug: false, got: null, crack: false, fed: null, pushed: null, moved: [], caught: false, splash: false,
                state: { ...s, lumi: t, steps: s.steps + 1, dry: 0, idle: s.idle + 1, helps: s.helps + (helped ? 1 : 0), finished: true } };
        }
        case 'v':
            if (basket === 0) return miss('ver');
            basket--; g[t] = '_'; fed = t; break;
        case 'o': {
            const b = t + dx;
            if (dy !== 0 || rules.push === false || x + dx < 0 || x + dx >= w || g[b] !== '_') return miss('lourd');
            g[b] = 'o'; g[t] = '_'; lumi = t; pushed = { from: t, to: b, kind: 'o' }; break;
        }
        case 'G': g[t] = 'g'; crack = true; break;
        case 'g': g[t] = '_'; lumi = t; got = 'geante'; break;
        case '*': g[t] = '_'; lumi = t; got = 'pepite'; break;
        case 'a': g[t] = '_'; lumi = t; basket++; got = 'pomme'; break;
        case '.': g[t] = '_'; lumi = t; dug = true; break;
        default: lumi = t;
    }
    const turn = world(g, w, lumi);
    if (turn.caught) basket++;
    const nugget = got === 'pepite' || got === 'geante';
    const bonk = turn.bonk ? { x: turn.bonk.cell % w, y: Math.floor(turn.bonk.cell / w), roll: turn.bonk.roll } : null;
    return {
        action: a, helped, fail: null, bonk, dug, got, crack, fed, pushed, moved: turn.moved, caught: turn.caught, splash: turn.splash,
        state: { ...s, grid: g.join(''), lumi, basket, steps: s.steps + 1, tries: s.tries + (bonk ? 1 : 0), dry: bonk ? s.dry + 1 : 0, idle: nugget ? 0 : s.idle + 1, helps: s.helps + (helped ? 1 : 0), finished: false }
    };
}

/** The cells a rock, an apple or some water could ever reach from where they are, whatever Lumi digs: down through anything
 * that is not roots, hard rock or the door; sideways only the way each one can go there (a rock pushed by Lumi standing on
 * its other side, or rolling off her hat after a fall; an apple rolling off a rock; water running off an edge). Soft earth
 * anywhere else can never hold anything up nor be in the way of anything, so whether it is dug or not changes nothing that
 * can happen: the key of a state writes it as a gallery. */
function reach(grid: string, w: number): boolean[] {
    const n = grid.length, out = new Array<boolean>(n).fill(false);
    const open = (j: number): boolean => j >= 0 && j < n && !PERMANENT.includes(grid[j]!);
    // Rocks first: an apple only rolls off a cell a rock can be in. A node is a cell and whether the thing came there by
    // falling (only then can a rock bounce off Lumi's hat).
    let rocks = new Array<boolean>(n).fill(false);
    for (const kind of 'oa~') {
        const seen = new Set<number>(), queue: number[] = [];
        const visit = (i: number, fell: number): void => { const k = i * 2 + fell; if (!seen.has(k)) { seen.add(k); out[i] = true; queue.push(k); } };
        for (let i = 0; i < n; i++) if (grid[i] === kind) visit(i, 0);
        for (let q = 0; q < queue.length; q++) {
            const fell = queue[q]! % 2, i = queue[q]! >> 1, x = i % w;
            if (open(i + w)) visit(i + w, 1);
            for (const d of [-1, 1]) {
                if (x + d < 0 || x + d >= w || !open(i + d)) continue;
                const ok = kind === 'o' ? x - d >= 0 && x - d < w && open(i - d) || fell === 1 && open(i + w)
                    : kind === 'a' ? i + w < n && rocks[i + w]! && open(i + w + d) : i + w < n && open(i + w + d);
                if (ok) visit(i + d, 0);
            }
        }
        if (kind === 'o') rocks = [...out];
    }
    return out;
}
type Node = Pick<State, 'level' | 'grid' | 'lumi' | 'basket'>;
export function keyOf(n: Node): string {
    const w = width(levelOf(n.level)), r = reach(n.grid, w);
    let g = '';
    for (let i = 0; i < n.grid.length; i++) g += n.grid[i] === '.' && !r[i] ? '_' : n.grid[i]!;
    return `${n.lumi}|${n.basket}|${g}`;
}
const bare = (s: State): State => ({ ...s, steps: 0, tries: 0, dry: 0, idle: 0, helps: 0 });
/** Every state Lumi can reach from `from` with steps that happen (a bonk is one of them): the game as a graph. */
export function explore(from: State, limit = Infinity): { nodes: Map<string, { state: State; next: { action: Move; key: string }[] }>; start: string; goals: Set<string> } {
    const nodes = new Map<string, { state: State; next: { action: Move; key: string }[] }>(), goals = new Set<string>();
    const first = bare(from), startKey = keyOf(first), queue: State[] = [first];
    nodes.set(startKey, { state: first, next: [] });
    if (from.finished) goals.add(startKey);
    for (let i = 0; i < queue.length && nodes.size <= limit; i++) {
        const s = queue[i]!, here = nodes.get(keyOf(s))!;
        if (s.finished) continue;
        for (const a of moves) {
            const r = step(s, a);
            if (!r || r.fail) continue;
            const k = keyOf(r.state);
            here.next.push({ action: a, key: k });
            if (!nodes.has(k)) { const n = bare(r.state); nodes.set(k, { state: n, next: [] }); queue.push(n); if (n.finished) goals.add(k); }
        }
    }
    return { nodes, start: startKey, goals };
}
/** The shortest way from `s` to the door, as a list of steps; null when there is none. */
export function solve(s: State, rules: Rules = {}): Move[] | null {
    if (s.finished) return [];
    const first = bare(s), seen = new Map<string, { from: string | null; action: Move | null }>(), queue: State[] = [first];
    seen.set(keyOf(first), { from: null, action: null });
    for (let i = 0; i < queue.length; i++) {
        const cur = queue[i]!, ck = keyOf(cur);
        for (const a of moves) {
            const r = step(cur, a, rules);
            if (!r || r.fail) continue;
            const k = keyOf(r.state);
            if (seen.has(k)) continue;
            seen.set(k, { from: ck, action: a });
            if (r.state.finished) {
                const path: Move[] = [];
                for (let at: string | null = k; at !== null && seen.get(at)!.action; at = seen.get(at)!.from) path.unshift(seen.get(at)!.action!);
                return path;
            }
            queue.push(bare(r.state));
        }
    }
    return null;
}
export const helpOn = (s: State): boolean => !s.finished && (s.dry >= TRIES_BEFORE_HELP || s.idle >= IDLE_BEFORE_HELP);
const hintCache = new Map<string, Move | null>();
/** The right next step: the first of a shortest way to the door. */
export function hint(s: State): Move | null {
    const k = `${s.level}:${keyOf(s)}`;
    if (!hintCache.has(k)) { if (hintCache.size > 5000) hintCache.clear(); hintCache.set(k, solve(s)?.[0] ?? null); }
    return hintCache.get(k)!;
}
/** The free « back » button: the garden of the step before, the counters of now (a help stays a help). */
export function undo(before: State, now: State): State {
    return { ...before, steps: now.steps, tries: now.tries, dry: 0, idle: now.idle, helps: now.helps, finished: false };
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

const featureCache = new Map<number, Feature[]>();
/** The new things a scene uses. `pousser` is there when the scene cannot be finished without pushing a rock. */
export function featuresOf(level: LevelDef): Feature[] {
    const known = featureCache.get(level.id);
    if (known && levels[level.id - 1] === level) return known;
    const all = level.rows.join('');
    const has: Record<Feature, boolean> = {
        rocher: all.includes('o'), pousser: all.includes('o') && solve(startState(level), { push: false }) === null, pomme: all.includes('a'),
        dure: all.includes('X'), eau: all.includes('~'), ver: all.includes('v'), geante: all.includes('G')
    };
    const out = features.filter(f => has[f]);
    if (levels[level.id - 1] === level) featureCache.set(level.id, out);
    return out;
}
/** What a new thing needs to be shown at all: pushing needs a rock, the apple rolls on rocks, the worm wants an apple. */
export const NEEDS: Readonly<Partial<Record<Feature, readonly Feature[]>>> = { pousser: ['rocher'], pomme: ['rocher'], ver: ['pomme', 'rocher'] };
export const rocksOf = (level: LevelDef): number => level.rows.join('').split('').filter(c => c === 'o').length;

/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], w = width(level), h = height(level), all = level.rows.join('');
    if (w < 3 || w > 7) out.push('three to seven columns');
    if (h < 3 || h > 9) out.push('three to nine rows');
    if (level.rows.some(r => r.length !== w)) out.push('rows of the same length');
    for (const ch of all) if (!/^[._#Xoa~*GvP@]$/.test(ch)) out.push(`unknown cell ${ch}`);
    if (all.split('').filter(c => c === '@').length !== 1) out.push('one Lumi');
    if (all.split('').filter(c => c === 'P').length !== 1) out.push('one door');
    if (nuggetsOf(level) < 1) out.push('a nugget to pick up');
    if (nuggetsOf(level) > 6) out.push('at most six nuggets');
    if (level.title.fr.length > 32 || level.title.en.length > 32) out.push('a short title');
    // Nothing hangs in the air at the start: the scene opens still.
    const g = startGrid(level).split(''), before = g.join('');
    world(g, w, startCell(level));
    if (g.join('') !== before) out.push('nothing falls before the first step');
    return out;
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 8;
/** How far apart two scenes are: the boards laid over each other from the top left corner, one per cell that differs (Lumi
 * and the door included), two per row or column more or less, three per new thing one has and not the other. */
export function distance(a: LevelDef, b: LevelDef): number {
    const wa = width(a), wb = width(b), ha = height(a), hb = height(b);
    let d = 2 * Math.abs(wa - wb) + 2 * Math.abs(ha - hb);
    for (let y = 0; y < Math.min(ha, hb); y++) for (let x = 0; x < Math.min(wa, wb); x++) if (a.rows[y]![x] !== b.rows[y]![x]) d++;
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d;
}
