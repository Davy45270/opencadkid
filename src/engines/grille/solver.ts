import { gestures, hint, start, step, type Action, type State } from '.';
import { makeRng } from '../rng';
/** The gesture the help would show. */
export function bestStep(s: State): Action | null {
    const h = hint(s);
    return h ? { kind: 'pose', ...h } : null;
}
/** A robot child: half of the time the gesture the help would show, otherwise any gesture at all (any picture on any cell,
 * a touch on a given cell, a shaken picture, CaliRoux), funny tries included. Every gesture counts. */
export function randomPlayer(id: number, seed: number, limit = 3000, helped = 0.5): { state: State; gestures: number } {
    const rng = makeRng(seed);
    let s = start(id);
    const all = gestures(s);
    while (!s.finished && s.gestures < limit) {
        const best = rng() < helped ? bestStep(s) : null;
        const a = best ?? all[Math.floor(rng() * all.length)]!;
        s = step(s, a)?.state ?? s;
    }
    return { state: s, gestures: s.gestures };
}
