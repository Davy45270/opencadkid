import { colors, features, friends, handLevels, letters, type ColorId, type Feature, type LevelDef } from './levels';
export { colors, features, friends, type ColorId, type Feature, type Friend, type LevelDef, type Plank, type Speaker } from './levels';
/** « Les bulles de Boubou »: Boubou throws coloured bubbles at a cluster hanging from the ceiling. Three or more of the
 * same colour that touch fly away as butterflies; what no longer hangs from anything falls gently and turns into
 * flowers. No clock, no lives, no ceiling coming down, nothing to lose: a throw that does nothing sticks the bubble to
 * the cluster, and when the cluster reaches too low it goes up one row. Pure and deterministic, in board units:
 * the board is 150 × 250, a bubble has a radius of 10. */
export const R = 10;
export const WIDTH = 150;
export const HEIGHT = 250;
export const ROW = Math.sqrt(3) * R;
/** Centre distance at which a flying bubble touches one in the cluster: a little under two radii lets it slip through gaps. */
export const CONTACT = 17;
/** Half the thickness of a plank plus a bubble radius. */
export const PLANK_REACH = R + 3;
/** Smallest upward part of a bubble's direction after a plank. */
export const PLANK_LIFT = 0.35;
export const LAUNCH = { x: 75, y: 228 } as const;
export const FLOOR = 240;
/** Aim from 78° left to 78° right of straight up. */
export const AIM_MAX = 78 * Math.PI / 180;
/** The swing: the cluster moves half a bubble each way over 150 ticks (6 s at 40 ms). Without it, it rests in the middle. */
export const SWAY = 5;
export const SWAY_PERIOD = 150;
export const TICK_MS = 40;
/** Throws in a row that change nothing before the help shows a good throw. */
export const DRY_HELP = 3;
/** Every fourth throw is a rainbow in the scenes that have them; the scenes that bring it in alone start with one. */
export const RAINBOW_EVERY = 4;
export const rainbowAt = (level: LevelDef, index: number): boolean => has(level, 'arc') && index % RAINBOW_EVERY === (level.features.length === 1 ? 0 : RAINBOW_EVERY - 1);
export type Kind = 'bulle' | 'glace' | 'nuage' | 'ami';
export interface Cell { row: number; col: number; kind: Kind; color: ColorId | null; ice: number }
export type Ammo = ColorId | 'arc';
/** Funny tries: a throw that changes nothing but the stuck bubble gets one of these, each with its own animation. */
export const misses = ['boing', 'tournis', 'coucou', 'atchoum', 'bisou', 'grimace'] as const;
export type Miss = typeof misses[number];
export interface Point { x: number; y: number }
export interface State {
    level: number; cells: Cell[]; top: number; tick: number; seed: number; shots: number; queue: [Ammo, Ammo];
    /** Throws in a row without anything popping, floating away, melting or falling. */
    dry: number; helps: number; butterflies: number; flowers: number; finished: boolean;
}
export interface Shot {
    path: Point[]; bounces: number; at: { row: number; col: number }; ammo: Ammo; color: ColorId;
    popped: Cell[]; freed: Cell[]; melted: Cell[]; fell: Cell[]; lifted: Cell[]; miss: Miss | null; helped: boolean; origin: number; top: number;
}
interface Hit { t: number; normal: Point | null; stop: 'cell' | 'ceiling' | null; plank: boolean }
export interface Trace { path: Point[]; bounces: number; end: Point; ceiling: boolean }

