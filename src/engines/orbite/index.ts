import { features, handLevels, type Feature, type LevelDef } from './levels';
export { features, type Feature, type LevelDef, type Move } from './levels';
/** « Les nuages de Lumi »: a little troop of grumpy clouds floats in the sky. Lumi, at the bottom, sends hearts up: the child
 * touches the sky above a column, Lumi trots there and throws a heart straight up. The heart meets the lowest cloud of that
 * column: the cloud smiles, turns rainbow and flies away. When every cloud smiles, the sun comes out. No shooting, no enemy,
 * no clock, no lives, nothing comes down towards Lumi, nothing to lose.
 *
 * Time goes in ticks. The troop swings (in the `balance` scenes) one slow step at a time and holds still while a heart flies;
 * the bird crosses the sky; the drops fall. A throw is (column, instant): the child chooses the column and the moment.
 * Everything in the sky holds its breath from the touch until the heart has landed, so a throw is decided by the sky at the
 * instant of the touch. Pure and deterministic. */
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
/** A swinging troop: a step every `STEP` ticks; it rests for `REST` ticks, then glides to the next column in quarters. */
export const STEP = 8;
export const REST = 5;
/** The bird flies one column every `BIRD_TICKS` ticks. */
export const BIRD_TICKS = 8;
/** A rain cloud lets a drop go every `RAIN_PERIOD` ticks; the drop is in the air for `FALL` ticks. */
export const RAIN_PERIOD = 32;
export const FALL = 14;
/** A heart meets a cloud or the bird when they are less than this far apart, in columns (a little less than half a column:
 * a heart can pass between two clouds while the troop glides). */
export const HIT = 3 / 8;
/** Throws in a row that make no cloud smile or blush before the good column shines. */
export const TRIES_BEFORE_HELP = 3;
/** Tries that change nothing: the heart goes up past the troop and bounces on the Moon (`lune`), between two clouds
 * (`entre`), on a cloud that already smiles (`bisou`), on the bird (`oiseau`), on the edge of the sky when the wind pushes it
 * out (`bord`); or a drop falls on Lumi before she throws (`pluie`). */
export const fails = ['lune', 'entre', 'bisou', 'oiseau', 'bord', 'pluie'] as const;
export type Fail = typeof fails[number];
/** Every funny try, the helmet included: its first heart only makes it blush. */
export const funnies = ['rougit', ...fails] as const;
export type Funny = typeof funnies[number];
/** The clouds that do not smile yet. */
export const GRUMPY = 'ncga';
const GRUMPY_OR_BLUSH = 'ncgar';

export interface State {
    level: number;
    /** The troop, from its top row: `.` gone, `r` a helmet cloud that blushed (one heart more), the others as in levels.ts. */
    troop: string[];
    /** The tick of the sky, the steps the troop took (in the `pas` scenes), the column Lumi stands in. */
    t: number; steps: number; lumi: number;
    /** Touches of the child, hearts thrown, funny tries (a drop on Lumi included), touches in a row that made no cloud smile
     * or blush, helps taken. */
    touches: number; hearts: number; tries: number; dry: number; helps: number; finished: boolean;
}
export interface Throw { col: number; at: number }
export interface CloudAt { r: number; j: number; kind: string }
export interface Result {
    throw: Throw; state: State; helped: boolean;
    fail: Fail | null;
    /** The column the heart flies up in (after the wind), the troop's left edge and the bird at the instant of the throw. */
    x: number; offset: number; bird: number | null;
    /** What the heart met: a cloud (its place in the troop), the bird, the Moon at the top, the edge, or nothing (a drop). */
    hit: CloudAt | null;
    /** The clouds that smiled (the one hit first, then its neighbours), the helmet that blushed. */
    smiled: CloudAt[]; blushed: CloudAt | null;
    useful: boolean;
}

