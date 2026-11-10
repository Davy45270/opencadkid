import { moves, score, start, swap, type State } from '.';
import { makeRng } from '../rng';
/** Plays a scene greedily: at each turn, the swap that does the most for the goals (friends first). Returns the last state. */
export function greedy(id: number, limit = 200): { state: State; swaps: number } {
    let s = start(id);
    while (!s.finished && s.swaps < limit) {
        let best = null as ReturnType<typeof swap>, top = -Infinity;
        for (const [a, b] of moves(s)) { const r = swap(s, a, b)!, v = score(s, r); if (v > top + 1e-9) { top = v; best = r; } }
        if (!best) break;
        s = best.state;
    }
    return { state: s, swaps: s.swaps };
}
/** A robot that swaps at random among the swaps that make something happen. */
export function randomPlayer(id: number, seed: number, limit = 600): { state: State; swaps: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.swaps < limit) {
        const all = moves(s);
        if (!all.length) break;
        const [a, b] = all[Math.floor(rng() * all.length)]!;
        s = swap(s, a, b)!.state;
    }
    return { state: s, swaps: s.swaps };
}
