import { actions, hint, start, step, type Action, type State } from '.';
import { makeRng } from '../rng';
/** A robot child: half of the time the slide the help would show, otherwise any of the eight gestures at all (four slides,
 * a diagonal, a shake, a touch on Lumi, a touch on the target), funny tries included. Every gesture counts. */
export function randomPlayer(id: number, seed: number, limit = 3000, helped = 0.5): { state: State; steps: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.steps < limit) {
        const best = rng() < helped ? hint(s) : null;
        const a: Action = best ?? actions[Math.floor(rng() * actions.length)]!;
        s = step(s, a)!.state;
    }
    return { state: s, steps: s.steps };
}