export const width = (l: LevelDef): number => l.troop[0]!.length;
export const span = (l: LevelDef): number => l.cols - width(l);
/** The step `k` of a troop that goes back and forth between 0 and `span`, starting at `x` going `dir`. */
export function stepAt(l: LevelDef, k: number): number {
    const m = span(l); if (m <= 0) return l.x;
    let p = l.x, d = l.dir;
    for (let i = 0; i < k % (2 * m); i++) { if (p + d < 0 || p + d > m) d = -d as 1 | -1; p += d; }
    return p;
}
/** Where the troop's left edge is, in columns (a quarter while it glides). */
export function offsetAt(l: LevelDef, steps: number, t: number): number {
    if (l.move === 'fixe') return l.x;
    if (l.move === 'pas') return stepAt(l, steps);
    const k = Math.floor(t / STEP), ph = t % STEP, a = stepAt(l, k);
    if (ph < REST) return a;
    return a + (stepAt(l, k + 1) - a) * (ph - REST + 1) / (STEP - REST + 1);
}
/** Where the bird is, in columns (it flies from one column outside the sky to one column outside the other side); null
 * without a bird. */
export function birdAt(l: LevelDef, t: number): number | null {
    if (!l.bird) return null;
    const loop = (l.cols + 2) * BIRD_TICKS, u = ((t + l.bird.phase) % loop) / BIRD_TICKS - 1;
    return l.bird.dir > 0 ? u : l.cols - 1 - u;
}
export interface Drop { x: number; r: number; j: number; fall: number }
/** The drops in the air at tick `t`: each rain cloud let one go at the last multiple of `RAIN_PERIOD`, straight down from
 * where it was; `fall` goes from 1 (just left) to `FALL` (landing). */
export function dropsAt(l: LevelDef, s: Pick<State, 'troop' | 'steps'>, t: number): Drop[] {
    const fall = t % RAIN_PERIOD; if (fall < 1 || fall > FALL) return [];
    const at = t - fall, off = offsetAt(l, s.steps, at), out: Drop[] = [];
    s.troop.forEach((row, r) => row.split('').forEach((c, j) => { if (c === 'g') out.push({ x: Math.round(off + j), r, j, fall }); }));
    return out;
}
/** The lowest cloud of each column of the troop. */
function lowest(troop: readonly string[], j: number): CloudAt | null {
    for (let r = troop.length - 1; r >= 0; r--) { const c = troop[r]![j]!; if (c !== '.') return { r, j, kind: c }; }
    return null;
}
export function start(id: number): State {
    const l = levelOf(id);
    return { level: id, troop: [...l.troop], t: 0, steps: 0, lumi: Math.floor((l.cols - 1) / 2), touches: 0, hearts: 0, tries: 0, dry: 0, helps: 0, finished: false };
}
export const done = (troop: readonly string[]): boolean => !troop.some(row => row.split('').some(c => GRUMPY_OR_BLUSH.includes(c)));

