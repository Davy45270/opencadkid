import { cycleOf, levelOf, nextGood, start, throwHeart, type Result, type State } from '.';
import { makeRng } from '../rng';
/** A greedy player: at the first good moment, the column the help would show. */
export function greedyPlayer(id: number, limit = 200): { state: State; throws: number } {
    let s = start(id);
    while (!s.finished && s.touches < limit) { const g = nextGood(s); if (!g) break; s = throwHeart(s, { col: g.col, at: g.at })!.state; }
    return { state: s, throws: s.touches };
}
/** A robot child: it waits a random while (up to one turn of the sky), then touches a random column. Every touch counts,
 * the drops on Lumi included. `seen` receives every state it plays from, and what its touch did. */
export function randomPlayer(id: number, seed: number, limit = 1000, seen?: (s: State, r: Result) => void): { state: State; throws: number } {
    const rng = makeRng(seed), l = levelOf(id), wait = Math.max(1, cycleOf(l));
    let s = start(id);
    while (!s.finished && s.touches < limit) {
        const r = throwHeart(s, { col: Math.floor(rng() * l.cols), at: s.t + Math.floor(rng() * wait) })!;
        seen?.(s, r);
        s = r.state;
    }
    return { state: s, throws: s.touches };
}
