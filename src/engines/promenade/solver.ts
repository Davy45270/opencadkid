import { makeRng } from '../rng';
import { act, advance, choose, FAIL_TICKS, gates, isRole, levelOf, offered, open, poke, press, start, targets, touch, waiting, type Role, type State } from '.';
/** Plays a level as a child who always knows what to do: opens the trapdoor, then at each gate gives the right job, touches
 * the thing, or takes the rainbow arch (`straight` goes on foot instead). `skip` leaves one gate alone; `wrong` first tries
 * every other job on offer and checks that each funny try ends with the foal waiting again and nothing changed.
 * Returns the last state: finished when the five foals (and the friend) went through the door. */
export function play(id: number, options: { skip?: number; wrong?: boolean; straight?: boolean; limit?: number } = {}): { state: State; tries: number; broken: string[] } {
    let s = open(start(id)), tries = 0;
    const limit = options.limit ?? 8000, list = gates(levelOf(id)), broken: string[] = [];
    while (!s.finished && s.tick < limit) {
        s = advance(s);
        const w = waiting(s);
        if (w === null || w === options.skip) continue;
        const kind = list[w]!.kind;
        if (isRole(kind)) {
            if (options.wrong && s.errors[w] === 0) for (const other of offered(levelOf(id)).filter(r => r !== kind)) {
                const before = s, tried = choose(s, other);
                if (tried.outcome !== 'fail') { broken.push(`gate ${w} ${other}: ${tried.outcome}`); continue; }
                s = advance(tried.state, FAIL_TICKS); tries++;
                if (waiting(s) !== w || s.cleared.join() !== before.cleared.join() || s.picked.join() !== before.picked.join() || s.friend !== before.friend) broken.push(`gate ${w} ${other}: not back to waiting`);
            }
            s = touch(s).state;
            if (s.works.every(x => x.gate !== w)) s = choose(s, kind).state;
        } else if (kind === 'pontlevis') s = press(s).state;
        else if (kind === 'fourche' && options.straight) s = touch(s).state;
        else s = poke(s).state;
    }
    return { state: s, tries, broken };
}
/** A child who touches at random whatever the field offers (every job button included), now and then: how many touches
 * until the walk is over. */
export function wander(id: number, seed: number, limit = 40_000): { state: State; touches: number } {
    const rng = makeRng(seed);
    let s = start(id), touches = 0;
    while (!s.finished && s.tick < limit) {
        s = advance(s);
        const list = targets(s);
        if (!list.length || rng() > .08) continue;
        s = act(s, list[Math.floor(rng() * list.length)]!).state; touches++;
    }
    return { state: s, touches };
}
export type { Role };
