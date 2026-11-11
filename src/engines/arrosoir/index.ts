import { features, handLevels, type Feature, type LevelDef } from './levels';
export { features, type Feature, type LevelDef } from './levels';
/** « L'arrosoir de CaliRoux »: CaliRoux stands high on his hill with a sling of soft water balloons. Thirsty flowers
 * droop on the meadow around him. The child pulls back with a finger, like a slingshot: the further, the stronger, the
 * other way from the pull; the balloon flies in a curve and goes splash, and the flowers in the splash drink, stand up and
 * open. When every flower is open, a rainbow and butterflies. No duel, no damage, no rival, no clock, no lives, no stock:
 * the balloon always comes back. A splash that waters no flower is a funny try.
 *
 * Pure and deterministic. A shot is (angle in whole degrees, power in whole percent); its flight is a pure function of the
 * shot, the wind and the scene (and of where the passing cloud stands, which moves one notch per balloon). Fixed steps. */
export const WIDTH = 160;
export const HEIGHT = 256;
/** The meadow's ground line. */
export const BASE = 246;
/** Gravity and the strongest throw, in board units per step; the wind adds this much speed per step per notch. */
export const GRAVITY = 0.05;
export const VMAX = 3.3;
export const WIND_ACC = 0.004;
/** On screen, steps per second of a flight. */
export const RATE = 90;
/** The balloon is a circle of this radius for every touch. */
export const BALL_R = 4;
/** What a finger can give: an angle from 0 (straight right) to 180 (straight left), a power from 10 to 100 percent. */
export const ANGLE_MIN = 0;
export const ANGLE_MAX = 180;
export const POWER_MIN = 10;
export const POWER_MAX = 100;
/** A flower is 18 wide and 30 high, and is drawn inside that box. A splash waters a flower when it falls within half a
 * flower plus `SPLASH_MARGIN` of its stem; with the giant watering can, within `BIG_SPLASH`. The splash reaches 20, the
 * distance between two flowers of a bouquet (18 wide and 2 apart, so that they never overlap): one splash on the middle
 * one waters all three, while only a bouquet ever drinks three flowers at once. */
export const FLOWER_HALF = 9;
export const FLOWER_H = 30;
export const SPLASH_MARGIN = 11;
export const SPLASH = FLOWER_HALF + SPLASH_MARGIN;
export const BIG_SPLASH = 32;
/** A splash this close to the sling is « too short »: the balloon rolls back to CaliRoux. */
export const SHORT = 16;
/** The sling's mouth is this high above the ground under it. */
export const SLING_H = 26;
/** CaliRoux's hill: a flat top `CALIROUX_TOP` each side of the sling (he stands on it), then a round slope
 * `CALIROUX_SLOPE` long down to the meadow. Flowers can stand on that slope: the meadow is tiered from his feet down. */
export const CALIROUX_TOP = 16;
export const CALIROUX_SLOPE = 30;
/** What each thing covers along the ground, as drawn (left and right of its foot): CaliRoux beside his sling, the cow and
 * her head, the apple tree's crown, the giant can and its spout. Two things are always `GAP` apart (half a flower), two
 * flowers `FLOWER_GAP` (a bouquet stands tight but no flower hides another). */
