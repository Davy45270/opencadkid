import { hint, pose, possible, start, type Result, type State } from '.';
import { makeRng } from '../rng';
/** A greedy player: always the good place the help would show. */
export function greedyPlayer(id: number, limit = 200): { state: State; poses: number } {
    let s = start(id);
    while (!s.finished && s.poses < limit) { const h = hint(s); if (!h) break; s = pose(s, h)!.state; }
    return { state: s, poses: s.poses };
}
/** A robot child: any of the poses that can happen, at random (the piece in hand or the other one, any turn, any column).
 * `seen` receives every state it plays from, with the poses it could choose from. */
export function randomPlayer(id: number, seed: number, limit = 1000, seen?: (s: State, options: Result[]) => void): { state: State; poses: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.poses < limit) {
        const options = possible(s);
        seen?.(s, options);
        if (!options.length) break;
        s = pose(s, options[Math.floor(rng() * options.length)]!.pose)!.state;
    }
    return { state: s, poses: s.poses };
}
