/** « Le goûter de Boubou » : a treat hangs from ropes; cutting them lets it fall into Boubou's mouth.
 * Deterministic fixed-step Verlet physics on a single point mass. Ropes are maximum-distance constraints
 * (slack below their length), hooks grab the treat when it passes within reach, and a bubble carries it up
 * until it is popped. No randomness and no clock: the same actions at the same ticks give the same result. */
import { levels, type LevelDef } from './levels.ts';
export { levels, type LevelDef } from './levels.ts';

export const FIELD = { width: 320, height: 440 } as const;
export const DT = 1 / 60;
export const GRAVITY = 900;
export const LIFT = 260;
export const TREAT_RADIUS = 13;
export const STAR_RADIUS = 22;
export const MOUTH_RADIUS = 32;
export const BUBBLE_RADIUS = 24;
/** A tap cuts a rope passing within this distance (field units), generous for small fingers. */
export const CUT_REACH = 24;

export interface Point { x: number; y: number }
export interface Rope { x: number; y: number; length: number; cut: boolean; hook: number | null }
export interface Hook { x: number; y: number; reach: number; used: boolean }
export interface Bubble { x: number; y: number; state: 'free' | 'held' | 'popped' }
export type Status = 'play' | 'won' | 'lost';
export interface State {
    level: number; tick: number;
    treat: { x: number; y: number; px: number; py: number };
    ropes: Rope[]; hooks: Hook[]; bubbles: Bubble[];
    stars: boolean[]; starPoints: readonly Point[]; mouth: Point; status: Status; actions: number;
}
export type Records = Partial<Record<number, number>>;

export function level(id: number): LevelDef { return levels.find(l => l.id === id) ?? levels[0]!; }
export function start(id: number | LevelDef): State {
    const def = typeof id === 'number' ? level(id) : id;
    return {
        level: def.id, tick: 0,
        treat: { x: def.treat.x, y: def.treat.y, px: def.treat.x, py: def.treat.y },
        ropes: def.ropes.map(r => ({ x: r.x, y: r.y, length: r.length ?? Math.hypot(r.x - def.treat.x, r.y - def.treat.y), cut: false, hook: null })),
        hooks: (def.hooks ?? []).map(h => ({ ...h, used: false })),
        bubbles: (def.bubbles ?? []).map(b => ({ ...b, state: 'free' as const })),
        stars: def.stars.map(() => false), starPoints: def.stars, mouth: { ...def.mouth }, status: 'play', actions: 0
    };
}
export function clone(s: State): State {
    return { ...s, treat: { ...s.treat }, ropes: s.ropes.map(r => ({ ...r })), hooks: s.hooks.map(h => ({ ...h })), bubbles: s.bubbles.map(b => ({ ...b })), stars: [...s.stars], mouth: { ...s.mouth } };
}
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
/** One fixed physics step, in place. */
export function stepInPlace(s: State): void {
    if (s.status !== 'play') return;
    const t = s.treat, held = s.bubbles.some(b => b.state === 'held');
    const damping = held ? 0.95 : 0.998, ay = held ? -LIFT : GRAVITY;
    const vx = (t.x - t.px) * damping, vy = (t.y - t.py) * damping;
    t.px = t.x; t.py = t.y; t.x += vx; t.y += vy + ay * DT * DT;
    for (const [i, h] of s.hooks.entries()) if (!h.used && distance(t, h) <= h.reach) {
        h.used = true; s.ropes.push({ x: h.x, y: h.y, length: Math.max(18, distance(t, h)), cut: false, hook: i });
    }
    for (let k = 0; k < 6; k++) for (const r of s.ropes) {
        if (r.cut) continue;
        const d = distance(t, r);
        if (d > r.length && d > 0) { const f = r.length / d; t.x = r.x + (t.x - r.x) * f; t.y = r.y + (t.y - r.y) * f; }
    }
    for (const b of s.bubbles) {
        if (b.state === 'free' && distance(t, b) < TREAT_RADIUS + BUBBLE_RADIUS * 0.75) b.state = 'held';
        if (b.state === 'held') { b.x = t.x; b.y = t.y; }
    }
    for (const [i, p] of s.starPoints.entries()) if (!s.stars[i] && distance(t, p) < STAR_RADIUS) s.stars[i] = true;
    if (distance(t, s.mouth) < MOUTH_RADIUS) s.status = 'won';
    else if (t.y > FIELD.height + 40 || t.x < -40 || t.x > FIELD.width + 40 || t.y < -50) s.status = 'lost';
    s.tick++;
}
export function advance(state: State, frames = 1): State { const s = clone(state); for (let i = 0; i < frames && s.status === 'play'; i++) stepInPlace(s); return s; }
export function cut(state: State, rope: number): State {
    const r = state.ropes[rope];
    if (state.status !== 'play' || !r || r.cut) return state;
    const s = clone(state); s.ropes[rope]!.cut = true; s.actions++; return s;
}
export function pop(state: State, bubble: number): State {
    const b = state.bubbles[bubble];
    if (state.status !== 'play' || !b || b.state === 'popped') return state;
    const s = clone(state); s.bubbles[bubble]!.state = 'popped'; s.actions++; return s;
}
function segmentDistance(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
    const o = (p: Point, q: Point, r: Point): number => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}
/** What a tap at this field point does: pop a bubble carrying the treat, else cut the closest rope in reach. */
export function tapTarget(s: State, p: Point): { kind: 'bubble' | 'rope'; index: number } | null {
    const bubble = s.bubbles.findIndex(b => b.state !== 'popped' && distance(p, b) <= BUBBLE_RADIUS + 14);
    if (bubble >= 0) return { kind: 'bubble', index: bubble };
    let best = -1, bestDistance = CUT_REACH;
    for (const [i, r] of s.ropes.entries()) { if (r.cut) continue; const d = segmentDistance(p, r, s.treat); if (d <= bestDistance) { best = i; bestDistance = d; } }
    return best >= 0 ? { kind: 'rope', index: best } : null;
}
/** Ropes a finger swipe from a to b crosses (anchor to treat segments). */
export function swipeTargets(s: State, a: Point, b: Point): number[] {
    return s.ropes.flatMap((r, i) => !r.cut && (crosses(a, b, r, s.treat) || segmentDistance(b, r, s.treat) <= 8) ? [i] : []);
}
export function tap(s: State, p: Point): State {
    const target = tapTarget(s, p);
    return !target ? s : target.kind === 'bubble' ? pop(s, target.index) : cut(s, target.index);
}
/** The reward is the stars caught on the way, and never less than one star for a finished level. */
export function reward(s: State): number { return s.status === 'won' ? Math.max(1, s.stars.filter(Boolean).length) : 0; }
export function complete(records: Records, s: State): Records { return s.status === 'won' ? { ...records, [s.level]: Math.max(records[s.level] ?? 0, reward(s)) } : { ...records }; }
export function isUnlocked(id: number, records: Records): boolean { return id === 1 || (records[id - 1] ?? 0) > 0; }
export function parseRecords(raw: string | null): Records {
    try {
        const v: unknown = JSON.parse(raw ?? 'null'); const out: Records = {};
        if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
        for (const [key, score] of Object.entries(v)) if (/^\d+$/.test(key) && Number(key) >= 1 && Number(key) <= levels.length && typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 3) out[Number(key)] = score;
        return out;
    } catch { return {}; }
}
