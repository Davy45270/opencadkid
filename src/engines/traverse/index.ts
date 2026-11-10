import { features, handLevels, type Feature, type Lane, type LevelDef } from './levels';
export { features, goals, heroes, type Feature, type GoalKind, type Hero, type Lane, type LaneKind, type LevelDef } from './levels';
/** « La traversée de Lumi »: a little one crosses roads, a river and rails to reach the other side. Turn by turn: nothing
 * moves until the child moves, and one step of the little one is one step of the world (cars, logs, ducks, lilies, the
 * train). No clock, no lives, nothing to lose. A step that would end under a car or in the water is a funny try: the car
 * honks and brakes, the little one jumps back to where it was, and the world waits. Pure and deterministic. */
export const actions = ['haut', 'bas', 'gauche', 'droite', 'attendre', 'feu'] as const;
export type Action = typeof actions[number];
export const moves = ['haut', 'bas', 'gauche', 'droite'] as const satisfies readonly Action[];
/** Funny tries: each has its own animation, and the little one ends up where it was, with nothing lost. */
export const fails = ['voiture', 'camion', 'tracteur', 'canard', 'train', 'plouf', 'nenuphar', 'bord'] as const;
export type Fail = typeof fails[number];
/** Funny tries in a row before the right next step pulses. */
export const TRIES_BEFORE_HELP = 3;
/** Ticks the cars stay stopped after a touch on the traffic light. */
export const RED_TICKS = 3;
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
export const width = (level: LevelDef): number => level.lanes[0]!.ring.length;
export const height = (level: LevelDef): number => level.lanes.length;
/** The lane of row `y`, row 0 being the start bank at the bottom. */
export const laneAt = (level: LevelDef, y: number): Lane => level.lanes[level.lanes.length - 1 - y]!;
const mod = (a: number, n: number): number => ((a % n) + n) % n;
const moving = (lane: Lane): boolean => lane.dir !== 0 && (lane.kind === 'route' || lane.kind === 'pre' || lane.kind === 'riviere');
const isDanger = (lane: Lane): boolean => lane.kind !== 'herbe';
export const dangers = (level: LevelDef): number => level.lanes.filter(isDanger).length;

/** The clock of the world: ticks, and the ticks the cars spent stopped at the red light. */
export interface Clock { t: number; held: number; red: number }
const tick = (c: Clock): Clock => ({ t: c.t + 1, held: c.held + (c.red > 0 ? 1 : 0), red: Math.max(0, c.red - 1) });
/** How far the things of a lane have gone at this clock: roads stop at the red light, slow lanes move every other tick. */
export function offset(lane: Lane, c: Clock): number { const o = lane.kind === 'route' ? c.t - c.held : c.t; return lane.slow ? Math.floor(o / 2) : o; }
/** What is on cell x of a moving lane, or of a still lane. */
export function cell(lane: Lane, x: number, c: Clock): string {
    if (lane.kind === 'rail') return '.';
    if (!moving(lane)) return lane.ring[x] ?? '.';
    return lane.ring[mod(x - lane.dir * offset(lane, c), lane.ring.length)]!;
}
/** Where ring index i of a moving lane is now, from 0 to the ring length (the board shows 0 to width - 1). */
export const place = (lane: Lane, i: number, c: Clock): number => mod(i + lane.dir * offset(lane, c), lane.ring.length);
export const lilyUp = (ch: string, t: number): boolean => (ch === 'n' || ch === 'm') && mod(t + (ch === 'm' ? 2 : 0), 4) < 2;
/** The barrier of a rail lane: down when the bell rings (`b`) and while the train goes by (`X`). */
export const closed = (lane: Lane, t: number): boolean => lane.ring[mod(t, lane.ring.length)] !== '.';
export const trainHere = (lane: Lane, t: number): boolean => lane.ring[mod(t, lane.ring.length)] === 'X';
const VEHICLE: Record<string, Fail> = { c: 'voiture', T: 'camion', r: 'tracteur', d: 'canard' };

