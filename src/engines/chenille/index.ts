import { features, handLevels, type Feature, type LevelDef } from './levels';
export { features, type Feature, type LevelDef } from './levels';
/** « La chenille de Lumi »: Lumi's caterpillar nibbles leaves and grows; when every leaf of the scene is eaten, it crawls
 * into its cocoon and comes out a butterfly. Turn by turn: nothing moves until the child guides it. No clock, no lives,
 * no losing: the caterpillar can always turn round (its tail becomes its head), and a step that does not work is a funny
 * try that changes nothing: it bumps its head on the hedge, makes big eyes at a stone, tickles itself… Pure and
 * deterministic. */
export const moves = ['haut', 'bas', 'gauche', 'droite'] as const;
export type Move = typeof moves[number];
/** `retourne`: the caterpillar turns round, its tail becomes its head. It always works. */
export type Action = Move | 'retourne';
export const actions: readonly Action[] = [...moves, 'retourne'];
/** Funny tries: each has its own animation, and nothing on the board changes. */
export const fails = ['mur', 'caillou', 'corps', 'demitour', 'flaque', 'fleur', 'couleur', 'cocon'] as const;
export type Fail = typeof fails[number];
/** Funny tries in a row before the right next step pulses. */
export const TRIES_BEFORE_HELP = 3;
/** Steps without a leaf eaten before the right next step pulses. */
export const IDLE_BEFORE_HELP = 30;
/** The shortest a caterpillar gets: a head and one ring. */
export const MIN_LENGTH = 2;
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const width = (level: LevelDef): number => level.rows[0]!.length;
export const height = (level: LevelDef): number => level.rows.length;
export const DELTA: Readonly<Record<Move, readonly [number, number]>> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
export const OPPOSITE: Readonly<Record<Move, Move>> = { haut: 'bas', bas: 'haut', gauche: 'droite', droite: 'gauche' };
const TAIL_DIRS: Readonly<Record<string, Move>> = { h: 'haut', b: 'bas', g: 'gauche', d: 'droite' };

/** What the ground of a cell is, once the caterpillar and its food are taken off. */
export type Ground = 'herbe' | 'haie' | 'caillou' | 'flaque' | 'fleur' | 'trou' | 'pont' | 'cocon';
/** Something to eat: a leaf (one ring more), a sweet leaf (two), an apple (one ring less, never required) or a leaf of a
 * colour of the rainbow (`rank` 1 to 6: red, orange, yellow, green, blue, purple), eaten in that order. */
export type FoodKind = 'feuille' | 'sucree' | 'pomme' | 'couleur';
export interface Food { x: number; y: number; kind: FoodKind; rank: number }
export const RAINBOW = ['rouge', 'orange', 'jaune', 'vert', 'bleu', 'violet'] as const;

