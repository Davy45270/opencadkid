import { colors, features, handLevels, letters, paths, type ColorId, type Feature, type LevelDef, type PathId, type Point } from './levels';
export { colors, features, paths, type ColorId, type Feature, type LevelDef, type PathId, type Point, type Rock } from './levels';
/** « Le collier de Boubou »: a necklace of coloured beads lies along a path; Boubou throws a bead where the child aims,
 * the bead slips into the necklace, and three or more of the same colour that touch fly away. The two ends then meet,
 * and if they make three again, they fly away too (a chain). The necklace never moves by itself: no clock, no hole that
 * swallows, no lives, nothing to lose. A bead that makes no line still goes into the necklace, with a funny reaction; a
 * bead thrown into the void goes boing on the edge and comes back to Boubou's hand.
 *
 * The engine is pure and deterministic: a necklace is a list of beads, a throw is (place, colour). The aiming geometry
 * (board units: the board is 160 × 250, a bead has a radius of 10) only chooses the place. */
export const WIDTH = 160;
export const HEIGHT = 250;
export const R = 10;
/** Distance between two bead centres along the thread: they touch. */
export const GAP = 2 * R;
/** Centre distance at which a flying bead touches a bead of the necklace. */
export const CONTACT = 17;
/** Where Boubou stands: at the bottom, or in the middle when the necklace goes all around him. */
export const LAUNCH: Point = { x: 80, y: 218 };
export const MIDDLE: Point = { x: 80, y: 125 };
/** Throws in a row without a line before a good place pulses on the necklace. */
export const DRY_HELP = 3;
/** Every fourth bead is a rainbow in the scenes that have them; the scenes that bring it in alone start with one. */
export const RAINBOW_EVERY = 4;
/** How much a place where a colour makes a line, or a pair, counts when choosing Boubou's next bead (see `weights`). */
export const LINE_WEIGHT = 40;
export const PAIR_WEIGHT = 4;
/** Funny tries: a throw that makes no line. Each has its own animation, and each is met in at least one scene. */
export const misses = ['boing', 'toc', 'dodo', 'chatouille', 'bout', 'rougit'] as const;
export type Miss = typeof misses[number];
export type Ammo = ColorId | 'arc';
export interface Bead { id: number; color: ColorId; asleep: boolean }
/** Where a bead goes: necklace `neck`, before the bead `index` (`index` = length: after the last one). */
export interface Place { neck: number; index: number }
export interface State {
    level: number; necks: Bead[][]; nextId: number; shots: number; queue: [Ammo, Ammo]; seed: number;
    /** Throws in a row without a line. */
    dry: number; helps: number; flown: number; finished: boolean;
}
/** A line that flew away: `chain` 0 is the line the bead made, 1 and more the ends meeting afterwards. */
export interface Pop { neck: number; beads: Bead[]; chain: number; at: number }
export interface Shot {
    place: Place | null; ammo: Ammo; bead: Bead | null; path: Point[]; bounces: number;
    pops: Pop[]; woke: Bead[]; miss: Miss | null; helped: boolean;
    /** The bead that slid off the far end because the necklace had no more room. */
    dropped: Bead | null;
}
export interface Trace { path: Point[]; bounces: number; end: Point; place: Place | null }

export const has = (level: LevelDef, f: Feature): boolean => level.features.includes(f);
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const launchOf = (level: LevelDef): Point => has(level, 'tour') ? MIDDLE : LAUNCH;
export const rainbowAt = (level: LevelDef, index: number): boolean => has(level, 'arc') && index % RAINBOW_EVERY === (level.features.length === 1 ? 0 : RAINBOW_EVERY - 1);

