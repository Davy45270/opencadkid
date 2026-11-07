/** Generates the extra levels of « Le goûter de Boubou » (17 and up), deterministic from one seed.
 * A rig (sweet, ropes, hook, bubble) is drawn, a child-paced plan is played without stars, and Boubou's
 * mouth and the three stars are put on the path the sweet really takes. A level is kept only if the
 * exhaustive solver finishes it with three stars, forgives at least TOLERANCE ticks of timing error,
 * nothing happens without the child, and it does not play like a level already kept (clones()).
 * Usage: node --experimental-strip-types scripts/gouter-generate.ts [count] > levels-extra.txt */
import { FIELD, MOUTH_RADIUS, STAR_RADIUS, TREAT_RADIUS, advance, cut, pop, start, type State } from '../src/engines/gouter/index.ts';
import { levels, type LevelDef } from '../src/engines/gouter/levels.ts';
import { CHILD_GAP, HORIZON, play, solve } from '../src/engines/gouter/solver.ts';
import { makeRng } from '../src/engines/rng.ts';

export const SEED = 20261107, TOLERANCE = 10;
/** Levels 1 to 16 are drawn by hand: the generator only ever compares against them, never against its own past output. */
export const HAND_DRAWN = 16;
const authored = levels.slice(0, HAND_DRAWN);
type Family = 'swing' | 'pair' | 'slack' | 'hook' | 'bubble' | 'lift' | 'web';
const FAMILIES: readonly Family[] = ['swing', 'pair', 'slack', 'hook', 'bubble', 'lift', 'web'];
interface P { x: number; y: number }
const r = Math.round;
const far: P = { x: -9999, y: -9999 };

