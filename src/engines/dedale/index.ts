import { features, friendKinds, handLevels, type Feature, type Friend, type FriendKind, type LevelDef } from './levels';
export { features, friendKinds, type Feature, type Friend, type FriendKind, type LevelDef } from './levels';
/** « Le jardin de Boubou »: Boubou walks a little maze of flowering hedges and picks up every seed; once the last one is
 * picked, the flowers grow all at once and the scene is over. Turn by turn: nothing moves until the child moves Boubou. One
 * step of Boubou is one step of the world: every friend (a butterfly, a hedgehog, a ladybird) takes one step along its fixed
 * round, drawn in dots. No chasers, no clock, no lives, nothing to lose: walking into a friend is a funny try (a sneeze, a
 * hug, a tickle), and so is bumping into a hedge, a puddle, the stream or a closed gate. A funny try changes nothing.
 * A sun makes the friends dance (they stop for a few steps) and each one gives a bonus seed. Pure and deterministic. */
export const moves = ['haut', 'bas', 'gauche', 'droite'] as const;
export type Move = typeof moves[number];
/** Funny tries. Every one is a step that does not happen: nothing in the garden changes, the friends wait. */
export const fails = ['haie', 'flaque', 'ruisseau', 'porte', 'papillon', 'herisson', 'coccinelle'] as const;
export type Fail = typeof fails[number];
/** Funny tries in a row before the way to the nearest seed pulses. */
export const TRIES_BEFORE_HELP = 3;
/** Steps without a new seed before the way to the nearest seed pulses. */
export const IDLE_BEFORE_HELP = 25;
/** Steps the friends dance (and stand still) after Boubou picks up a sun. */
export const DANCE = 4;
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const width = (level: LevelDef): number => level.rows[0]!.length;
export const height = (level: LevelDef): number => level.rows.length;
export const DELTA: Readonly<Record<Move, readonly [number, number]>> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
const LETTER: Readonly<Record<string, Move>> = { h: 'haut', b: 'bas', g: 'gauche', d: 'droite' };

/** One character per cell, the same in a scene and in the state:
 *   `.` a path   `#` a hedge   `*` a seed   `S` a sun   `k` the key flower   `D` a closed garden gate (opened by the key)
 *   `o` a puddle   `~` the stream   `-` a bridge crossed left-right   `|` a bridge crossed up-down   `=` a tunnel mouth
 *   (on an edge: it comes out at the mouth on the other edge)   `f` a carpet of leaves (Boubou slides across it)
 * A scene also has `@`, where Boubou starts, on a path. */
export type Cell = '.' | '#' | '*' | 'S' | 'k' | 'D' | 'o' | '~' | '-' | '|' | '=' | 'f';
const isGoal = (c: string): boolean => c === '*' || c === 'S';
/** Where a friend may walk. */
const FRIEND_GROUND = '.*Sk-|=f';

export function startGrid(level: LevelDef): string { return level.rows.join('').replace('@', '.'); }
export const startCell = (level: LevelDef): number => level.rows.join('').indexOf('@');
export const cellXY = (level: LevelDef, i: number): { x: number; y: number } => ({ x: i % width(level), y: Math.floor(i / width(level)) });
/** Seeds and suns to pick up in a scene. */
export const goalsOf = (level: LevelDef): number => startGrid(level).split('').filter(isGoal).length;
export const goalsLeft = (grid: string): number => { let n = 0; for (const c of grid) if (isGoal(c)) n++; return n; };

/** The cells of a friend's round, from where it starts; it comes back there after the last one. */
export function roundOf(level: LevelDef, f: Friend): number[] {
    const w = width(level), out = [f.y * w + f.x];
    let x = f.x, y = f.y;
    for (const ch of f.route.slice(0, -1)) { const [dx, dy] = DELTA[LETTER[ch]!]; x += dx; y += dy; out.push(y * w + x); }
    return out;
}
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
/** After this many world steps, every friend is back where it started. */
export const periodOf = (level: LevelDef): number => level.friends.reduce((p, f) => p / gcd(p, f.route.length) * f.route.length, 1);
const roundCache = new WeakMap<LevelDef, number[][]>();
const rounds = (level: LevelDef): number[][] => { let r = roundCache.get(level); if (!r) { r = level.friends.map(f => roundOf(level, f)); roundCache.set(level, r); } return r; };
/** Where every friend is at world clock `t`. */
export const friendsAt = (level: LevelDef, t: number): number[] => rounds(level).map(r => r[t % r.length]!);