/* ---------- Paths ---------- */
export interface Track { points: readonly Point[]; cum: number[]; length: number }
const tracks = new Map<PathId, Track>();
export function track(id: PathId): Track {
    let t = tracks.get(id);
    if (!t) {
        const points = paths[id], cum = [0];
        for (let i = 1; i < points.length; i++) cum.push(cum[i - 1]! + Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y));
        t = { points, cum, length: cum[cum.length - 1]! };
        tracks.set(id, t);
    }
    return t;
}
/** The point at distance `s` along a path, and the direction of the path there. */
export function pointAt(t: Track, s: number): { p: Point; dir: Point } {
    const d = Math.max(0, Math.min(t.length, s));
    let i = 1;
    while (i < t.cum.length - 1 && t.cum[i]! < d) i++;
    const a = t.points[i - 1]!, b = t.points[i]!, len = t.cum[i]! - t.cum[i - 1]!, k = len ? (d - t.cum[i - 1]!) / len : 0;
    return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, dir: len ? { x: (b.x - a.x) / len, y: (b.y - a.y) / len } : { x: 1, y: 0 } };
}
/** How many beads a path holds without squeezing them. */
export const capacity = (id: PathId): number => Math.floor((track(id).length - 2 * R) / GAP) + 1;
/** Beads a necklace may hold: never more than it starts with. A bead that makes no line still goes in, and the bead at
 * the far end slides off the string and flies away, so that a child throwing anywhere always gets closer to the end
 * (measured: with room for one more bead, a robot throwing at random needed up to 396 throws in a scene). */
export const roomOf = (level: LevelDef, k: number): number => level.necklaces[k]!.beads.length;
/** Spacing of `n` beads on a path: they touch, unless there are more than the path holds, then they squeeze. */
export const spacing = (id: PathId, n: number): number => n <= 1 ? GAP : Math.min(GAP, (track(id).length - 2 * R) / (n - 1));
/** Centre and direction of every bead: the first one at the clasp, the others one after the other. */
export function layout(level: LevelDef, necks: readonly (readonly Bead[])[]): { p: Point; dir: Point }[][] {
    return necks.map((beads, k) => { const id = level.necklaces[k]!.path, t = track(id), gap = spacing(id, beads.length); return beads.map((_, i) => pointAt(t, R + i * gap)); });
}

/* ---------- Scenes ---------- */
export function parse(level: LevelDef): Bead[][] {
    let id = 0;
    return level.necklaces.map(n => n.beads.split('').map(ch => ({ id: id++, color: letters[ch.toLowerCase()]!, asleep: ch !== ch.toLowerCase() })));
}
/** The colours of a scene, in the catalogue order. */
export function palette(level: LevelDef): ColorId[] { const used = new Set(parse(level).flat().map(b => b.color)); return colors.filter(c => used.has(c)); }
/** Pairs of colours too close to share a scene (the test measures them in CIELAB). */
export const closeColors: readonly (readonly [ColorId, ColorId])[] = [['rouge', 'orange'], ['orange', 'jaune'], ['bleu', 'violet']];
/** Distance from a point to a path. */
function away(p: Point, id: PathId): number {
    const pts = paths[id];
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!, b = pts[i]!, dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy, k = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
        best = Math.min(best, Math.hypot(p.x - a.x - dx * k, p.y - a.y - dy * k));
    }
    return best;
}
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], used = palette(level), necks = parse(level);
    if (level.necklaces.length !== (has(level, 'deux') ? 2 : 1)) out.push('two necklaces where the scene says so');
    for (const n of level.necklaces) {
        if (!/^[ojvbprOJVBPR]+$/.test(n.beads)) out.push('known beads');
        if (!(n.path in paths)) out.push('a known path');
        else {
            if (n.beads.length > capacity(n.path)) out.push(`the necklace fits on ${n.path}`);
            if (/^(tour|tourG|tourD)$/.test(n.path) !== has(level, 'tour')) out.push('around Boubou where the scene says so');
            for (const pt of paths[n.path]) if (pt.x < R || pt.x > WIDTH - R || pt.y < R || pt.y > HEIGHT - R) out.push('the path stays on the board');
        }
        if (/(.)\1\1/i.test(n.beads.replace(/[A-Z]/g, '.'))) out.push('no line of three to start with');
    }
    if (used.length < 2 || used.length > 4) out.push('two to four colours');
    for (const [a, b] of closeColors) if (used.includes(a) && used.includes(b)) out.push(`${a} and ${b} look alike`);
    if (has(level, 'dodo') !== necks.flat().some(b => b.asleep)) out.push('sleeping beads where the scene says so');
    if (has(level, 'rocher') !== Boolean(level.rocks?.length)) out.push('a rock where the scene says so');
    const launch = launchOf(level);
    for (const [x, y, r] of level.rocks ?? []) {
        for (const n of level.necklaces) if (away({ x, y }, n.path) < r + R + 4) out.push('the rock stays clear of the necklace');
        if (Math.hypot(x - launch.x, y - launch.y) < r + 2 * R) out.push('the rock stays clear of Boubou');
    }
    if (level.hand && !palette(level).includes(level.hand)) out.push('a first bead of the scene');
    // Boubou reaches most places from where he stands (a rock or the beads in front hide a few).
    if (levels[level.id - 1] === level && reach({ level: level.id, necks }).length < 0.6 * necks.reduce((t, n) => t + n.length + 1, 0)) out.push('most places in reach');
    if (new Set(level.features).size !== level.features.length || level.features.some(f => !features.includes(f))) out.push('known features once');
    return out;
}

