import { advance, aims, fire, has, levelOf, score, start, type State } from '.';
import { makeRng } from '../rng';
/** Plays a scene greedily: at each throw, the aim that does the most (a friend freed first). Returns the last state. */
export function greedy(id: number, limit = 60): { state: State; shots: number } {
    let s = start(id);
    const level = levelOf(id);
    while (!s.finished && s.shots < limit) {
        let best = aims[Math.floor(aims.length / 2)]!, top = -1;
        for (const a of aims) { const { shot } = fire(s, a); const v = shot ? score(level, shot) : 0; if (v > top + 1e-9) { top = v; best = a; } }
        s = fire(s, best).state;
    }
    return { state: s, shots: s.shots };
}
/** A robot that aims anywhere, and waits a random moment between two throws (the swing moves meanwhile). */
export function randomPlayer(id: number, seed: number, limit = 600): { state: State; shots: number } {
    const rng = makeRng(seed), swing = has(levelOf(id), 'balance');
    let s = start(id);
    while (!s.finished && s.shots < limit) {
        if (swing) s = advance(s, Math.floor(rng() * 150));
        s = fire(s, aims[Math.floor(rng() * aims.length)]!).state;
    }
    return { state: s, shots: s.shots };
}
