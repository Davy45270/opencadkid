import { actions, COUNTDOWN, cross, DELTA, greedyAction, landing, levelOf, moves, start, step, walkable, width, type Action, type State } from '.';
import { makeRng } from '../rng';
/** The greedy player: the plan of the help, gesture after gesture, until the end (or `limit` gestures). */
export function greedyPlayer(from: State, limit = 400): { state: State; steps: number; stuck: boolean } {
    let s = from, n = 0;
    while (!s.finished && n < limit) {
        const a = greedyAction(s);
        if (!a) return { state: s, steps: n, stuck: true };
        s = step(s, a)!.state; n++;
    }
    return { state: s, steps: n, stuck: !s.finished };
}
/** A robot child pressing at random: any of the six gestures (four steps, « put down », « wait »), funny tries included.
 * Every gesture counts. `visit` sees every state it goes through. */
export function randomPlayer(id: number, seed: number, limit = 5000, visit?: (s: State) => void): { state: State; steps: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.steps < limit) {
        visit?.(s);
        s = step(s, actions[Math.floor(rng() * actions.length)]!)!.state;
    }
    return { state: s, steps: s.steps };
}
/** A robot child with a little idea: it picks at random a carton that a box can reach from somewhere, walks there by a short
 * way (a random gesture now and then), puts the box down and waits for the pouf; then another carton. With no carton in
 * reach, it walks to a bonus. Counts the boxes put down. */
export function childPlayer(id: number, seed: number, limit = 3000): { state: State; steps: number; boxes: number } {
    const rng = makeRng(seed), level = levelOf(id), w = width(level), any = (): Action => actions[Math.floor(rng() * actions.length)]!;
    let s = start(id), boxes = 0;
    while (!s.finished && s.steps < limit) {
        // For every carton, the cells where a box put down reaches it.
        const spots = new Map<number, Set<number>>();
        for (let cell = 0; cell < s.grid.length; cell++) {
            const x = cell % w, y = Math.floor(cell / w);
            if (!walkable(s.grid[cell])) continue;
            const to = landing(level, s.grid, s.boxes, x, y);
            for (const c of cross(level, s.grid, to.x, to.y, s.range).cartons) { const k = c.y * w + c.x; if (!spots.has(k)) spots.set(k, new Set()); spots.get(k)!.add(cell); }
        }
        const ways = [...spots.values()].map(goals => walk(s, goals)).filter((way): way is Action[] => way !== null);
        const bonus = s.grid.split('').flatMap((c, i) => c === 'g' || c === 'm' ? [i] : []);
        const way = ways.length ? ways[Math.floor(rng() * ways.length)]! : bonus.length ? walk(s, new Set(bonus)) : null;
        if (!way) { s = step(s, any())!.state; continue; }
        for (const m of way) { if (s.finished) break; s = step(s, rng() < 0.15 ? any() : m)!.state; }
        if (s.finished || !ways.length) continue;
        const r = step(s, 'poser')!;
        s = r.state;
        if (!r.fail) boxes++;
        // A box already counting (put down by a random gesture) or the box put now: wait for the pouf.
        for (let k = 0; k < COUNTDOWN && !s.finished; k++) s = step(s, 'attendre')!.state;
    }
    return { state: s, steps: s.steps, boxes };
}
/** The shortest walk from Tutu to one of `goals` (cells), boxes in the way avoided; null when none is reachable. */
function walk(s: State, goals: Set<number>): Action[] | null {
    const level = levelOf(s.level), w = width(level), h = level.rows.length, first = s.y * w + s.x;
    if (goals.has(first)) return [];
    const from = new Map<number, [number, Action]>(), queue = [first], seen = new Set([first]);
    for (let i = 0; i < queue.length; i++) {
        const at = queue[i]!;
        for (const m of moves) {
            const nx = at % w + DELTA[m][0], ny = Math.floor(at / w) + DELTA[m][1], n = ny * w + nx;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen.has(n) || !walkable(s.grid[n]) || s.boxes.some(b => b.x === nx && b.y === ny)) continue;
            seen.add(n); from.set(n, [at, m]); queue.push(n);
            if (goals.has(n)) { const out: Action[] = []; for (let c = n; c !== first; c = from.get(c)![0]) out.unshift(from.get(c)![1]); return out; }
        }
    }
    return null;
}