export interface State {
    level: number;
    /** Every cell, row by row (`y * width + x`); picked seeds, suns and the key become paths, gates open with the key. */
    grid: string;
    boubou: number;
    /** The clock of the friends (world steps taken, dances left out), and the dance steps left. */
    t: number; dance: number;
    /** Bonus seeds the friends gave. */
    bonus: number;
    /** Steps (funny tries included), funny tries, funny tries in a row, steps since the last seed, helps. */
    steps: number; tries: number; dry: number; idle: number; helps: number; finished: boolean;
}
function startState(level: LevelDef): State {
    return { level: level.id, grid: startGrid(level), boubou: startCell(level), t: 0, dance: 0, bonus: 0, steps: 0, tries: 0, dry: 0, idle: 0, helps: 0, finished: false };
}
export const start = (id: number): State => startState(levelOf(id));

export interface Result {
    action: Move; state: State; helped: boolean;
    /** A step that did not happen, and the cell it is about. */
    fail: { kind: Fail; x: number; y: number } | null;
    /** The cells Boubou went through, in order (more than one when he slid on leaves or went through the tunnel). */
    path: number[];
    /** What he picked up on the way, in order. */
    got: { cell: number; kind: 'graine' | 'soleil' | 'cle' }[];
    /** He came out of the tunnel on the other side; he slid on leaves; the gates opened. */
    tunnel: boolean; slid: boolean; opened: boolean;
    /** The friends started dancing (a sun): each gives a bonus seed. */
    danced: boolean;
}

/** Where a step from `from` towards `a` leads, before the friends: the next cell, or a funny try. Tunnels wrap. */
function next(level: LevelDef, grid: string, from: number, a: Move): { to: number; tunnel: boolean } | { fail: Fail; x: number; y: number } {
    const w = width(level), h = height(level), [dx, dy] = DELTA[a], x0 = from % w, y0 = Math.floor(from / w);
    const across = (c: string): boolean => c === '-' && dy !== 0 || c === '|' && dx !== 0;
    if (across(grid[from]!)) return { fail: 'ruisseau', x: x0 + dx, y: y0 + dy };
    let x = x0 + dx, y = y0 + dy, tunnel = false;
    if (x < 0 || y < 0 || x >= w || y >= h) {
        const wx = (x + w) % w, wy = (y + h) % h;
        if (grid[from] !== '=' || grid[wy * w + wx] !== '=') return { fail: 'haie', x, y };
        x = wx; y = wy; tunnel = true;
    }
    const to = y * w + x, c = grid[to]!;
    if (c === '#') return { fail: 'haie', x, y };
    if (c === 'o') return { fail: 'flaque', x, y };
    if (c === '~' || across(c)) return { fail: 'ruisseau', x, y };
    if (c === 'D') return { fail: 'porte', x, y };
    return { to, tunnel };
}

/** One step of the child. A step that does not work is a funny try that changes nothing but the counters. */
export function step(s: State, a: Move): Result | null {
    if (s.finished) return null;
    const level = levelOf(s.level), w = width(level), helped = helpOn(s) && hint(s) === a;
    const miss = (kind: Fail, x: number, y: number): Result => ({
        action: a, helped: false, fail: { kind, x, y }, path: [], got: [], tunnel: false, slid: false, opened: false, danced: false,
        state: { ...s, steps: s.steps + 1, tries: s.tries + 1, dry: s.dry + 1, idle: s.idle + 1 }
    });
    const first = next(level, s.grid, s.boubou, a);
    if ('fail' in first) return miss(first.fail, first.x, first.y);
    const path = [first.to];
    // On leaves, Boubou slides on in the same direction until he leaves the carpet or something stops him.
    let at = first.to, slid = false;
    while (s.grid[at] === 'f') {
        const n = next(level, s.grid, at, a);
        if ('fail' in n || path.includes(n.to) || n.to === s.boubou) break;
        at = n.to; path.push(at); slid = true;
    }
    // Friends: one standing on his way, or one coming onto the cell where he stops, is a funny try.
    const kinds = level.friends.map(f => f.kind), now = friendsAt(level, s.t), moving = s.dance === 0;
    const later = moving ? friendsAt(level, s.t + 1) : now;
    for (let i = 0; i < kinds.length; i++) {
        const blocked = path.includes(now[i]!) ? now[i]! : later[i] === at ? at : -1;
        if (blocked >= 0) return miss(kinds[i]!, blocked % w, Math.floor(blocked / w));
    }
    const g = s.grid.split(''), got: Result['got'] = [];
    let opened = false, danced = false, bonus = s.bonus;
    for (const cell of path) {
        const c = g[cell]!;
        if (c === '*') { g[cell] = '.'; got.push({ cell, kind: 'graine' }); }
        else if (c === 'S') { g[cell] = '.'; got.push({ cell, kind: 'soleil' }); danced = true; }
        else if (c === 'k') { g[cell] = '.'; got.push({ cell, kind: 'cle' }); for (let j = 0; j < g.length; j++) if (g[j] === 'D') { g[j] = '.'; opened = true; } }
    }
    if (danced) bonus += level.friends.length;
    const grid = g.join(''), picked = got.some(x => x.kind !== 'cle'), finished = goalsLeft(grid) === 0;
    const t = moving && !danced ? (s.t + 1) % periodOf(level) : s.t, dance = danced ? DANCE : Math.max(0, s.dance - 1);
    return {
        action: a, helped, fail: null, path, got, tunnel: first.tunnel, slid, opened, danced,
        state: { ...s, grid, boubou: at, t, dance, bonus, steps: s.steps + 1, dry: 0, idle: picked ? 0 : s.idle + 1, helps: s.helps + (helped ? 1 : 0), finished }
    };
}

