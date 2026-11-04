import { expect, it } from 'vitest';
import { advance, complete, cut, CUT_REACH, FIELD, isUnlocked, levels, parseRecords, pop, reward, start, swipeTargets, tap, tapTarget, type State } from '../src/engines/gouter';
import { play, solve, tolerance } from '../src/engines/gouter/solver';
import { fieldSvg, gameView, labels, levelView, pictogram, ropePath } from '../src/games/gouter/view';

const idle = (id: number): State => advance(start(id), 900);

it('sixteen authored levels stay inside the field and use every mechanism', () => {
    expect(levels.length).toBeGreaterThanOrEqual(15);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        for (const p of [l.treat, l.mouth, ...l.stars, ...l.ropes, ...(l.hooks ?? []), ...(l.bubbles ?? [])]) {
            expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(FIELD.width);
            expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(FIELD.height);
        }
        // Boubou is drawn around his mouth: keep him on the stage.
        expect(l.mouth.x).toBeGreaterThanOrEqual(40); expect(l.mouth.x).toBeLessThanOrEqual(FIELD.width - 40);
        expect(l.stars).toHaveLength(3);
    }
    expect(levels.some(l => l.bubbles?.length)).toBe(true); expect(levels.some(l => l.hooks?.length)).toBe(true);
    expect(levels.some(l => l.ropes.some(r => r.length !== undefined))).toBe(true);
    expect(levels.some(l => l.ropes.length >= 4)).toBe(true);
});

it('the solver finishes every level with three stars, timing errors are forgiven, and nothing happens without the child', () => {
    for (const l of levels) {
        const solution = solve(l.id);
        expect(solution, `level ${l.id}`).not.toBeNull();
        expect(solution!.stars, `level ${l.id}`).toBe(3);
        expect(solution!.plan.length).toBeGreaterThan(0);
        // Each action of the reference plan may come at least 8 ticks (0.13 s) early or late.
        expect(solution!.tolerance, `level ${l.id}`).toBeGreaterThanOrEqual(8);
        expect(tolerance(l.id, solution!.plan)).toBe(solution!.tolerance);
        const replay = play(l.id, solution!.plan);
        expect(replay.status).toBe('won'); expect(replay.stars).toEqual([true, true, true]); expect(reward(replay)).toBe(3);
        expect(idle(l.id).status, `level ${l.id} is not won without an action`).not.toBe('won');
    }
}, 120_000);

it('physics is deterministic and pure: same actions, same ticks, same result; inputs are never mutated', () => {
    const plan = solve(4)!.plan;
    expect(play(4, plan)).toEqual(play(4, plan));
    const s = start(3), copy = structuredClone(s);
    advance(s, 100); cut(s, 0); expect(s).toEqual(copy);
    expect(advance(start(1), 0)).toEqual(start(1));
});

it('a hanging sweet stays still until a rope is cut, then falls with gravity', () => {
    const s = advance(start(1), 120);
    expect(s.status).toBe('play'); expect(s.treat.y).toBeCloseTo(levels[0]!.treat.y, 0);
    const falling = advance(cut(s, 0), 20);
    expect(falling.treat.y).toBeGreaterThan(s.treat.y + 20); expect(falling.ropes[0]!.cut).toBe(true);
    expect(cut(falling, 0)).toBe(falling); expect(cut(falling, 9)).toBe(falling);
});

it('a tap cuts the closest rope within reach, a swipe cuts every rope it crosses, a bubble pops on touch', () => {
    const s = start(5), r = s.ropes[0]!, mid = { x: (r.x + s.treat.x) / 2, y: (r.y + s.treat.y) / 2 };
    expect(tapTarget(s, mid)).toEqual({ kind: 'rope', index: 0 });
    expect(tapTarget(s, { x: mid.x + CUT_REACH + 30, y: mid.y })?.index).not.toBe(0);
    expect(tapTarget(s, { x: 2, y: 438 })).toBeNull(); expect(tap(s, { x: 2, y: 438 })).toBe(s);
    expect(tap(s, mid).ropes[0]!.cut).toBe(true);
    expect(swipeTargets(s, { x: 20, y: 100 }, { x: 300, y: 100 })).toEqual([0, 1, 2]);
    expect(swipeTargets(s, { x: 20, y: 60 }, { x: 300, y: 60 })).toEqual([2]);
    expect(swipeTargets(s, { x: 20, y: 430 }, { x: 300, y: 430 })).toEqual([]);
    let b = cut(start(2), 0); b = advance(b, 60);
    expect(b.bubbles[0]!.state).toBe('held');
    const target = tapTarget(b, { x: b.treat.x, y: b.treat.y });
    expect(target).toEqual({ kind: 'bubble', index: 0 });
    expect(pop(b, 0).bubbles[0]!.state).toBe('popped'); expect(pop(pop(b, 0), 0)).toEqual(pop(b, 0));
});

