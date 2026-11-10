import { expect, it } from 'vitest';
import { advance, choose, complete, FOALS, IDLE_TICKS, isUnlocked, layoutKey, levels, obstacles, offered, open, parseRecords, path, problems, roles, start, stars, touch, waiting, type State } from '../src/engines/promenade';
import { GENERATED, generate, GENERATOR_SEED, handLevels, obstacleCount } from '../src/engines/promenade/levels';
import { play } from '../src/engines/promenade/solver';

/** Runs until the first foal waits at an obstacle (or the level ends). */
const toObstacle = (s: State): State => { let out = s; while (waiting(out) === null && !out.finished && out.tick < 5000) out = advance(out); return out; };

it('52 levels: 12 written by hand, then 40 generated from a fixed seed, each one fair to a five-year-old', () => {
    expect(levels).toHaveLength(52); expect(handLevels).toHaveLength(12); expect(GENERATED).toBe(40);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `level ${l.id}`).toEqual([]);
        expect(obstacles(l).length, `level ${l.id}`).toBeLessThanOrEqual(4);
        expect(offered(l).length, `level ${l.id}`).toBeLessThanOrEqual(3);
    }
    // The same seed gives the same list: every device plays the same levels.
    const again = generate(GENERATOR_SEED, GENERATED, 13, l => problems(l).length === 0 && obstacles(l).length === obstacleCount(l.id) && offered(l).length >= 2 && !levels.slice(0, l.id - 1).some(o => layoutKey(o) === layoutKey(l)) && layoutKey(l) === layoutKey(levels[l.id - 1]!));
    expect(again.map(layoutKey)).toEqual(levels.slice(12).map(layoutKey));
});

it('no two levels share a layout', () => {
    const keys = levels.map(layoutKey);
    const twins = keys.flatMap((k, i) => keys.slice(0, i).includes(k) ? [`${keys.indexOf(k) + 1}~${i + 1}`] : []);
    expect(twins).toEqual([]);
});

it('roles come one at a time, then two and three obstacles; the generated levels start again at two and grow to four', () => {
    const counts = levels.map(l => obstacles(l).length);
    expect(counts.slice(0, 5)).toEqual([0, 1, 1, 1, 1]);
    expect(levels.slice(1, 5).map(l => obstacles(l)[0]!.role)).toEqual(['pont', 'tunnel', 'trou', 'echelle']);
    expect(counts.slice(5, 9)).toEqual([2, 2, 2, 2]); expect(counts.slice(9, 12)).toEqual([3, 3, 3]);
    // Level 13 opens the generated list with two obstacles again (new mixes), then it never gets easier.
    expect(counts[12]).toBe(2);
    for (let i = 13; i < counts.length; i++) expect(counts[i]!, `level ${i + 1}`).toBeGreaterThanOrEqual(counts[i - 1]!);
    expect(counts.at(-1)).toBe(4);
    // Every combination level asks for a choice between at least two roles; all four roles and all sceneries come back.
    for (const l of levels.slice(5)) expect(offered(l).length, `level ${l.id}`).toBeGreaterThanOrEqual(2);
    for (const role of roles) expect(levels.slice(12).filter(l => offered(l).includes(role)).length, role).toBeGreaterThanOrEqual(8);
    expect(new Set(levels.slice(12).map(l => l.theme)).size).toBe(4);
    expect(new Set(levels.slice(12).map(l => l.floors.length))).toEqual(new Set([1, 2, 3]));
});

it('the solver brings the five foals home on every level with three stars', () => {
    for (const l of levels) {
        const { state } = play(l.id);
        expect(state.finished, `level ${l.id}`).toBe(true);
        expect(state.foals.every(f => f.home)).toBe(true); expect(stars(state)).toBe(3);
    }
});

it('every obstacle needs its own role: any other role is refused, and without the right one nobody passes', () => {
    for (const l of levels) {
        const list = obstacles(l);
        const { state, rejected } = play(l.id, { wrong: true });
        expect(state.finished).toBe(true); expect(rejected, `level ${l.id}`).toBe(list.length * (roles.length - 1));
        for (const [k, o] of list.entries()) {
            const stuck = play(l.id, { skip: k, limit: 3000 }).state;
            expect(stuck.finished, `level ${l.id} obstacle ${k}`).toBe(false);
            // The troupe waits in front of it: the first foal stands there, nobody went further, nobody is lost.
            expect(waiting(stuck), `level ${l.id} obstacle ${k}`).toBe(k);
            expect(Math.max(...stuck.foals.map(f => f.pos))).toBe(o.at * 8);
            expect(stuck.foals.every(f => !f.home)).toBe(true);
        }
    }
});

it('nothing moves before the trapdoor opens; a wrong role is gentle; two make the right one show', () => {
    const closed = advance(start(1), 300);
    expect(closed.foals.every(f => !f.out)).toBe(true); expect(closed.hint).toBe('start');
    const s = toObstacle(open(start(6)));
    expect(waiting(s)).toBe(0);
    const chosen = touch(s); expect(chosen.outcome).toBe('choose'); expect(chosen.state.choosing).toBe(true);
    const once = choose(chosen.state, 'trou'); expect(once.outcome).toBe('wrong'); expect(once.state.hint).toBe('none'); expect(once.state.shake).toBeGreaterThan(0);
    const twice = choose(once.state, 'echelle'); expect(twice.state.hint).toBe('role'); expect(twice.state.helped[0]).toBe(true);
    const right = choose(twice.state, 'pont'); expect(right.outcome).toBe('work');
    // One help: two stars at the end.
    let end = right.state; while (!end.finished) { end = advance(end); if (waiting(end) !== null) end = choose(end, obstacles(levels[5]!)[waiting(end)!]!.role).state; }
    expect(stars(end)).toBe(2);
});

it('a single-role level works on the first touch; waiting long makes the foal, then the role shine', () => {
    const s = toObstacle(open(start(2)));
    expect(touch(s).outcome).toBe('work');
    const idle = advance(s, IDLE_TICKS); expect(idle.hint).toBe('foal'); expect(idle.helped[0]).toBe(false);
    const longer = advance(idle, IDLE_TICKS); expect(longer.hint).toBe('role'); expect(longer.helped[0]).toBe(true);
    // Waiting never loses anything: the troupe is still there, whole.
    expect(longer.foals.filter(f => f.out).length + longer.foals.filter(f => !f.out).length).toBe(FOALS);
    const multi = advance(toObstacle(open(start(6))), 2 * IDLE_TICKS); expect(multi.choosing).toBe(true); expect(multi.hint).toBe('role');
});

it('foals keep their distance and walk the path cell by cell, down every floor', () => {
    const l = levels[10]!;
    expect(path(l)).toHaveLength(18); expect(path(l)[6]!.col).toBe(path(l)[5]!.col);
    let s = open(start(l.id));
    for (let i = 0; i < 4000 && !s.finished; i++) {
        s = advance(s); if (waiting(s) !== null) s = choose(s, obstacles(l)[waiting(s)!]!.role).state;
        const out = s.foals.filter(f => f.out && !f.home);
        for (let k = 1; k < out.length; k++) expect(out[k - 1]!.pos - out[k]!.pos).toBeGreaterThanOrEqual(5);
    }
    expect(s.finished).toBe(true);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = play(3).state;
    expect(complete({ 3: 2 }, won)).toEqual({ 3: 3 }); expect(complete({ 3: 3 }, { ...won, helped: [true] })).toEqual({ 3: 3 });
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"53":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