export function featuresOf(level: LevelDef): Feature[] {
    const roads = level.lanes.filter(l => l.kind === 'route');
    const has: Record<Feature, boolean> = {
        deuxsens: roads.some(l => l.dir === 1) && roads.some(l => l.dir === -1),
        camion: roads.some(l => l.ring.includes('T')), tracteur: roads.some(l => l.ring.includes('r')),
        rondin: level.lanes.some(l => l.kind === 'riviere' && l.dir !== 0), nenuphar: level.lanes.some(l => l.kind === 'riviere' && l.dir === 0),
        canard: level.lanes.some(l => l.kind === 'pre'), train: level.lanes.some(l => l.kind === 'rail'),
        ami: level.lanes.some(l => l.kind === 'herbe' && l.ring.includes('A')), gouter: level.lanes.some(l => l.kind === 'herbe' && l.ring.includes('o')),
        feu: level.lanes.some(l => l.kind === 'herbe' && l.ring.includes('F')), attendre: level.wait
    };
    return features.filter(f => has[f]);
}
const find = (level: LevelDef, ch: string): { x: number; y: number }[] => {
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < height(level); y++) { const lane = laneAt(level, y); if (lane.kind === 'herbe') for (let x = 0; x < lane.ring.length; x++) if (lane.ring[x] === ch) out.push({ x, y }); }
    return out;
};
export const startOf = (level: LevelDef): { x: number; y: number } => find(level, 'S')[0]!;
export const homeOf = (level: LevelDef): { x: number; y: number } => find(level, 'H')[0]!;
export const friendOf = (level: LevelDef): { x: number; y: number } | null => find(level, 'A')[0] ?? null;
export const snacksOf = (level: LevelDef): { x: number; y: number }[] => find(level, 'o');
export const lightOf = (level: LevelDef): { x: number; y: number } | null => find(level, 'F')[0] ?? null;

/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(level: LevelDef): string[] {
    const out: string[] = [], w = width(level), h = height(level), lanes = level.lanes;
    if (w < 5 || w > 7) out.push('five to seven columns');
    if (h < 3 || h > 9) out.push('three to nine lanes');
    if (lanes[0]?.kind !== 'herbe' || lanes[h - 1]?.kind !== 'herbe') out.push('grass at both ends');
    for (const [i, lane] of lanes.entries()) {
        const r = lane.ring, at = `lane ${i}`;
        if (lane.kind === 'herbe') { if (r.length !== w || !/^[.SHxAoF]+$/.test(r)) out.push(`${at}: grass cells`); if (lane.dir !== 0 || lane.slow) out.push(`${at}: grass stays still`); }
        if (lane.kind === 'route') {
            if (lane.dir === 0 || r.length < w || r.length > 2 * w || !/^[.cTr]+$/.test(r)) out.push(`${at}: road cells`);
            if (r.includes('r') && !lane.slow) out.push(`${at}: tractors go slow`);
            for (const run of r.match(/T+/g) ?? []) if (run.length < 2 || run.length > 3) out.push(`${at}: a truck is two or three cells`);
            if (!r.includes('.')) out.push(`${at}: a gap to cross`);
        }
        if (lane.kind === 'pre') { if (lane.dir === 0 || r.length < w || r.length > 2 * w || !/^[.d]+$/.test(r) || !r.includes('d')) out.push(`${at}: meadow cells`); }
        if (lane.kind === 'riviere') {
            if (lane.dir === 0) { if (r.length !== w || !/^[.nm]+$/.test(r) || lane.slow) out.push(`${at}: still water cells`); }
            else {
                if (r.length < w || r.length > 2 * w || !/^[.l]+$/.test(r)) out.push(`${at}: river cells`);
                const logs = (r + r).slice(r.indexOf('.')).match(/l+/g) ?? [];
                if (!logs.length || logs.some(run => run.length < 2 || run.length > 4)) out.push(`${at}: logs of two to four cells`);
            }
        }
        if (lane.kind === 'rail') {
            if (r.length < 6 || r.length > 14 || !/^\.+b+X+$/.test(r)) out.push(`${at}: the bell rings before the train, then it is open`);
        }
    }
    if (find(level, 'S').length !== 1 || find(level, 'H').length !== 1) out.push('one start, one home');
    if (find(level, 'A').length > 1 || find(level, 'F').length > 1) out.push('at most one friend and one light');
    if (lightOf(level) && !lanes.some(l => l.kind === 'route')) out.push('a light needs a road');
    if (snacksOf(level).length > 2) out.push('at most two snacks');
    if (find(level, 'S').some(p => p.y !== 0)) out.push('the start is on the bottom bank');
    return out;
}