export const CALIROUX_SPAN = { left: 39, right: 9 } as const;
export const COW_SPAN = { left: 20, right: 16 } as const;
export const CAN_SPAN = { left: 25, right: 10 } as const;
export const GAP = 9;
export const FLOWER_GAP = 2;
/** CaliRoux's head, above the ground he stands on. */
export const CALIROUX_TALL = 43;
/** The share of the board's height the action must fill, from the highest thing to the meadow (390 × 844 phone included). */
export const ACTION_SHARE = 0.6;
export const TREE_R = 15;
export const COW_W = 26;
export const COW_H = 18;
export const CLOUD_RX = 20;
export const CLOUD_RY = 10;
/** The cloud moves this far after each balloon, and loops round the sky. */
export const CLOUD_STEP = 20;
export const CLOUD_LOOP = WIDTH + 40;
export const PHASES = CLOUD_LOOP / CLOUD_STEP;
/** Balloons in a row that water no flower before the help shows the good pull. */
export const DRY_HELP = 3;
const MAX_STEPS = 700;
/** Funny tries, each with its own animation, each met in at least one scene. `court`: too short, the balloon rolls back and
 * splashes CaliRoux, who shakes himself; `loin`: off the meadow, a far « plouf » and a fish jumping; `pousse`: on the
 * grass, a tuft of grass grows; `mare`: in the sand, a little puddle where a frog comes; `bisou`: on a flower already open,
 * it blows a kiss; `vache`: on the cow, « meuh », she shakes her horns; `etang`: in the pond, the duck rides the wave;
 * `arbre`: in the apple tree, an apple falls on CaliRoux's head; `nuage`: on the passing cloud, it rains a little. */
export const misses = ['court', 'loin', 'pousse', 'mare', 'bisou', 'vache', 'etang', 'arbre', 'nuage'] as const;
export type Miss = typeof misses[number];
export interface Shot { angle: number; power: number }
export interface Point { x: number; y: number }
export type ImpactKind = 'sol' | 'fleur' | 'arbre' | 'vache' | 'nuage' | 'etang' | 'loin';
export interface Impact { kind: ImpactKind; x: number; y: number; what: number }
export interface State {
    level: number;
    /** Balloons thrown so far: the cloud stands where `turn` puts it. */
    turn: number;
    /** Which flowers are open, in the order of the scene. */
    open: boolean[];
    /** Balloons in a row that watered nothing, all funny tries, flowers watered while the help was shown. */
    dry: number; tries: number; helps: number;
    /** The giant watering can was splashed: big balloons until the end of the scene. */
    big: boolean;
    /** Cosmetic traces of the funny tries: puddles in the sand, tufts of grass (their x). */
    puddles: number[]; tufts: number[];
    finished: boolean;
}
export interface Result { state: State; shot: Shot; points: Point[]; impact: Impact; drank: number[]; kissed: number[]; bonus: boolean; miss: Miss | null; helped: boolean }

export const has = (level: LevelDef, f: Feature): boolean => level.features.includes(f);
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** The ground of a scene, sampled every unit from x = 0 to WIDTH. */
const profiles = new Map<LevelDef, Float64Array>();
export function profile(level: LevelDef): Float64Array {
    const known = profiles.get(level); if (known) return known;
    const p = new Float64Array(WIDTH + 1);
    const bump = (x: number, cx: number, w: number, h: number): number => { const d = Math.abs(x - cx); return d < w / 2 ? h * (1 + Math.cos(Math.PI * d / (w / 2))) / 2 : 0; };
    const knoll = (x: number): number => { const d = Math.abs(x - level.caliroux.x) - CALIROUX_TOP; return d <= 0 ? level.caliroux.h : d < CALIROUX_SLOPE ? level.caliroux.h * (1 + Math.cos(Math.PI * d / CALIROUX_SLOPE)) / 2 : 0; };
    for (let x = 0; x <= WIDTH; x++) {
        let top = knoll(x);
        for (const h of level.hills) top = Math.max(top, bump(x, h.x, h.w, h.h));
        for (const m of level.mesas) if (x >= m.x0 && x <= m.x1) top = Math.max(top, m.h);
        p[x] = BASE - top;
    }
    profiles.set(level, p);
    return p;
}
/** The ground's height under `x` (smaller is higher). */
export function groundAt(level: LevelDef, x: number): number {
    const p = profile(level), cx = clamp(x, 0, WIDTH), i = Math.floor(cx), f = cx - i;
    return i >= WIDTH ? p[WIDTH]! : p[i]! * (1 - f) + p[i + 1]! * f;
}
/** Where the balloon leaves the sling. */
export const launch = (level: LevelDef): Point => ({ x: level.caliroux.x, y: groundAt(level, level.caliroux.x) - SLING_H });
/** The cloud's centre after `turn` balloons, or null. */
export function cloudAt(level: LevelDef, turn: number): Point | null {
    const c = level.cloud; if (!c) return null;
    const x = ((c.x + 20 + turn * CLOUD_STEP) % CLOUD_LOOP + CLOUD_LOOP) % CLOUD_LOOP - 20;
    return { x, y: c.y };
}
export const phaseOf = (level: LevelDef, turn: number): number => level.cloud ? turn % PHASES : 0;
const inRect = (x: number, y: number, r: number, x0: number, y0: number, x1: number, y1: number): boolean => {
    const px = clamp(x, x0, x1), py = clamp(y, y0, y1); return (x - px) ** 2 + (y - py) ** 2 < r * r;
};
/** A shot as a finger gives it: whole degrees and whole percent, within what a finger can give. */
export const quantize = (s: Shot): Shot => ({ angle: clamp(Math.round(s.angle), ANGLE_MIN, ANGLE_MAX), power: clamp(Math.round(s.power), POWER_MIN, POWER_MAX) });
/** The flight of a balloon: every step until it touches something (a flower, the cow, the apple tree, the cloud, the
 * ground, the pond) or leaves the meadow by a side. Pure: the same shot, wind and cloud give the same flight. */