/* ---------- Aiming ---------- */
function hitCircle(p: Point, d: Point, c: Point, radius: number): number | null {
    const fx = p.x - c.x, fy = p.y - c.y, b = fx * d.x + fy * d.y, cc = fx * fx + fy * fy - radius * radius;
    if (b >= 0 || cc <= 0) return null;
    const disc = b * b - cc;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t > 1e-7 ? t : null;
}
/** Leaving the board (inset by a bead radius) from p along d. */
function exitAt(p: Point, d: Point): number {
    let t = Infinity;
    if (d.x > 1e-9) t = Math.min(t, (WIDTH - R - p.x) / d.x); else if (d.x < -1e-9) t = Math.min(t, (R - p.x) / d.x);
    if (d.y > 1e-9) t = Math.min(t, (HEIGHT - R - p.y) / d.y); else if (d.y < -1e-9) t = Math.min(t, (R - p.y) / d.y);
    return Math.max(0, t);
}
/** The place a bead takes when it touches bead `index` at `q`: before it or after it, by the side it touches. */
function placeOf(neck: number, index: number, q: Point, at: { p: Point; dir: Point }): Place {
    return { neck, index: (q.x - at.p.x) * at.dir.x + (q.y - at.p.y) * at.dir.y > 0 ? index + 1 : index };
}
/** Flight of a bead thrown at `angle` (0 straight up, negative to the left, the whole circle): it bounces once on a rock,
 * stops on the first bead it touches, or goes boing on the edge of the board (place null). */