export interface State {
    level: number; x: number; y: number; t: number; held: number; red: number;
    /** The friend walks with the little one once found; snacks go in the basket. */
    friend: boolean; picked: boolean[];
    /** Steps (successful or not, the light included), funny tries, funny tries in a row, helps. */
    steps: number; tries: number; dry: number; helps: number; finished: boolean;
}
export function start(id: number): State {
    const level = levelOf(id), s = startOf(level);
    return { level: id, x: s.x, y: s.y, t: 0, held: 0, red: 0, friend: false, picked: snacksOf(level).map(() => false), steps: 0, tries: 0, dry: 0, helps: 0, finished: false };
}
export const clockOf = (s: Pick<State, 't' | 'held' | 'red'>): Clock => ({ t: s.t, held: s.held, red: s.red });
const DELTA: Record<Action, [number, number]> = { haut: [0, 1], bas: [0, -1], gauche: [-1, 0], droite: [1, 0], attendre: [0, 0], feu: [0, 0] };
/** Where a step would land, and whether it works: null when it is no step at all (off the board, into a bush or the light). */
export type Landing = { ok: true; x: number; y: number; carried: number } | { ok: false; fail: Fail; x: number; y: number };
export function landing(level: LevelDef, s: Pick<State, 'x' | 'y' | 't' | 'held' | 'red'>, a: Action): Landing | null {
    if (a === 'feu') return null;
    if (a === 'attendre' && !level.wait) return null;
    const [dx, dy] = DELTA[a], x = s.x + dx, y = s.y + dy, w = width(level);
    if (x < 0 || x >= w || y < 0 || y >= height(level)) return null;
    const lane = laneAt(level, y), now = clockOf(s), next = tick(now);
    if (lane.kind === 'herbe') return 'xF'.includes(lane.ring[x]!) ? null : { ok: true, x, y, carried: 0 };
    if (lane.kind === 'route' || lane.kind === 'pre') {
        const a0 = cell(lane, x, now), a1 = cell(lane, x, next), hit = a0 !== '.' ? a0 : a1;
        return hit === '.' ? { ok: true, x, y, carried: 0 } : { ok: false, fail: VEHICLE[hit]!, x, y };
    }
    if (lane.kind === 'rail') return closed(lane, now.t) || closed(lane, next.t) ? { ok: false, fail: 'train', x, y } : { ok: true, x, y, carried: 0 };
    if (lane.dir === 0) {
        // A lily that comes up as the little one lands holds it; one that dives as it lands, or water, does not.
        const ch = lane.ring[x]!;
        if (lilyUp(ch, next.t)) return { ok: true, x, y, carried: 0 };
        return { ok: false, fail: lilyUp(ch, now.t) ? 'nenuphar' : 'plouf', x, y };
    }
    if (cell(lane, x, now) !== 'l') return { ok: false, fail: 'plouf', x, y };
    const carried = lane.dir * (offset(lane, next) - offset(lane, now));
    return x + carried < 0 || x + carried >= w ? { ok: false, fail: 'bord', x, y } : { ok: true, x: x + carried, y, carried };
}
/** The actions that are steps at all in this state (a funny try is a step). */
export function possible(s: State): Action[] {
    const level = levelOf(s.level), out: Action[] = moves.filter(a => landing(level, s, a));
    if (level.wait) out.push('attendre');
    if (lightOf(level) && s.red === 0) out.push('feu');
    return out;
}
export interface Result { action: Action; state: State; landing: Landing | null; helped: boolean; picked: 'ami' | 'gouter' | null }
/** One step of the child. A step that works moves the world by one tick; a funny try changes nothing but the counters. */
export function step(s: State, a: Action): Result | null {
    if (s.finished) return null;
    const level = levelOf(s.level), helped = helpOn(s) && hint(s) === a;
    if (a === 'feu') {
        if (!lightOf(level) || s.red > 0) return null;
        return { action: a, state: { ...s, red: RED_TICKS, steps: s.steps + 1, helps: s.helps + (helped ? 1 : 0), dry: helped ? 0 : s.dry }, landing: null, helped, picked: null };
    }
    const l = landing(level, s, a);
    if (!l) return null;
    if (!l.ok) return { action: a, state: { ...s, steps: s.steps + 1, tries: s.tries + 1, dry: s.dry + 1 }, landing: l, helped: false, picked: null };
    const c = tick(clockOf(s)), lane = laneAt(level, l.y);
    let friend = s.friend, picked = s.picked, got: Result['picked'] = null;
    if (lane.kind === 'herbe') {
        if (lane.ring[l.x] === 'A' && !friend) { friend = true; got = 'ami'; }
        const k = snacksOf(level).findIndex(p => p.x === l.x && p.y === l.y);
        if (k >= 0 && !picked[k]) { picked = picked.map((p, i) => p || i === k); got = 'gouter'; }
    }
    const home = homeOf(level), finished = l.x === home.x && l.y === home.y && (friend || !friendOf(level)) && picked.every(Boolean);
    return { action: a, state: { ...s, x: l.x, y: l.y, ...c, friend, picked, steps: s.steps + 1, dry: 0, helps: s.helps + (helped ? 1 : 0), finished }, landing: l, helped, picked: got };
}