const groundCache = new WeakMap<LevelDef, Ground[]>();
const groundOf = (ch: string): Ground => ch === '#' ? 'haie' : ch === 'o' ? 'caillou' : ch === '~' ? 'flaque' : ch === 'f' ? 'fleur' : ch === 'U' ? 'trou' : ch === 'H' ? 'pont' : ch === 'C' ? 'cocon' : 'herbe';
/** The ground of every cell, row by row (index `y * width + x`). */
export function grounds(level: LevelDef): Ground[] {
    let v = groundCache.get(level);
    if (!v) { v = level.rows.flatMap(r => r.split('').map(groundOf)); groundCache.set(level, v); }
    return v;
}
export function groundAt(level: LevelDef, x: number, y: number): Ground {
    return x < 0 || y < 0 || x >= width(level) || y >= height(level) ? 'haie' : grounds(level)[y * width(level) + x]!;
}
const find = (level: LevelDef, test: (ch: string) => boolean): { x: number; y: number }[] => {
    const out: { x: number; y: number }[] = [];
    level.rows.forEach((row, y) => row.split('').forEach((ch, x) => { if (test(ch)) out.push({ x, y }); }));
    return out;
};
const foodCache = new WeakMap<LevelDef, Food[]>();
/** The food of a scene, in reading order; its index is its bit in `State.eaten`. */
export function foodsOf(level: LevelDef): Food[] {
    let v = foodCache.get(level);
    if (!v) {
        v = find(level, ch => /^[lsp1-6]$/.test(ch)).map((p): Food => {
            const ch = level.rows[p.y]![p.x]!, kind: FoodKind = ch === 'l' ? 'feuille' : ch === 's' ? 'sucree' : ch === 'p' ? 'pomme' : 'couleur';
            return { ...p, kind, rank: /\d/.test(ch) ? Number(ch) : 0 };
        });
        foodCache.set(level, v);
    }
    return v;
}
/** The bits of the food that must be eaten before the cocoon opens: everything but the apples. */
export const requiredMask = (level: LevelDef): number => foodsOf(level).reduce((m, f, i) => f.kind === 'pomme' ? m : m | (1 << i), 0);
export const cocoonOf = (level: LevelDef): { x: number; y: number } => find(level, ch => ch === 'C')[0]!;
export const holesOf = (level: LevelDef): { x: number; y: number }[] => find(level, ch => ch === 'U');
/** The caterpillar at the start, head first: the head `@`, then the rings along `tail`. */
export function startBody(level: LevelDef): { x: number; y: number }[] {
    const head = find(level, ch => ch === '@')[0]!, out = [head];
    for (const ch of level.tail) { const last = out[out.length - 1]!, [dx, dy] = DELTA[TAIL_DIRS[ch]!]; out.push({ x: last.x + dx, y: last.y + dy }); }
    return out;
}

const featureCache = new Map<number, Feature[]>();
/** The new things a scene uses. `retourne` is there when the scene cannot be finished without turning round. */
export function featuresOf(level: LevelDef): Feature[] {
    const known = featureCache.get(level.id);
    if (known && levels[level.id - 1] === level) return known;
    const all = level.rows.join('');
    const has: Record<Feature, boolean> = {
        caillou: all.includes('o'), fleur: all.includes('f'), retourne: solve(startState(level), { turning: false }) === null,
        flaque: all.includes('~'), sucree: all.includes('s'), pomme: all.includes('p'), tunnel: all.includes('U'), pont: all.includes('H'), arcenciel: /[1-6]/.test(all)
    };
    const out = features.filter(f => has[f]);
    if (levels[level.id - 1] === level) featureCache.set(level.id, out);
    return out;
}
/** Leaves to eat (apples aside). */
export const leavesOf = (level: LevelDef): number => foodsOf(level).filter(f => f.kind !== 'pomme').length;

