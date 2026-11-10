import { advance, choose, needed, open, roles, start, touch, waiting, type State } from '.';
/** Plays a level as a child who always knows the job: opens the trapdoor, then touches each waiting foal and gives it the
 * role it needs. `skip` leaves one obstacle without its role, `wrong` tries every other role there first.
 * Returns the last state: finished when all five foals reached the door. */
export function play(id: number, options: { skip?: number; wrong?: boolean; limit?: number } = {}): { state: State; rejected: number } {
    let s = open(start(id)), rejected = 0;
    const limit = options.limit ?? 6000;
    while (!s.finished && s.tick < limit) {
        s = advance(s);
        const role = needed(s);
        if (role === null) continue;
        if (waiting(s) === options.skip) continue;
        if (options.wrong) for (const other of roles.filter(r => r !== role)) {
            const tried = choose(s, other);
            if (tried.outcome === 'wrong' && tried.state.cleared.every((c, k) => c === s.cleared[k]) && tried.state.work === null) rejected++;
        }
        s = touch(s).state;
        if (!s.work) s = choose(s, role).state;
    }
    return { state: s, rejected };
}
