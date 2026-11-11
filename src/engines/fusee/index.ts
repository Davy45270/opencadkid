import { features, handLevels, type Feature, type LevelDef, type PadDef } from './levels';
export { features, type Feature, type LevelDef } from './levels';
/** « La fusée de Boubou »: Boubou flies a little round rocket that comes down very gently towards the Moon; the child
 * lands it on the starry runway. One main gesture: pressing makes the rocket puff and rise gently, letting go lets it
 * come down slowly; sliding the finger (or two big arrows) moves it gently to the side. No rotation, no fuel, no clock,
 * no crash, no lives, nothing to lose: touching the Moon too fast, beside the runway, a rock, a crater or an alien is a
 * funny try — the rocket bounces like a ball, then rises a little by itself and the child tries again.
 *
 * Pure and deterministic. The state is the rocket (position, speed), the step count and what has been done; one
 * command per fixed step (puff yes or no, side −1, 0 or +1). Same commands, same path. On screen, 30 steps a second. */
export const WIDTH = 150;
export const HEIGHT = 250;
/** The Moon's ground, and the top of the sky the rocket cannot go above. */
export const GROUND = 228;
export const TOP = 14;
/** The rocket is a circle of this radius for every touch. */
export const R = 9;
/** Steps a second on screen. */
export const RATE = 30;
/** Moon gravity, the puff, and the speed limits (board units per step, per step). Always slow: a fall never goes beyond
 * VDOWN, VHELP with the help; a puff never rises faster than VUP; sideways never faster than VX_LIMIT, wind included. */
export const GRAVITY = 0.018;
export const PUFF = 0.05;
export const VDOWN = 0.8;
export const VHELP = 0.4;
export const VUP = 0.6;
export const SIDE_ACCEL = 0.04;
export const VX = 0.7;
export const DRAG = 0.92;
export const WIND = 0.012;
export const VX_LIMIT = 1;
/** A landing on the runway at this falling speed or less is a good one; a touch beside it faster than FAST makes
 * Boubou dizzy. */
export const SOFT = 0.55;
export const FAST = 0.65;
/** After a funny try the rocket rises by itself this far above where it touched (or higher, to a free place). */
export const LIFT = 55;
export const PAD_W = 36;
export const PAD_H = 4;
export const ALIEN_W = 14;
export const ALIEN_H = 18;
export const STAR_R = 6;
/** Nothing solid above this line: the top of the sky stays free to fly across. */
export const OPEN_SKY = 64;
/** Funny tries in a row before the help: a golden arrow shows the runway and the rocket comes down more slowly. */
export const DRY_HELP = 3;
/** Funny tries, each with its own animation, each met in at least one scene. `boing`: on the runway too fast, the rocket
 * bounces like a ball; `tournis`: on the ground too fast, Boubou's eyes spin; `pouf`: gently on the ground beside the
 * runway, a puff of dust; `cratere`: into a crater, which goes « pouf » and spits the rocket out; `toc`: against a rock,
 * which says « toc » and rubs its head; `rigole`: onto an alien, who laughs, tickled; `coucou`: on a friend's runway that
 * is not the next one, the friend waves « coucou » and shows the other one. */
export const misses = ['boing', 'tournis', 'pouf', 'cratere', 'toc', 'rigole', 'coucou'] as const;
export type Miss = typeof misses[number];
export interface Command { puff: boolean; side: -1 | 0 | 1 }
export const idle: Command = { puff: false, side: 0 };
export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface State {
    level: number; t: number; x: number; y: number; vx: number; vy: number;
    /** Runways landed on, in order: the next one to visit is `pads[visited]`. */
    visited: number;
    /** Ids of the stars caught. */
    caught: number[];
    /** Funny tries in a row since the last landing, all funny tries, landings made with the help. */
    dry: number; tries: number; helps: number; finished: boolean;
}
export type Event =
    | { kind: 'miss'; miss: Miss; at: Point; to: Point; what: number }
    | { kind: 'land'; pad: number; at: Point; to: Point; helped: boolean }
    | { kind: 'star'; id: number };