const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
const lcm = (a: number, b: number): number => a / gcd(a, b) * b;
/** The world comes back exactly as it was after this many ticks (roads apart, which the light may hold). */
export function periods(level: LevelDef): { world: number; roads: number } {
    let world = 1, roads = 1;
    for (const lane of level.lanes) {
        const p = lane.kind === 'rail' ? lane.ring.length : lane.kind === 'riviere' && lane.dir === 0 ? 4 : moving(lane) ? lane.ring.length * (lane.slow ? 2 : 1) : 1;
        if (lane.kind === 'route') roads = lcm(roads, p); else world = lcm(world, p);
    }
    return lightOf(level) ? { world, roads } : { world: lcm(world, roads), roads: 1 };
}
type Node = Pick<State, 'x' | 'y' | 't' | 'held' | 'red' | 'friend' | 'picked'>;
function keyOf(level: LevelDef, n: Node, p: { world: number; roads: number }): string {
    const roads = lightOf(level) ? mod(n.t - n.held, p.roads) : 0;
    return `${n.x},${n.y},${mod(n.t, p.world)},${roads},${n.red},${n.friend ? 1 : 0},${n.picked.map(b => b ? 1 : 0).join('')}`;
}
const playOf = (level: LevelDef, n: Node): State => ({ level: level.id, ...n, steps: 0, tries: 0, dry: 0, helps: 0, finished: false });
/** Every state the little one can reach from `from`, with only steps that work: the edges of the game, as a graph. */
export function explore(from: State): { nodes: Map<string, { state: State; next: { action: Action; key: string }[] }>; start: string; goals: Set<string> } {
    const level = levelOf(from.level), p = periods(level), nodes = new Map<string, { state: State; next: { action: Action; key: string }[] }>(), goalsSet = new Set<string>();
    const first = playOf(level, from), startKey = keyOf(level, first, p), queue: State[] = [first];
    nodes.set(startKey, { state: first, next: [] });
    if (from.finished) goalsSet.add(startKey);
    for (let i = 0; i < queue.length; i++) {
        const s = queue[i]!, here = nodes.get(keyOf(level, s, p))!;
        if (goalsSet.has(keyOf(level, s, p))) continue;
        for (const a of actions) {
            const r = step(s, a);
            if (!r || (r.landing && !r.landing.ok)) continue;
            const n = r.state, k = keyOf(level, n, p);
            here.next.push({ action: a, key: k });
            if (!nodes.has(k)) { nodes.set(k, { state: { ...n, steps: 0, tries: 0, dry: 0, helps: 0 }, next: [] }); queue.push(nodes.get(k)!.state); if (n.finished) goalsSet.add(k); }
        }
    }
    return { nodes, start: startKey, goals: goalsSet };
}
/** The shortest way from `s` to the end of the scene, as a list of actions; null when there is none. */
export function solve(s: State): Action[] | null {
    if (s.finished) return [];
    const level = levelOf(s.level), p = periods(level), first = playOf(level, s), seen = new Map<string, { from: string | null; action: Action | null }>();
    const startKey = keyOf(level, first, p), queue: State[] = [first];
    seen.set(startKey, { from: null, action: null });
    for (let i = 0; i < queue.length; i++) {
        const cur = queue[i]!, ck = keyOf(level, cur, p);
        for (const a of actions) {
            const r = step(cur, a);
            if (!r || (r.landing && !r.landing.ok)) continue;
            const k = keyOf(level, r.state, p);
            if (seen.has(k)) continue;
            seen.set(k, { from: ck, action: a });
            if (r.state.finished) {
                const path: Action[] = [];
                for (let at: string | null = k; at !== null && seen.get(at)!.action; at = seen.get(at)!.from) path.unshift(seen.get(at)!.action!);
                return path;
            }
            queue.push({ ...r.state, dry: 0, helps: 0 });
        }
    }
    return null;
}
export const helpOn = (s: State): boolean => !s.finished && s.dry >= TRIES_BEFORE_HELP;
const hintCache = new Map<string, Action | null>();
/** The right next step: the first of a shortest way to the end. */
export function hint(s: State): Action | null {
    const level = levelOf(s.level), k = `${s.level}:${keyOf(level, s, periods(level))}`;
    if (!hintCache.has(k)) hintCache.set(k, solve({ ...s, dry: 0 })?.[0] ?? null);
    return hintCache.get(k)!;
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
export const MIN_GAP = 3;
/** How far apart two scenes are: lanes compared from the start bank up (kind, way, speed, what is on them), two per lane
 * more or less, two per column more or less, three per new thing one has and not the other. */
export function distance(a: LevelDef, b: LevelDef): number {
    const ha = height(a), hb = height(b);
    let d = 2 * Math.abs(ha - hb) + 2 * Math.abs(width(a) - width(b));
    for (let y = 0; y < Math.min(ha, hb); y++) {
        const la = laneAt(a, y), lb = laneAt(b, y);
        if (la.kind !== lb.kind || la.dir !== lb.dir || la.slow !== lb.slow || la.ring !== lb.ring) d++;
    }
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d;
}
