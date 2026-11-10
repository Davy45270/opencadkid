import { features, handLevels, MOTIF_LETTERS, type Feature, type LevelDef, type Motif } from './levels';
export { features, motifs, type Feature, type LevelDef, type Motif } from './levels';
/** « Les caisses de Boubou »: Boubou tidies his toys away. Each crate holds a toy (a balloon, a teddy bear, a car, a star, a
 * frog) and goes on a spot drawn on the floor: any spot in the first scenes, then the spot of its own toy. Boubou pushes the
 * crate in front of him, and he can pull the crate stuck to his back, so a crate stuck in a corner always comes out: no
 * situation is ever lost. No clock, no step limit, no lives. A step that does not work is a funny try: Boubou bumps his
 * nose, the crate rolls its eyes, two crates are too heavy… and nothing on the board changes. Pure and deterministic. */
export const moves = ['haut', 'bas', 'gauche', 'droite'] as const;
export type Move = typeof moves[number];
/** `tire-x`: Boubou steps towards x and pulls along the crate stuck to his back, on the other side. */
export const pulls = ['tire-haut', 'tire-bas', 'tire-gauche', 'tire-droite'] as const;
export type Pull = typeof pulls[number];
export type Action = Move | Pull;
export const actions: readonly Action[] = [...moves, ...pulls];
/** Funny tries: each has its own animation, and nothing on the board changes. */
export const fails = ['mur', 'bonk', 'lourd', 'motif', 'plouf', 'buisson', 'vide', 'orteil', 'porte', 'trou'] as const;
export type Fail = typeof fails[number];
/** Funny tries in a row before the right next step pulses. */
export const TRIES_BEFORE_HELP = 3;
/** Steps without a new crate put away before the right next step pulses. */
export const IDLE_BEFORE_HELP = 40;
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const width = (level: LevelDef): number => level.rows[0]!.length;
export const height = (level: LevelDef): number => level.rows.length;
export const DELTA: Readonly<Record<Move, readonly [number, number]>> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
export const OPPOSITE: Readonly<Record<Move, Move>> = { haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' };
export const isPull = (a: Action): a is Pull => a.startsWith('tire-');
export const moveOf = (a: Action): Move => (isPull(a) ? a.slice(5) : a) as Move;
export const pullOf = (m: Move): Pull => `tire-${m}`;

/** What the floor of a cell is, once the crates and Boubou are taken off. */
export type Ground = 'sol' | 'mur' | 'buisson' | 'eau' | 'trou' | 'bouton' | 'porte' | 'glace' | 'tapis' | 'place';
export interface Cell { ground: Ground; /** The toy of a spot, `null` for a spot any crate fits. */ motif?: Motif | null; /** The way a belt runs. */ dir?: Move }
const BELTS: Record<string, Move> = { '→': 'droite', '←': 'gauche', '↑': 'haut', '↓': 'bas' };
const WALL: Cell = { ground: 'mur' };
const cellCache = new WeakMap<LevelDef, Cell[][]>();
export function cellAt(level: LevelDef, x: number, y: number): Cell {
    let grid = cellCache.get(level);
    if (!grid) { grid = level.rows.map((row, ry) => row.split('').map((_, rx) => readCell(level, rx, ry))); cellCache.set(level, grid); }
    return grid[y]?.[x] ?? WALL;
}
function readCell(level: LevelDef, x: number, y: number): Cell {
    const ch = level.rows[y]?.[x];
    if (ch === undefined) return { ground: 'mur' };
    switch (ch) {
        case '#': return { ground: 'mur' };
        case '*': return { ground: 'buisson' };
        case '~': return { ground: 'eau' };
        case 'X': return { ground: 'trou' };
        case '_': return { ground: 'bouton' };
        case 'D': return { ground: 'porte' };
        case '=': return { ground: 'glace' };
        case '+': return { ground: 'place', motif: null };
    }
    if (BELTS[ch]) return { ground: 'tapis', dir: BELTS[ch] };
    const slot = MOTIF_LETTERS.find(([l]) => l.toUpperCase() === ch);
    if (slot) return { ground: 'place', motif: slot[1] };
    return { ground: 'sol' };
}
const findCache = new WeakMap<LevelDef, Map<string, { x: number; y: number }[]>>();
/** The cells of a kind, found once per scene. */
const cached = (level: LevelDef, name: string, test: (ch: string) => boolean): { x: number; y: number }[] => {
    let m = findCache.get(level);
    if (!m) { m = new Map(); findCache.set(level, m); }
    let v = m.get(name);
    if (!v) { v = find(level, test); m.set(name, v); }
    return v;
};
const find = (level: LevelDef, test: (ch: string) => boolean): { x: number; y: number }[] => {
    const out: { x: number; y: number }[] = [];
    level.rows.forEach((row, y) => row.split('').forEach((ch, x) => { if (test(ch)) out.push({ x, y }); }));
    return out;
};
/** A crate pushed into a hole is `sunk`: it fills the hole, Boubou and the other crates go over it, and Boubou can pull it
 * back out. */
export interface Crate { x: number; y: number; motif: Motif; sunk: boolean }
export const startOf = (level: LevelDef): { x: number; y: number } => find(level, ch => ch === '@')[0]!;
export const cratesOf = (level: LevelDef): Crate[] => find(level, ch => MOTIF_LETTERS.some(([l]) => l === ch)).map(p => ({ ...p, motif: MOTIF_LETTERS.find(([l]) => l === level.rows[p.y]![p.x])![1], sunk: false }));
const slotCache = new WeakMap<LevelDef, { x: number; y: number; motif: Motif | null }[]>();
export function slotsOf(level: LevelDef): { x: number; y: number; motif: Motif | null }[] {
    let v = slotCache.get(level);
    if (!v) { v = find(level, ch => ch === '+' || MOTIF_LETTERS.some(([l]) => l.toUpperCase() === ch)).map(p => ({ ...p, motif: cellAt(level, p.x, p.y).motif ?? null })); slotCache.set(level, v); }
    return v;
}
export const holesOf = (level: LevelDef): { x: number; y: number }[] => cached(level, 'holes', ch => ch === 'X');
export const buttonsOf = (level: LevelDef): { x: number; y: number }[] => cached(level, 'buttons', ch => ch === '_');
export const doorsOf = (level: LevelDef): { x: number; y: number }[] => cached(level, 'doors', ch => ch === 'D');

const featureCache = new Map<number, Feature[]>();
/** The new things a scene uses. `tirer` is there when the scene cannot be finished by pushing only. */
export function featuresOf(level: LevelDef): Feature[] {
    const known = featureCache.get(level.id);
    if (known && levels[level.id - 1] === level) return known;
    const all = level.rows.join('');
    const has: Record<Feature, boolean> = {
        tirer: solve(startState(level), false) === null,
        motif: slotsOf(level).some(s => s.motif !== null), tapis: /[→←↑↓]/.test(all), porte: all.includes('D'),
        glace: all.includes('='), trou: all.includes('X'), eau: all.includes('~')
    };
    const out = features.filter(f => has[f]);
    if (levels[level.id - 1] === level) featureCache.set(level.id, out);
    return out;
}

/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], w = width(level), h = height(level);
    if (w < 4 || w > 7) out.push('four to seven columns');
    if (h < 4 || h > 9) out.push('four to nine rows');
    if (level.rows.some(r => r.length !== w)) out.push('rows of the same length');
    const known = /^[.#*~X_D=+→←↑↓@bovegBOVEG]$/u;
    for (const r of level.rows) for (const ch of r) if (!known.test(ch)) out.push(`unknown cell ${ch}`);
    if (find(level, ch => ch === '@').length !== 1) out.push('one Boubou');
    const crates = cratesOf(level), slots = slotsOf(level);
    if (crates.length < 1 || crates.length > 3) out.push('one to three crates');
    if (slots.length < 1 || slots.length > crates.length) out.push('a spot for each crate at most');
    // A spot of a toy needs a crate of that toy, and the crates left over after the holes still fill every spot.
    for (const m of new Set(slots.map(s => s.motif))) if (m && crates.filter(c => c.motif === m).length < slots.filter(s => s.motif === m).length) out.push(`a ${m} crate for each ${m} spot`);
    if ((buttonsOf(level).length > 0) !== level.rows.some(r => r.includes('D'))) out.push('a door and its button go together');
    if (level.title.fr.length > 32 || level.title.en.length > 32) out.push('a short title');
    return out;
}