export function flight(level: LevelDef, shot: Shot, cloud: Point | null): { points: Point[]; impact: Impact } {
    const q = quantize(shot), a = q.angle * Math.PI / 180, v = VMAX * q.power / 100, start = launch(level);
    let x = start.x, y = start.y, vx = v * Math.cos(a), vy = -v * Math.sin(a);
    const points: Point[] = [{ x, y }], wind = level.wind * WIND_ACC;
    const done = (kind: ImpactKind, what = -1, at: Point = { x, y }): { points: Point[]; impact: Impact } => ({ points, impact: { kind, x: at.x, y: at.y, what } });
    for (let k = 0; k < MAX_STEPS; k++) {
        vx += wind; vy += GRAVITY; x += vx; y += vy;
        points.push({ x, y });
        if (x < -8 || x > WIDTH + 8) return done('loin');
        for (let i = 0; i < level.flowers.length; i++) { const fx = level.flowers[i]!, g = groundAt(level, fx); if (inRect(x, y, BALL_R, fx - FLOWER_HALF + 1, g - FLOWER_H, fx + FLOWER_HALF - 1, g)) return done('fleur', i); }
        for (let i = 0; i < level.cows.length; i++) { const cx = level.cows[i]!, g = groundAt(level, cx); if (inRect(x, y, BALL_R, cx - COW_W / 2, g - COW_H, cx + COW_W / 2, g)) return done('vache', i); }
        for (let i = 0; i < level.trees.length; i++) {
            const t = level.trees[i]!, g = groundAt(level, t.x);
            if ((x - t.x) ** 2 + (y - (g - t.h)) ** 2 < (TREE_R + BALL_R) ** 2 || inRect(x, y, BALL_R, t.x - 3, g - t.h, t.x + 3, g)) return done('arbre', i);
        }
        if (cloud && ((x - cloud.x) / (CLOUD_RX + BALL_R)) ** 2 + ((y - cloud.y) / (CLOUD_RY + BALL_R)) ** 2 < 1) return done('nuage', 0);
        const g = groundAt(level, x);
        if (y + BALL_R >= g) {
            const at = { x, y: g };
            if (level.pond && x >= level.pond.x0 && x <= level.pond.x1) return done('etang', 0, at);
            return done('sol', -1, at);
        }
    }
    return done('loin');
}
/** How far a splash at `p` is from the stem of the flower standing at `fx`. */
export function reach(level: LevelDef, p: Point, fx: number): number {
    const g = groundAt(level, fx), sy = clamp(p.y, g - FLOWER_H, g);
    return Math.hypot(p.x - fx, p.y - sy);
}
/** Where the giant watering can's middle is. */
export const canAt = (level: LevelDef): Point | null => level.can === null ? null : { x: level.can, y: groundAt(level, level.can) - 10 };
export const radius = (s: State): number => s.big ? BIG_SPLASH : SPLASH;
export const onSand = (level: LevelDef, x: number): boolean => level.sand.some(z => x >= z.x0 && x <= z.x1);
/** What a splash at `impact` does: the thirsty flowers that drink, the open ones that blow a kiss, the giant can. */
export function splash(level: LevelDef, s: State, impact: Impact): { drank: number[]; kissed: number[]; bonus: boolean } {
    const r = radius(s), drank: number[] = [], kissed: number[] = [];
    if (impact.kind !== 'loin') level.flowers.forEach((fx, i) => { if (reach(level, impact, fx) <= r) (s.open[i] ? kissed : drank).push(i); });
    const c = canAt(level);
    const bonus = impact.kind !== 'loin' && !s.big && c !== null && Math.hypot(impact.x - c.x, impact.y - c.y) <= r;
    return { drank, kissed, bonus };
}
/** The funny try of a splash that watered nothing. */
export function missOf(level: LevelDef, impact: Impact, kissed: readonly number[]): Miss {
    if (kissed.length) return 'bisou';
    switch (impact.kind) {
        case 'vache': case 'arbre': case 'nuage': case 'etang': case 'loin': return impact.kind;
        default: return Math.abs(impact.x - level.caliroux.x) <= SHORT ? 'court' : onSand(level, impact.x) ? 'mare' : 'pousse';
    }
}

