import { goodTargets, levelOf, LIFT, play, start, targets, type Event, type State } from '.';
import { makeRng } from '../rng';
/** A greedy player: as soon as Boubou is free, the first touch of a shortest way to the end, at the first instant it works
 * (waiting for the lift when it must). */
export function greedyPlayer(id: number, limit = 200): { state: State; moves: number } {
    let s = start(id);
    while (!s.finished && s.moves < limit) {
        let r = null;
        for (let w = 0; w < LIFT && !r; w++) for (const target of goodTargets(s)) { const x = play(s, { target, at: s.busy + w }); if (x?.events[0]?.kind === 'move' && x.events[0].good) { r = x; break; } }
        if (!r) break;
        s = r.state;
    }
    return { state: s, moves: s.moves };
}
/** A robot child: as soon as Boubou is free, it waits a random moment (up to half the lift's loop), then touches any platform
 * shown or the robot, at random. `seen` receives every state it touches from, `events` every event. */
export function randomPlayer(id: number, seed: number, limit = 1000, seen?: (s: State) => void, events?: (e: Event) => void): { state: State; moves: number } {
    const rng = makeRng(seed), l = levelOf(id);
    let s = start(id);
    while (!s.finished && s.moves < limit) {
        seen?.(s);
        const all = targets(l, s.bridge).filter(t => t !== s.at), target = all[Math.floor(rng() * all.length)]!;
        const r = play(s, { target, at: s.busy + Math.floor(rng() * LIFT / 2) });
        if (!r) continue;
        r.events.forEach(e => events?.(e));
        s = r.state;
    }
    return { state: s, moves: s.moves };
}