export interface State {
    level: number; x: number; y: number; crates: readonly Crate[];
    /** Steps (funny tries included), funny tries, funny tries in a row, steps since the last new crate put away, the most
     * crates ever put away at once, helps. */
    steps: number; tries: number; dry: number; idle: number; best: number; helps: number; finished: boolean;
}
function startState(level: LevelDef): State {
    const s = startOf(level);
    return { level: level.id, x: s.x, y: s.y, crates: cratesOf(level), steps: 0, tries: 0, dry: 0, idle: 0, best: 0, helps: 0, finished: false };
}
export const start = (id: number): State => startState(levelOf(id));
/** Crates on a spot of their own toy (or on a spot any crate fits). */
export function placed(level: LevelDef, crates: readonly Crate[]): number {
    return slotsOf(level).filter(sl => crates.some(c => !c.sunk && c.x === sl.x && c.y === sl.y && (sl.motif === null || sl.motif === c.motif))).length;
}
/** The crate standing on a cell (not one sunk in a hole). */
const crateIndex = (s: Pick<State, 'crates'>, x: number, y: number): number => s.crates.findIndex(c => c.x === x && c.y === y && !c.sunk);
const sunkIndex = (s: Pick<State, 'crates'>, x: number, y: number): number => s.crates.findIndex(c => c.x === x && c.y === y && c.sunk);
export const filled = (s: Pick<State, 'crates'>, x: number, y: number): boolean => sunkIndex(s, x, y) >= 0;
/** The door is open while a crate sits on a button, or while something stands in the doorway. */
export function doorOpen(level: LevelDef, s: Pick<State, 'crates' | 'x' | 'y'>): boolean {
    return buttonsOf(level).some(b => crateIndex(s, b.x, b.y) >= 0) || doorsOf(level).some(d => crateIndex(s, d.x, d.y) >= 0 || (s.x === d.x && s.y === d.y));
}
/** Whether Boubou can stand on a cell; otherwise why not. */
function walk(level: LevelDef, s: Pick<State, 'crates' | 'x' | 'y'>, x: number, y: number): Fail | 'caisse' | null {
    const c = cellAt(level, x, y);
    if (c.ground === 'mur' || c.ground === 'buisson') return 'mur';
    if (c.ground === 'eau') return 'orteil';
    if (c.ground === 'trou' && !filled(s, x, y)) return 'trou';
    if (c.ground === 'porte' && !doorOpen(level, s)) return 'porte';
    if (crateIndex(s, x, y) >= 0) return 'caisse';
    return null;
}
/** Whether a crate can go onto a cell; otherwise the funny try it makes. A hole takes it in. */
function room(level: LevelDef, s: Pick<State, 'crates' | 'x' | 'y'>, x: number, y: number, motif: Motif): Fail | 'trou' | null {
    const c = cellAt(level, x, y);
    if (c.ground === 'mur') return 'bonk';
    if (c.ground === 'buisson') return 'buisson';
    if (c.ground === 'eau') return 'plouf';
    if (c.ground === 'porte' && !doorOpen(level, s)) return 'bonk';
    if (crateIndex(s, x, y) >= 0) return 'lourd';
    if (s.x === x && s.y === y) return 'bonk';
    if (c.ground === 'place' && c.motif && c.motif !== motif) return 'motif';
    if (c.ground === 'trou' && !filled(s, x, y)) return 'trou';
    return null;
}
/** Where a crate that has just arrived on `x, y` (going `dir`) ends up: ice makes it slide to the wall, a belt carries it
 * one cell. The path lists every cell it goes through after the first; `hole` is set when it falls into a hole. */