export function trace(s: Pick<State, 'level' | 'necks'>, angle: number): Trace {
    const level = levelOf(s.level), beads = layout(level, s.necks), launch = launchOf(level);
    let p = { ...launch }, d = { x: Math.sin(angle), y: -Math.cos(angle) }, bounces = 0;
    const path: Point[] = [p];
    for (let leg = 0; leg < 3; leg++) {
        let t = exitAt(p, d), hit: { neck: number; index: number } | null = null, rock: Point | null = null;
        for (let k = 0; k < beads.length; k++) for (let i = 0; i < beads[k]!.length; i++) { const u = hitCircle(p, d, beads[k]![i]!.p, CONTACT); if (u !== null && u < t) { t = u; hit = { neck: k, index: i }; rock = null; } }
        for (const [x, y, r] of level.rocks ?? []) { const u = hitCircle(p, d, { x, y }, r + R); if (u !== null && u < t) { t = u; rock = { x, y }; hit = null; } }
        const q = { x: p.x + d.x * t, y: p.y + d.y * t };
        path.push(q);
        if (hit) return { path, bounces, end: q, place: placeOf(hit.neck, hit.index, q, beads[hit.neck]![hit.index]!) };
        if (!rock || bounces >= 1) return { path, bounces, end: q, place: null };
        const l = Math.hypot(q.x - rock.x, q.y - rock.y), n = { x: (q.x - rock.x) / l, y: (q.y - rock.y) / l }, dot = d.x * n.x + d.y * n.y;
        d = { x: d.x - 2 * dot * n.x, y: d.y - 2 * dot * n.y }; p = q; bounces++;
    }
    return { path, bounces, end: p, place: null };
}
export const AIM_STEPS = 360;
/** The aims the help, the robots and the tests look at: one per degree, all the way round. */
export const aims: readonly number[] = Array.from({ length: AIM_STEPS }, (_, i) => -Math.PI + 2 * Math.PI * i / AIM_STEPS);
export const placeKey = (p: Place): string => `${p.neck}:${p.index}`;
export interface Reach { place: Place; aim: number; bounces: number }
const reachCache = new WeakMap<readonly (readonly Bead[])[], Reach[]>();
/** Every place Boubou can reach from where he stands, each with the straightest aim that gets there (fewest bounces
 * first). Computed like `trace`, with a quick look at the direction of each bead first. */
export function reach(s: Pick<State, 'level' | 'necks'>): Reach[] {
    const cached = reachCache.get(s.necks);
    if (cached) return cached;
    const level = levelOf(s.level), launch = launchOf(level), beads = layout(level, s.necks), rocks = level.rocks ?? [];
    const polar = beads.flatMap((list, k) => list.map((b, i) => { const dx = b.p.x - launch.x, dy = b.p.y - launch.y, dist = Math.hypot(dx, dy); return { k, i, b, angle: Math.atan2(dx, -dy), half: Math.asin(Math.min(1, CONTACT / dist)) + 1e-3 }; }));
    const rockPolar = rocks.map(([x, y, r]) => { const dx = x - launch.x, dy = y - launch.y, dist = Math.hypot(dx, dy); return { angle: Math.atan2(dx, -dy), half: Math.asin(Math.min(1, (r + R) / dist)) + 1e-3 }; });
    const wrap = (a: number): number => Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    const found = new Map<string, Reach>();
    for (const a of aims) {
        let place: Place | null = null, bounces = 0;
        if (rockPolar.some(r => wrap(a - r.angle) <= r.half)) { const f = trace(s, a); place = f.place; bounces = f.bounces; }
        else {
            const d = { x: Math.sin(a), y: -Math.cos(a) };
            let t = Infinity, best: typeof polar[number] | null = null;
            for (const c of polar) if (wrap(a - c.angle) <= c.half) { const u = hitCircle(launch, d, c.b.p, CONTACT); if (u !== null && u < t) { t = u; best = c; } }
            if (best && t < exitAt(launch, d)) place = placeOf(best.k, best.i, { x: launch.x + d.x * t, y: launch.y + d.y * t }, best.b);
        }
        if (!place) continue;
        const k = placeKey(place), old = found.get(k);
        if (!old || bounces < old.bounces || (bounces === old.bounces && Math.abs(a) < Math.abs(old.aim))) found.set(k, { place, aim: a, bounces });
    }
    const out = [...found.values()].sort((x, y) => x.place.neck - y.place.neck || x.place.index - y.place.index);
    reachCache.set(s.necks, out);
    return out;
}