export function start(id: number): State {
    const l = levelOf(id);
    return { level: id, turn: 0, open: l.flowers.map(() => false), dry: 0, tries: 0, helps: 0, big: false, puddles: [], tufts: [], finished: false };
}
export const helpOn = (s: State): boolean => !s.finished && s.dry >= DRY_HELP;
/** One balloon. The balloon always comes back: there is no stock and nothing to lose. */
export function fire(s: State, raw: Shot): Result {
    const level = levelOf(s.level), shot = quantize(raw), { points, impact } = flight(level, shot, cloudAt(level, s.turn));
    if (s.finished) return { state: s, shot, points, impact, drank: [], kissed: [], bonus: false, miss: null, helped: false };
    const { drank, kissed, bonus } = splash(level, s, impact);
    const miss = drank.length || bonus ? null : missOf(level, impact, kissed);
    const helped = helpOn(s) && drank.length > 0;
    const open = s.open.map((o, i) => o || drank.includes(i));
    const state: State = {
        ...s, turn: s.turn + 1, open, dry: drank.length ? 0 : bonus ? s.dry : s.dry + 1, tries: s.tries + (miss ? 1 : 0), helps: s.helps + (helped ? 1 : 0), big: s.big || bonus,
        puddles: miss === 'mare' ? [...s.puddles, impact.x].slice(-3) : s.puddles, tufts: miss === 'pousse' ? [...s.tufts, impact.x].slice(-6) : s.tufts,
        finished: open.every(Boolean)
    };
    return { state, shot, points, impact, drank, kissed, bonus, miss, helped };
}

/** Every shot of the help's grid (each degree, every second percent) with what its splash reaches, per scene and per place of
 * the cloud: the flowers within a splash, within a big splash, and whether the giant can is in reach. */