/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], w = width(level), h = height(level);
    if (w < 3 || w > 7) out.push('three to seven columns');
    if (h < 3 || h > 9) out.push('three to nine rows');
    if (level.rows.some(r => r.length !== w)) out.push('rows of the same length');
    for (const r of level.rows) for (const ch of r) if (!/^[.#o~fUHC@lsp1-6]$/.test(ch)) out.push(`unknown cell ${ch}`);
    if (find(level, ch => ch === '@').length !== 1) out.push('one head');
    if (find(level, ch => ch === 'C').length !== 1) out.push('one cocoon');
    const holes = holesOf(level).length;
    if (holes !== 0 && holes !== 2) out.push('a tunnel has two holes');
    else if (holes === 2) { const [a, b] = holesOf(level); if (Math.abs(a!.x - b!.x) + Math.abs(a!.y - b!.y) < 2) out.push('the two holes of a tunnel apart'); }
    if (!/^[hbgd]+$/.test(level.tail)) out.push('a tail of one ring or more');
    else {
        const body = startBody(level), seen = new Set<string>();
        for (const p of body) {
            if (seen.has(`${p.x},${p.y}`)) out.push('the caterpillar does not cross itself');
            seen.add(`${p.x},${p.y}`);
            const ch = level.rows[p.y]?.[p.x];
            if (p !== body[0] && ch !== '.') out.push('the caterpillar lies on grass');
        }
    }
    const ranks = foodsOf(level).filter(f => f.kind === 'couleur').map(f => f.rank).sort();
    if (ranks.some((r, i) => r !== i + 1)) out.push('rainbow leaves 1, 2, 3… once each');
    if (leavesOf(level) < 1) out.push('a leaf to eat');
    if (level.title.fr.length > 32 || level.title.en.length > 32) out.push('a short title');
    return out;
}

export interface State {
    level: number;
    /** The cells of the caterpillar, head first, as `y * width + x`. A bridge may hold two rings, one over the other. */
    body: readonly number[];
    /** Food eaten, one bit per item of `foodsOf`. */
    eaten: number;
    /** Rings still to grow: the tail stays put for that many steps. */
    grow: number;
    /** Steps (funny tries included), funny tries, funny tries in a row, steps since the last leaf eaten, helps. */
    steps: number; tries: number; dry: number; idle: number; helps: number; finished: boolean;
}
function startState(level: LevelDef): State {
    const w = width(level);
    return { level: level.id, body: startBody(level).map(p => p.y * w + p.x), eaten: 0, grow: 0, steps: 0, tries: 0, dry: 0, idle: 0, helps: 0, finished: false };
}
export const start = (id: number): State => startState(levelOf(id));
export const cellXY = (level: LevelDef, i: number): { x: number; y: number } => ({ x: i % width(level), y: Math.floor(i / width(level)) });
/** The next rainbow leaf to eat (1 to 6), or 0 when none is left. */
export function nextRank(level: LevelDef, eaten: number): number {
    let best = 0;
    foodsOf(level).forEach((f, i) => { if (f.kind === 'couleur' && !(eaten & (1 << i)) && (best === 0 || f.rank < best)) best = f.rank; });
    return best;
}
export const foodAt = (level: LevelDef, eaten: number, x: number, y: number): number => foodsOf(level).findIndex((f, i) => f.x === x && f.y === y && !(eaten & (1 << i)));
export const ready = (level: LevelDef, eaten: number): boolean => (eaten & requiredMask(level)) === requiredMask(level);

export interface Result {
    action: Action; state: State; helped: boolean;
    /** The funny try and the cell it is about (the cell the head would go to). */
    fail: { kind: Fail; x: number; y: number } | null;
    /** What was eaten on this step, and whether the head went through the tunnel. */
    ate: Food | null; tunnel: boolean;
}
export interface Rules { turning?: boolean; bridge?: boolean; apples?: boolean; tunnel?: boolean }
/** One step of the child. A step that works moves the caterpillar; a funny try changes nothing but the counters. `rules`
 * switches a new thing off, to tell which scenes need it. */
export function step(s: State, a: Action, rules: Rules = {}): Result | null {
    if (s.finished) return null;
    const level = levelOf(s.level), w = width(level), helped = helpOn(s) && hint(s) === a;
    const done = (body: readonly number[], eaten: number, grow: number, ate: Food | null, tunnel: boolean, finished: boolean): Result => ({
        action: a, helped, fail: null, ate, tunnel,
        state: { ...s, body, eaten, grow, steps: s.steps + 1, dry: 0, idle: ate && ate.kind !== 'pomme' ? 0 : s.idle + 1, helps: s.helps + (helped ? 1 : 0), finished }
    });
    if (a === 'retourne') return rules.turning === false ? null : done([...s.body].reverse(), s.eaten, s.grow, null, false, false);
    const miss = (kind: Fail, x: number, y: number): Result => ({ action: a, helped: false, fail: { kind, x, y }, ate: null, tunnel: false, state: { ...s, steps: s.steps + 1, tries: s.tries + 1, dry: s.dry + 1, idle: s.idle + 1 } });
    const head = cellXY(level, s.body[0]!), [dx, dy] = DELTA[a];
    let x = head.x + dx, y = head.y + dy, tunnel = false;
    // Into one hole, out of the other, still going the same way: the head comes up on the cell beyond the other hole.
    if (groundAt(level, x, y) === 'trou') {
        if (rules.tunnel === false) return miss('mur', x, y);
        const other = holesOf(level).find(p => p.x !== x || p.y !== y)!;
        x = other.x + dx; y = other.y + dy; tunnel = true;
    }
    const g = groundAt(level, x, y);
    if (g === 'haie' || g === 'trou') return miss('mur', x, y);
    if (g === 'caillou') return miss('caillou', x, y);
    if (g === 'flaque') return miss('flaque', x, y);
    if (g === 'fleur') return miss('fleur', x, y);
    if (g === 'cocon' && !ready(level, s.eaten)) return miss('cocon', x, y);
    const target = y * w + x;
    if (s.body.length > 1 && target === s.body[1]) return miss('demitour', x, y);
    const fi = foodAt(level, s.eaten, x, y), food = fi >= 0 ? foodsOf(level)[fi]! : null;
    if (food?.kind === 'couleur' && food.rank !== nextRank(level, s.eaten)) return miss('couleur', x, y);
    if (food?.kind === 'pomme' && rules.apples === false) return miss('caillou', x, y);
    let grow = s.grow + (food?.kind === 'feuille' || food?.kind === 'couleur' ? 1 : food?.kind === 'sucree' ? 2 : 0);
    const body = [target, ...s.body];
    // A ring still to grow waits while the head goes into the cell its tail leaves: it grows as soon as there is room.
    if (grow > 0 && target !== s.body[s.body.length - 1]) grow--; else body.pop();
    if (food?.kind === 'pomme') { if (grow > 0) grow--; else if (body.length > MIN_LENGTH) body.pop(); }
    // The tail leaving the cell this very step frees it; a bridge takes a second ring over the first.
    let count = 0;
    for (let i = 1; i < body.length; i++) if (body[i] === target) count++;
    if (count > (g === 'pont' && rules.bridge !== false ? 1 : 0)) return miss('corps', x, y);
    return done(body, fi >= 0 ? s.eaten | (1 << fi) : s.eaten, grow, food, tunnel, g === 'cocon');
}

type Node = Pick<State, 'body' | 'eaten' | 'grow'>;
export const keyOf = (n: Node): string => `${String.fromCharCode(...n.body.map(c => 48 + c))}|${n.eaten}|${n.grow}`;
const bare = (s: State): State => ({ ...s, steps: 0, tries: 0, dry: 0, idle: 0, helps: 0 });
/** Every state the caterpillar can reach from `from` with steps that work: the game as a graph. */
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
/** The shortest way from `s` to the cocoon, as a list of actions; null when there is none. `rules` switches a new thing off
 * (used to tell the scenes that need it). */
export function solve(s: State, rules: Rules = {}): Action[] | null {
    if (s.finished) return [];
    const first = bare(s), seen = new Map<string, { from: string | null; action: Action | null }>(), queue: State[] = [first];
    seen.set(keyOf(first), { from: null, action: null });
    for (let i = 0; i < queue.length; i++) {
        const cur = queue[i]!, ck = keyOf(cur);
        for (const a of actions) {
            const r = step(cur, a, rules);
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
/** The right next step: the first of a shortest way to the cocoon. */
export function hint(s: State): Action | null {
    const k = `${s.level}:${keyOf(s)}`;
    if (!hintCache.has(k)) { if (hintCache.size > 5000) hintCache.clear(); hintCache.set(k, solve(s)?.[0] ?? null); }
    return hintCache.get(k)!;
}
/** The free « back » button: the caterpillar of the step before, the counters of now (a help stays a help). */
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
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 8;
/** How far apart two scenes are: the boards laid over each other from the top left corner, one per cell that differs
 * (ground, food, the head and the cocoon), one per ring of the caterpillar more or less or lying another way, two per row or
 * column more or less, three per new thing one has and not the other. */
export function distance(a: LevelDef, b: LevelDef): number {
    const wa = width(a), wb = width(b), ha = height(a), hb = height(b);
    let d = 2 * Math.abs(wa - wb) + 2 * Math.abs(ha - hb);
    for (let y = 0; y < Math.min(ha, hb); y++) for (let x = 0; x < Math.min(wa, wb); x++) if (a.rows[y]![x] !== b.rows[y]![x]) d++;
    for (let i = 0; i < Math.max(a.tail.length, b.tail.length); i++) if (a.tail[i] !== b.tail[i]) d++;
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d;
}
