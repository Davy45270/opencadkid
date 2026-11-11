import { goodTap, play, start, targets, type Event, type State } from '.';
import { makeRng } from '../rng';
/** A player who always touches the vehicle the help would show: it finishes in the fewest touches. */
export function greedyPlayer(id: number, limit = 100): { state: State; moves: number } {
    let s = start(id);
    while (!s.finished && s.moves < limit) { const g = goodTap(s); if (!g) break; s = play(s, g)!.state; }
    return { state: s, moves: s.moves };
}
/** A robot child touching anything that can be touched (the vehicles, the cones, the stop, CaliRoux, the empty yard) at
 * random, taking the shining vehicle when the help shows one with probability `helpful`. `seen` receives every state it
 * touches from, `events` every event. */
export function randomPlayer(id: number, seed: number, limit = 1000, seen?: (s: State) => void, events?: (e: Event) => void, helpful = 0): { state: State; moves: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.moves < limit) {
        seen?.(s);
        const all = targets(s), shine = s.misses >= 3 ? goodTap(s) : null;
        const r = play(s, shine && rng() < helpful ? shine : all[Math.floor(rng() * all.length)]!);
        if (!r) continue;
        r.events.forEach(e => events?.(e));
        s = r.state;
    }
    return { state: s, moves: s.moves };
}