function rig(f: Family, rnd: () => number): LevelDef {
    const between = (a: number, b: number): number => r(a + rnd() * (b - a));
    const y = f === 'hook' ? between(100, 150) : f === 'bubble' ? between(240, 320) : f === 'lift' ? between(160, 220) : between(110, 220);
    const treat = { x: between(60, 260), y };
    const anchor = (dy: [number, number], dx = 120): P => ({ x: Math.max(20, Math.min(300, treat.x + between(-dx, dx))), y: Math.max(30, treat.y - between(dy[0], dy[1])) });
    const base = { id: 0, treat, stars: [], mouth: far };
    switch (f) {
        case 'swing': return { ...base, ropes: [anchor([50, 90])] };
        case 'pair': return { ...base, ropes: [anchor([50, 100]), anchor([50, 100])] };
        case 'slack': { const a = anchor([40, 90]); return { ...base, ropes: [anchor([50, 80], 30), { ...a, length: r(Math.hypot(a.x - treat.x, a.y - treat.y) + between(40, 90)) }] }; }
        // The hook is placed on the path the sweet takes once cut (see hooked()).
        case 'hook': return { ...base, ropes: [anchor([50, 80], 100)] };
        // Half the rising levels hang from a second, slanted string: cut first, it swings the sweet sideways.
        case 'bubble': return { ...base, ropes: rnd() < 0.5 ? [anchor([60, 80], 40)] : [anchor([60, 80], 40), { x: Math.max(20, Math.min(300, treat.x + (rnd() < 0.5 ? -1 : 1) * between(70, 130))), y: treat.y - between(10, 60) }], bubbles: [{ x: treat.x, y: treat.y + between(60, 80) }] };
        case 'lift': return { ...base, ropes: [anchor([50, 80], 60)], bubbles: [{ x: Math.max(30, Math.min(290, treat.x + between(-60, 60))), y: between(300, 360) }] };
        case 'web': return { ...base, ropes: [anchor([60, 100], 80), anchor([60, 100], 80), { x: between(20, 60), y: treat.y + between(40, 80) }, { x: between(260, 300), y: treat.y + between(40, 80) }] };
    }
}
/** A child-paced random plan: each action at least CHILD_GAP after the previous one, on the solver's grid. */
function plan(def: LevelDef, rnd: () => number): { tick: number; kind: 'cut' | 'pop'; index: number }[] {
    const actions = [...def.ropes.map((_, i) => ({ kind: 'cut' as const, index: i })), ...(def.bubbles ?? []).map((_, i) => ({ kind: 'pop' as const, index: i }))];
    const n = 1 + Math.floor(rnd() * Math.min(3, actions.length));
    const chosen = actions.sort(() => rnd() - 0.5).slice(0, n);
    let tick = 6 * Math.floor(rnd() * 8);
    // A hook makes a new rope when it grabs the sweet: it is cut last, once the sweet hangs from it.
    for (const [i] of (def.hooks ?? []).entries()) chosen.push({ kind: 'cut', index: def.ropes.length + i });
    return chosen.map(a => { const step = { ...a, tick }; tick += CHILD_GAP + 6 * Math.floor(rnd() * 10); return step; });
}
/** The sweet's path under a plan, with no stars and no mouth: the field points it visits, tick by tick. */
function path(def: LevelDef, steps: ReturnType<typeof plan>): P[] {
    let s: State = start(def); const out: P[] = [];
    const due = [...steps];
    while (s.status === 'play' && s.tick < HORIZON) {
        while (due[0] && due[0].tick <= s.tick) { const a = due.shift()!; s = a.kind === 'cut' ? cut(s, a.index) : pop(s, a.index); }
        s = advance(s, 1); out.push({ x: s.treat.x, y: s.treat.y });
    }
    return out;
}
/** A hook beside the falling sweet's path, a third of the way down, which it grabs and swings from. */
function hooked(def: LevelDef, trail: P[], rnd: () => number): LevelDef | null {
    const i = trail.findIndex(p => d(p, def.treat) > 90); if (i < 0) return null;
    const p = trail[i]!, side = rnd() < 0.5 ? -1 : 1, reach = r(55 + rnd() * 15);
    const hook = { x: r(p.x + side * (25 + rnd() * 25)), y: r(p.y + 10 + rnd() * 30), reach };
    return hook.x < 30 || hook.x > 290 || hook.y > 300 ? null : { ...def, hooks: [hook] };
}
const d = (a: P, b: P): number => Math.hypot(a.x - b.x, a.y - b.y);
/** Mouth where the path first reaches the bottom band (or the top band for a rising bubble), stars along the way. */
function dress(def: LevelDef, trail: P[]): LevelDef | null {
    const rising = (def.bubbles?.length ?? 0) > 0 && trail.some(p => p.y < 110);
    const end = trail.findIndex(p => rising ? p.y <= 105 : p.y >= 388);
    if (end < 30) return null;
    const mouth = { x: r(trail[end]!.x), y: r(trail[end]!.y) };
    if (mouth.x < 40 || mouth.x > FIELD.width - 40) return null;
    const head = trail.slice(0, end);
    const lengths = [0]; for (let i = 1; i < head.length; i++) lengths.push(lengths[i - 1]! + d(head[i]!, head[i - 1]!));
    const total = lengths.at(-1)!; if (total < 160) return null;
    const stars: P[] = [];
    for (const f of [0.3, 0.55, 0.8]) {
        const i = lengths.findIndex(l => l >= f * total); const p = head[i]!;
        stars.push({ x: r(p.x), y: r(p.y) });
    }
    const ok = stars.every((p, i) => d(p, def.treat) > TREAT_RADIUS + STAR_RADIUS + 10 && d(p, mouth) > MOUTH_RADIUS + STAR_RADIUS && p.x >= 20 && p.x <= 300 && p.y >= 30 && p.y <= 420 && stars.every((q, j) => j === i || d(p, q) > 2 * STAR_RADIUS));
    return ok ? { ...def, stars, mouth } : null;
}
/** Two levels play alike when they have the same mechanisms and, seen from the sweet, Boubou and every
 * anchor sit at the same place to within CLONE units: a rig moved sideways is the same level. */