export interface Grid { shots: Shot[]; small: Int32Array; big: Int32Array; can: Uint8Array; canBig: Uint8Array }
const grids = new Map<string, Grid>();
export function grid(level: LevelDef, phase: number): Grid {
    const key = `${level.id}:${phase}:${level.flowers.join()}`, known = grids.get(key); if (known) return known;
    const shots: Shot[] = [];
    for (let angle = ANGLE_MIN; angle <= ANGLE_MAX; angle++) for (let power = POWER_MIN; power <= POWER_MAX; power += 2) shots.push({ angle, power });
    const small = new Int32Array(shots.length), big = new Int32Array(shots.length), can = new Uint8Array(shots.length), canBig = new Uint8Array(shots.length);
    const cloud = cloudAt(level, phase), c = canAt(level);
    shots.forEach((shot, k) => {
        const { impact } = flight(level, shot, cloud);
        if (impact.kind === 'loin') return;
        level.flowers.forEach((fx, i) => { const d = reach(level, impact, fx); if (d <= SPLASH) small[k]! |= 1 << i; if (d <= BIG_SPLASH) big[k]! |= 1 << i; });
        if (c) { const d = Math.hypot(impact.x - c.x, impact.y - c.y); can[k] = d <= SPLASH ? 1 : 0; canBig[k] = d <= BIG_SPLASH ? 1 : 0; }
    });
    const g: Grid = { shots, small, big, can, canBig };
    grids.set(key, g);
    return g;
}
const bits = (m: number): number => { let n = 0; while (m) { n += m & 1; m >>>= 1; } return n; };
const thirstyMask = (s: State): number => s.open.reduce((m, o, i) => o ? m : m | (1 << i), 0);
/** The good pull the help shows: the shot of the grid that waters the most thirsty flowers, and among those the one whose
 * neighbours (two degrees, four percent around) water as many — the easiest to copy — then the closest to 45°. */
export function hint(s: State): Shot | null {
    if (s.finished) return null;
    const level = levelOf(s.level), g = grid(level, phaseOf(level, s.turn)), masks = s.big ? g.big : g.small, want = thirstyMask(s);
    const P = (POWER_MAX - POWER_MIN) / 2 + 1, count = (k: number): number => bits(masks[k]! & want);
    let best = -1, bestScore = -Infinity;
    for (let k = 0; k < g.shots.length; k++) {
        const n = count(k); if (!n) continue;
        let near = 0;
        const ai = Math.floor(k / P), pi = k % P;
        for (let da = -2; da <= 2; da++) for (let dp = -2; dp <= 2; dp++) { const a = ai + da, p = pi + dp; if (a >= 0 && a <= ANGLE_MAX && p >= 0 && p < P && count(a * P + p) >= n) near++; }
        const score = n * 1000 + near * 10 - Math.abs(g.shots[k]!.angle - 45) / 10;
        if (score > bestScore) { bestScore = score; best = k; }
    }
    return best < 0 ? null : g.shots[best]!;
}
/** Whether some shot of the grid still waters a thirsty flower from this state (never a dead end). */
export function usefulShots(s: State): number {
    const level = levelOf(s.level), g = grid(level, phaseOf(level, s.turn)), masks = s.big ? g.big : g.small, want = thirstyMask(s);
    let n = 0; for (let k = 0; k < masks.length; k++) if (masks[k]! & want) n++;
    return n;
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

/** Three flowers close enough for one splash: their feet within this span, on the same ground. */
export const BOUQUET = 40;
const bouquet = (level: LevelDef): boolean => level.flowers.some((a, i) => level.flowers.filter((b, j) => j !== i && b >= a && b - a <= BOUQUET && groundAt(level, b) === groundAt(level, a)).length >= 2);
/** What a scene really has, read from its geometry: `features` must say the same. */
export function present(level: LevelDef): Record<Feature, boolean> {
    return {
        colline: level.hills.length > 0, vent: level.wind !== 0, haut: level.mesas.length > 0 && level.flowers.some(x => level.mesas.some(m => x >= m.x0 && x <= m.x1)),
        arbre: level.trees.length > 0, vache: level.cows.length > 0, etang: level.pond !== null, sable: level.sand.length > 0, nuage: level.cloud !== null,
        groupe: bouquet(level), geant: level.can !== null, pointilles: level.dots < 1
    };
}
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], want = present(level), c = level.caliroux.x;
    for (const f of features) if (has(level, f) !== want[f]) out.push(`${f} where the scene says so`);
    if (new Set(level.features).size !== level.features.length || level.features.some(f => !features.includes(f))) out.push('known features once');
    if (level.flowers.length < 1 || level.flowers.length > 7) out.push('one to seven flowers');
    if (level.id < 8 && level.flowers.length > 4) out.push('four flowers at most before scene 8');
    if (c < 14 || c > WIDTH - 14) out.push('CaliRoux inside the meadow');
    const sorted = [...level.flowers].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) if (sorted[i]! - sorted[i - 1]! < 2 * FLOWER_HALF + FLOWER_GAP) out.push('flowers apart');
    for (const x of level.flowers) {
        if (x < FLOWER_HALF + 3 || x > WIDTH - FLOWER_HALF - 1) out.push(`flower ${x}: inside the meadow`);
        for (const m of level.mesas) for (const edge of [m.x0, m.x1]) if (Math.abs(x - edge) < 6) out.push(`flower ${x}: not on the edge of a rock`);
    }
    out.push(...overlaps(level));
    if (level.pond && (level.pond.x1 - level.pond.x0 < 20 || Math.abs(groundAt(level, level.pond.x0) - BASE) > 0 || Math.abs(groundAt(level, level.pond.x1) - BASE) > 0)) out.push('a pond on flat ground');
    if (level.cloud && (level.cloud.y > 80 || level.cloud.y < 40)) out.push('a cloud high in the sky, above the sling');
    if (!Number.isInteger(level.wind) || Math.abs(level.wind) > 2) out.push('a gentle wind');
    if (!(level.dots > 0 && level.dots <= 1)) out.push('dots');
    for (let i = 0; i < level.flowers.length; i++) {
        // Wherever the cloud stands, some pull waters every flower: never a dead end.
        for (let p = 0; p < (level.cloud ? PHASES : 1); p++) if (!grid(level, p).small.some(m => (m & (1 << i)) !== 0)) { out.push(`flower ${level.flowers[i]}: some pull waters it`); break; }
    }
    return out;
}