export const has = (level: LevelDef, f: Feature): boolean => level.features.includes(f);
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** A scene as the engine uses it: every solid thing as a rectangle. */
export interface World { level: LevelDef; rocks: Rect[]; hills: Rect[]; aliens: Rect[] }
const worlds = new Map<LevelDef, World>();
export function world(level: LevelDef): World {
    const known = worlds.get(level); if (known) return known;
    const rocks: Rect[] = level.rocks.map(r => ({ ...r }));
    for (const l of level.tunnel) {
        const left = l.x - l.gap / 2, right = l.x + l.gap / 2;
        if (left > 0) rocks.push({ x: 0, y: l.y0, w: left, h: l.y1 - l.y0 });
        if (right < WIDTH) rocks.push({ x: right, y: l.y0, w: WIDTH - right, h: l.y1 - l.y0 });
    }
    const hills = level.hills.map(h => ({ x: h.x, y: GROUND - h.h, w: h.w, h: h.h }));
    const w: World = { level, rocks, hills, aliens: [] };
    w.aliens = level.aliens.map(x => { const top = surfaceAt(w, x); return { x: x - ALIEN_W / 2, y: top - ALIEN_H, w: ALIEN_W, h: ALIEN_H }; });
    worlds.set(level, w);
    return w;
}
/** The ground under `x`: a hill top or the Moon. */
export function surfaceAt(w: World, x: number): number {
    let top = GROUND;
    for (const h of w.hills) if (x >= h.x && x <= h.x + h.w) top = Math.min(top, h.y);
    return top;
}
/** Triangle wave from 0 up to 1, down to −1 and back, one cycle per unit. */
const tri = (u: number): number => 1 - 4 * Math.abs(((u + 0.25) % 1 + 1) % 1 - 0.5);
export const padWidth = (p: PadDef): number => p.w ?? PAD_W;
/** The centre of a runway at step `t`, and its top. */
export function padAt(w: World, i: number, t: number): { x: number; top: number; w: number } {
    const p = w.level.pads[i]!, x = p.swing ? p.x + p.swing * tri(t / (p.period ?? 360)) : p.x;
    return { x, top: surfaceAt(w, p.x) - PAD_H, w: padWidth(p) };
}
const overlaps = (x: number, y: number, r: number, b: Rect): boolean => {
    const cx = clamp(x, b.x, b.x + b.w), cy = clamp(y, b.y, b.y + b.h);
    return (x - cx) ** 2 + (y - cy) ** 2 < r * r;
};
/** Where the rocket can be without touching anything, with `margin` to spare. */
export function free(w: World, t: number, x: number, y: number, margin: number): boolean {
    if (x < R || x > WIDTH - R || y < TOP + R) return false;
    for (const b of [...w.rocks, ...w.hills, ...w.aliens]) if (overlaps(x, y, R + margin, b)) return false;
    for (const dx of [-R, 0, R]) if (y + R + margin > surfaceAt(w, clamp(x + dx, 0, WIDTH))) return false;
    for (let i = 0; i < w.level.pads.length; i++) { const p = padAt(w, i, t); if (Math.abs(x - p.x) <= p.w / 2 + R && y + R + margin > p.top) return false; }
    return true;
}
/** Where the rocket goes after touching at (x, y): a little higher, at the first free place. */
export function lift(w: World, t: number, x: number, y: number): Point {
    // The bounce never goes through anything: every point between the touch and the new place is free (the first few
    // units excepted, where the rocket still touches). Up first; under a rock, down.
    const clear = (fx: number, fy: number): boolean => {
        const n = Math.ceil(Math.hypot(fx - x, fy - y) / 3);
        for (let k = 1; k <= n; k++) { const px = x + (fx - x) * k / n, py = y + (fy - y) * k / n; if (Math.hypot(px - x, py - y) > 6 && !free(w, t, px, py, 0)) return false; }
        return true;
    };
    for (const off of [0, 10, -10, 20, -20, 30, -30, 45, -45]) {
        const fx = clamp(x + off, R + 2, WIDTH - R - 2);
        for (let dy = LIFT; y - dy >= TOP + R; dy += 5) if (free(w, t, fx, y - dy, 6) && clear(fx, y - dy)) return { x: fx, y: y - dy };
        for (let dy = 25; dy <= LIFT; dy += 5) if (free(w, t, fx, y + dy, 6) && clear(fx, y + dy)) return { x: fx, y: y + dy };
    }
    for (const off of [0, 10, -10, 20, -20, 30, -30, 45, -45, 60, -60, 80, -80, 100, -100]) {
        const fx = clamp(x + off, R + 2, WIDTH - R - 2);
        for (let dy = LIFT; y - dy >= TOP + R; dy += 5) if (free(w, t, fx, y - dy, 6)) return { x: fx, y: y - dy };
    }
    return { ...w.level.start };
}

