import { friendOf, homeOf, levelOf, possible, snacksOf, start, step, type Action, type State } from '.';
import { makeRng } from '../rng';
/** Where the little one wants to go next: the friend, then the snacks, then home. */
export function target(s: State): { x: number; y: number } {
    const level = levelOf(s.level), friend = friendOf(level);
    if (friend && !s.friend) return friend;
    const snacks = snacksOf(level), k = s.picked.findIndex(p => !p);
    if (k >= 0) return snacks.slice(k).filter((_, i) => !s.picked[k + i]).sort((a, b) => Math.abs(a.x - s.x) + Math.abs(a.y - s.y) - Math.abs(b.x - s.x) - Math.abs(b.y - s.y))[0]!;
    return homeOf(level);
}
/** The step towards the target: up or down first, then across. */
export function forward(s: State): Action {
    const t = target(s);
    if (t.y !== s.y) return t.y > s.y ? 'haut' : 'bas';
    return t.x > s.x ? 'droite' : t.x < s.x ? 'gauche' : 'attendre';
}
/** A robot child: 60 % of the time the step towards its target, otherwise any step at all, funny tries included. Every
 * step counts, the light and the funny tries too. */
export function randomPlayer(id: number, seed: number, limit = 2000, ahead = 0.6): { state: State; steps: number } {
    const rng = makeRng(seed);
    let s = start(id);
    while (!s.finished && s.steps < limit) {
        const all = possible(s), f = forward(s);
        const a = rng() < ahead && all.includes(f) ? f : all[Math.floor(rng() * all.length)]!;
        s = step(s, a)!.state;
    }
    return { state: s, steps: s.steps };
}
