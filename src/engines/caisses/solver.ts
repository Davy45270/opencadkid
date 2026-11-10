import { actions, explore, keyOf, start, step, type Action, type State } from '.';
import { makeRng } from '../rng';
const maps = new Map<number, Map<string, number>>();
/** How many steps from each reachable state to the end of the scene: a breadth-first search backwards from the ends. */
export function distances(id: number): Map<string, number> {
    const known = maps.get(id);
    if (known) return known;
    const g = explore(start(id)), back = new Map<string, string[]>();
    for (const [k, n] of g.nodes) for (const e of n.next) { const b = back.get(e.key); if (b) b.push(k); else back.set(e.key, [k]); }
    const dist = new Map<string, number>(), queue = [...g.goals];
    for (const k of queue) dist.set(k, 0);
    for (let i = 0; i < queue.length; i++) for (const b of back.get(queue[i]!) ?? []) if (!dist.has(b)) { dist.set(b, dist.get(queue[i]!)! + 1); queue.push(b); }
    maps.set(id, dist);
    return dist;
}
/** The step the help would show: one that brings the end one step closer. */
export function bestStep(s: State): Action | null {
    const dist = distances(s.level), here = dist.get(keyOf(s)) ?? Infinity;
    for (const a of actions) { const r = step(s, a); if (r && !r.fail && (dist.get(keyOf(r.state)) ?? Infinity) < here) return a; }
    return null;
}
/** A robot child: half of the time the step the help would show, otherwise any of the eight steps at all (four moves,
 * four pulls), funny tries included. Every step counts, funny tries too. */
export function randomPlayer(id: number, seed: number, limit = 3000, helped = 0.5): { state: State; steps: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.steps < limit) {
        const best = rng() < helped ? bestStep(s) : null;
        const a = best ?? actions[Math.floor(rng() * actions.length)]!;
        s = step(s, a)!.state;
    }
    return { state: s, steps: s.steps };
}