/** The steps a slide makes on its own: on along the alley, round its bends, until a crossing, a dead end, something picked,
 * a funny try or the leaves. Always at least the first step. */
export function run(s: State, a: Move, limit = 20): Move[] {
    const level = levelOf(s.level), out: Move[] = [a];
    let cur = s, dir: Move = a;
    for (let k = 0; k < limit; k++) {
        const r = step({ ...cur, dry: 0, idle: 0 }, dir);
        if (!r || r.fail || r.got.length || r.slid || r.tunnel || r.state.finished) break;
        cur = r.state;
        const back = ({ haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' } as const)[dir];
        const ways = moves.filter(m => m !== back && !('fail' in next(level, cur.grid, cur.boubou, m)));
        const sides = moves.filter(m => !('fail' in next(level, cur.grid, cur.boubou, m))).length;
        if (sides !== 2 || ways.length !== 1) break;
        dir = ways[0]!; out.push(dir);
    }
    return out;
}

type Node = Pick<State, 'level' | 'grid' | 'boubou' | 't' | 'dance'>;
/** Everything that changes what can happen next (the bonus and the counters do not). */
export const keyOf = (n: Node): string => `${n.boubou}|${n.t}|${n.dance}|${n.grid}`;
const bare = (s: State): State => ({ ...s, bonus: 0, steps: 0, tries: 0, dry: 0, idle: 0, helps: 0 });
/** Every state Boubou can reach from `from` with steps that happen: the game as a graph. */
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
/** The shortest way from `s` until `done` holds, as a list of steps; null when there is none. */
function search(s: State, done: (r: Result) => boolean): Move[] | null {
    const first = bare(s), seen = new Map<string, { from: string | null; action: Move | null }>(), queue: State[] = [first];
    seen.set(keyOf(first), { from: null, action: null });
    for (let i = 0; i < queue.length; i++) {
        const cur = queue[i]!, ck = keyOf(cur);
        for (const a of moves) {
            const r = step(cur, a);
            if (!r || r.fail) continue;
            const k = keyOf(r.state);
            if (seen.has(k)) continue;
            seen.set(k, { from: ck, action: a });
            if (done(r)) {
                const path: Move[] = [];
                for (let at: string | null = k; at !== null && seen.get(at)!.action; at = seen.get(at)!.from) path.unshift(seen.get(at)!.action!);
                return path;
            }
            if (!r.state.finished) queue.push(bare(r.state));
        }
    }
    return null;
}
/** The shortest way to pick up every seed and sun. */
export function solve(s: State): Move[] | null { return s.finished ? [] : search(s, r => r.state.finished); }
/** The shortest way to the nearest seed or sun (nearest in steps, the friends' rounds counted). */
export function nearest(s: State): Move[] | null { return s.finished ? [] : search(s, r => goalsLeft(r.state.grid) < goalsLeft(s.grid)); }
export const helpOn = (s: State): boolean => !s.finished && (s.dry >= TRIES_BEFORE_HELP || s.idle >= IDLE_BEFORE_HELP);
const hintCache = new Map<string, Move | null>();
/** The direction that pulses: the first step towards the nearest seed. */
export function hint(s: State): Move | null {
    const k = `${s.level}:${keyOf(s)}`;
    if (!hintCache.has(k)) { if (hintCache.size > 20000) hintCache.clear(); hintCache.set(k, nearest(s)?.[0] ?? null); }
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

/** The new things a scene uses. */
export function featuresOf(level: LevelDef): Feature[] {
    const all = level.rows.join(''), kinds = new Set<FriendKind>(level.friends.map(f => f.kind));
    const has: Record<Feature, boolean> = {
        papillon: kinds.has('papillon'), herisson: kinds.has('herisson'), coccinelle: kinds.has('coccinelle'), soleil: all.includes('S'),
        flaque: all.includes('o'), porte: all.includes('D'), tunnel: all.includes('='), pont: all.includes('~'), feuilles: all.includes('f')
    };
    return features.filter(f => has[f]);
}
/** What a new thing needs to be shown at all: the sun makes a friend dance. */
export const NEEDS: Readonly<Partial<Record<Feature, readonly Feature[]>>> = { soleil: ['papillon'] };

/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], w = width(level), h = height(level), all = level.rows.join(''), count = (c: string): number => all.split(c).length - 1;
    // Eight columns at most: a ninth would make cells narrower than 44 px on a 390 px wide phone.
    if (w < 3 || w > 8) out.push('three to eight columns');
    if (h < 3 || h > 11) out.push('three to eleven rows');
    if (level.rows.some(r => r.length !== w)) out.push('rows of the same length');
    for (const ch of all) if (!/^[.#*Skdo~\-|=f@D]$/.test(ch) || ch === 'd') out.push(`unknown cell ${ch}`);
    if (count('@') !== 1) out.push('one Boubou');
    if (goalsOf(level) < 1 || goalsOf(level) > 8) out.push('one to eight seeds and suns');
    if (count('S') > 2) out.push('two suns at most');
    if ((count('D') > 0) !== (count('k') === 1) || count('k') > 1) out.push('one key flower with the gates');
    if (count('S') > 0 && level.friends.length === 0) out.push('a friend to dance with the sun');
    if ((count('-') + count('|') > 0) && count('~') === 0) out.push('a bridge over the stream');
    for (let i = 0; i < all.length; i++) {
        if (all[i] !== '=') continue;
        const x = i % w, y = Math.floor(i / w);
        const ok = x === 0 && all[y * w + w - 1] === '=' || x === w - 1 && all[y * w] === '=' || y === 0 && all[(h - 1) * w + x] === '=' || y === h - 1 && all[x] === '=';
        if (!ok) out.push('tunnel mouths face each other on two edges');
    }
    if (level.friends.length > 3) out.push('three friends at most');
    const g = startGrid(level);
    for (const [i, f] of level.friends.entries()) {
        if (!/^[hbgd]{2,12}$/.test(f.route)) { out.push(`friend ${i}: a round of 2 to 12 steps`); continue; }
        let x = f.x, y = f.y;
        const cells = [[x, y]];
        for (const ch of f.route) { const [dx, dy] = DELTA[LETTER[ch]!]; x += dx; y += dy; cells.push([x, y]); }
        if (x !== f.x || y !== f.y) out.push(`friend ${i}: a round comes back where it starts`);
        if (cells.some(([cx, cy]) => cx! < 0 || cy! < 0 || cx! >= w || cy! >= h || !FRIEND_GROUND.includes(g[cy! * w + cx!]!))) out.push(`friend ${i}: walks on the paths`);
    }
    if (periodOf(level) > 24) out.push('the friends are all back within 24 steps');
    if (friendsAt(level, 0).includes(startCell(level)) || friendsAt(level, 1).includes(startCell(level))) out.push('no friend on Boubou at the start');
    if (level.title.fr.length > 32 || level.title.en.length > 32) out.push('a short title');
    return out;
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 12;
/** The rows of a scene with the friends drawn on their first cell, as letters. */
const drawn = (l: LevelDef): string[] => {
    const rows = l.rows.map(r => r.split(''));
    for (const f of l.friends) rows[f.y]![f.x] = f.kind[0]!.toUpperCase();
    return rows.map(r => r.join(''));
};
/** How far apart two scenes are: the boards (friends on their first cell) laid over each other from the top left corner, one
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
