import { reach, score, start, swap, throwAt, type State } from '.';
import { makeRng } from '../rng';
/** Plays a scene greedily: at each throw, the place that does the most with either of Boubou's beads (the swap is free). */
export function greedy(id: number, limit = 80): { state: State; shots: number } {
    let s = start(id);
    while (!s.finished && s.shots < limit) {
        let best: { v: number; swap: boolean; r: ReturnType<typeof reach>[number] } | null = null;
        for (const swapped of [false, true]) {
            const t = swapped ? swap(s) : s;
            for (const r of reach(t)) { const v = score(t.necks, r.place, t.queue[0]); if (!best || v > best.v + 1e-9) best = { v, swap: swapped, r }; }
        }
        if (!best) break;
        if (best.swap) s = swap(s);
        s = throwAt(s, best.r.place, best.r.bounces).state;
    }
    return { state: s, shots: s.shots };
}
/** A robot that throws anywhere: a random place among those Boubou can reach, never swapping. */
export function randomPlayer(id: number, seed: number, limit = 600, watch?: (s: State) => void): { state: State; shots: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.shots < limit) {
        watch?.(s);
        const places = reach(s);
        const r = places[Math.floor(rng() * places.length)]!;
        s = throwAt(s, r.place, r.bounces).state;
    }
    return { state: s, shots: s.shots };
}