export const cols = (row: number): number => row % 2 ? 6 : 7;
const valid = (row: number, col: number, top = 0): boolean => row >= top && col >= 0 && col < cols(row);
export const key = (row: number, col: number): string => `${row}:${col}`;
export function neighbors(row: number, col: number, top = 0): { row: number; col: number }[] {
    const left = col - (row % 2 ? 0 : 1);
    return [[row - 1, left], [row - 1, left + 1], [row, col - 1], [row, col + 1], [row + 1, left], [row + 1, left + 1]]
        .filter(([r, c]) => valid(r!, c!, top)).map(([r, c]) => ({ row: r!, col: c! }));
}
export const has = (level: LevelDef, f: Feature): boolean => level.features.includes(f);
/** How many rows the cluster may hang down before it goes up: fewer when planks stand below it. */
export const limitOf = (level: LevelDef): number => Math.min(has(level, 'murs') ? 5 : 6, Math.max(4, level.rows.length + 2));
export function origin(level: LevelDef, tick: number): number { return has(level, 'balance') ? SWAY + SWAY * Math.sin(2 * Math.PI * tick / SWAY_PERIOD) : SWAY; }
export function center(cell: { row: number; col: number }, top: number, x0: number): Point { return { x: x0 + R + cell.col * 2 * R + (cell.row % 2) * R, y: R + (cell.row - top) * ROW }; }
export function parse(level: LevelDef): Cell[] {
    const out: Cell[] = [];
    level.rows.forEach((line, row) => line.split('').forEach((ch, col) => {
        if (ch === '.') return;
        const lower = ch.toLowerCase();
        if (ch === 'n') out.push({ row, col, kind: 'nuage', color: null, ice: 0 });
        else if (ch === 'a') out.push({ row, col, kind: 'ami', color: null, ice: 0 });
        else if (letters[lower]) out.push({ row, col, kind: ch === lower ? 'bulle' : 'glace', color: letters[lower], ice: ch === lower ? 0 : 2 });
    }));
    return out;
}
/** The colours of a scene, in the catalogue order. */
export function palette(level: LevelDef): ColorId[] { const used = new Set(parse(level).map(c => c.color)); return colors.filter(c => used.has(c)); }
/** Cells hanging from the ceiling (row `top`) through neighbours. */
function anchored(cells: readonly Cell[], top: number): Set<string> {
    const at = new Map(cells.map(c => [key(c.row, c.col), c])), seen = new Set<string>(), queue = cells.filter(c => c.row === top);
    for (const c of queue) seen.add(key(c.row, c.col));
    while (queue.length) {
        const c = queue.pop()!;
        for (const n of neighbors(c.row, c.col, top)) { const k = key(n.row, n.col); if (at.has(k) && !seen.has(k)) { seen.add(k); queue.push(at.get(k)!); } }
    }
    return seen;
}
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], cells = parse(level), used = palette(level);
    if (level.rows.length < 1 || level.rows.length > 6) out.push('one to six rows');
    level.rows.forEach((line, row) => { if (line.length !== cols(row)) out.push(`row ${row}: ${cols(row)} places`); if (!/^[.ojvbprOJVBPRna]+$/.test(line)) out.push(`row ${row}: known places`); });
    if (!level.rows[0]!.replace(/\./g, '')) out.push('something hangs from the ceiling');
    if (anchored(cells, 0).size !== cells.length) out.push('every bubble hangs from the ceiling');
    if (used.length < 2 || used.length > 4) out.push('two to four colours');
    for (const [a, b] of closeColors) if (used.includes(a) && used.includes(b)) out.push(`${a} and ${b} look alike`);
    const kinds = new Set(cells.map(c => c.kind));
    if (has(level, 'nuage') !== kinds.has('nuage')) out.push('clouds where the scene says so');
    if (has(level, 'ami') !== kinds.has('ami') || has(level, 'ami') !== Boolean(level.friend)) out.push('a friend where the scene says so');
    if (has(level, 'glace') !== kinds.has('glace')) out.push('ice where the scene says so');
    if (has(level, 'murs') !== Boolean(level.planks?.length)) out.push('planks where the scene says so');
    if (new Set(level.features).size !== level.features.length || level.features.some(f => !features.includes(f))) out.push('known features once');
    const lowest = R + (limitOf(level) - 1) * ROW + R;
    for (const p of level.planks ?? []) if (Math.min(p[1], p[3]) - PLANK_REACH < lowest || Math.max(p[1], p[3]) > LAUNCH.y - 30) out.push('planks between the cluster and Boubou');
    if (level.rows.length > limitOf(level)) out.push('the cluster starts above its limit');
    if (has(level, 'ami') && !friends.includes(level.friend!)) out.push('a known friend');
    return out;
}
/** Pairs of colours too close to share a scene (the test measures them in CIELAB). */
export const closeColors: readonly (readonly [ColorId, ColorId])[] = [['rouge', 'orange'], ['orange', 'jaune'], ['bleu', 'violet']];
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };

