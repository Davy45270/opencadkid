import { colors, features, handLevels, type Color, type Dir, type Feature, type LevelDef, type Vehicle } from './levels';
export { colors, features, greys, parse, type Color, type Cone, type Dir, type Exit, type Feature, type LevelDef, type Side, type Vehicle } from './levels';
/** « Les bus de CaliRoux »: children wait at the bus stop, each for the bus of their colour, and the buses are parked in
 * CaliRoux’s yard among grey cars and cones. The child touches a vehicle: it drives forward along its lane as far as it
 * can, or backs up as far as it can when it cannot go forward. A bus whose way forward ends at a gate leaves with the
 * first child of the row, if that child waits for it; otherwise the children shake their heads and nothing moves. No
 * clock, no lives, no losing: every scene is proved to have no dead end. Pure and deterministic. */
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export interface Box { what: string; x0: number; y0: number; x1: number; y1: number }
/** Board units: 180 wide, 300 high. The bus stop with its row of children at the top, the yard in the middle, CaliRoux at
 * the bottom left. */
export const W = 180, H = 300;
export const STOP: Box = { what: 'arret', x0: 4, y0: 4, x1: 176, y1: 62 };
export const CALI: Box = { what: 'caliroux', x0: 4, y0: 246, x1: 74, y1: 298 };
/** The yard: its top edge, the widest it may be, and the cells (36 units at most, 26 for six cells). */
export const YARD_Y = 84, YARD_MAX = 156;
export const ARRET = 'arret', CALIROUX = 'caliroux', COUR = 'cour';
export const coneId = (k: number): string => `plot-${k}`;
export function geometry(l: Pick<LevelDef, 'cols' | 'rows'>): { cell: number; x0: number; y0: number; x1: number; y1: number } {
    const cell = Math.min(36, Math.floor(YARD_MAX / Math.max(l.cols, l.rows))), x0 = (W - l.cols * cell) / 2;
    return { cell, x0, y0: YARD_Y, x1: x0 + l.cols * cell, y1: YARD_Y + l.rows * cell };
}
export type Fail = 'klaxon' | 'pasmoi' | 'plot' | 'coucou' | 'pigeon' | 'roulade';
export const fails: readonly Fail[] = ['klaxon', 'pasmoi', 'plot', 'coucou', 'pigeon', 'roulade'];
export const HELP_AFTER = 3;
export interface State {
    level: number;
    /** Where each vehicle stands (its top or left cell), in the order of the level’s vehicles; the buses gone, in order. */
    pos: number[]; gone: string[];
    moves: number; tries: number;
    /** Funny tries since the last bus left: from `HELP_AFTER` on, the vehicle to touch shines until the next bus leaves. */
    misses: number; helps: number;
    finished: boolean;
}
export type Event =
    | { kind: 'roule'; vehicle: string; from: number; to: number; helped: boolean }
    | { kind: 'part'; bus: string; color: Color; helped: boolean }
    | { kind: 'fail'; fail: Fail; on: string }
    | { kind: 'fini' };
export interface Result { state: State; events: Event[] }
type Core = Pick<State, 'level' | 'pos' | 'gone'>;