export interface Slide { x: number; y: number; path: { x: number; y: number; by: 'glace' | 'tapis' }[]; hole: boolean }
function settle(level: LevelDef, s: Pick<State, 'crates' | 'x' | 'y'>, i: number, x: number, y: number, dir: Move): Slide {
    const motif = s.crates[i]!.motif, path: Slide['path'] = [];
    const others = { ...s, crates: s.crates.filter((_, k) => k !== i) };
    const go = (by: 'glace' | 'tapis', d: Move): 'trou' | boolean => {
        const nx = x + DELTA[d][0], ny = y + DELTA[d][1], r = room(level, others, nx, ny, motif);
        if (r && r !== 'trou') return false;
        path.push({ x: nx, y: ny, by }); x = nx; y = ny; return r === 'trou' ? 'trou' : true;
    };
    for (let guard = 0; cellAt(level, x, y).ground === 'glace' && guard < 20; guard++) {
        const r = go('glace', dir);
        if (r === 'trou') return { x, y, path, hole: true };
        if (!r) break;
    }
    const c = cellAt(level, x, y);
    if (c.ground === 'tapis' && c.dir && go('tapis', c.dir) === 'trou') return { x, y, path, hole: true };
    return { x, y, path, hole: false };
}
export interface Result {
    action: Action; state: State; helped: boolean;
    /** The funny try, where it happened (the cell Boubou or the crate would go to) and the crate in it. */
    fail: { kind: Fail; x: number; y: number; crate: number } | null;
    /** The crate pushed or pulled, its first cell and how it went on (ice, belt, hole). */
    crate: { index: number; x: number; y: number; slide: Slide } | null;
    /** A crate newly put away on its spot. */
    tidied: boolean;
}
const fresh = (level: LevelDef, s: State, crates: readonly Crate[], x: number, y: number, helped: boolean): State => {
    const n = placed(level, crates), better = n > s.best;
    return { ...s, x, y, crates, steps: s.steps + 1, dry: 0, idle: better ? 0 : s.idle + 1, best: Math.max(s.best, n), helps: s.helps + (helped ? 1 : 0), finished: n === slotsOf(level).length };
};
/** One step of the child. A step that works moves Boubou (and a crate); a funny try changes nothing but the counters. */
export function step(s: State, a: Action): Result | null {
    if (s.finished) return null;
    const level = levelOf(s.level), m = moveOf(a), [dx, dy] = DELTA[m], x = s.x + dx, y = s.y + dy;
    const helped = helpOn(s) && hint(s) === a;
    const miss = (kind: Fail, fx: number, fy: number, crate = -1): Result => ({ action: a, helped: false, fail: { kind, x: fx, y: fy, crate }, crate: null, tidied: false, state: { ...s, steps: s.steps + 1, tries: s.tries + 1, dry: s.dry + 1, idle: s.idle + 1 } });
    const here = walk(level, s, x, y);
    if (isPull(a)) {
        // The crate behind Boubou, or the one sunk in the hole behind him when nothing stands on it.
        const bx = s.x - dx, by = s.y - dy, top = crateIndex(s, bx, by), i = top >= 0 ? top : sunkIndex(s, bx, by);
        if (i < 0) return miss('vide', bx, by);
        if (here === 'caisse') return miss('lourd', x, y, crateIndex(s, x, y));
        if (here) return miss(here, x, y);
        // The crate comes onto the cell Boubou leaves: a spot of another toy does not take it.
        const c = cellAt(level, s.x, s.y);
        if (c.ground === 'place' && c.motif && c.motif !== s.crates[i]!.motif) return miss('motif', s.x, s.y, i);
        const moved = { ...s, x, y };
        const slide = settle(level, moved, i, s.x, s.y, m);
        return land(level, s, a, i, s.x, s.y, slide, x, y, helped);
    }
    if (here !== 'caisse') return here ? miss(here, x, y) : { action: a, helped, fail: null, crate: null, tidied: false, state: fresh(level, s, s.crates, x, y, helped) };
    const i = crateIndex(s, x, y), nx = x + dx, ny = y + dy, r = room(level, s, nx, ny, s.crates[i]!.motif);
    if (r && r !== 'trou') return miss(r, nx, ny, i);
    const moved = { ...s, x, y };
    const slide: Slide = r === 'trou' ? { x: nx, y: ny, path: [], hole: true } : settle(level, moved, i, nx, ny, m);
    return land(level, s, a, i, nx, ny, slide, x, y, helped);
}
function land(level: LevelDef, s: State, a: Action, i: number, cx: number, cy: number, slide: Slide, x: number, y: number, helped: boolean): Result {
    const crates = s.crates.map((c, k) => k === i ? { ...c, x: slide.x, y: slide.y, sunk: slide.hole } : c);
    const state = fresh(level, s, crates, x, y, helped);
    return { action: a, helped, fail: null, crate: { index: i, x: cx, y: cy, slide }, tidied: state.best > s.best, state };
}
/** The steps that do something at all: every move (a wall is a funny try) and every pull. */
export const possible = (s: State): Action[] => s.finished ? [] : [...actions];