/** Mulberry32 step: same values as rng.ts, but the state stays in the game state. */
function rand(seed: number): [number, number] {
    const value = (seed + 1831565813) | 0;
    let n = Math.imul(value ^ value >>> 15, 1 | value);
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
    return [((n ^ n >>> 14) >>> 0) / 4294967296, value];
}
const present = (cells: readonly Cell[]): ColorId[] => { const used = new Set(cells.map(c => c.color)); return colors.filter(c => used.has(c)); };
/** The bubble Boubou gets for throw number `index`: a rainbow on schedule, otherwise the colour of a bubble that can be
 * reached (one with a free place next to it). A reachable bubble already in a pair counts PAIR_WEIGHT times, one alone
 * once: the next bubble often completes a group, so that a child who aims anywhere still sees butterflies soon. */
export const PAIR_WEIGHT = 20;
function pick(level: LevelDef, cells: readonly Cell[], top: number, index: number, seed: number): [Ammo, number] {
    if (rainbowAt(level, index)) return ['arc', seed];
    const at = new Map(cells.map(c => [key(c.row, c.col), c])), pool: ColorId[] = [];
    for (const c of cells) {
        if (!c.color || !neighbors(c.row, c.col, top).some(n => !at.has(key(n.row, n.col)))) continue;
        const paired = c.kind === 'bulle' && neighbors(c.row, c.col, top).some(n => { const o = at.get(key(n.row, n.col)); return o?.kind === 'bulle' && o.color === c.color; });
        for (let k = 0; k < (paired ? PAIR_WEIGHT : 1); k++) pool.push(c.color);
    }
    const choices = pool.length ? pool : present(cells).length ? present(cells) : palette(level), [r, next] = rand(seed);
    return [choices[Math.floor(r * choices.length)]!, next];
}
export function start(id: number): State {
    const level = levelOf(id), cells = parse(level);
    const [first, s1] = pick(level, cells, 0, 0, id * 7919 + 13), [second, s2] = pick(level, cells, 0, 1, s1);
    return { level: id, cells, top: 0, tick: 0, seed: s2, shots: 0, queue: [first, second], dry: 0, helps: 0, butterflies: 0, flowers: 0, finished: false };
}
/** Time passes: only the swing uses it. */
export function advance(s: State, ticks = 1): State { return s.finished || !has(levelOf(s.level), 'balance') ? s : { ...s, tick: s.tick + ticks }; }
export const helpOn = (s: State): boolean => !s.finished && s.dry >= DRY_HELP;
export const clampAim = (angle: number): number => Math.max(-AIM_MAX, Math.min(AIM_MAX, angle));

function hitCircle(p: Point, d: Point, c: Point, radius: number): number | null {
    const fx = p.x - c.x, fy = p.y - c.y, b = fx * d.x + fy * d.y, cc = fx * fx + fy * fy - radius * radius;
    if (b >= 0 || cc <= 0) return null;
    const disc = b * b - cc;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t > 1e-7 ? t : null;
}
/** Flight of a bubble thrown at `angle` (0 straight up, negative to the left): bounces on the walls, the planks and the
 * floor until it touches the cluster or the ceiling. */