export function start(id: number): State {
    const l = levelOf(id);
    return { level: id, t: 0, x: l.start.x, y: l.start.y, vx: 0, vy: 0, visited: 0, caught: [], dry: 0, tries: 0, helps: 0, finished: false };
}
export const helpOn = (s: State): boolean => !s.finished && s.dry >= DRY_HELP;
/** The little passenger rides in the rocket: from the start with one runway, after the first with two. */
export const carrying = (s: State): boolean => { const l = levelOf(s.level); return l.passenger && !s.finished && (l.pads.length === 1 || s.visited >= 1); };
/** The wind at height `y`: the sum of the bands it is in. */
export function windAt(level: LevelDef, y: number): number { let v = 0; for (const b of level.wind) if (y >= b.y0 && y <= b.y1) v += b.dir * WIND; return v; }

/** One fixed step with one command. Returns the new state and what happened, if anything. */
export function step(s: State, cmd: Command): { state: State; event: Event | null } {
    if (s.finished) return { state: s, event: null };
    const level = levelOf(s.level), w = world(level), cap = helpOn(s) ? VHELP : VDOWN;
    let vy = cmd.puff ? Math.max(-VUP, s.vy - (PUFF - GRAVITY)) : Math.min(cap, s.vy + GRAVITY);
    if (vy > cap) vy = cap;
    let vx = cmd.side ? s.vx + clamp(cmd.side * VX - s.vx, -SIDE_ACCEL, SIDE_ACCEL) : s.vx * DRAG;
    vx = clamp(vx + windAt(level, s.y), -VX_LIMIT, VX_LIMIT);
    let x = s.x + vx, y = s.y + vy;
    if (x < R) { x = R; vx = 0; } else if (x > WIDTH - R) { x = WIDTH - R; vx = 0; }
    if (y < TOP + R) { y = TOP + R; vy = Math.max(0, vy); }
    const t = s.t + 1, at = { x, y };
    let next: State = { ...s, t, x, y, vx, vy };
    const star = level.stars.findIndex((p, id) => !s.caught.includes(id) && Math.hypot(p.x - x, p.y - y) < R + STAR_R);
    const missed = (miss: Miss, what: number): { state: State; event: Event } => {
        const to = lift(w, t, x, y);
        return { state: { ...next, x: to.x, y: to.y, vx: 0, vy: 0, dry: s.dry + 1, tries: s.tries + 1 }, event: { kind: 'miss', miss, at, to, what } };
    };
    const rock = w.rocks.findIndex(b => overlaps(x, y, R, b));
    if (rock >= 0) return missed('toc', rock);
    const alien = w.aliens.findIndex(b => overlaps(x, y, R, b));
    if (alien >= 0) return missed('rigole', alien);
    for (let i = 0; i < level.pads.length; i++) {
        const p = padAt(w, i, t);
        if (y + R < p.top || Math.abs(x - p.x) > p.w / 2) continue;
        if (vy > SOFT) return missed('boing', i);
        if (i !== s.visited) return missed('coucou', i);
        const helped = helpOn(s), visited = s.visited + 1, finished = visited >= level.pads.length;
        next = { ...next, visited, dry: 0, helps: s.helps + (helped ? 1 : 0), finished, vx: 0, vy: 0 };
        const rest = { x, y: p.top - R }, to = finished ? rest : lift(w, t, x, p.top - R);
        next = { ...next, x: to.x, y: to.y };
        return { state: next, event: { kind: 'land', pad: i, at: rest, to, helped } };
    }
    for (const dx of [-R * 0.6, 0, R * 0.6]) {
        const gx = clamp(x + dx, 0, WIDTH), top = surfaceAt(w, gx);
        if (y + R < top) continue;
        const crater = top === GROUND ? level.craters.findIndex(c => Math.abs(x - c.x) <= c.w / 2) : -1;
        if (crater >= 0) return missed('cratere', crater);
        return missed(vy > FAST ? 'tournis' : 'pouf', -1);
    }
    if (star >= 0) { next = { ...next, caught: [...s.caught, star] }; return { state: next, event: { kind: 'star', id: star } }; }
    return { state: next, event: null };
}

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