type Node = Pick<State, 'x' | 'y' | 'crates'>;
/** Crates of the same toy can swap places: the key sorts them. */
export function keyOf(n: Node): string {
    return `${n.x},${n.y}|${n.crates.map(c => `${c.motif[0]}${c.sunk ? '_' : ''}${c.x}${c.y}`).sort().join(',')}`;
}
const bare = (s: State): State => ({ ...s, steps: 0, tries: 0, dry: 0, idle: 0, best: 0, helps: 0 });
/** Every state Boubou can reach from `from` with steps that work: the game as a graph. */
export function explore(from: State, limit = Infinity): { nodes: Map<string, { state: State; next: { action: Action; key: string }[] }>; start: string; goals: Set<string> } {
    const nodes = new Map<string, { state: State; next: { action: Action; key: string }[] }>(), goals = new Set<string>();
    const first = bare(from), startKey = keyOf(first), queue: State[] = [first];
    nodes.set(startKey, { state: first, next: [] });
    if (from.finished) goals.add(startKey);
    for (let i = 0; i < queue.length && nodes.size <= limit; i++) {
        const s = queue[i]!, here = nodes.get(keyOf(s))!;
        if (s.finished) continue;
        for (const a of actions) {
            const r = step(s, a);
            if (!r || r.fail) continue;
            const k = keyOf(r.state);
            here.next.push({ action: a, key: k });
            if (!nodes.has(k)) { const n = bare(r.state); nodes.set(k, { state: n, next: [] }); queue.push(n); if (n.finished) goals.add(k); }
        }
    }
    return { nodes, start: startKey, goals };
}
/** The shortest way from `s` to the end of the scene, as a list of actions; null when there is none. Without `pulling`,
 * Boubou only pushes (used to tell the scenes that need a pull). */