export const CLONE = 45;
export function clones(a: LevelDef, b: LevelDef): boolean {
    const counts = (l: LevelDef): string => `${String(l.ropes.length)}|${String(l.hooks?.length ?? 0)}|${String(l.bubbles?.length ?? 0)}`;
    if (counts(a) !== counts(b)) return false;
    const rel = (l: LevelDef, p: P): P => ({ x: p.x - l.treat.x, y: p.y - l.treat.y });
    const near = (p: P, q: P): boolean => d(p, q) < CLONE;
    if (!near(rel(a, a.mouth), rel(b, b.mouth))) return false;
    const order = (l: LevelDef): P[] => [...l.ropes, ...(l.hooks ?? []), ...(l.bubbles ?? [])].map(p => rel(l, p)).sort((p, q) => p.x - q.x || p.y - q.y);
    const pa = order(a), pb = order(b);
    return pa.every((p, i) => near(p, pb[i]!));
}
function idle(l: LevelDef): State { return advance(start(l), HORIZON); }
/** Every hook and bubble of the rig takes part in the reference solution, and a plain fall travels sideways. */
export function uses(l: LevelDef, steps: readonly { tick: number; kind: 'cut' | 'pop'; index: number }[]): boolean {
    const end = play(l, steps);
    if (!end.hooks.every(h => h.used)) return false;
    if (end.bubbles.some(b => b.state === 'free')) return false;
    return (l.hooks?.length ?? 0) + (l.bubbles?.length ?? 0) > 0 || l.ropes.length >= 3 || Math.abs(l.mouth.x - l.treat.x) >= 40;
}

export function generate(count: number, seed = SEED, only?: Family): LevelDef[] {
    const rnd = makeRng(seed), kept: { def: LevelDef; actions: number; tolerance: number; family: number }[] = [];
    const families = FAMILIES.filter(f => !only || f === only), found = families.map(() => 0), dry = families.map(() => 0);
    // Families take turns; one that cannot find a new level in DRY rigs in a row is left out.
    const DRY = 1500;
    for (let turn = 0; kept.length < count && dry.some(n => n < DRY); turn++) {
        const fi = turn % families.length, family = families[fi]!;
        if (dry[fi]! >= DRY) continue;
        let added = false;
        for (; !added && dry[fi]! < DRY; dry[fi]!++) {
            const def = rig(family, rnd);
            for (let k = 0; k < 12 && !added; k++) {
                const steps = plan(def, rnd), trail = path(def, steps);
                const level = family === 'hook' ? hooked(def, trail, rnd) : def; if (!level) continue;
                const dressed = dress(level, level === def ? trail : path(level, plan(level, rnd))); if (!dressed) continue;
                if ([...authored, ...kept.map(x => x.def)].some(o => clones(o, dressed))) continue;
                if (idle(dressed).status === 'won') continue;
                const s = solve(dressed); if (!s || s.stars !== 3 || s.tolerance < TOLERANCE || !uses(dressed, s.plan)) continue;
                kept.push({ def: dressed, actions: s.plan.length, tolerance: s.tolerance, family: FAMILIES.indexOf(family) }); added = true;
            }
        }
        if (added) { found[fi]!++; dry[fi] = 0; }
    }
    process.stderr.write(families.map((f, i) => `${f}: ${String(found[i])}`).join('\n') + '\n');
    // Easier first: fewer gestures, then more forgiving timing; families stay mixed within a difficulty.
    kept.sort((a, b) => a.actions - b.actions || b.tolerance - a.tolerance);
    return kept.slice(0, count).map((k, i) => ({ ...k.def, id: authored.length + 1 + i }));
}

const fmt = (p: P): string => `{x: ${p.x},y: ${p.y}}`;
export function source(l: LevelDef): string {
    const ropes = l.ropes.map(x => x.length === undefined ? fmt(x) : `{x: ${x.x},y: ${x.y},length: ${x.length}}`).join(',');
    const hooks = l.hooks?.length ? `, hooks: [${l.hooks.map(h => `{x: ${h.x},y: ${h.y},reach: ${h.reach}}`).join(',')}]` : '';
    const bubbles = l.bubbles?.length ? `, bubbles: [${l.bubbles.map(fmt).join(',')}]` : '';
    return `    { id: ${l.id}, treat: ${fmt(l.treat)}, ropes: [${ropes}]${hooks}${bubbles}, stars: [${l.stars.map(fmt).join(',')}], mouth: ${fmt(l.mouth)} }`;
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const out = generate(Number(process.argv[2] ?? 100), SEED, process.argv[3] as Family | undefined);
    process.stderr.write(`${out.length} levels\n`);
    process.stdout.write(out.map(source).join(',\n') + '\n');
}