/* ---------- Beads ---------- */
/** Mulberry32 step: same values as rng.ts, but the state stays in the game state. */
function rand(seed: number): [number, number] {
    const value = (seed + 1831565813) | 0;
    let n = Math.imul(value ^ value >>> 15, 1 | value);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return [((n ^ n >>> 14) >>> 0) / 4294967296, value];
}
/** The run of awake beads of one colour around `i`. */
function run(beads: readonly Bead[], i: number): [number, number] {
    const b = beads[i];
    if (!b || b.asleep) return [i, i - 1];
    let a = i, z = i;
    while (a > 0 && !beads[a - 1]!.asleep && beads[a - 1]!.color === b.color) a--;
    while (z < beads.length - 1 && !beads[z + 1]!.asleep && beads[z + 1]!.color === b.color) z++;
    return [a, z];
}
/** Colours Boubou may hold: those next to a place he can reach. A colour counts LINE_WEIGHT times for each place where
 * it would make a line, PAIR_WEIGHT times where it would make a pair, once next to a sleeping bead: a child who throws
 * anywhere still sees beads fly away soon. */
export function weights(s: Pick<State, 'level' | 'necks'>): Map<ColorId, number> {
    const lines = new Map<ColorId, number>(), pairs = new Map<ColorId, number>();
    for (const { place } of reach(s)) {
        const beads = s.necks[place.neck]!, seen = new Set<ColorId>();
        for (const i of [place.index - 1, place.index]) {
            const b = beads[i];
            if (!b || seen.has(b.color)) continue;
            seen.add(b.color);
            let size = 1;
            for (let k = place.index - 1; k >= 0 && !beads[k]!.asleep && beads[k]!.color === b.color; k--) size++;
            for (let k = place.index; k < beads.length && !beads[k]!.asleep && beads[k]!.color === b.color; k++) size++;
            if (size >= 3) lines.set(b.color, (lines.get(b.color) ?? 0) + 1); else pairs.set(b.color, (pairs.get(b.color) ?? 0) + (size === 2 ? PAIR_WEIGHT : 1));
        }
    }
    // Places where a colour makes a line count squared: the colour with the most of them comes most often.
    const out = new Map<ColorId, number>();
    for (const c of colors) { const w = LINE_WEIGHT * (lines.get(c) ?? 0) ** 2 + (pairs.get(c) ?? 0); if (w) out.set(c, w); }
    return out;
}
/** The bead Boubou gets for throw number `index`: a rainbow on schedule, otherwise a colour next to a place he can reach. */
function pick(s: Pick<State, 'level' | 'necks'>, index: number, seed: number): [Ammo, number] {
    const level = levelOf(s.level);
    if (rainbowAt(level, index)) return ['arc', seed];
    const pool = [...weights(s)].sort((a, b) => colors.indexOf(a[0]) - colors.indexOf(b[0]));
    const total = pool.reduce((t, [, w]) => t + w, 0), [r, next] = rand(seed);
    if (!total) { const left = colors.filter(c => s.necks.some(n => n.some(b => b.color === c))); return [left[Math.floor(r * left.length)] ?? palette(level)[0]!, next]; }
    let x = r * total;
    for (const [c, w] of pool) { if (x < w) return [c, next]; x -= w; }
    return [pool[pool.length - 1]![0], next];
}
/** Boubou may hold this bead here: a rainbow, or a colour next to a place he can reach. */
export const holdable = (s: Pick<State, 'level' | 'necks'>, a: Ammo): boolean => a === 'arc' || weights(s).has(a);
export function start(id: number): State {
    const level = levelOf(id), necks = parse(level), base = { level: id, necks };
    const [picked, s1] = pick(base, 0, id * 7919 + 13), [second, s2] = pick(base, 1, s1), first = level.hand ?? picked;
    return { level: id, necks, nextId: necks.flat().length, shots: 0, queue: [first, second], seed: s2, dry: 0, helps: 0, flown: 0, finished: false };
}
/** The colour a rainbow bead takes at a place: the neighbour it makes the longest line with (the left one on a tie). */
function rainbowColor(beads: readonly Bead[], index: number): ColorId {
    const options = [beads[index - 1], beads[index]].filter((b): b is Bead => Boolean(b));
    let best: ColorId = options[0]?.color ?? 'rouge', size = -1;
    for (const o of options) {
        const trial = [...beads.slice(0, index), { id: -1, color: o.color, asleep: false }, ...beads.slice(index)], [a, z] = run(trial, index);
        if (z - a > size) { size = z - a; best = o.color; }
    }
    return best;
}
/** The necklaces after a bead of `ammo` goes in at `place`: the line it makes flies away, the ends meet, sleeping beads
 * at the meeting point wake up, and the ends fly away again as long as they make three. */