/** What a scene really has, read from its geometry: `features` must say the same. */
export function present(level: LevelDef): Record<Feature, boolean> {
    return {
        cote: level.pads.length === 1 && Math.abs(level.pads[0]!.x - level.start.x) > 24, rocher: level.rocks.length > 0, etoile: level.stars.length > 0,
        colline: level.hills.length > 0, vent: level.wind.length > 0, glisse: level.pads.some(p => (p.swing ?? 0) > 0), deux: level.pads.length === 2,
        tunnel: level.tunnel.length > 0, passager: level.passenger
    };
}
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], w = world(level), want = present(level);
    for (const f of features) if (has(level, f) !== want[f]) out.push(`${f} where the scene says so`);
    if (new Set(level.features).size !== level.features.length || level.features.some(f => !features.includes(f))) out.push('known features once');
    if (level.pads.length < 1 || level.pads.length > 2) out.push('one or two runways');
    if (!free(w, 0, level.start.x, level.start.y, 4) || level.start.y > 50) out.push('a free start at the top');
    for (const b of [...w.rocks, ...w.hills, ...w.aliens]) if (b.y < OPEN_SKY) out.push('the top of the sky stays free');
    level.pads.forEach((p, i) => {
        const pw = padWidth(p), reach = (p.swing ?? 0) + pw / 2, top = surfaceAt(w, p.x);
        if (pw < 30) out.push(`runway ${i}: wide enough`);
        if (p.x - reach < 2 || p.x + reach > WIDTH - 2) out.push(`runway ${i}: inside the board`);
        for (let x = p.x - reach; x <= p.x + reach; x += 2) if (surfaceAt(w, x) !== top) out.push(`runway ${i}: on flat ground`);
        if (p.swing && (p.swing > 45 || (p.period ?? 360) < 240 || top !== GROUND)) out.push(`runway ${i}: slides slowly on the ground`);
        for (const c of level.craters) if (Math.abs(c.x - p.x) < reach + c.w / 2) out.push(`runway ${i}: no crater under it`);
        for (const b of [...w.rocks, ...w.aliens]) if (b.x < p.x + reach && b.x + b.w > p.x - reach && b.y + b.h > top - 40) out.push(`runway ${i}: room above it`);
        const other = level.pads[1 - i];
        if (other && i === 0 && Math.abs(other.x - p.x) < reach + (other.swing ?? 0) + padWidth(other) / 2 + 10) out.push('runways apart');
    });
    for (const c of level.craters) if (surfaceAt(w, c.x - c.w / 2) !== GROUND || surfaceAt(w, c.x + c.w / 2) !== GROUND || c.w < 14) out.push('craters in the flat ground');
    level.aliens.forEach(a => { for (const c of level.craters) if (Math.abs(a - c.x) < c.w / 2 + ALIEN_W / 2) out.push('aliens beside the craters'); });
    for (const l of level.tunnel) if (l.gap < 40) out.push('a tunnel wide enough');
    for (const st of level.stars) if (!free(w, 0, st.x, st.y, 0)) out.push('stars in the open');
    if (level.wind.some(b => b.y1 <= b.y0)) out.push('wind bands');
    return out;
}

/** Two scenes play differently when they differ in at least this many places, counted by `distance`. */
export const MIN_GAP = 6;
/** Cells of 10 × 10 whose content differs (runway, sliding runway, rock, hill, crater, alien, star, wind and its way,
 * start), plus four per feature one scene has and the other not. */
export function distance(a: LevelDef, b: LevelDef): number {
    const canon = (l: LevelDef): Map<string, string> => {
        const w = world(l), out = new Map<string, string>(), put = (x: number, y: number, v: string): void => { const k = `${Math.floor(x / 10)}:${Math.floor(y / 10)}`; out.set(k, (out.get(k) ?? '') + v); };
        const fill = (r: Rect, v: string): void => { for (let x = r.x + 2; x < r.x + r.w; x += 10) for (let y = r.y + 2; y < r.y + r.h; y += 10) put(x, y, v); };
        l.pads.forEach((p, i) => { const pd = padAt(w, i, 0); for (let x = pd.x - pd.w / 2 + 2; x < pd.x + pd.w / 2; x += 10) put(x, pd.top, p.swing ? 'm' : 'p'); });
        for (const r of w.rocks) fill(r, 'r');
        for (const h of w.hills) fill(h, 'h');
        for (const c of l.craters) for (let x = c.x - c.w / 2 + 2; x < c.x + c.w / 2; x += 10) put(x, GROUND, 'c');
        for (const al of w.aliens) put(al.x + al.w / 2, al.y, 'a');
        for (const st of l.stars) put(st.x, st.y, 's');
        for (const band of l.wind) for (let y = band.y0; y < band.y1; y += 10) put(0, y, band.dir > 0 ? 'w' : 'W');
        put(l.start.x, l.start.y, 'S');
        return out;
    };
    const ca = canon(a), cb = canon(b), places = new Set([...ca.keys(), ...cb.keys()]);
    let d = 0;
    for (const k of places) if (ca.get(k) !== cb.get(k)) d++;
    for (const f of features) if (has(a, f) !== has(b, f)) d += 4;
    return d;
}