/** The child waited for next, or null when every child has gone. */
export const waited = (l: LevelDef, gone: readonly string[]): Color | null => l.queue[gone.length] ?? null;
const step = (d: Dir): number => d === 'haut' || d === 'gauche' ? -1 : 1;
/** The cells a vehicle covers at `pos`, as `row * cols + col`. */
export function cellsOf(l: LevelDef, v: Vehicle, pos: number): number[] {
    return Array.from({ length: v.len }, (_, k) => v.axis === 'v' ? (pos + k) * l.cols + v.lane : v.lane * l.cols + pos + k);
}
/** Who is on each cell: a vehicle’s index, -2 a cone, -1 nobody. */
export function occupancy(l: LevelDef, pos: readonly number[], gone: readonly string[]): number[] {
    const grid = Array<number>(l.cols * l.rows).fill(-1);
    for (const c of l.cones) grid[c.row * l.cols + c.col] = -2;
    l.vehicles.forEach((v, i) => { if (!gone.includes(v.id)) for (const c of cellsOf(l, v, pos[i]!)) grid[c] = i; });
    return grid;
}
/** How many free cells there are in front of (`sign` 1) or behind (-1) the vehicle, up to the edge of the yard. */
export function run(l: LevelDef, grid: readonly number[], i: number, pos: number, sign: 1 | -1): number {
    const v = l.vehicles[i]!, dir = step(v.nose) * sign, size = v.axis === 'v' ? l.rows : l.cols;
    let n = 0;
    for (;;) {
        const head = dir < 0 ? pos - n - 1 : pos + v.len + n;
        if (head < 0 || head >= size) return n;
        const cell = v.axis === 'v' ? head * l.cols + v.lane : v.lane * l.cols + head;
        if (grid[cell] !== -1) return n;
        n++;
    }
}
/** Whether a vehicle at `pos` has its nose on a gate (only a bus can drive through it). */
export function atGate(l: LevelDef, v: Vehicle, pos: number): boolean {
    if (v.nose === 'haut') return pos === 0 && l.exits.some(e => e.side === 'haut' && e.at === v.lane);
    if (v.nose === 'gauche') return pos === 0 && l.exits.some(e => e.side === 'gauche' && e.at === v.lane);
    if (v.nose === 'droite') return pos + v.len === l.cols && l.exits.some(e => e.side === 'droite' && e.at === v.lane);
    return false;
}
export const vehicleOf = (l: LevelDef, id: string): Vehicle => { const v = l.vehicles.find(x => x.id === id); if (!v) throw new RangeError(`Unknown vehicle ${id}`); return v; };
/** What a touch on vehicle `i` does, the counters aside: a move, a departure (maybe after a move), or a funny try. */
type Tap = { kind: 'roule'; to: number; part: boolean } | { kind: 'part' } | { kind: 'fail'; fail: 'klaxon' | 'pasmoi' };
export function tap(l: LevelDef, s: Core, i: number): Tap {
    const v = l.vehicles[i]!, pos = s.pos[i]!, grid = occupancy(l, s.pos, s.gone), ok = v.kind === 'bus' && waited(l, s.gone) === v.color;
    if (v.kind === 'bus' && atGate(l, v, pos)) return ok ? { kind: 'part' } : { kind: 'fail', fail: 'pasmoi' };
    const f = run(l, grid, i, pos, 1), forward = pos + step(v.nose) * f;
    if (f > 0) {
        if (v.kind === 'bus' && atGate(l, v, forward)) return ok ? { kind: 'roule', to: forward, part: true } : { kind: 'fail', fail: 'pasmoi' };
        return { kind: 'roule', to: forward, part: false };
    }
    const b = run(l, grid, i, pos, -1);
    return b > 0 ? { kind: 'roule', to: pos - step(v.nose) * b, part: false } : { kind: 'fail', fail: 'klaxon' };
}
/** The state a useful touch leads to, without the counters; null for a funny try. */
function next(l: LevelDef, s: Core, i: number): { pos: number[]; gone: string[] } | null {
    const t = tap(l, s, i);
    if (t.kind === 'fail') return null;
    const pos = [...s.pos], gone = [...s.gone];
    if (t.kind === 'roule') pos[i] = t.to;
    if (t.kind === 'part' || t.part) gone.push(l.vehicles[i]!.id);
    return { pos, gone };
}
const keyOf = (s: Pick<Core, 'pos' | 'gone'>): string => `${s.pos.join(',')}|${s.gone.join('')}`;
const isWon = (l: LevelDef, gone: readonly string[]): boolean => gone.length === l.queue.length;
/** Every state the touches can reach, with where each touch leads (null: a funny try). */
export function explore(l: LevelDef, from: Pick<Core, 'pos' | 'gone'> = { pos: l.vehicles.map(v => v.pos), gone: [] }, limit = 50_000): { states: Map<string, { pos: number[]; gone: string[]; moves: (string | null)[] }>; complete: boolean } {
    const states = new Map<string, { pos: number[]; gone: string[]; moves: (string | null)[] }>(), todo = [{ pos: [...from.pos], gone: [...from.gone] }];
    states.set(keyOf(from), { ...todo[0]!, moves: [] });
    while (todo.length) {
        const s = todo.shift()!, entry = states.get(keyOf(s))!;
        if (isWon(l, s.gone)) continue;
        entry.moves = l.vehicles.map((v, i) => {
            if (s.gone.includes(v.id)) return null;
            const n = next(l, { level: 0, ...s }, i); if (!n) return null;
            const k = keyOf(n);
            if (!states.has(k)) { if (states.size >= limit) return k; states.set(k, { ...n, moves: [] }); todo.push(n); }
            return k;
        });
    }
    return { states, complete: states.size < limit };
}
/** How many touches each state the touches can reach is from the end (a state missing from the map is a dead end). */
function distances(l: LevelDef): { dist: Map<string, number>; states: number } {
    const { states } = explore(l), back = new Map<string, string[]>();
    for (const [k, s] of states) for (const m of s.moves) if (m) back.set(m, [...back.get(m) ?? [], k]);
    const dist = new Map<string, number>(), todo: string[] = [];
    for (const [k, s] of states) if (isWon(l, s.gone)) { dist.set(k, 0); todo.push(k); }
    while (todo.length) { const k = todo.shift()!; for (const p of back.get(k) ?? []) if (!dist.has(p)) { dist.set(p, dist.get(k)! + 1); todo.push(p); } }
    return { dist, states: states.size };
}
/** The fewest touches to send every bus away from the start, how many states can be reached, and how many of them can no
 * longer be finished (dead ends: always 0 in a fair scene). */
