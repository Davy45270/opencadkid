import { aims, fire, goodAim, start, type State } from '.';
import { makeRng } from '../rng';
/** Plays a scene greedily: at each throw, the aim that breaks the most (the help's choice). Returns the last state. */
export function greedy(id: number, limit = 80): { state: State; shots: number } {
    let s = start(id);
    while (!s.finished && s.shots < limit) {
        const best = goodAim(s);
        if (best === null) break;
        s = fire(s, best).state;
    }
    return { state: s, shots: s.shots };
}
/** A robot that throws anywhere: an angle drawn uniformly among the allowed whole degrees. */
export function randomPlayer(id: number, seed: number, limit = 600, watch?: (s: State) => void): { state: State; shots: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.shots < limit) {
        watch?.(s);
        s = fire(s, aims[Math.floor(rng() * aims.length)]!).state;
    }
    return { state: s, shots: s.shots };
}