export function apply(necks: readonly (readonly Bead[])[], place: Place, ammo: Ammo, id: number): { necks: Bead[][]; bead: Bead; pops: Pop[]; woke: Bead[] } {
    let beads = [...necks[place.neck]!];
    const bead: Bead = { id, color: ammo === 'arc' ? rainbowColor(beads, place.index) : ammo, asleep: false };
    beads.splice(place.index, 0, bead);
    const pops: Pop[] = [], woke: Bead[] = [];
    let [a, z] = run(beads, place.index);
    if (z - a >= 2) {
        let chain = 0;
        for (;;) {
            pops.push({ neck: place.neck, beads: beads.slice(a, z + 1), chain, at: a });
            beads = [...beads.slice(0, a), ...beads.slice(z + 1)];
            // The ends meet at `a`: a sleeping bead on either side wakes up.
            for (const i of [a - 1, a]) { const b = beads[i]; if (b?.asleep) { const w = { ...b, asleep: false }; beads[i] = w; woke.push(w); } }
            const left = run(beads, a - 1), right = run(beads, a);
            const lines = [left, right].filter(([x, y]) => y - x >= 2);
            if (!lines.length) break;
            a = Math.min(...lines.map(l => l[0])); z = Math.max(...lines.map(l => l[1])); chain++;
        }
    }
    const out = necks.map(x => [...x]); out[place.neck] = beads;
    return { necks: out, bead, pops, woke };
}
/** How good a throw is for the greedy player and for the help: beads flown away, sleepers woken, then a pair made. */
export function score(necks: readonly (readonly Bead[])[], place: Place, ammo: Ammo): number {
    const r = apply(necks, place, ammo, -1), beads = necks[place.neck]!, color = r.bead.color;
    const pair = [beads[place.index - 1], beads[place.index]].some(b => b?.color === color);
    return r.pops.reduce((t, p) => t + p.beads.length, 0) + r.woke.length * 0.5 + (pair ? 0.3 : 0);
}
export const helpOn = (s: State): boolean => !s.finished && s.dry >= DRY_HELP;
/** The best place from here, with the aim that reaches it: what the help shows. Among equally good places, the one with
 * the fewest bounces, then the straightest aim. Null only when nothing can be reached. */