/** The box each thing of a scene covers on the board, as drawn: CaliRoux beside his sling, each flower, an apple tree's
 * trunk and crown, the cow and her head, the giant can and its spout, the pond, each patch of sand. */
export interface Footprint { what: string; x0: number; x1: number; y0: number; y1: number }
export function footprints(level: LevelDef): Footprint[] {
    const c = level.caliroux.x, g = (x: number): number => groundAt(level, x), box = (what: string, x0: number, x1: number, y0: number, y1: number): Footprint => ({ what, x0, x1, y0, y1 });
    const strip = (what: string, x0: number, x1: number): Footprint => { const ys = Array.from({ length: Math.max(2, Math.ceil(x1 - x0) + 1) }, (_, i) => g(x0 + i * (x1 - x0) / Math.max(1, Math.ceil(x1 - x0)))); return box(what, x0, x1, Math.min(...ys) - 2, Math.max(...ys) + 7); };
    return [
        box('CaliRoux', c - CALIROUX_SPAN.left, c + CALIROUX_SPAN.right, g(c - 15) - CALIROUX_TALL, g(c)),
        ...level.flowers.map(x => box(`flower ${x}`, x - FLOWER_HALF, x + FLOWER_HALF, g(x) - FLOWER_H, g(x))),
        ...level.trees.flatMap(t => [box(`trunk ${t.x}`, t.x - 3, t.x + 3, g(t.x) - t.h, g(t.x)), box(`crown ${t.x}`, t.x - TREE_R, t.x + TREE_R, g(t.x) - t.h - TREE_R, g(t.x) - t.h + TREE_R)]),
        ...level.cows.map(x => box(`cow ${x}`, x - COW_SPAN.left, x + COW_SPAN.right, g(x) - COW_H - 6, g(x))),
        ...(level.can === null ? [] : [box(`can ${level.can}`, level.can - CAN_SPAN.left, level.can + CAN_SPAN.right, g(level.can) - 22, g(level.can))]),
        ...(level.pond ? [strip('pond', level.pond.x0, level.pond.x1)] : []),
        ...level.sand.map(z => strip(`sand ${z.x0}`, z.x0, z.x1))
    ];
}
/** Things that cover one another, or stand closer than half a flower: nothing in a scene may hide anything else. */
export function overlaps(level: LevelDef): string[] {
    const out: string[] = [], all = footprints(level);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i]!, b = all[j]!;
        if (a.what.split(' ')[1] === b.what.split(' ')[1] && /^(trunk|crown)/.test(a.what) && /^(trunk|crown)/.test(b.what)) continue;
        const gap = a.what.startsWith('flower') && b.what.startsWith('flower') ? FLOWER_GAP : GAP;
        if (a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap) out.push(`${a.what} and ${b.what} apart`);
    }
    return out;
}
/** The highest thing of a scene (smaller is higher): CaliRoux's head, a flower, a crown, the cow, the can, the cloud. */
export function actionTop(level: LevelDef): number {
    const g = (x: number): number => groundAt(level, x), c = level.caliroux.x;
    return Math.min(g(c - 15) - CALIROUX_TALL, ...level.flowers.map(x => g(x) - FLOWER_H), ...level.trees.map(t => g(t.x) - t.h - TREE_R),
        ...level.cows.map(x => g(x) - COW_H - 6), ...(level.can === null ? [] : [g(level.can) - 22]), ...(level.cloud ? [level.cloud.y - CLOUD_RY] : []));
}

