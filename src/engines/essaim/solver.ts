import { advance, arrival, lapOf, LANES, levelOf, nextGoal, ROW, start, touch, type Result, type State } from '.';
import { makeRng } from '../rng';
/** A greedy player: it touches the lane of the next goal the sky brings (once, when the rocket is not already heading
 * there), then lets the sky run until that goal's row has gone by. */
export function greedyPlayer(id: number, limit = 200): { state: State; gestures: number } {
    let s = start(id);
    while (!s.finished && s.touches < limit && s.t < 100_000) {
        const n = nextGoal(s); if (!n) break;
        if (s.target !== n.goal.lane) s = touch(s, { lane: n.goal.lane, at: s.t })!.state;
        s = advance(s, arrival(n.k)).state;
    }
    return { state: s, gestures: s.touches };
}
/** A robot child: it waits a random while (up to `turns` turns of the sky), then touches a random lane, the edges beyond the
 * lanes included. Every touch counts. `seen` receives every state it plays from, and what its touch did. With `turns` large,
 * it is a child who touches nothing for long periods. */
export function randomPlayer(id: number, seed: number, limit = 1000, turns = 1, seen?: (s: State, r: Result) => void): { state: State; gestures: number } {
    const rng = makeRng(seed), wait = Math.max(ROW, Math.round(lapOf(levelOf(id)) * ROW * turns));
    let s = start(id);
    while (!s.finished && s.touches < limit) {
        const r = touch(s, { lane: Math.floor(rng() * (LANES + 2)) - 1, at: s.t + Math.floor(rng() * wait) })!;
        seen?.(s, r);
        s = r.state;
    }
    return { state: s, gestures: s.touches };
}
/** Nobody touches at all: the sky runs by itself until the scene is finished (or `limit` ticks). */
export function idle(id: number, limit = 100_000): State { return advance(start(id), limit).state; }