export function solve(s: State, pulling = true): Action[] | null {
    if (s.finished) return [];
    const first = bare(s), seen = new Map<string, { from: string | null; action: Action | null }>(), queue: State[] = [first];
    seen.set(keyOf(first), { from: null, action: null });
    for (let i = 0; i < queue.length; i++) {
        const cur = queue[i]!, ck = keyOf(cur);
        for (const a of pulling ? actions : moves) {
            const r = step(cur, a);
            if (!r || r.fail) continue;
            const k = keyOf(r.state);
            if (seen.has(k)) continue;
            seen.set(k, { from: ck, action: a });
            if (r.state.finished) {
                const path: Action[] = [];
                for (let at: string | null = k; at !== null && seen.get(at)!.action; at = seen.get(at)!.from) path.unshift(seen.get(at)!.action!);
                return path;
            }
            queue.push(bare(r.state));
        }
    }
    return null;
}
export const helpOn = (s: State): boolean => !s.finished && (s.dry >= TRIES_BEFORE_HELP || s.idle >= IDLE_BEFORE_HELP);
const hintCache = new Map<string, Action | null>();
/** The right next step: the first of a shortest way to the end. */
export function hint(s: State): Action | null {
    const k = `${s.level}:${keyOf(s)}`;
    if (!hintCache.has(k)) { if (hintCache.size > 5000) hintCache.clear(); hintCache.set(k, solve(s)?.[0] ?? null); }
    return hintCache.get(k)!;
}
/** The free « back » button: the board of the step before, the counters of now (a help stays a help). */
export function undo(before: State, now: State): State {
    return { ...before, steps: now.steps, tries: now.tries, dry: 0, idle: now.idle, best: now.best, helps: now.helps, finished: false };
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
export const MIN_GAP = 6;
/** How far apart two scenes are: the boards laid over each other from the top left corner, one per cell that differs
 * (crates, spots, Boubou and the ground), two per row or column more or less, three per new thing one has and not the
 * other. A board moved by one cell counts every cell it moved. */
export function distance(a: LevelDef, b: LevelDef): number {
    const wa = width(a), wb = width(b), ha = height(a), hb = height(b);
    let d = 2 * Math.abs(wa - wb) + 2 * Math.abs(ha - hb);
    for (let y = 0; y < Math.min(ha, hb); y++) for (let x = 0; x < Math.min(wa, wb); x++) if (a.rows[y]![x] !== b.rows[y]![x]) d++;
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d;
}
