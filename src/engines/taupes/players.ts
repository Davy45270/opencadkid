import { carrotsOn, goodCell, hint, levelOf, play, start, width, height, type Action, type Event, type Result, type State } from '.';
import { makeRng } from '../rng';
/** A careful child: always digs the first clod the flowers prove free, never a funny try. */
export function greedyPlayer(id: number, limit = 200): { state: State; moves: number } {
    let s = start(id);
    while (!s.finished && s.moves < limit) {
        const c = goodCell(s);
        if (c === null) break;
        s = play(s, { kind: 'creuser', cell: c })!.state;
    }
    return { state: s, moves: s.moves };
}
/** A robot child digging at random: any clod still covered and without a carrot. Like a child, it remembers a mole it has
 * just woken up and puts a carrot on it at once (once the carrot has come in); when a clod shines, it takes it one time in
 * two. `seen` receives every state it plays from, `events` every event. */
export function randomPlayer(id: number, seed: number, limit = 1000, seen?: (s: State) => void, events?: (e: Event) => void): { state: State; moves: number } {
    const rng = makeRng(seed), l = levelOf(id), n = width(l) * height(l);
    let s = start(id), woken: number | null = null;
    while (!s.finished && s.moves < limit) {
        seen?.(s);
        let a: Action;
        const h = hint(s);
        if (woken !== null && carrotsOn(id)) a = { kind: 'carotte', cell: woken };
        else if (h !== null && rng() < .5) a = { kind: 'creuser', cell: h };
        else {
            const covered = Array.from({ length: n }, (_, i) => i).filter(i => !s.open.includes(i) && !s.carrots.includes(i) && l.rows.join('')[i] !== '#');
            a = { kind: 'creuser', cell: covered[Math.floor(rng() * covered.length)]! };
        }
        woken = null;
        const r: Result = play(s, a)!;
        for (const e of r.events) { events?.(e); if (e.kind === 'fail' && e.fail === 'baille') woken = e.cell; }
        s = r.state;
    }
    return { state: s, moves: s.moves };
}
/** A robot child touching anything at random (any cell, Tutu, the edge, digging or carrots): it meets every funny try. */
export function wildPlayer(id: number, seed: number, limit = 3000, events?: (e: Event) => void): { state: State; moves: number } {
    const rng = makeRng(seed), l = levelOf(id), n = width(l) * height(l);
    let s = start(id);
    while (!s.finished && s.moves < limit) {
        const k = Math.floor(rng() * (n + 2));
        const a: Action = k === n ? { kind: 'tutu' } : k === n + 1 ? { kind: 'bord' } : { kind: carrotsOn(id) && rng() < .4 ? 'carotte' : 'creuser', cell: k };
        const r = play(s, a);
        if (!r) continue;
        r.events.forEach(e => events?.(e));
        s = r.state;
    }
    return { state: s, moves: s.moves };
}
