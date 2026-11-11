import { COL, features, FLOOR, H, handLevels, ROW, THICK, W, type Feature, type LevelDef, type Piece, type Plat } from './levels';
export { COL, features, FLOOR, H, kinds, pieces, plat, ROW, rowY, THICK, W, type Feature, type Kind, type Ladder, type LevelDef, type Piece, type Plat } from './levels';
/** « Le robot de Boubou »: Boubou jumps from platform to platform in a toy workshop seen from the side, picks up the parts
 * of a kind big robot that sits broken at the end of it, and brings them back to it. The child touches a platform: if Boubou
 * can reach it, he jumps (or walks, or climbs) there; if not, a funny try, and nothing is lost. No clock, no lives, no fall
 * that hurts: the floor is a big soft cushion.
 *
 * Time goes in ticks. A gesture is (what is touched, instant): Boubou leaves at that instant and is busy until he lands; the
 * lift goes up and down in a slow loop whatever he does. Pure and deterministic: no randomness, no clock. */
export const levels: readonly LevelDef[] = handLevels;
export const levelOf = (id: number): LevelDef => { const l = levels[id - 1]; if (!l) throw new RangeError('Unknown level'); return l; };
/** How high (from his feet), how far down and how far (between the edges of two platforms) Boubou jumps; from a
 * trampoline, three rows up. Further down, the cushion catches him and bounces him back home. */
export const UP = 57, DOWN = 57, TRAMP_UP = 168, GAP = 40;
/** Boubou's height, a plank's thickness, the robot's box. */
export const BODY = 40;
export const ROBOT_W = 52, ROBOT_H = 90;
export const robotBox = (l: Pick<LevelDef, 'robot'>): Box => l.robot === 'd' ? { what: 'robot', x0: W - 4 - ROBOT_W, y0: FLOOR - ROBOT_H, x1: W - 4, y1: FLOOR } : { what: 'robot', x0: 4, y0: FLOOR - ROBOT_H, x1: 4 + ROBOT_W, y1: FLOOR };
/** The lift waits 18 ticks at the bottom, goes up in 10, waits 18 at the top, comes down in 10. */
export const LIFT = 56, LIFT_WAIT = 18;
export const HELP_AFTER = 3;
export const ROBOT = 'robot';
export const FLOOR_PLAT = 'sol';
export type Fail = 'coussin' | 'bong' | 'balles' | 'canard' | 'surplace' | 'eternue';
export const fails: readonly Fail[] = ['coussin', 'bong', 'balles', 'canard', 'surplace', 'eternue'];
export type How = 'marche' | 'saut' | 'trampo' | 'echelle' | 'tapis' | 'donne' | Fail;
export interface Pt { x: number; y: number }
export interface Box { what: string; x0: number; y0: number; x1: number; y1: number }
/** A leg of a move: from one point to another in `n` ticks, along an arc `h` high (0: straight). */
export interface Seg { x0: number; y0: number; x1: number; y1: number; n: number; h: number }
export interface Move { how: How; target: string; t0: number; segs: Seg[] }
export interface State {
    level: number;
    /** The instant of the last gesture, the platform Boubou is on (or lands on), and when he is free again. */
    t: number; at: string; busy: number;
    /** The parts Boubou carries and those back in the robot (by the platform they lay on); whether the bridge is out. */
    carried: string[]; delivered: string[]; bridge: boolean;
    moves: number; wrong: number; helps: number; tries: number;
    move: Move | null;
    finished: boolean;
}
export type Event =
    | { kind: 'move'; how: How; target: string; good: boolean; helped: boolean }
    | { kind: 'piece'; at: string; piece: Piece }
    | { kind: 'lourd'; at: string }
    | { kind: 'pont' }
    | { kind: 'fail'; fail: Fail }
    | { kind: 'rapporte'; n: number }
    | { kind: 'fini' };
export interface Result { state: State; events: Event[] }
export interface Gesture { target: string; at: number }