export function goodPlace(s: State): Reach | null {
    if (s.finished) return null;
    let best: Reach | null = null, top = 0;
    for (const r of reach(s)) {
        const v = score(s.necks, r.place, s.queue[0]);
        if (v > top + 1e-9 || (best && Math.abs(v - top) <= 1e-9 && (r.bounces < best.bounces || (r.bounces === best.bounces && Math.abs(r.aim) < Math.abs(best.aim))))) { best = r; top = v; }
    }
    return best;
}
/** Boubou throws his bead to `place` (null: into the void). `bounces` says whether it bounced on a rock on the way. */
export function throwAt(s: State, place: Place | null, bounces = 0, path: Point[] = []): { state: State; shot: Shot | null } {
    if (s.finished) return { state: s, shot: null };
    const ammo = s.queue[0], good = helpOn(s) ? goodPlace(s) : null, helped = Boolean(place && good && placeKey(good.place) === placeKey(place));
    if (!place) {
        const state: State = { ...s, shots: s.shots + 1, dry: s.dry + 1 };
        return { state, shot: { place: null, ammo, bead: null, path, bounces, pops: [], woke: [], miss: 'boing', helped: false, dropped: null } };
    }
    const before = s.necks[place.neck]!, r = apply(s.necks, place, ammo, s.nextId), flown = r.pops.reduce((t, p) => t + p.beads.length, 0);
    let miss: Miss | null = null;
    if (!r.pops.length) {
        const near = [before[place.index - 1], before[place.index]].filter((b): b is Bead => Boolean(b));
        miss = bounces ? 'toc' : near.some(b => b.asleep) ? 'dodo' : near.some(b => b.color === r.bead.color) ? 'chatouille' : place.index === 0 || place.index === before.length ? 'bout' : 'rougit';
    }
    // A necklace never grows past its room: the bead at the other end slides off the string and flies away.
    let dropped: Bead | null = null;
    const grown = r.necks[place.neck]!;
    if (!r.pops.length && grown.length > roomOf(levelOf(s.level), place.neck)) {
        const last = place.index === before.length ? 0 : grown.length - 1;
        dropped = grown[last]!; r.necks[place.neck] = grown.filter((_, i) => i !== last);
    }
    const finished = r.necks.every(n => n.length === 0), shots = s.shots + 1, after = { level: s.level, necks: r.necks };
    let next = s.queue[1], seed = s.seed, last: Ammo = next;
    if (!finished) {
        if (!holdable(after, next)) [next, seed] = pick(after, shots, seed);
        [last, seed] = pick(after, shots + 1, seed);
    }
    const state: State = { ...s, necks: r.necks, nextId: s.nextId + 1, shots, queue: [next, last], seed, dry: r.pops.length ? 0 : s.dry + 1,
        helps: s.helps + (helped ? 1 : 0), flown: s.flown + flown + (dropped ? 1 : 0), finished };
    return { state, shot: { place, ammo, bead: r.bead, path, bounces, pops: r.pops, woke: r.woke, miss, helped, dropped } };
}
/** Boubou throws at `angle`: the flight chooses the place. */
export function fire(s: State, angle: number): { state: State; shot: Shot | null } {
    if (s.finished) return { state: s, shot: null };
    const f = trace(s, angle);
    return throwAt(s, f.place, f.bounces, f.path);
}
/** The big free button: Boubou takes his other bead. */
export function swap(s: State): State { return s.finished ? s : { ...s, queue: [s.queue[1], s.queue[0]] }; }
export function stars(s: State): 1 | 2 | 3 { return s.helps === 0 ? 3 : s.helps <= 2 ? 2 : 1; }
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
/** Two scenes play differently when they differ by at least this much, counted by `distance`. */
export const MIN_GAP = 4;
/** Beads that differ once colours are renamed in order of appearance (so a mere recolouring counts as the same scene),
 * place by place on each necklace, plus a bead per bead of length difference, plus four per feature one scene has and
 * the other not, four per path that differs, four when the rocks differ. */
export function distance(a: LevelDef, b: LevelDef): number {
    const canon = (l: LevelDef): string[][] => { const names = new Map<ColorId, number>(); return parse(l).map(n => n.map(x => { if (!names.has(x.color)) names.set(x.color, names.size); return `${names.get(x.color)}${x.asleep ? 'z' : ''}`; })); };
    const ca = canon(a), cb = canon(b);
    let d = 0;
    for (let k = 0; k < Math.max(ca.length, cb.length); k++) {
        const x = ca[k] ?? [], y = cb[k] ?? [];
        for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) d++;
        if (a.necklaces[k]?.path !== b.necklaces[k]?.path) d += 4;
    }
    for (const f of features) if (has(a, f) !== has(b, f)) d += 4;
    if (JSON.stringify(a.rocks ?? []) !== JSON.stringify(b.rocks ?? [])) d += 4;
    return d;
}