export function measure(l: LevelDef): { par: number; states: number; dead: number } {
    const { dist, states } = distances(l), start = keyOf({ pos: l.vehicles.map(v => v.pos), gone: [] });
    return { par: dist.get(start) ?? Infinity, states, dead: states - dist.size };
}
/** The distances of the scenes of the game, computed once each: the levels never change. */
const known = new Map<number, Map<string, number>>();
/** The vehicle to touch now on a shortest way to the end: the first, in the level’s order, whose touch brings the end one
 * touch nearer. */
export function goodTap(s: State): string | null {
    if (s.finished) return null;
    const l = levelOf(s.level);
    if (!known.has(s.level)) known.set(s.level, distances(l).dist);
    const dist = known.get(s.level)!, here = dist.get(keyOf(s));
    if (here === undefined) return null;
    for (const [i, v] of l.vehicles.entries()) {
        if (s.gone.includes(v.id)) continue;
        const n = next(l, s, i);
        if (n && dist.get(keyOf(n)) === here - 1) return v.id;
    }
    return null;
}
/** What shines: the vehicle to touch, once the child has made `HELP_AFTER` funny tries since the last bus left. */
export const hint = (s: State): string[] => { const g = s.misses >= HELP_AFTER ? goodTap(s) : null; return g ? [g] : []; };
/** Everything that can be touched: the vehicles still in the yard, the cones, the stop, CaliRoux and the empty yard. */
export function targets(s: Core): string[] {
    const l = levelOf(s.level);
    return [...l.vehicles.filter(v => !s.gone.includes(v.id)).map(v => v.id), ...l.cones.map((_, k) => coneId(k)), ARRET, CALIROUX, COUR];
}
export function start(id: number): State {
    const l = levelOf(id);
    return { level: id, pos: l.vehicles.map(v => v.pos), gone: [], moves: 0, tries: 0, misses: 0, helps: 0, finished: false };
}
/** The child touches `target`: a vehicle, a cone, the stop, CaliRoux or the empty yard. Null when nothing happens: the scene
 * is over, the target is unknown or a bus already gone. */