/** What a heart thrown from column `col` at tick `at` does, without the help. */
function fly(l: LevelDef, s: State, col: number, at: number): Omit<Result, 'state' | 'helped' | 'useful' | 'throw'> {
    const offset = offsetAt(l, s.steps, at), bird = birdAt(l, at), x = col + (l.wind ?? 0);
    const none = { x, offset, bird, hit: null, smiled: [], blushed: null };
    if (dropsAt(l, s, at).some(d => d.x === col)) return { ...none, fail: 'pluie' };
    if (x < 0 || x >= l.cols) return { ...none, fail: 'bord' };
    if (bird !== null && Math.abs(bird - x) <= HIT) return { ...none, fail: 'oiseau' };
    const j = Math.round(x - offset), cloud = j >= 0 && j < width(l) && Math.abs(offset + j - x) <= HIT ? lowest(s.troop, j) : null;
    if (!cloud) {
        // Between two clouds when the heart goes up inside the troop, past it otherwise: the Moon bounces it back.
        const xs = s.troop.flatMap(row => row.split('').flatMap((c, k) => c === '.' ? [] : [offset + k]));
        return { ...none, fail: xs.length && x > Math.min(...xs) && x < Math.max(...xs) ? 'entre' : 'lune' };
    }
    if (cloud.kind === 's') return { ...none, hit: cloud, fail: 'bisou' };
    if (cloud.kind === 'c') return { ...none, hit: cloud, fail: null, blushed: cloud };
    const smiled = [cloud];
    if (cloud.kind === 'a') for (const k of [cloud.j - 1, cloud.j + 1]) { const c = s.troop[cloud.r]![k]; if (c && GRUMPY_OR_BLUSH.includes(c)) smiled.push({ r: cloud.r, j: k, kind: c }); }
    return { ...none, hit: cloud, fail: null, smiled };
}
/** One touch of the child: Lumi goes to column `col` at tick `at` (never before the sky's tick) and throws a heart. */
export function throwHeart(s: State, th: Throw): Result | null {
    const l = levelOf(s.level);
    if (s.finished || !Number.isInteger(th.col) || th.col < 0 || th.col >= l.cols || !Number.isInteger(th.at) || th.at < s.t) return null;
    const helped = helpOn(s) && hint(s, th.at) === th.col;
    const f = fly(l, s, th.col, th.at);
    const useful = !f.fail;
    const troop = s.troop.map((row, r) => row.split('').map((c, j) => f.smiled.some(m => m.r === r && m.j === j) ? '.' : f.blushed && f.blushed.r === r && f.blushed.j === j ? 'r' : c).join(''));
    const wet = f.fail === 'pluie', finished = done(troop);
    return {
        ...f, throw: { ...th }, useful, helped: helped && useful,
        state: { ...s, troop, t: th.at, steps: s.steps + (l.move === 'pas' && !wet ? 1 : 0), lumi: th.col, touches: s.touches + 1, hearts: s.hearts + (wet ? 0 : 1),
            tries: s.tries + (f.fail ? 1 : 0), dry: useful ? 0 : s.dry + 1, helps: s.helps + (helped && useful ? 1 : 0), finished }
    };
}
/** How good a column is for the help at tick `at`: clouds made to smile, a helmet made to blush, then closest to Lumi. */
const hintCache = new Map<string, number | null>();
export function hint(s: State, at: number): number | null {
    if (s.finished) return null;
    const l = levelOf(s.level), key = `${s.level}|${s.troop.join('/')}|${s.steps}|${s.lumi}|${at}`;
    if (!hintCache.has(key)) {
        if (hintCache.size > 50_000) hintCache.clear();
        let best: number | null = null, score = -Infinity;
        for (let c = 0; c < l.cols; c++) {
            const f = fly(l, s, c, at); if (f.fail) continue;
            const v = f.smiled.length * 100 + (f.blushed ? 50 : 0) - Math.abs(c - s.lumi);
            if (v > score) { score = v; best = c; }
        }
        hintCache.set(key, best);
    }
    return hintCache.get(key)!;
}
/** The sky repeats itself at most every `CYCLE` ticks: the next good moment always comes within it. */
export function cycleOf(l: LevelDef): number {
    const parts = [1];
    if (l.move === 'balance' && span(l) > 0) parts.push(2 * span(l) * STEP);
    if (l.bird) parts.push((l.cols + 2) * BIRD_TICKS);
    if (l.troop.some(r => r.includes('g'))) parts.push(RAIN_PERIOD);
    const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
    return parts.reduce((a, b) => a / gcd(a, b) * b, 1);
}
/** The next good moment from tick `from` on: the first tick where some column makes a cloud smile or blush. */
export function nextGood(s: State, from = s.t): { at: number; col: number } | null {
    if (s.finished) return null;
    const cycle = cycleOf(levelOf(s.level));
    for (let at = from; at < from + cycle; at++) { const c = hint(s, at); if (c !== null) return { at, col: c }; }
    return null;
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

export const cloudsOf = (l: LevelDef): number => l.troop.join('').replace(/\./g, '').length;
/** A cloud hides behind another: two clouds in the same column of the troop. */
const stacked = (l: LevelDef): boolean => Array.from({ length: width(l) }, (_, j) => l.troop.filter(r => r[j] !== '.').length).some(n => n > 1);
/** The new things a scene uses. */
export function featuresOf(l: LevelDef): Feature[] {
    const all = l.troop.join('');
    const has: Record<Feature, boolean> = {
        pas: l.move === 'pas', balance: l.move === 'balance', casque: all.includes('c'), oiseau: Boolean(l.bird), pluie: all.includes('g'),
        cache: stacked(l), arc: all.includes('a'), vent: Boolean(l.wind), ami: all.includes('s')
    };
    return features.filter(f => has[f]);
}
/** Clouds at most before scene 8. */
export const EARLY_CLOUDS = 6;
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(l: LevelDef): string[] {
    const out: string[] = [], w = width(l), all = l.troop.join('');
    // Six columns at most: the columns stay at least 44 px wide on a 320 px phone.
    if (l.cols < 5 || l.cols > 6) out.push('five or six columns');
    if (l.troop.length < 1 || l.troop.length > 3) out.push('one to three rows of clouds');
    if (l.troop.some(r => r.length !== w)) out.push('rows of the same length');
    if (!/^[.ncgas]+$/.test(all)) out.push('known clouds');
    if (l.x < 0 || l.x + w > l.cols) out.push('the troop inside the sky');
    if (l.move !== 'fixe' && span(l) < 1) out.push('room to move');
    if (!/[ncga]/.test(all)) out.push('a grumpy cloud');
    if (l.id < 8 && cloudsOf(l) > EARLY_CLOUDS) out.push(`at most ${EARLY_CLOUDS} clouds before scene 8`);
    if (cloudsOf(l) > 9) out.push('nine clouds at most');
    for (let j = 0; j < w; j++) {
        const col = l.troop.map(r => r[j]!);
        // A heart meets the lowest cloud of its column: a smiling cloud never stands under a grumpy one, a rain cloud is
        // always the lowest (its drops fall freely).
        col.forEach((c, r) => {
            if (c === 's' && col.slice(0, r).some(u => GRUMPY.includes(u))) out.push(`column ${j}: a grumpy cloud behind a smiling one`);
            if (c === 'g' && col.slice(r + 1).some(u => u !== '.')) out.push(`column ${j}: a rain cloud with a cloud under it`);
        });
    }
    if (l.troop[0]!.split('').every(c => c === '.') || l.troop.every(r => r[0] === '.') || l.troop.every(r => r[w - 1] === '.')) out.push('no empty edge to the troop');
    // The rain only where the troop moves by itself or not at all: the drops fall from where the cloud was.
    if (all.includes('g') && l.move === 'pas') out.push('no rain in a turn by turn scene');
    // The wind never in a turn by turn scene: at the far end of its way, the troop would stand out of the wind's reach until
    // a heart missed.
    if (l.wind && l.move === 'pas') out.push('no wind in a turn by turn scene');
    if (l.wind && l.move === 'fixe') { const from = l.x - l.wind, to = l.x + w - 1 - l.wind; if (from < 0 || to >= l.cols) out.push('every cloud within the wind’s reach'); }
    if (l.bird && (l.bird.phase < 0 || !Number.isInteger(l.bird.phase))) out.push('a bird phase');
    if (l.title.fr.length > 24 || l.title.en.length > 24) out.push('a short title');
    return out;
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 6;
/** The sky of a scene as it starts, top row first: the troop at its first place. */
function drawn(l: LevelDef): string[] {
    return Array.from({ length: 3 }, (_, r) => Array.from({ length: l.cols }, (_, x) => l.troop[r]?.[x - l.x] ?? '.').join(''));
}
/** How far apart two scenes are: the skies laid over each other from the top left corner, one per place that differs, two per
 * column more or less, three per new thing one has and not the other, two when the troop moves differently, two when the
 * wind or the bird goes the other way. */
export function distance(a: LevelDef, b: LevelDef): number {
    const ga = drawn(a), gb = drawn(b);
    let d = 2 * Math.abs(a.cols - b.cols) + (a.move !== b.move ? 2 : 0) + ((a.wind ?? 0) * (b.wind ?? 0) < 0 ? 2 : 0) + ((a.bird?.dir ?? 0) * (b.bird?.dir ?? 0) < 0 ? 2 : 0);
    for (let r = 0; r < 3; r++) for (let x = 0; x < Math.max(a.cols, b.cols); x++) if ((ga[r]![x] ?? '.') !== (gb[r]![x] ?? '.')) d++;
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d;
}