const floorPlat: Plat = { id: FLOOR_PLAT, kind: 'sol', x0: 0, x1: W, y: FLOOR, top: FLOOR, h: H - FLOOR, piece: null, to: null, button: false };
const cache = new WeakMap<LevelDef, { plats: Plat[]; byId: Map<string, Plat> }>();
function platsOf(l: LevelDef): { plats: Plat[]; byId: Map<string, Plat> } {
    let c = cache.get(l);
    if (!c) { const plats = [floorPlat, ...l.plats]; c = { plats, byId: new Map(plats.map(p => [p.id, p])) }; cache.set(l, c); }
    return c;
}
export const allPlats = (l: LevelDef): readonly Plat[] => platsOf(l).plats;
export const platOf = (l: LevelDef, id: string): Plat => { const p = platsOf(l).byId.get(id); if (!p) throw new RangeError(`Unknown platform ${id}`); return p; };
export const partsOf = (l: LevelDef): Plat[] => l.plats.filter(p => p.piece);
export const lift = (l: LevelDef): Plat | undefined => l.plats.find(p => p.kind === 'ascenseur');
/** Where the lift's floor is at instant t. */
export function liftY(p: Pick<Plat, 'y' | 'top'>, t: number): number {
    const k = ((t % LIFT) + LIFT) % LIFT, w = LIFT_WAIT, m = LIFT / 2 - w;
    if (k < w) return p.y;
    if (k < w + m) return p.y + (p.top - p.y) * (k - w) / m;
    if (k < 2 * w + m) return p.top;
    return p.top + (p.y - p.top) * (k - 2 * w - m) / m;
}
export const yAt = (p: Plat, t: number): number => p.kind === 'ascenseur' ? liftY(p, t) : p.y;
/** Where Boubou stands on a platform: its middle, or beside the robot on the floor. */
export const standX = (l: LevelDef, p: Plat): number => p.kind === 'sol' ? (l.robot === 'd' ? 105 : 75) : (p.x0 + p.x1) / 2;
export const standAt = (l: LevelDef, id: string, t: number): Pt => { const p = platOf(l, id); return { x: standX(l, p), y: yAt(p, t) }; };
export const isHidden = (p: Plat, bridge: boolean): boolean => p.kind === 'pont' && !bridge;
/** What can be touched: every platform shown (not the floor: it is a cushion) and the robot. */
export const targets = (l: LevelDef, bridge: boolean): string[] => [...l.plats.filter(p => !isHidden(p, bridge)).map(p => p.id), ROBOT];
export const gapOf = (a: Plat, b: Plat): number => Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1));
const ladderOf = (l: LevelDef, a: string, b: string) => l.ladders.find(d => (d.a === a && d.b === b) || (d.a === b && d.b === a));
/** Ticks of the jump; the reach is judged with the target where it will be when Boubou lands. */
export const JUMP = 8;
interface Outcome { how: How; land: string }
/** What a touch on `target` does from platform `at`, with the platforms where they are (`fy`, `ty`); `give`: Boubou carries
 * a battery. Null: nothing to do. */
export function outcome(l: LevelDef, at: string, target: string, give: boolean, bridge: boolean, fy: number, ty: number): Outcome | null {
    // The robot's long magnet arm takes a battery (and what comes with it) from wherever Boubou is; without one, it sneezes.
    if (target === ROBOT) return give ? { how: 'donne', land: at } : { how: 'eternue', land: at };
    if (target === at) return null;
    const from = platOf(l, at), p = platsOf(l).byId.get(target);
    if (!p || isHidden(p, bridge)) return null;
    if (ladderOf(l, at, target)) return { how: 'echelle', land: target };
    if (p.kind === 'tapis' && p.to === at) return { how: 'surplace', land: at };
    const rise = fy - ty, gap = gapOf(from, p);
    if (rise > (from.kind === 'trampo' ? TRAMP_UP : UP)) return { how: 'bong', land: at };
    if (gap > GAP || -rise > DOWN) return { how: 'coussin', land: at };
    if (p.kind === 'canard') return { how: 'canard', land: at };
    if (p.kind === 'balles') return { how: 'balles', land: target };
    if (p.kind === 'tapis') return { how: 'tapis', land: p.to! };
    if (from.kind === 'trampo') return { how: 'trampo', land: target };
    return { how: Math.abs(rise) <= 2 && gap === 0 ? 'marche' : 'saut', land: target };
}
const isFail = (h: How): h is Fail => (fails as readonly string[]).includes(h);
interface Core { at: string; carried: string[]; delivered: string[]; bridge: boolean }
/** Lands Boubou: the part on the platform is picked up (one battery at a time), the switch brings the bridge out, the robot
 * takes what he carries. */