export function play(s: State, target: string): Result | null {
    if (s.finished) return null;
    const l = levelOf(s.level);
    const fail = (f: Fail, on: string): Result => ({ state: { ...s, moves: s.moves + 1, tries: s.tries + 1, misses: s.misses + 1 }, events: [{ kind: 'fail', fail: f, on }] });
    const i = l.vehicles.findIndex(v => v.id === target);
    if (i >= 0) {
        const v = l.vehicles[i]!;
        if (s.gone.includes(v.id)) return null;
        const t = tap(l, s, i);
        if (t.kind === 'fail') return fail(t.fail, v.id);
        const helped = hint(s).includes(v.id), pos = [...s.pos], gone = [...s.gone], events: Event[] = [];
        if (t.kind === 'roule') { events.push({ kind: 'roule', vehicle: v.id, from: pos[i]!, to: t.to, helped }); pos[i] = t.to; }
        const leaves = t.kind === 'part' || t.part;
        if (leaves) { gone.push(v.id); events.push({ kind: 'part', bus: v.id, color: v.color!, helped }); }
        const finished = isWon(l, gone);
        if (finished) events.push({ kind: 'fini' });
        return { state: { ...s, pos, gone, moves: s.moves + 1, misses: leaves ? 0 : s.misses, helps: s.helps + (helped ? 1 : 0), finished }, events };
    }
    const k = l.cones.findIndex((_, n) => coneId(n) === target);
    if (k >= 0) return fail('plot', target);
    if (target === ARRET) return fail('coucou', ARRET);
    if (target === CALIROUX) return fail('roulade', CALIROUX);
    if (target === COUR) return fail('pigeon', COUR);
    return null;
}
/** Help costs one star, and only help: everything else is free. */
export function stars(s: Pick<State, 'helps'>): 2 | 3 { return s.helps === 0 ? 3 : 2; }
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
/** What a finger at (x, y), in board units, touches: a vehicle still in the yard, a cone, an empty cell of the yard, the
 * stop or CaliRoux. Null: nothing (a gate, the fence, the grass). */