export function trace(s: State, angle: number): Trace {
    const level = levelOf(s.level), x0 = origin(level, s.tick), a = clampAim(angle);
    const balls = s.cells.map(c => center(c, s.top, x0));
    let p: Point = { x: LAUNCH.x, y: LAUNCH.y }, d: Point = { x: Math.sin(a), y: -Math.cos(a) }, bounces = 0;
    const path: Point[] = [p];
    for (let leg = 0; leg < 40; leg++) {
        const hit: Hit = { t: Infinity, normal: null, stop: null, plank: false };
        const take = (t: number | null, normal: Point | null, stop: Hit['stop'], plank = false): void => { if (t !== null && t > 1e-7 && t < hit.t) Object.assign(hit, { t, normal, stop, plank }); };
        if (d.x < -1e-9) take((R - p.x) / d.x, { x: 1, y: 0 }, null);
        if (d.x > 1e-9) take((WIDTH - R - p.x) / d.x, { x: -1, y: 0 }, null);
        if (d.y < -1e-9) take((R - p.y) / d.y, null, 'ceiling');
        if (d.y > 1e-9) take((FLOOR - p.y) / d.y, { x: 0, y: -1 }, null);
        for (const c of balls) take(hitCircle(p, d, c, CONTACT), null, 'cell');
        for (const [x1, y1, x2, y2] of level.planks ?? []) {
            const A = { x: x1, y: y1 }, B = { x: x2, y: y2 }, len = Math.hypot(x2 - x1, y2 - y1), n = { x: -(y2 - y1) / len, y: (x2 - x1) / len };
            for (const end of [A, B]) { const t = hitCircle(p, d, end, PLANK_REACH); if (t !== null) { const q = { x: p.x + d.x * t, y: p.y + d.y * t }; take(t, { x: (q.x - end.x) / PLANK_REACH, y: (q.y - end.y) / PLANK_REACH }, null, true); } }
            const dn = d.x * n.x + d.y * n.y;
            if (Math.abs(dn) < 1e-9) continue;
            for (const side of [1, -1]) {
                if (dn * side >= 0) continue;
                const t = (side * PLANK_REACH - ((p.x - A.x) * n.x + (p.y - A.y) * n.y)) / dn, q = { x: p.x + d.x * t, y: p.y + d.y * t };
                const u = ((q.x - A.x) * (B.x - A.x) + (q.y - A.y) * (B.y - A.y)) / (len * len);
                if (u >= 0 && u <= 1) take(t, { x: n.x * side, y: n.y * side }, null, true);
            }
        }
        p = { x: p.x + d.x * hit.t, y: p.y + d.y * hit.t }; path.push(p);
        if (hit.stop) return { path, bounces, end: p, ceiling: hit.stop === 'ceiling' };
        const n = hit.normal;
        if (!n) break;
        const dot = d.x * n.x + d.y * n.y;
        d = { x: d.x - 2 * dot * n.x, y: d.y - 2 * dot * n.y }; bounces++;
        // A plank always sends the bubble on upwards (never back to Boubou): it keeps its sideways part and climbs again.
        if (hit.plank && d.y > -PLANK_LIFT) { const y = -Math.max(PLANK_LIFT, Math.abs(d.y)), x = Math.abs(d.x) < 1e-6 ? (n.x < 0 ? -1 : 1) * 0.5 : d.x, l = Math.hypot(x, y); d = { x: x / l, y: y / l }; }
    }
    return { path, bounces, end: p, ceiling: false };
}
/** The free place where a bubble that stopped at `at` settles: the nearest one that hangs from the ceiling or a neighbour. */
export function snap(s: State, at: Point): { row: number; col: number } {
    const level = levelOf(s.level), x0 = origin(level, s.tick), taken = new Set(s.cells.map(c => key(c.row, c.col)));
    let best = { row: s.top, col: 3 }, distance = Infinity;
    for (let row = s.top; row <= s.top + limitOf(level) + 2; row++) for (let col = 0; col < cols(row); col++) {
        if (taken.has(key(row, col))) continue;
        if (row !== s.top && !neighbors(row, col, s.top).some(n => taken.has(key(n.row, n.col)))) continue;
        const c = center({ row, col }, s.top, x0), dist = Math.hypot(c.x - at.x, c.y - at.y);
        if (dist < distance - 1e-9) { distance = dist; best = { row, col }; }
    }
    return best;
}
function group(at: Map<string, Cell>, from: Cell, color: ColorId, top: number): Cell[] {
    const seen = new Set([key(from.row, from.col)]), out = [from], queue = [from];
    while (queue.length) {
        const c = queue.pop()!;
        for (const n of neighbors(c.row, c.col, top)) {
            const k = key(n.row, n.col), other = at.get(k);
            if (other && !seen.has(k) && other.kind === 'bulle' && other.color === color) { seen.add(k); out.push(other); queue.push(other); }
        }
    }
    return out;
}
/** Boubou throws the current bubble at `angle`. Never loses anything: the bubble always ends up somewhere. */
export function fire(s: State, angle: number): { state: State; shot: Shot | null } {
    if (s.finished) return { state: s, shot: null };
    const level = levelOf(s.level), flight = trace(s, angle), place = snap(s, flight.end), ammo = s.queue[0];
    const at = new Map(s.cells.map(c => [key(c.row, c.col), c]));
    const near = neighbors(place.row, place.col, s.top).map(n => at.get(key(n.row, n.col))).filter((c): c is Cell => Boolean(c));
    const bubbles = near.filter(c => c.kind === 'bulle');
    let color: ColorId, popped: Cell[] = [];
    const placed = (c: ColorId): Cell => ({ ...place, kind: 'bulle', color: c, ice: 0 });
    if (ammo === 'arc') {
        // The rainbow goes with every colour that makes three with it; otherwise it takes the colour of its biggest neighbour group.
        const tries = colors.filter(c => bubbles.some(b => b.color === c)).map(c => ({ c, g: group(at, placed(c), c, s.top) }));
        const good = tries.filter(t => t.g.length >= 3);
        const biggest = [...(good.length ? good : tries)].sort((a, b) => b.g.length - a.g.length)[0];
        color = biggest?.c ?? (present(s.cells)[0] ?? palette(level)[0]!);
        const seen = new Set<string>();
        for (const t of good) for (const c of t.g) { const k = key(c.row, c.col); if (!seen.has(k)) { seen.add(k); popped.push(c); } }
        popped = popped.map(c => c.row === place.row && c.col === place.col ? placed(color) : c);
    } else {
        color = ammo;
        const g = group(at, placed(color), color, s.top);
        if (g.length >= 3) popped = g;
    }
    const newCell = popped.find(c => c.row === place.row && c.col === place.col) ?? placed(color);
    at.set(key(place.row, place.col), newCell);
    const gone = new Set(popped.map(c => key(c.row, c.col)));
    const freed: Cell[] = [], melted: Cell[] = [], touched = new Set<string>();
    for (const c of [newCell, ...popped]) for (const n of neighbors(c.row, c.col, s.top)) touched.add(key(n.row, n.col));
    for (const k of touched) {
        const c = at.get(k);
        if (!c || gone.has(k)) continue;
        if ((c.kind === 'nuage' || c.kind === 'ami') && popped.some(p => neighbors(p.row, p.col, s.top).some(n => key(n.row, n.col) === k))) { freed.push(c); gone.add(k); }
        else if (c.kind === 'glace') { const ice = c.ice - 1, m: Cell = { ...c, ice, kind: ice <= 0 ? 'bulle' : 'glace' }; at.set(k, m); melted.push(m); }
    }
    for (const k of gone) at.delete(k);
    let cells = [...at.values()];
    const hold = anchored(cells, s.top), fell = cells.filter(c => !hold.has(key(c.row, c.col)));
    cells = cells.filter(c => hold.has(key(c.row, c.col)));
    let top = s.top, lifted: Cell[] = [];
    const lowest = Math.max(-Infinity, ...cells.map(c => c.row));
    if (lowest - top >= limitOf(level)) { top = lowest - limitOf(level) + 1; lifted = cells.filter(c => c.row < top); cells = cells.filter(c => c.row >= top); }
    const progress = popped.length + freed.length + melted.length + fell.length > 0;
    let miss: Miss | null = null;
    if (!progress && !lifted.length) {
        miss = !near.length ? 'boing' : flight.bounces >= 3 ? 'tournis' : near.some(c => c.kind === 'ami') ? 'coucou' : near.some(c => c.kind === 'nuage') ? 'atchoum' : bubbles.some(c => c.color === newCell.color) ? 'bisou' : 'grimace';
    }
    const finished = has(level, 'ami') ? !cells.some(c => c.kind === 'ami') : cells.length === 0;
    const helped = helpOn(s), shots = s.shots + 1;
    let next = s.queue[1], seed = s.seed;
    if (next !== 'arc' && !present(cells).includes(next) && present(cells).length) [next, seed] = pick(level, cells, top, shots, seed);
    const [after, seed2] = pick(level, cells, top, shots + 1, seed);
    const state: State = { ...s, cells, top, shots, seed: seed2, queue: [next, after], dry: progress ? 0 : s.dry + 1, helps: s.helps + (helped ? 1 : 0),
        butterflies: s.butterflies + popped.length + freed.length, flowers: s.flowers + fell.length, finished };
    return { state, shot: { path: flight.path, bounces: flight.bounces, at: place, ammo, color: newCell.color!, popped, freed, melted, fell, lifted, miss, helped, origin: origin(level, s.tick), top: s.top } };
}
/** How good a throw is for the greedy player and for the help: a freed friend first, then everything that moves. */
export function score(level: LevelDef, shot: Shot): number {
    const friendsOut = [...shot.freed, ...shot.fell, ...shot.lifted].filter(c => c.kind === 'ami').length;
    return friendsOut * 100 + shot.popped.length + 2 * shot.freed.length + shot.fell.length + shot.melted.length + (shot.miss === 'bisou' ? 0.3 : 0);
}
export const AIM_STEPS = 97;
export const aims: readonly number[] = Array.from({ length: AIM_STEPS }, (_, i) => -AIM_MAX + 2 * AIM_MAX * i / (AIM_STEPS - 1));
/** The best throw from here, or null when nothing changes anything: what the help shows. Among equally good throws,
 * the one with the fewest bounces, then the straightest: the golden line stays easy to follow. */