function land(l: LevelDef, c: Core, o: Outcome, events: Event[]): boolean {
    c.at = o.land;
    if (o.how === 'donne') {
        const n = c.carried.length; c.delivered = [...c.delivered, ...c.carried]; c.carried = [];
        if (c.delivered.length === partsOf(l).length) { events.push({ kind: 'fini' }); return true; }
        events.push({ kind: 'rapporte', n }); return false;
    }
    if (o.how === 'eternue' || o.how === 'bong' || o.how === 'coussin' || o.how === 'canard' || o.how === 'surplace') return false;
    const p = platOf(l, c.at);
    if (p.piece && !c.carried.includes(p.id) && !c.delivered.includes(p.id)) {
        if (p.piece === 'p' && c.carried.some(id => platOf(l, id).piece === 'p')) events.push({ kind: 'lourd', at: p.id });
        else { c.carried = [...c.carried, p.id]; events.push({ kind: 'piece', at: p.id, piece: p.piece }); }
    }
    if (p.button && !c.bridge) { c.bridge = true; events.push({ kind: 'pont' }); }
    // The last part: the robot's magnet arm takes them all at once.
    if (c.carried.length && c.carried.length + c.delivered.length === partsOf(l).length) { c.delivered = [...c.delivered, ...c.carried]; c.carried = []; events.push({ kind: 'fini' }); return true; }
    return false;
}
const arc = (a: Pt, b: Pt, n: number, h: number): Seg => ({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, n, h });
/** The legs of a move, from where Boubou stands to where he lands. */
export function motion(l: LevelDef, at: string, target: string, how: How, t0: number, landOn: string): Seg[] {
    const a = standAt(l, at, t0);
    if (how === 'eternue' || how === 'donne') return [arc(a, a, 16, 0)];
    const p = platOf(l, target), b = { x: standX(l, p), y: yAt(p, t0 + JUMP) }, up = (y: number): number => Math.max(14, a.y - Math.min(a.y, y) + 16);
    switch (how) {
        case 'marche': return [arc(a, b, 6, 0)];
        case 'saut': return [arc(a, b, JUMP, up(b.y))];
        case 'trampo': return [arc(a, { x: a.x, y: a.y + 4 }, 2, 0), arc({ x: a.x, y: a.y + 4 }, b, JUMP + 2, up(b.y) + 20)];
        case 'echelle': { const x = ladderOf(l, at, target)!.x; return [arc(a, { x, y: a.y }, 3, 0), arc({ x, y: a.y }, { x, y: b.y }, 10, 0), arc({ x, y: b.y }, b, 3, 0)]; }
        case 'tapis': {
            const q = platOf(l, landOn), dest = { x: standX(l, q), y: q.y }, end = { x: q.x0 >= p.x1 ? p.x1 - 6 : p.x0 + 6, y: p.y };
            return [arc(a, b, JUMP, up(b.y)), arc(b, end, 10, 0), arc(end, dest, 7, Math.max(14, end.y - dest.y + 14))];
        }
        case 'coussin': {
            // Out towards the platform too far away, arms wide, down onto the cushion, and a big bounce back home.
            const edge = { x: a.x + Math.sign(b.x - a.x || 1) * Math.min(Math.abs(b.x - a.x), 46), y: Math.min(a.y, b.y) + 10 }, cushion = { x: edge.x, y: FLOOR };
            return [arc(a, edge, 6, 18), arc(edge, cushion, Math.max(3, Math.round((FLOOR - edge.y) / 24)), 0), arc(cushion, { x: cushion.x, y: cushion.y - 6 }, 3, 0), arc({ x: cushion.x, y: cushion.y - 6 }, a, 10, Math.max(30, FLOOR - a.y + 20))];
        }
        case 'bong': {
            // As high as he can, under the platform that is too high: bong, stars, and down again.
            const top = { x: a.x + (b.x - a.x) * .5, y: Math.max(a.y - UP, b.y + THICK + BODY) };
            return [arc(a, top, 5, 0), arc(top, top, 7, 0), arc(top, a, 6, 0)];
        }
        case 'canard': return [arc(a, b, JUMP, up(b.y)), arc(b, { x: b.x, y: b.y + 6 }, 6, 0), arc({ x: b.x, y: b.y + 6 }, a, JUMP, up(a.y) + 10)];
        case 'balles': return [arc(a, { x: b.x, y: b.y + 20 }, JUMP, up(b.y)), arc({ x: b.x, y: b.y + 20 }, { x: b.x, y: b.y + 20 }, 8, 0), arc({ x: b.x, y: b.y + 20 }, b, 6, 14)];
        case 'surplace': { const edge = { x: b.x + (a.x - b.x) * .45, y: b.y }; return [arc(a, edge, 4, 6), arc(edge, edge, 12, 0), arc(edge, a, 4, 0)]; }
    }
}
export const movesTicks = (segs: readonly Seg[]): number => segs.reduce((n, s) => n + s.n, 0);
/** Where Boubou's feet are at instant t: along his move, or standing (riding the lift). */
export function boubouAt(s: State, t: number): Pt {
    const l = levelOf(s.level);
    if (s.move && t < s.busy) {
        let k = Math.max(0, t - s.move.t0);
        for (const g of s.move.segs) {
            if (k < g.n) { const f = k / g.n; return { x: g.x0 + (g.x1 - g.x0) * f, y: g.y0 + (g.y1 - g.y0) * f - g.h * 4 * f * (1 - f) }; }
            k -= g.n;
        }
    }
    return standAt(l, s.at, t);
}