export function touched(s: Core, x: number, y: number): string | null {
    const l = levelOf(s.level), g = geometry(l);
    if (x >= g.x0 && x < g.x1 && y >= g.y0 && y < g.y1) {
        const col = Math.floor((x - g.x0) / g.cell), row = Math.floor((y - g.y0) / g.cell), who = occupancy(l, s.pos, s.gone)[row * l.cols + col]!;
        if (who >= 0) return l.vehicles[who]!.id;
        if (who === -2) return coneId(l.cones.findIndex(c => c.row === row && c.col === col));
        return COUR;
    }
    const inside = (b: Box): boolean => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;
    if (inside(STOP)) return ARRET;
    if (inside(CALI)) return CALIROUX;
    return null;
}
/** The new things a scene uses. */
export function featuresOf(l: LevelDef): Feature[] {
    const buses = l.vehicles.filter(v => v.kind === 'bus'), cars = l.vehicles.filter(v => v.kind === 'voiture');
    const has: Record<Feature, boolean> = {
        voiture: cars.some(v => v.len === 2), deuxbus: buses.length >= 2, plot: l.cones.length > 0,
        cote: l.exits.some(e => e.side !== 'haut'), grandcar: buses.some(v => v.len === 3), camion: cars.some(v => v.len === 3),
        deuxsorties: l.exits.length >= 2, grand: Math.max(l.cols, l.rows) >= 6
    };
    return features.filter(f => has[f]);
}
/** What a new thing brings with it: two gates are for two buses. */
export const needs: Readonly<Partial<Record<Feature, Feature[]>>> = { deuxsorties: ['deuxbus'] };
/** At most two vehicles before scene `EARLY`; never more than `MAX_VEHICLES`, `MAX_PAR` touches or `MAX_STATES` states. */
export const EARLY = 4, EARLY_VEHICLES = 2, MAX_VEHICLES = 10, MAX_PAR = 16, MAX_STATES = 5_000;
/** What a scene must respect to be fair to a four-year-old; empty when it does. */
export function problems(l: LevelDef): string[] {
    const out: string[] = [], buses = l.vehicles.filter(v => v.kind === 'bus');
    if (l.title.fr.length > 24 || l.title.en.length > 24) out.push('a short title');
    if (l.cols < 3 || l.rows < 3 || l.cols > 6 || l.rows > 6) out.push('a yard of three to six cells a side');
    if (l.vehicles.length > MAX_VEHICLES) out.push(`at most ${MAX_VEHICLES} vehicles`);
    if (l.id < EARLY && l.vehicles.length > EARLY_VEHICLES) out.push(`at most ${EARLY_VEHICLES} vehicles before scene ${EARLY}`);
    if (!buses.length) out.push('a bus');
    if ([...l.queue].sort().join('') !== buses.map(b => b.color).sort().join('')) out.push('one child for each bus');
    for (const b of buses) if (b.nose === 'bas') out.push(`${b.id}: a bus faces a side with gates`);
    const gates = new Set<string>();
    for (const e of l.exits) {
        if (e.at < 0 || e.at >= (e.side === 'haut' ? l.cols : l.rows)) out.push(`gate ${e.side} ${e.at}: on the yard`);
        if (gates.has(`${e.side}${e.at}`)) out.push(`gate ${e.side} ${e.at}: once`);
        gates.add(`${e.side}${e.at}`);
        if (!buses.some(b => b.nose === e.side && b.lane === e.at)) out.push(`gate ${e.side} ${e.at}: a bus drives through it`);
    }
    for (const v of l.vehicles) if (v.pos < 0 || v.pos + v.len > (v.axis === 'v' ? l.rows : l.cols) || v.lane >= (v.axis === 'v' ? l.cols : l.rows)) out.push(`${v.id}: inside the yard`);
    if (out.length) return out;
    if (new Set(occupancy(l, l.vehicles.map(v => v.pos), []).filter(x => x >= 0)).size !== l.vehicles.length) out.push('nothing on top of anything');
    const { par, states, dead } = measure(l);
    if (states > MAX_STATES) out.push(`at most ${MAX_STATES} states`);
    else if (par === Infinity) out.push('a way to the end');
    else if (dead) out.push(`${dead} dead ends`);
    else if (par > MAX_PAR) out.push(`at most ${MAX_PAR} touches`);
    return out;
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 8;
/** How far apart two scenes are: one per vehicle (kind, colour, place, nose), cone or gate one has and not the other, three
 * per new thing one has and not the other, four for another size of yard. */
export function distance(a: LevelDef, b: LevelDef): number {
    const bag = (l: LevelDef): string[] => [...l.vehicles.map(v => `${v.kind}:${v.color ?? ''}:${v.axis}${v.lane}:${v.pos}:${v.len}:${v.nose}`), ...l.cones.map(c => `#${c.row},${c.col}`), ...l.exits.map(e => `${e.side}${e.at}`), `${l.cols}x${l.rows}`, l.queue.join('')];
    const count = (xs: string[]): Map<string, number> => { const m = new Map<string, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
    const ca = count(bag(a)), cb = count(bag(b));
    let d = 0;
    for (const k of new Set([...ca.keys(), ...cb.keys()])) d += Math.abs((ca.get(k) ?? 0) - (cb.get(k) ?? 0));
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d + (a.cols === b.cols && a.rows === b.rows ? 0 : 4);
}
export const busColors = (l: LevelDef): Color[] => colors.filter(c => l.vehicles.some(v => v.color === c));