/** Two scenes play differently when they differ in at least this many places, counted by `distance`. */
export const MIN_GAP = 6;
/** Cells of 10 × 10 whose content differs (flower, ground line, rock, tree, cow, pond, sand, cloud, giant can, CaliRoux),
 * plus one per notch of wind and per tenth of dotted line that differs, plus four per feature one scene has and the other not. */
export function distance(a: LevelDef, b: LevelDef): number {
    const canon = (l: LevelDef): Map<string, string> => {
        const out = new Map<string, string>(), put = (x: number, y: number, v: string): void => { const k = `${Math.floor(x / 10)}:${Math.floor(y / 10)}`; out.set(k, (out.get(k) ?? '') + v); };
        for (let x = 5; x < WIDTH; x += 10) put(x, groundAt(l, x), 'g');
        for (const x of l.flowers) put(x, groundAt(l, x) - 14, 'f');
        for (const t of l.trees) put(t.x, groundAt(l, t.x) - t.h, 't');
        for (const x of l.cows) put(x, groundAt(l, x) - 10, 'c');
        if (l.pond) for (let x = l.pond.x0; x < l.pond.x1; x += 10) put(x, BASE, 'e');
        for (const z of l.sand) for (let x = z.x0; x < z.x1; x += 10) put(x, groundAt(l, x) + 4, 's');
        if (l.cloud) put(l.cloud.x, l.cloud.y, 'n');
        if (l.can !== null) put(l.can, groundAt(l, l.can) - 10, 'a');
        put(l.caliroux.x, groundAt(l, l.caliroux.x) - 20, 'C');
        return out;
    };
    const ca = canon(a), cb = canon(b), places = new Set([...ca.keys(), ...cb.keys()]);
    let d = Math.abs(a.wind - b.wind) + Math.round(Math.abs(a.dots - b.dots) * 10);
    for (const k of places) if (ca.get(k) !== cb.get(k)) d++;
    for (const f of features) if (has(a, f) !== has(b, f)) d += 4;
    return d;
}
