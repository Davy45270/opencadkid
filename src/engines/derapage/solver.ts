import { canDrift, choose, drift, goodRoads, levelOf, openRoads, roll, spotOf, start, starWindow, type Event, type Spot, type State } from '.';
import { makeRng } from '../rng';
/** A greedy player: at each fork, the first road of a shortest way to the end; with `drifts`, it drifts in every starred
 * bend (at the start of the bend). */
export function greedyPlayer(id: number, drifts = false, limit = 200): { state: State; choices: number } {
    let s = start(id);
    while (!s.finished && s.choices < limit) {
        s = rollDrifting(s, drifts ? () => true : () => false).state;
        if (s.finished) break;
        s = choose(s, s.spot, goodRoads(s)[0]!)!.state;
    }
    return { state: s, choices: s.choices };
}
/** Rolls to the next fork (or the end), drifting in a starred bend when `want()` says so. */
function rollDrifting(s: State, want: () => boolean, seen?: (e: Event) => void): { state: State } {
    let st = s;
    for (;;) {
        const w = starWindow(spotOf(levelOf(st.level), st.spot).road);
        if (w && !st.drifted && st.d < w[0] && want()) {
            const r = drift(st, st.t + (w[0] - st.d))!;
            r.events.forEach(e => seen?.(e));
            st = r.state;
            if (st.finished || st.waiting) return { state: st };
            if (canDrift(st)) continue;
        }
        const r = roll(st); r.events.forEach(e => seen?.(e));
        return { state: r.state };
    }
}
/** A robot child: at each fork it touches one of the arrows at random (never the help), and in a starred bend it presses
 * « Dérape ! » one time in two. `seen` receives every state it waits in at a fork, and every event. */
export function randomPlayer(id: number, seed: number, limit = 1000, seen?: (s: State) => void, events?: (e: Event) => void): { state: State; choices: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.choices < limit) {
        s = rollDrifting(s, () => rng() < .5, events).state;
        if (s.finished) break;
        seen?.(s);
        const sp = spotOf(levelOf(s.level), s.spot) as Extract<Spot, { kind: 'fourche' }>, open = openRoads(sp);
        const r = choose(s, s.spot, open[Math.floor(rng() * open.length)]!)!;
        r.events.forEach(e => events?.(e));
        s = r.state;
    }
    return { state: s, choices: s.choices };
}
