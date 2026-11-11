import { features, handLevels, ONE_WAY, START, type Fail, type Feature, type Friend, type LevelDef, type Road, type Shape, type Spot } from './levels';
export { features, fails, friends, gifts, roofs, shapes, ONE_WAY, START, type Fail, type Feature, type Friend, type LevelDef, type Road, type Shape, type Spot } from './levels';
/** « Le kart de Pestouille »: Pestouille's kart rolls by itself, slowly and always at the same speed, along the road of each
 * screen; at a fork it stops and waits for the child to pick a road. No race, no rival, no clock, no ranking, nothing lost:
 * a wrong road leads to a funny try and the kart comes back to a fork.
 *
 * Time goes in ticks. A stretch is the way from one spot to the next: `EXIT` ticks to leave the screen of the previous spot
 * (along the road picked, or back down after a funny try), then the road of the new screen, as long as its shape. A gesture
 * is either a choice (fork, road) or a drift (instant). Pure and deterministic: no randomness, no clock. */
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
/** Ticks to leave a screen, and to drive the road of each shape (a road with a bridge or a tunnel takes a little longer). */
export const EXIT = 8;
export const SHAPE_TICKS: Readonly<Record<Shape, number>> = { droit: 20, vague: 26, serpent: 30, zigzag: 30, virage: 26, escalier: 30, boucle: 36 };
export const DECO_TICKS = 4;
export const roadTicks = (r: Road): number => SHAPE_TICKS[r.shape] + (r.deco ? DECO_TICKS : 0);
export const stretchTicks = (r: Road): number => EXIT + roadTicks(r);
/** The starred bend of a road: from 30 % to 80 % of the road, in ticks of the stretch. */
export function starWindow(r: Road): [number, number] | null {
    if (!r.star) return null;
    const n = roadTicks(r);
    return [EXIT + Math.round(n * .3), EXIT + Math.round(n * .8)];
}
/** Wrong roads in a scene before the good arrow shines; picking a shining arrow costs a star (and only that). */
export const HELP_AFTER = 2;

export interface State {
    level: number;
    t: number;
    /** The spot the kart heads for, how far along the stretch it is, and the screen it leaves (road -1: back down). */
    spot: string; d: number; from: { spot: string; road: number } | null;
    /** Stopped at a fork, waiting for a choice. */
    waiting: boolean;
    pending: Friend[]; delivered: Friend[];
    choices: number; wrong: number; helps: number; tries: number;
    /** Drift stars caught in the air, and whether this stretch has had its drift. */
    bonus: number; drifted: boolean;
    finished: boolean;
}
export type Event =
    | { kind: 'fourche'; spot: string }
    | { kind: 'livre'; spot: string; who: Friend }
    | { kind: 'fail'; spot: string; fail: Fail; who?: Friend; again?: boolean }
    | { kind: 'choix'; spot: string; road: number; good: boolean; helped: boolean }
    | { kind: 'derape'; spot: string };
export interface Result { state: State; events: Event[] }
export type Gesture = { kind: 'choix'; fork: string; road: number } | { kind: 'derape'; at: number };

export const spotOf = (l: LevelDef, id: string): Spot => { const s = l.spots[id]; if (!s) throw new RangeError(`Unknown spot ${id}`); return s; };
export function start(id: number): State {
    const l = levelOf(id);
    return { level: id, t: 0, spot: START, d: EXIT, from: null, waiting: false, pending: [...l.deliver], delivered: [], choices: 0, wrong: 0, helps: 0, tries: 0, bonus: 0, drifted: false, finished: false };
}
/** The screen shown: the one being left while the kart drives out of it, then the new one. */
export const screenOf = (s: Pick<State, 'spot' | 'd' | 'from'>): string => s.from && s.d < EXIT ? s.from.spot : s.spot;
const copy = (s: State): State => ({ ...s, pending: [...s.pending], delivered: [...s.delivered], from: s.from ? { ...s.from } : null });
const leave = (st: State, to: string, from: { spot: string; road: number }): void => { st.spot = to; st.d = 0; st.from = from; st.drifted = false; };
/** The kart reaches the spot of its stretch. */
function arrive(st: State, events: Event[]): void {
    const l = levelOf(st.level), sp = spotOf(l, st.spot);
    if (sp.kind === 'fourche') { st.waiting = true; events.push({ kind: 'fourche', spot: st.spot }); return; }
    if (sp.kind === 'ami' && st.pending.includes(sp.who)) {
        st.pending = st.pending.filter(f => f !== sp.who); st.delivered.push(sp.who);
        events.push({ kind: 'livre', spot: st.spot, who: sp.who });
        if (st.pending.length === 0) { st.finished = true; return; }
    } else {
        st.tries++;
        events.push(sp.kind === 'ami' ? { kind: 'fail', spot: st.spot, fail: 'mauvais', who: sp.who, again: st.delivered.includes(sp.who) } : { kind: 'fail', spot: st.spot, fail: sp.fail });
    }
    leave(st, sp.then!, { spot: st.spot, road: -1 });
}
/** One tick: the kart rolls on, unless it waits at a fork. */
export function tick(s: State): Result {
    if (s.finished || s.waiting) return { state: s, events: [] };
    const st = copy(s), events: Event[] = [];
    st.t++; st.d++;
    if (st.d >= stretchTicks(spotOf(levelOf(st.level), st.spot).road)) arrive(st, events);
    return { state: st, events };
}
/** The kart rolls by itself up to tick `to`, or until it waits at a fork, or the scene is finished. */
export function advance(s: State, to: number): Result {
    let st = s; const events: Event[] = [];
    while (st.t < to && !st.finished && !st.waiting) { const r = tick(st); st = r.state; events.push(...r.events); }
    return { state: st, events };
}
/** Rolls on until the kart waits at a fork or the scene is finished. */
export const roll = (s: State): Result => advance(s, Number.MAX_SAFE_INTEGER);