export function start(id: number): State {
    levelOf(id);
    return { level: id, t: 0, at: FLOOR_PLAT, busy: 0, carried: [], delivered: [], bridge: false, moves: 0, wrong: 0, helps: 0, tries: 0, move: null, finished: false };
}
// The plan: every situation a scene can reach (platform, parts carried, parts back, bridge), and the fewest touches from it
// to the end. The lift's loop is folded in: a touch involving it is possible if it is possible at some instant of the loop.
type Key = string;
const keyOf = (c: Core): Key => `${c.at}|${[...c.carried].sort().join(',')}|${[...c.delivered].sort().join(',')}|${c.bridge ? 1 : 0}`;
interface Plan { dist: Map<Key, number>; next: Map<Key, { target: string; key: Key; land: string; t: number[] }[]> }
const plans = new WeakMap<LevelDef, Plan>();
/** The instants of the loop worth trying when the lift is involved (one per tick of its loop), else the instant 0. */
const instants = (l: LevelDef, at: string, target: string): number[] => { const p = lift(l); return p && (p.id === at || p.id === target) ? Array.from({ length: LIFT }, (_, k) => k) : [0]; };
export function tryAt(l: LevelDef, c: Core, target: string, t: number): { o: Outcome; c: Core; events: Event[]; done: boolean } | null {
    const p = target === ROBOT ? null : platsOf(l).byId.get(target);
    const give = c.carried.some(id => platOf(l, id).piece === 'p');
    const o = outcome(l, c.at, target, give, c.bridge, yAt(platOf(l, c.at), t), p ? yAt(p, t + JUMP) : 0);
    if (!o) return null;
    const next: Core = { at: c.at, carried: [...c.carried], delivered: [...c.delivered], bridge: c.bridge }, events: Event[] = [];
    const done = land(l, next, o, events);
    return { o, c: next, events, done };
}
export function planOf(l: LevelDef): Plan {
    let plan = plans.get(l);
    if (plan) return plan;
    const next = new Map<Key, { target: string; key: Key; land: string; t: number[] }[]>(), cores = new Map<Key, Core>(), done = new Set<Key>(), back = new Map<Key, Set<Key>>();
    const first: Core = { at: FLOOR_PLAT, carried: [], delivered: [], bridge: false }, todo = [first];
    cores.set(keyOf(first), first);
    while (todo.length) {
        const c = todo.pop()!, k = keyOf(c), out: { target: string; key: Key; land: string; t: number[] }[] = [];
        for (const target of targets(l, c.bridge)) for (const t of instants(l, c.at, target)) {
            const r = tryAt(l, c, target, t); if (!r) continue;
            const nk = r.done ? 'fini' : keyOf(r.c);
            const e = out.find(x => x.target === target && x.key === nk); if (e) e.t.push(t); else out.push({ target, key: nk, land: r.c.at, t: [t] });
            if (r.done) { done.add(k); continue; }
            if (!cores.has(nk)) { cores.set(nk, r.c); todo.push(r.c); }
            if (!back.has(nk)) back.set(nk, new Set()); back.get(nk)!.add(k);
        }
        next.set(k, out);
    }
    const dist = new Map<Key, number>([['fini', 0]]);
    let frontier = [...done];
    for (const k of frontier) dist.set(k, 1);
    for (let d = 2; frontier.length; d++) {
        const more: Key[] = [];
        for (const k of frontier) for (const b of back.get(k) ?? []) if (!dist.has(b)) { dist.set(b, d); more.push(b); }
        frontier = more;
    }
    plan = { dist, next };
    plans.set(l, plan);
    return plan;
}
/** Fewest touches left to bring every part back (Infinity: never). */
export const touchesLeft = (s: Pick<State, 'level' | 'at' | 'carried' | 'delivered' | 'bridge' | 'finished'>): number => s.finished ? 0 : planOf(levelOf(s.level)).dist.get(keyOf(s)) ?? Infinity;
/** The touches that start a shortest way to the end (some only at the right instant of the lift's loop). */
export function goodTargets(s: State): string[] {
    if (s.finished) return [];
    const l = levelOf(s.level), plan = planOf(l), now = touchesLeft(s);
    return [...new Set((plan.next.get(keyOf(s)) ?? []).filter(x => (plan.dist.get(x.key) ?? Infinity) === now - 1).map(x => x.target))];
}
/** What shines: the good touches, once the child has made `HELP_AFTER` touches that brought no part nearer. */
export const hint = (s: State): string[] => s.wrong >= HELP_AFTER ? goodTargets(s) : [];
/** The touches that, right now (instant t), make Boubou land somewhere new without a funny try. */
export function reachable(s: State, t: number): string[] {
    const l = levelOf(s.level);
    if (s.finished || t < s.busy) return [];
    return targets(l, s.bridge).filter(id => { const r = tryAt(l, s, id, t); return r && !isFail(r.o.how) && r.o.how !== 'donne'; });
}
/** The child touches `target` at instant `at`. Null when nothing happens: the scene is over, Boubou is still moving, the
 * instant is past, the target unknown, hidden, or the platform he is on. */
