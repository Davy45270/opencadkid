import { goodScrew, play, start, targets, type Event, type State } from '.';
import { makeRng } from '../rng';
/** A greedy player: always the screw the help would show. Every touch takes a screw out, so it finishes in exactly as many
 * touches as there are screws. */
export function greedyPlayer(id: number, limit = 100): { state: State; moves: number } {
    let s = start(id);
    while (!s.finished && s.moves < limit) { const g = goodScrew(s); if (!g) break; s = play(s, g)!.state; }
    return { state: s, moves: s.moves };
}
/** A robot child touching anything that can be touched (screws left, plates still on, pots, the toy, the chest,
 * Pestouille) at random. `seen` receives every state it touches from, `events` every event. */
export function randomPlayer(id: number, seed: number, limit = 1000, seen?: (s: State) => void, events?: (e: Event) => void): { state: State; moves: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.moves < limit) {
        seen?.(s);
        const all = targets(s), r = play(s, all[Math.floor(rng() * all.length)]!);
        if (!r) continue;
        r.events.forEach(e => events?.(e));
        s = r.state;
    }
    return { state: s, moves: s.moves };
}