/** Where a choice leads without another choice: through friends and funny tries, to the next fork (or the end). */
export function follow(l: LevelDef, spot: string, pending: readonly Friend[]): { fork: string | null; pending: Friend[] } {
    let at = spot, left = [...pending];
    for (let n = 0; n <= Object.keys(l.spots).length; n++) {
        const sp = spotOf(l, at);
        if (sp.kind === 'fourche') return { fork: at, pending: left };
        if (sp.kind === 'ami' && left.includes(sp.who)) { left = left.filter(f => f !== sp.who); if (!left.length) return { fork: null, pending: left }; }
        if (!sp.then) throw new Error(`spot ${at} leads nowhere`);
        at = sp.then;
    }
    throw new Error(`a loop without a fork from ${spot}`);
}
const key = (fork: string, pending: readonly Friend[]): string => `${fork}|${[...pending].sort().join(',')}`;
/** The roads of a fork that can be picked (the one-way road cannot). */
export const openRoads = (sp: Extract<Spot, { kind: 'fourche' }>): number[] => sp.to.flatMap((to, i) => to === ONE_WAY ? [] : [i]);
/** Fewest choices left to deliver everything, from a fork with these friends still waiting (Infinity: never). */
export function choicesLeft(l: LevelDef, fork: string | null, pending: readonly Friend[]): number {
    if (fork === null) return pending.length ? Infinity : 0;
    // Breadth first over (fork, friends waiting): every choice costs one.
    const seen = new Map<string, number>([[key(fork, pending), 0]]);
    let frontier: { fork: string; pending: Friend[] }[] = [{ fork, pending: [...pending] }];
    for (let depth = 1; frontier.length; depth++) {
        const next: typeof frontier = [];
        for (const f of frontier) {
            const sp = spotOf(l, f.fork) as Extract<Spot, { kind: 'fourche' }>;
            for (const i of openRoads(sp)) {
                const r = follow(l, sp.to[i]!, f.pending);
                if (r.fork === null) return depth;
                const k = key(r.fork, r.pending);
                if (!seen.has(k)) { seen.set(k, depth); next.push({ fork: r.fork, pending: r.pending }); }
            }
        }
        frontier = next;
    }
    return Infinity;
}
/** The roads of the fork the kart waits at that start a shortest way to the end. */
export function goodRoads(s: State): number[] {
    if (!s.waiting || s.finished) return [];
    const l = levelOf(s.level), sp = spotOf(l, s.spot) as Extract<Spot, { kind: 'fourche' }>, now = choicesLeft(l, s.spot, s.pending);
    return openRoads(sp).filter(i => { const r = follow(l, sp.to[i]!, s.pending); return choicesLeft(l, r.fork, r.pending) === now - 1; });
}
/** The arrows that shine: the good roads, once the child has taken `HELP_AFTER` wrong roads in the scene. */
export const hint = (s: State): number[] => s.wrong >= HELP_AFTER ? goodRoads(s) : [];
/** The child picks road `road` of the fork the kart waits at. */
export function choose(s: State, fork: string, roadIndex: number): Result | null {
    if (s.finished || !s.waiting || s.spot !== fork || !Number.isInteger(roadIndex)) return null;
    const sp = spotOf(levelOf(s.level), fork);
    if (sp.kind !== 'fourche' || roadIndex < 0 || roadIndex >= sp.to.length || sp.to[roadIndex] === ONE_WAY) return null;
    const good = goodRoads(s).includes(roadIndex), helped = good && hint(s).length > 0;
    const st = copy(s);
    st.choices++; st.waiting = false;
    if (!good) st.wrong++;
    if (helped) st.helps++;
    leave(st, sp.to[roadIndex]!, { spot: fork, road: roadIndex });
    return { state: st, events: [{ kind: 'choix', spot: fork, road: roadIndex, good, helped }] };
}
/** Whether the kart is in a starred bend that has not had its drift yet. */
export function canDrift(s: State): boolean {
    if (s.finished || s.waiting || s.drifted) return false;
    const w = starWindow(spotOf(levelOf(s.level), s.spot).road);
    return w !== null && s.d >= w[0] && s.d < w[1];
}
/** The drift: the kart rolls to instant `at`, then, in a starred bend, slides with sparks and catches a star in the air. It
 * never changes where the kart goes nor when it gets there. Null for an instant already past. */
