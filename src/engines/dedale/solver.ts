import { hint, moves, start, step, type Move, type State } from '.';
import { makeRng } from '../rng';
/** The step the help would show: the first one towards the nearest seed. */
export const bestStep = (s: State): Move | null => hint(s);
/** A robot child: half of the time the step the help would show, otherwise any of the four steps at all, funny tries
 * included. Every step counts, funny tries too. */
export function randomPlayer(id: number, seed: number, limit = 3000, helped = 0.5): { state: State; steps: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.steps < limit) {
        const best = rng() < helped ? bestStep(s) : null;
        const a = best ?? moves[Math.floor(rng() * moves.length)]!;
        s = step(s, a)!.state;
    }
    return { state: s, steps: s.steps };
}