export function play(s: State, g: Gesture): Result | null {
    if (s.finished || !Number.isInteger(g.at) || g.at < s.t || g.at < s.busy) return null;
    const l = levelOf(s.level), r = tryAt(l, s, g.target, g.at);
    if (!r) return null;
    const before = touchesLeft(s), good = touchesLeft({ ...s, ...r.c, finished: r.done }) === before - 1, helped = good && hint(s).length > 0;
    const segs = motion(l, s.at, g.target, r.o.how, g.at, r.c.at);
    const st: State = { ...s, ...r.c, t: g.at, busy: g.at + movesTicks(segs), moves: s.moves + 1, wrong: s.wrong + (good ? 0 : 1), helps: s.helps + (helped ? 1 : 0), tries: s.tries + (isFail(r.o.how) ? 1 : 0), move: { how: r.o.how, target: g.target, t0: g.at, segs }, finished: r.done };
    const events: Event[] = [{ kind: 'move', how: r.o.how, target: g.target, good, helped }, ...(isFail(r.o.how) ? [{ kind: 'fail', fail: r.o.how } as Event] : []), ...r.events];
    return { state: st, events };
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

/** The new things a scene uses. */
export function featuresOf(l: LevelDef): Feature[] {
    const has: Record<Feature, boolean> = {
        trampo: l.plats.some(p => p.kind === 'trampo'), tapis: l.plats.some(p => p.kind === 'tapis'), echelle: l.ladders.length > 0,
        ascenseur: Boolean(lift(l)), pont: l.plats.some(p => p.kind === 'pont'), lourd: l.plats.filter(p => p.piece === 'p').length >= 2
    };
    return features.filter(f => has[f]);
}
/** The body of a platform (a crate, a duck or a crate of balls goes down to what it stands on), the room above where Boubou
 * stands and where its part lies, and, for the lift, all the way it goes. */
export const bodyBox = (p: Plat): Box => ({ what: `${p.id} body`, x0: p.x0, y0: Math.min(p.y, p.top), x1: p.x1, y1: Math.max(p.y, p.top) + p.h });
export function roomBox(l: LevelDef, p: Plat): Box { const x = standX(l, p); return { what: `${p.id} room`, x0: x - 15, y0: Math.min(p.y, p.top) - BODY, x1: x + 15, y1: Math.max(p.y, p.top) }; }
export const overlap = (a: Box, b: Box, margin = 1): boolean => a.x0 < b.x1 - margin && b.x0 < a.x1 - margin && a.y0 < b.y1 - margin && b.y0 < a.y1 - margin;
/** What covers what in a scene: platforms, the room above them, the robot. Empty when nothing does. */
export function overlaps(l: LevelDef): string[] {
    const out: string[] = [], ps = allPlats(l), robot = robotBox(l);
    const boxes = [...ps.map(bodyBox), ...ps.filter(p => p.kind !== 'canard').map(p => roomBox(l, p)), robot];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!, b = boxes[j]!;
        // A platform's own room sits on its own body.
        if (a.what.split(' ')[0] === b.what.split(' ')[0]) continue;
        if (overlap(a, b)) out.push(`${a.what} covers ${b.what}`);
    }
    return out;
}
/** At most three parts before scene 8; one to five parts in all. */
export const EARLY = 8, EARLY_PARTS = 3, MAX_PARTS = 5;
/** What a scene must respect to be fair to a five-year-old; empty when it does. */
export function problems(l: LevelDef): string[] {
    const out: string[] = [], ps = allPlats(l), ids = new Set<string>();
    if (l.title.fr.length > 24 || l.title.en.length > 24) out.push('a short title');
    const n = partsOf(l).length;
    if (n < 1 || n > MAX_PARTS) out.push(`one to ${MAX_PARTS} parts`);
    if (l.id < EARLY && n > EARLY_PARTS) out.push(`at most ${EARLY_PARTS} parts before scene ${EARLY}`);
    for (const p of ps) {
        if (ids.has(p.id) || p.id === ROBOT) out.push(`${p.id}: a name of its own`); ids.add(p.id);
        if (p.x0 < 0 || p.x1 > W || p.x1 <= p.x0 || p.top < 30) out.push(`${p.id}: inside the workshop`);
        if (p.kind === 'tapis') { const q = l.plats.find(x => x.id === p.to); if (!q || q.kind === 'tapis' || q.kind === 'ascenseur' || q.kind === 'pont') out.push(`${p.id}: a belt leads to a platform`); else if (q.y < p.y - 2) out.push(`${p.id}: a belt does not throw upwards`); }
        else if (p.to) out.push(`${p.id}: only a belt leads somewhere`);
        if (p.kind !== 'sol' && p.h > THICK && p.y + p.h !== FLOOR && !ps.some(q => q !== p && q.y === p.y + p.h && q.kind !== 'ascenseur' && q.kind !== 'tapis' && q.x0 <= p.x0 && q.x1 >= p.x1)) out.push(`${p.id}: a crate stands on something`);
        if (p.piece && (p.kind === 'tapis' || p.kind === 'canard' || p.kind === 'balles' || p.kind === 'ascenseur')) out.push(`${p.id}: no part on a ${p.kind}`);
        if (p.kind !== 'ascenseur' && p.top !== p.y) out.push(`${p.id}: only the lift moves`);
    }
    if (l.plats.filter(p => p.kind === 'ascenseur').length > 1) out.push('one lift at most');
    if (l.plats.some(p => p.kind === 'pont') !== l.plats.some(p => p.button)) out.push('a bridge and its switch go together');
    for (const d of l.ladders) { const a = l.plats.find(p => p.id === d.a), b = l.plats.find(p => p.id === d.b); if (!a || !b || a.kind === 'ascenseur' || b.kind === 'ascenseur' || d.x < Math.max(Math.min(a.x0, b.x0), 0) || d.x > Math.max(a.x1, b.x1)) out.push(`ladder ${d.a}-${d.b}`); }
    if (robotBox(l).x0 < 0) out.push('robot');
    for (const o of overlaps(l)) out.push(o);
    if (out.length) return out;
    // Every situation the scene can reach still leads to the end, and every platform is landed on (or touched) in one.
    const plan = planOf(l);
    if (!plan.dist.has(keyOf({ at: FLOOR_PLAT, carried: [], delivered: [], bridge: false }))) out.push('cannot be finished');
    for (const k of plan.next.keys()) if (!plan.dist.has(k)) { out.push(`a dead end at ${k}`); break; }
    const landed = new Set([...plan.next.values()].flatMap(x => x.map(y => y.land))), touched = new Set([...plan.next.values()].flatMap(x => x.map(y => y.target)));
    for (const p of l.plats) if (!landed.has(p.id) && !((p.kind === 'canard' || p.kind === 'tapis') && touched.has(p.id))) out.push(`${p.id} is never reached`);
    return out;
}
/** Two scenes play differently when they are at least this far apart, as `distance` counts: 6 measured (scenes 1 and 26),
 * and the test fails at 7. */