export function drift(s: State, at: number): (Result & { drifted: boolean }) | null {
    if (s.finished || !Number.isInteger(at) || at < s.t) return null;
    const ran = advance(s, at);
    if (!canDrift(ran.state)) return { ...ran, drifted: false };
    const st = copy(ran.state); st.drifted = true; st.bonus++;
    return { state: st, events: [...ran.events, { kind: 'derape', spot: st.spot }], drifted: true };
}
export function play(s: State, g: Gesture): Result | null { return g.kind === 'choix' ? choose(s, g.fork, g.road) : drift(s, g.at); }
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

/** What a sign shows for a road: the friends and funny things that road leads to, going forward (through forks only). */
export type Icon = { kind: 'ami'; who: Friend } | { kind: 'drole'; fail: Fail };
export function signOf(l: LevelDef, fork: string, roadIndex: number): Icon[] {
    const sp = spotOf(l, fork); if (sp.kind !== 'fourche') return [];
    const out: Icon[] = [], seen = new Set<string>();
    const walk = (id: string): void => {
        if (id === ONE_WAY || seen.has(id)) return; seen.add(id);
        const x = spotOf(l, id);
        if (x.kind === 'fourche') x.to.forEach(walk);
        else out.push(x.kind === 'ami' ? { kind: 'ami', who: x.who } : { kind: 'drole', fail: x.fail });
    };
    walk(sp.to[roadIndex]!);
    return out;
}
export const forks = (l: LevelDef): string[] => Object.keys(l.spots).filter(k => l.spots[k]!.kind === 'fourche');
/** The new things a scene uses. */
export function featuresOf(l: LevelDef): Feature[] {
    const sp = Object.values(l.spots), fs = sp.filter((x): x is Extract<Spot, { kind: 'fourche' }> => x.kind === 'fourche');
    const has: Record<Feature, boolean> = {
        deux: fs.length >= 2, derape: sp.some(x => x.road.star), trois: fs.some(f => !f.round && openRoads(f).length >= 3),
        double: l.deliver.length >= 2, toit: l.roofsOnly, sens: fs.some(f => f.to.includes(ONE_WAY)), rondpoint: fs.some(f => f.round),
        pont: sp.some(x => x.road.deco === 'pont'), tunnel: sp.some(x => x.road.deco === 'tunnel')
    };
    return features.filter(f => has[f]);
}
/** At most two forks before scene 8. */
export const EARLY = 8;
export const EARLY_FORKS = 2;
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(l: LevelDef): string[] {
    const out: string[] = [], ids = Object.keys(l.spots);
    if (l.spots[START]?.kind !== 'fourche') out.push('starts at a fork');
    if (l.title.fr.length > 24 || l.title.en.length > 24) out.push('a short title');
    if (!l.deliver.length || l.deliver.length > 2 || new Set(l.deliver).size !== l.deliver.length) out.push('one or two friends to deliver');
    if (l.id < EARLY && forks(l).length > EARLY_FORKS) out.push(`at most ${EARLY_FORKS} forks before scene ${EARLY}`);
    for (const id of ids) {
        const sp = l.spots[id]!;
        const next = sp.kind === 'fourche' ? sp.to.filter(t => t !== ONE_WAY) : sp.then ? [sp.then] : [];
        for (const t of next) if (!l.spots[t]) out.push(`${id}: unknown spot ${t}`);
        if (sp.kind === 'fourche') {
            if (sp.to.length < 2 || sp.to.length > 3) out.push(`${id}: two or three roads`);
            if (openRoads(sp).length < 2) out.push(`${id}: two roads to pick at least`);
            if (sp.to.filter(t => t === ONE_WAY).length > 1) out.push(`${id}: one one-way road at most`);
            if (new Set(sp.to.filter(t => t !== ONE_WAY)).size !== openRoads(sp).length) out.push(`${id}: two roads to the same spot`);
            sp.to.forEach((t, i) => { if (t !== ONE_WAY && l.spots[t]) { const n = signOf(l, id, i).length; if (n > (sp.to.length === 2 ? 3 : 2)) out.push(`${id}: road ${i} sign too full`); } });
        } else if (sp.kind === 'drole') { if (l.spots[sp.then]?.kind !== 'fourche') out.push(`${id}: a funny try goes back to a fork`); }
        else if (!l.deliver.includes(sp.who) && !sp.then) out.push(`${id}: a friend who waits for nothing sends the kart back`);
        else if (sp.then && l.spots[sp.then]?.kind !== 'fourche') out.push(`${id}: back to a fork`);
        if (sp.road.star && sp.road.shape === 'droit') out.push(`${id}: a starred bend needs a bend`);
    }
    for (const f of l.deliver) if (!ids.some(id => { const sp = l.spots[id]!; return sp.kind === 'ami' && sp.who === f; })) out.push(`no house for ${f}`);
    if (out.length) return out;
    // Every spot is reached, and from every reachable state everything can still be delivered.
    const reached = new Set<string>([START]), states = new Map<string, { fork: string; pending: Friend[] }>([[key(START, l.deliver), { fork: START, pending: [...l.deliver] }]]);
    const todo = [...states.values()];
    try {
        while (todo.length) {
            const f = todo.pop()!, sp = l.spots[f.fork] as Extract<Spot, { kind: 'fourche' }>;
            if (choicesLeft(l, f.fork, f.pending) === Infinity) { out.push(`a dead end at ${f.fork}`); break; }
            for (const i of openRoads(sp)) {
                // The spots passed on the way, then the next fork with the friends still waiting.
                let at = sp.to[i]!, left = [...f.pending];
                while (l.spots[at]!.kind !== 'fourche') {
                    reached.add(at); const x = l.spots[at]! as Exclude<Spot, { kind: 'fourche' }>;
                    if (x.kind === 'ami' && left.includes(x.who)) { left = left.filter(w => w !== x.who); if (!left.length) break; }
                    if (!x.then || reached.has(`${at}>${x.then}`)) break;
                    reached.add(`${at}>${x.then}`); at = x.then;
                }
                const r = follow(l, sp.to[i]!, f.pending);
                if (r.fork !== null) { reached.add(r.fork); const k = key(r.fork, r.pending); if (!states.has(k)) { const next = { fork: r.fork, pending: r.pending }; states.set(k, next); todo.push(next); } }
            }
        }
    } catch (e) { out.push((e as Error).message); }
    for (const id of ids) if (!reached.has(id)) out.push(`${id} is never reached`);
    return out;
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts. */
export const MIN_GAP = 6;
/** How far apart two scenes are: three per new thing one has and not the other, two per fork more or less, one per road
 * shape, friend and funny try one has and not the other (counted with repeats), one per road more or less at the start, two
 * per fewest-choices difference. */
export function distance(a: LevelDef, b: LevelDef): number {
    const bag = (l: LevelDef): string[] => Object.values(l.spots).flatMap(sp => [`shape:${sp.road.shape}${sp.road.star ? '*' : ''}${sp.road.deco ?? ''}`, sp.kind === 'ami' ? `ami:${sp.who}` : sp.kind === 'drole' ? `fail:${sp.fail}` : `fork:${sp.to.length}${sp.round ? 'r' : ''}`]).concat(l.deliver.map(f => `deliver:${f}`));
    const count = (xs: string[]): Map<string, number> => { const m = new Map<string, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
    const ca = count(bag(a)), cb = count(bag(b));
    let d = 0;
    for (const k of new Set([...ca.keys(), ...cb.keys()])) d += Math.abs((ca.get(k) ?? 0) - (cb.get(k) ?? 0));
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    d += 2 * Math.abs(forks(a).length - forks(b).length) + 2 * Math.abs(a.best - b.best);
    return d;
}