it('a hook grabs the sweet passing within reach and becomes a new rope', () => {
    const level = levels.find(l => l.hooks?.length)!;
    const plan = solve(level.id)!.plan;
    let s = start(level.id), grabbed = false;
    for (let t = 0; t < 600 && s.status === 'play'; t++) {
        for (const a of plan.filter(a => a.tick === s.tick)) s = a.kind === 'cut' ? cut(s, a.index) : pop(s, a.index);
        s = advance(s, 1); if (s.hooks[0]!.used) { grabbed = true; break; }
    }
    expect(grabbed).toBe(true); expect(s.ropes.at(-1)!.hook).toBe(0);
});

it('falling out of the field loses gently; the reward is the stars caught, never less than one', () => {
    const off = advance(cut(cut(start(4), 0), 1), 30);
    const flung = { ...off, treat: { ...off.treat, x: -100, px: -100 } };
    expect(advance(flung, 1).status).toBe('lost'); expect(reward(advance(flung, 1))).toBe(0);
    const won = { ...start(1), status: 'won' as const };
    expect(reward(won)).toBe(1); expect(reward({ ...won, stars: [true, false, true] })).toBe(2);
});

it('records keep the best result, unlock the next level, and reject corrupt storage', () => {
    const won = { ...start(2), status: 'won' as const, stars: [true, true, false] };
    let records = complete({}, won); expect(records).toEqual({ 2: 2 });
    records = complete(records, { ...won, stars: [false, false, false] }); expect(records).toEqual({ 2: 2 });
    expect(complete(records, start(2))).toEqual(records);
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(3, {})).toBe(false); expect(isUnlocked(3, records)).toBe(true);
    expect(parseRecords(JSON.stringify({ 1: 3, 2: 0, 3: 4, 99: 1, x: 2, 4: 1.5, 5: 2 }))).toEqual({ 1: 3, 5: 2 });
    for (const bad of [null, '', '{', '[]', '"x"', 'null']) expect(parseRecords(bad)).toEqual({});
});

it('the view draws every rope, star, hook and bubble, in both languages, with no brand and no stray number', () => {
    for (const l of levels) {
        const s = start(l.id), html = fieldSvg(s);
        expect(html.match(/data-rope=/g)).toHaveLength(l.ropes.length);
        expect(html.match(/data-star=/g)).toHaveLength(3);
        expect((html.match(/data-hook=/g) ?? []).length).toBe(l.hooks?.length ?? 0);
        expect((html.match(/data-bubble=/g) ?? []).length).toBe(l.bubbles?.length ?? 0);
        expect(html).not.toMatch(/NaN|undefined|Infinity/);
        for (const locale of ['fr', 'en'] as const) { const view = gameView(s, locale); expect(view).toContain(labels[locale].instruction); expect(view).not.toMatch(/NaN|undefined/); }
    }
    expect(Object.keys(labels.fr)).toEqual(Object.keys(labels.en));
    expect(levelView({ 1: 3 }, 'fr').match(/data-gouter-level=/g)).toHaveLength(levels.length);
    expect(levelView({}, 'en').match(/disabled/g)).toHaveLength(levels.length - 1);
    expect(pictogram).toMatch(/^<svg\s[^>]*xmlns=/);
    // A slack rope sags below the straight line; a taut one is straight.
    expect(ropePath({ x: 0, y: 0, length: 100 }, { x: 60, y: 0 })).toBe('M0.0 0.0Q30.0 40.0 60.0 0.0');
    expect(ropePath({ x: 0, y: 0, length: 50 }, { x: 0, y: 50 })).toBe('M0.0 0.0Q0.0 25.0 0.0 50.0');
});