export const MIN_GAP = 6;
/** How far apart two scenes are: one per platform (kind, place) or part one has and not the other, three per new thing one
 * has and not the other, two for the robot on the other side, two per fewest-touches difference. */
export function distance(a: LevelDef, b: LevelDef): number {
    const bag = (l: LevelDef): string[] => [...l.plats.map(p => `${p.kind}:${p.x0 / COL}-${p.x1 / COL}:${Math.round((FLOOR - p.y) / ROW)}${p.top !== p.y ? `~${Math.round((FLOOR - p.top) / ROW)}` : ''}`), ...partsOf(l).map(p => `part:${p.piece}`), ...l.ladders.map(d => `ladder:${d.x}`)];
    const count = (xs: string[]): Map<string, number> => { const m = new Map<string, number>(); for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1); return m; };
    const ca = count(bag(a)), cb = count(bag(b));
    let d = 0;
    for (const k of new Set([...ca.keys(), ...cb.keys()])) d += Math.abs((ca.get(k) ?? 0) - (cb.get(k) ?? 0));
    const fa = new Set(featuresOf(a)), fb = new Set(featuresOf(b));
    for (const f of features) if (fa.has(f) !== fb.has(f)) d += 3;
    return d + (a.robot === b.robot ? 0 : 2) + 2 * Math.abs(a.best - b.best);
}
/** Where a finger touches a platform (at instant t, for the lift): from a little above Boubou's head down through its body,
 * at least 44 high; the robot is its own box. */
export const HIT_ABOVE = 34;
export const hitBox = (p: Plat, t: number): Box => { const y = yAt(p, t); return { what: p.id, x0: p.x0, y0: y - HIT_ABOVE, x1: p.x1, y1: y + Math.max(p.h, 14) }; };
/** What a finger at (x, y) touches: the robot, or the platform shown whose top is the nearest. */
export function touched(l: LevelDef, bridge: boolean, x: number, y: number, t: number): string | null {
    const r = robotBox(l);
    if (x >= r.x0 && x <= r.x1 && y >= r.y0 - 12 && y <= r.y1) return ROBOT;
    let best: string | null = null, d = Infinity;
    for (const p of l.plats) {
        if (isHidden(p, bridge)) continue;
        const b = hitBox(p, t), e = Math.abs(y - (yAt(p, t) - 10));
        if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && e < d) { best = p.id; d = e; }
    }
    return best;
}
