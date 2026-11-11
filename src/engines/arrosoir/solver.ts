import { ANGLE_MAX, ANGLE_MIN, fire, groundAt, helpOn, hint, levelOf, POWER_MAX, POWER_MIN, start, type Result, type Shot, type State } from '.';
import { makeRng } from '../rng';
/** The greedy player: the help's good pull, balloon after balloon, until every flower is open (or `limit` balloons). */
export function greedyPlayer(from: State, limit = 100, watch?: (r: Result) => void): { state: State; shots: number; stuck: boolean } {
    let s = from, n = 0;
    while (!s.finished && n < limit) {
        const h = hint(s);
        if (!h) return { state: s, shots: n, stuck: true };
        const r = fire(s, h); watch?.(r); s = r.state; n++;
    }
    return { state: s, shots: n, stuck: !s.finished };
}
/** A robot pulling blindly: angle and power drawn uniformly over what a finger can give, every balloon counted. */
export function randomPlayer(id: number, seed: number, limit = 5000, watch?: (r: Result, before: State) => void): { state: State; shots: number } {
    const rng = makeRng(seed);
    let s = start(id), n = 0;
    while (!s.finished && n < limit) {
        const shot = { angle: ANGLE_MIN + Math.floor(rng() * (ANGLE_MAX - ANGLE_MIN + 1)), power: POWER_MIN + Math.floor(rng() * (POWER_MAX - POWER_MIN + 1)) };
        const r = fire(s, shot); watch?.(r, s); s = r.state; n++;
    }
    return { state: s, shots: n };
}
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
/** A robot child who adjusts: it picks a thirsty flower, pulls, looks where the balloon fell and corrects half the gap
 * (with a little noise of its hand): too short, a bit stronger; too far, a bit softer; stopped by the apple tree, the cow,
 * the cloud or the side of a rock, a bit higher. Once the help shows, it copies the ghost hand one time in two, clumsily. */
export function childPlayer(id: number, seed: number, limit = 400, watch?: (r: Result, before: State) => void): { state: State; shots: number } {
    const rng = makeRng(seed), level = levelOf(id), c = level.caliroux.x, noise = (k: number): number => (rng() + rng() - 1) * k;
    let s = start(id), n = 0;
    const pick = (): number => { const left = level.flowers.map((_, i) => i).filter(i => !s.open[i]); return left[Math.floor(rng() * left.length)]!; };
    let target = pick(), angle = 30 + rng() * 30, power = 35 + rng() * 40;
    while (!s.finished && n < limit) {
        const fx = level.flowers[target]!, side = fx >= c ? 1 : -1;
        const h = helpOn(s) && rng() < 0.5 ? hint(s) : null;
        const shot: Shot = h ? { angle: h.angle + noise(3), power: h.power + noise(4) } : { angle: side > 0 ? angle + noise(3) : 180 - angle + noise(3), power: power + noise(4) };
        const r = fire(s, shot); watch?.(r, s); s = r.state; n++;
        if (s.finished) break;
        if (s.open[target]) { target = pick(); continue; }
        if (h) continue;
        const want = (fx - c) * side, got = (r.impact.x - c) * side;
        const blocked = r.impact.kind === 'arbre' || r.impact.kind === 'vache' || r.impact.kind === 'nuage' || (got < want && r.impact.kind === 'sol' && r.impact.y < groundAt(level, fx) - 6 && got > want - 40);
        // Fallen onto the crown from above: it went high enough, it needs a little more strength.
        const tree = r.impact.kind === 'arbre' ? level.trees[r.impact.what]! : null;
        if (tree && r.impact.y < groundAt(level, tree.x) - tree.h - 4) { power = clamp(power * 1.1 + 2, POWER_MIN, POWER_MAX); continue; }
        if (blocked) { angle = clamp(angle + 8 + rng() * 6, 20, 78); power = clamp(power + 6, POWER_MIN, POWER_MAX); continue; }
        if (r.impact.kind === 'loin' && got > 0) { power = clamp(power * 0.8, POWER_MIN, POWER_MAX); continue; }
        if (got <= 4) { power = clamp(power + 15, POWER_MIN, POWER_MAX); continue; }
        const better = power * Math.sqrt(want / got);
        power = clamp(power + (better - power) / 2, POWER_MIN, POWER_MAX);
        if (power >= POWER_MAX - 1 && got < want) angle = clamp(angle + (45 - angle) / 2, 20, 78);
    }
    return { state: s, shots: n };
}
