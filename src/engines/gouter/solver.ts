/** Exhaustive solver for « Le goûter de Boubou »: every cut and pop, at every decision tick of a fixed grid.
 * It proves a level can be finished, finds the most stars reachable, and keeps the plan whose timing
 * tolerates the widest error, so a young child does not need precise timing. */
import { advance, cut, pop, start, type LevelDef, type State } from './index.ts';

export interface Action { tick: number; kind: 'cut' | 'pop'; index: number }
export interface Solution { stars: number; plan: Action[]; tolerance: number; plans: number }
export const GRID = 6, HORIZON = 600;

export function play(level: number | LevelDef, plan: readonly Action[], horizon = HORIZON): State {
    let s = start(level);
    for (const a of [...plan].sort((x, y) => x.tick - y.tick)) {
        if (a.tick > s.tick) s = advance(s, a.tick - s.tick);
        if (s.status !== 'play') return s;
        s = a.kind === 'cut' ? cut(s, a.index) : pop(s, a.index);
    }
    return advance(s, Math.max(0, horizon - s.tick));
}
/** Largest uniform shift (in ticks, both directions) of every action that still finishes the level. */
export function tolerance(level: number | LevelDef, plan: readonly Action[], limit = 30): number {
    for (let d = 1; d <= limit; d++) {
        for (const sign of [-1, 1]) {
            for (const [i] of plan.entries()) {
                const shifted = plan.map((a, j) => j === i ? { ...a, tick: Math.max(0, a.tick + sign * d) } : a);
                if (play(level, shifted).status !== 'won') return d - 1;
            }
        }
    }
    return limit;
}
export function solve(level: number | LevelDef, grid = GRID, horizon = HORIZON, maxActions = 4): Solution | null {
    const wins: { stars: number; plan: Action[] }[] = [];
    const explore = (state: State, plan: Action[]): void => {
        let s = state;
        while (s.status === 'play' && s.tick < horizon) {
            // States that agree to the unit (position) and half unit per tick (velocity) behave the same:
            // explore each such situation once, whatever path led to it.
            const key = `${Math.round(s.treat.x)},${Math.round(s.treat.y)},${Math.round((s.treat.x - s.treat.px) * 2)},${Math.round((s.treat.y - s.treat.py) * 2)},${s.ropes.map(r => r.cut ? 0 : 1).join('')},${s.hooks.map(h => h.used ? 1 : 0).join('')},${s.bubbles.map(b => b.state[0]).join('')},${s.stars.map(Number).join('')},${plan.length}`;
            if (seen.has(key)) return;
            seen.add(key);
            if (plan.length < maxActions) {
                for (const [i, r] of s.ropes.entries()) if (!r.cut) explore(cut(s, i), [...plan, { tick: s.tick, kind: 'cut', index: i }]);
                for (const [i, b] of s.bubbles.entries()) if (b.state === 'held') explore(pop(s, i), [...plan, { tick: s.tick, kind: 'pop', index: i }]);
            }
            s = advance(s, grid);
        }
        if (s.status === 'won') {
            count++; const stars = s.stars.filter(Boolean).length;
            if (stars > best) { best = stars; wins.length = 0; }
            if (stars === best && wins.length < 5000) wins.push({ stars, plan });
        }
    };
    let best = -1, count = 0; const seen = new Set<string>();
    explore(start(level), []);
    if (!wins.length) return null;
    const candidates = [...wins].sort((a, b) => a.plan.length - b.plan.length);
    const fewest = candidates[0]!.plan.length;
    let chosen = candidates[0]!, chosenTolerance = -1;
    // Plans along a time grid repeat with shifted ticks; sample evenly to keep the search bounded.
    const pool = candidates.filter(c => c.plan.length === fewest);
    const step = Math.max(1, Math.floor(pool.length / 60));
    for (let i = 0; i < pool.length; i += step) {
        const c = pool[i]!; if (!c.plan.length) continue;
        const t = tolerance(level, c.plan);
        if (t > chosenTolerance) { chosen = c; chosenTolerance = t; }
    }
    return { stars: best, plan: chosen.plan, tolerance: Math.max(0, chosenTolerance), plans: count };
}