export function goodAim(s: State): number | null {
    if (s.finished) return null;
    const level = levelOf(s.level);
    let best: number | null = null, top = 0.5, bounces = Infinity;
    for (const a of aims) {
        const { shot } = fire(s, a), v = shot ? score(level, shot) : 0, b = shot?.bounces ?? Infinity;
        if (v > top + 1e-9 || (best !== null && Math.abs(v - top) <= 1e-9 && (b < bounces || (b === bounces && Math.abs(a) < Math.abs(best))))) { top = v; best = a; bounces = b; }
    }
    return best;
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
/** Two scenes play differently when they differ in at least this many places, counted by `distance`. */
export const MIN_GAP = 4;
/** Places whose content differs once colours are renamed in order of appearance (so a mere recolouring counts as the
 * same scene), plus four per feature one scene has and the other not, plus four when the planks differ. */
export function distance(a: LevelDef, b: LevelDef): number {
    const canon = (l: LevelDef): Map<string, string> => {
        const names = new Map<string, string>(), out = new Map<string, string>();
        for (const c of parse(l)) {
            let v: string = c.kind;
            if (c.color) { if (!names.has(c.color)) names.set(c.color, String(names.size)); v += names.get(c.color)!; }
            out.set(key(c.row, c.col), v);
        }
        return out;
    };
    const ca = canon(a), cb = canon(b), places = new Set([...ca.keys(), ...cb.keys()]);
    let d = 0;
    for (const k of places) if (ca.get(k) !== cb.get(k)) d++;
    for (const f of features) if (has(a, f) !== has(b, f)) d += 4;
    if (JSON.stringify(a.planks ?? []) !== JSON.stringify(b.planks ?? [])) d += 4;
    return d;
}
