import { free, levelOf, padAt, R, SOFT, start, step, VX, WIDTH, HEIGHT, world, type Command, type Event, type State } from '.';
import { makeRng } from '../rng';
/** A simple automatic pilot, for the tests: it follows a map of the free sky towards the runway to visit (a distance
 * field over 4 × 4 cells, computed once per runway), then comes down over the runway, puffing whenever the rocket falls
 * faster than a gentle speed. */
const CELL = 4;
const COLS = Math.floor(WIDTH / CELL), ROWS = Math.floor(HEIGHT / CELL);
const fields = new Map<string, Int32Array>();
const centre = (c: number): { x: number; y: number } => ({ x: (c % COLS) * CELL + CELL / 2, y: Math.floor(c / COLS) * CELL + CELL / 2 });
/** The approach band above a runway: where the pilot starts coming straight down. */
function field(level: number, pad: number): Int32Array {
    const key = `${level}:${pad}`, known = fields.get(key); if (known) return known;
    const l = levelOf(level), w = world(l), p = l.pads[pad]!, at = padAt(w, pad, 0), reach = Math.max(2, at.w / 2 - 8);
    const lo = (p.swing ? p.x - p.swing : p.x) - reach, hi = (p.swing ? p.x + p.swing : p.x) + reach;
    const dist = new Int32Array(COLS * ROWS).fill(-1), open = new Uint8Array(COLS * ROWS), queue: number[] = [];
    // Runways are not in the way of the map: only rocks, hills, aliens and the ground are (all runways sit at t = 0).
    const bare = { ...w, level: { ...l, pads: [] } };
    for (let c = 0; c < COLS * ROWS; c++) { const { x, y } = centre(c); open[c] = free(bare, 0, x, y, 2) ? 1 : 0; }
    for (let c = 0; c < COLS * ROWS; c++) { const { x, y } = centre(c); if (open[c] && x >= lo && x <= hi && y >= at.top - R - 22 && y <= at.top - R - 6) { dist[c] = 0; queue.push(c); } }
    for (let i = 0; i < queue.length; i++) {
        const c = queue[i]!, col = c % COLS;
        for (const n of [col > 0 ? c - 1 : -1, col < COLS - 1 ? c + 1 : -1, c - COLS, c + COLS]) if (n >= 0 && n < COLS * ROWS && open[n] && dist[n]! < 0) { dist[n] = dist[c]! + 1; queue.push(n); }
    }
    fields.set(key, dist);
    return dist;
}
const sideFor = (want: number, vx: number): -1 | 0 | 1 => want - vx > 0.04 ? 1 : want - vx < -0.04 ? -1 : 0;
/** The pilot's command for this step. */
export function pilot(s: State): Command {
    if (s.finished) return { puff: false, side: 0 };
    const l = levelOf(s.level), w = world(l), p = padAt(w, s.visited, s.t), dist = field(s.level, s.visited);
    const col = Math.min(COLS - 1, Math.max(0, Math.floor(s.x / CELL))), row = Math.min(ROWS - 1, Math.max(0, Math.floor(s.y / CELL)));
    let c = row * COLS + col;
    const over = Math.abs(s.x - p.x) <= p.w / 2 - 6 && s.y > p.top - R - 26;
    if (over || dist[c] === 0) {
        // Come down over the runway, following it if it slides.
        const want = Math.max(-VX, Math.min(VX, (p.x - s.x) * 0.1));
        return { puff: s.vy > SOFT - 0.2, side: sideFor(want, s.vx) };
    }
    if (dist[c]! < 0) {
        // Not on the map (close to something): head for the nearest cell that is.
        let best = -1, bd = Infinity;
        for (let dr = -4; dr <= 4; dr++) for (let dc = -4; dc <= 4; dc++) { const r = row + dr, k = col + dc; if (r < 0 || r >= ROWS || k < 0 || k >= COLS) continue; const n = r * COLS + k; if (dist[n]! >= 0 && dr * dr + dc * dc < bd) { bd = dr * dr + dc * dc; best = n; } }
        if (best < 0) return { puff: true, side: 0 };
        c = best;
    } else for (let k = 0; k < 3; k++) {
        const cc = c % COLS; let next = c;
        for (const n of [c + COLS, c - COLS, cc > 0 ? c - 1 : -1, cc < COLS - 1 ? c + 1 : -1]) if (n >= 0 && n < COLS * ROWS && dist[n]! >= 0 && dist[n]! < dist[next]!) next = n;
        c = next;
    }
    const target = centre(c);
    const want = Math.max(-VX, Math.min(VX, (target.x - s.x) * 0.1)), fall = Math.max(-0.5, Math.min(0.4, (target.y - s.y) * 0.06));
    return { puff: s.vy > fall, side: sideFor(want, s.vx) };
}
/** Plays a scene with a command chooser until it ends or `limit` steps. */
export function play(id: number, choose: (s: State) => Command, limit = 20000, watch?: (s: State, e: Event | null) => void): { state: State; steps: number } {
    let s = start(id);
    while (!s.finished && s.t < limit) { const r = step(s, choose(s)); s = r.state; watch?.(s, r.event); }
    return { state: s, steps: s.t };
}
export const autopilot = (id: number, limit = 20000, watch?: (s: State, e: Event | null) => void): { state: State; steps: number } => play(id, pilot, limit, watch);
/** A clumsy robot: commands held for a while (10 to 59 steps); for each hold, one chance in two to follow the pilot,
 * otherwise a puff or not and a side drawn at random. */
export function clumsy(id: number, seed: number, limit = 60000, watch?: (s: State, e: Event | null) => void): { state: State; steps: number } {
    const rng = makeRng(seed);
    let left = 0, follow = false, held: Command = { puff: false, side: 0 };
    return play(id, s => {
        if (left <= 0) { left = 10 + Math.floor(rng() * 50); follow = rng() < 0.5; held = { puff: rng() < 0.5, side: (Math.floor(rng() * 3) - 1) as -1 | 0 | 1 }; }
        left--;
        return follow ? pilot(s) : held;
    }, limit, watch);
}
