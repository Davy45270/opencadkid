import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { ARRET, CALI, CALIROUX, colors, complete, coneId, COUR, distance, EARLY, EARLY_VEHICLES, explore, fails, features, featuresOf, geometry, goodTap, H, HELP_AFTER, hint, isUnlocked, levelOf, levels, MAX_PAR, measure, MIN_GAP, needs, parse, parseRecords, play, problems, start, stars, STOP, targets, touched, W, waited, type Fail, type LevelDef } from '../src/engines/autobus';
import { greedyPlayer, randomPlayer } from '../src/engines/autobus/solver';
import { failAnimations, thingAnimations } from '../src/games/autobus/art';

/** A robot child taking the shining vehicle half of the time when the help shows one, and touching anything at random
 * otherwise (vehicles, cones, the stop, CaliRoux, the empty yard), 200 seeds per scene. Measured on the 32 scenes: median at
 * most 40 touches (scene 31), worst game 72 touches (scene 31). With the median bound at 39 the test fails (scene 31). */
const RANDOM_MEDIAN_MAX = 40;
const RANDOM_WORST_MAX = 100;
const scene = (l: LevelDef, grid: string[], gates: string, queue: string): LevelDef => ({ ...l, ...parse(grid, gates, queue) });
const go = (id: number, path: string[]) => path.reduce((s, t) => play(s, t)!.state, start(id));

it('at least 30 scenes, numbered in order, each fair to a four-year-old, with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        if (l.id < EARLY) expect(l.vehicles.length, `scene ${l.id}`).toBeLessThanOrEqual(EARLY_VEHICLES);
    }
    for (const key of ['fr', 'en'] as const) expect(new Set(levels.map(l => l.title[key])).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    // The first scene is one bus and one touch.
    expect([levelOf(1).vehicles.length, measure(levelOf(1)).par]).toEqual([1, 1]);
    // What problems() catches: too many vehicles early, a child with no bus, a gate no bus drives through, a bus facing
    // the bottom, a scene with no way to the end.
    const one = levelOf(1);
    expect(problems(scene(one, ['wW..', 'xX..', '.R..', '.r..'], 'h1', 'r'))).toContain(`at most ${EARLY_VEHICLES} vehicles before scene ${EARLY}`);
    expect(problems(scene(one, ['....', '....', '.R..', '.r..'], 'h1', 'rb'))).toContain('one child for each bus');
    expect(problems(scene(one, ['....', '....', '.R..', '.r..'], 'h1 h2', 'r'))).toContain('gate haut 2: a bus drives through it');
    expect(problems(scene(one, ['....', '....', '.r..', '.R..'], 'h1', 'r'))).toContain('r: a bus faces a side with gates');
    expect(problems(scene(one, ['....', '#...', '.R..', '.r..'], 'h0 h1', 'r'))).toEqual(['gate haut 0: a bus drives through it']);
    expect(problems(scene(one, ['.#..', '....', '.R..', '.r..'], 'h1', 'r'))).toContain('a way to the end');
    expect(() => parse(['.r..', '.r..'], 'h1', 'r')).toThrow(); expect(() => parse(['.R..', '.R..'], 'h1', 'r')).toThrow(); expect(() => parse(['rR.', 'r..'], 'h1', 'r')).toThrow();
    expect(() => parse(['.R.', '.r.'], 'b1', 'r')).toThrow(); expect(() => parse(['.R.', '.r.'], 'h1', 'q')).toThrow();
});

it('never a dead end: from every state the touches can reach, every scene can still be finished', () => {
    let states = 0;
    for (const l of levels) {
        const m = measure(l);
        expect(m.dead, `scene ${l.id}`).toBe(0);
        expect(m.par, `scene ${l.id}`).toBeLessThanOrEqual(MAX_PAR);
        expect(explore(l).complete, `scene ${l.id}`).toBe(true);
        states += m.states;
    }
    expect(states).toBeGreaterThan(5_000);
    // The counter-proof: a scene where the red bus blocks the blue one in the only lane, and blue is waited first.
    const stuck = scene(levelOf(3), ['....', '..R.', '..r.', '..B.', '..b.'], 'h2', 'br');
    expect(measure(stuck).par).toBe(Infinity);
    expect(problems(stuck)).toEqual(['a way to the end']);
    // A grey car that drives off for good, past the only place it could come back from, is a dead end the rules catch.
    const trap = scene(levelOf(11), ['.....', '....x', 'vV..X', '.R...', '.r...'], 'h1 d2', 'rv');
    expect(measure(trap).dead).toBeGreaterThan(0);
    expect(problems(trap)).toContainEqual(expect.stringMatching(/dead ends$/));
});

it('a touch drives a vehicle forward as far as it can, else backward as far as it can; a stuck one honks', () => {
    // Scene 4: the grey car first drives the wrong way to the edge, then backs up against the cone.
    let s = start(4);
    let r = play(s, 'w')!;
    expect(r.events).toEqual([{ kind: 'roule', vehicle: 'w', from: 1, to: 0, helped: false }]);
    s = r.state; r = play(s, 'w')!;
    expect(r.events).toEqual([{ kind: 'roule', vehicle: 'w', from: 0, to: 2, helped: false }]);
    // Scene 2: the bus under the parked car can go neither way.
    expect(play(start(2), 'r')!.events).toEqual([{ kind: 'fail', fail: 'klaxon', on: 'r' }]);
    // A bus whose way ends at its gate leaves, in the same touch, with the first child.
    s = play(start(2), 'w')!.state; r = play(s, 'r')!;
    expect(r.events).toEqual([{ kind: 'roule', vehicle: 'r', from: 2, to: 0, helped: false }, { kind: 'part', bus: 'r', color: 'r', helped: false }, { kind: 'fini' }]);
    expect(r.state.gone).toEqual(['r']); expect(play(r.state, 'r')).toBeNull();
    // Scene 10: the red bus stands at its gate, the blue child is first; red leaves after blue.
    s = start(10);
    expect(waited(levelOf(10), s.gone)).toBe('b');
    expect(play(s, 'r')!.events).toEqual([{ kind: 'fail', fail: 'pasmoi', on: 'r' }]);
    s = play(s, 'b')!.state; expect(waited(levelOf(10), s.gone)).toBe('r');
    r = play(s, 'r')!; expect(r.events).toEqual([{ kind: 'part', bus: 'r', color: 'r', helped: false }, { kind: 'fini' }]);
});

it('every scene brings in one new thing at most, and each new thing comes back in at least two combinations', () => {
    const met = new Set<string>();
    for (const l of levels) {
        const fs = featuresOf(l), fresh = fs.filter(f => !met.has(f));
        expect(fresh.length, `scene ${l.id} brings in ${fresh.join(', ')}`).toBeLessThanOrEqual(1);
        for (const f of fresh) { for (const n of needs[f] ?? []) expect(met.has(n), `${f} after ${n}`).toBe(true); met.add(f); }
    }
    expect([...met].sort()).toEqual([...features].sort());
    for (const f of features) expect(levels.filter(l => featuresOf(l).includes(f) && featuresOf(l).length > 1 + (needs[f]?.length ?? 0)).length, f).toBeGreaterThanOrEqual(2);
    expect(featuresOf(levelOf(1))).toEqual([]);
    // The order of the new things: a car, two buses, the cones, a side gate, a long coach, a lorry, two gates, the big yard.
    expect(features.map(f => levels.find(l => featuresOf(l).includes(f))!.id)).toEqual([2, 3, 4, 5, 7, 9, 10, 23]);
    expect(levels.filter(l => featuresOf(l).includes('grand')).every(l => l.id >= 23)).toBe(true);
});

it(`two scenes always differ by at least MIN_GAP = ${MIN_GAP} (8 measured, scenes 1 and 2); the last scenes ask for more touches than the first`, () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    const one = levelOf(1);
    expect(distance(one, one)).toBe(0);
    // The same bus one cell lower: too close to count as another scene.
    expect(distance(one, scene(one, ['....', '.R..', '.r..', '....'], 'h1', 'r'))).toBe(2);
    const par = levels.map(l => measure(l).par);
    expect(Math.max(...par.slice(0, 10))).toBeLessThanOrEqual(3);
    expect(Math.min(...par.slice(-3))).toBeGreaterThanOrEqual(9);
    expect(Math.max(...par)).toBe(par.at(-1));
});

it('a scene always starts the same way and the same touches give the same game', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    expect(randomPlayer(30, 7, 1000, undefined, undefined, .5).state).toEqual(randomPlayer(30, 7, 1000, undefined, undefined, .5).state);
    const s = start(1);
    expect([s.pos, s.gone, s.moves, s.finished]).toEqual([[2], [], 0, false]);
    expect(play(s, 'zz')).toBeNull(); expect(play(s, 'b')).toBeNull(); expect(play(s, coneId(0))).toBeNull();
    expect(() => start(99)).toThrow();
});

it('every scene can be finished: the player who follows the help needs exactly the fewest touches', () => {
    for (const l of levels) {
        const g = greedyPlayer(l.id);
        expect(g.state.finished, `scene ${l.id}`).toBe(true);
        expect(g.moves, `scene ${l.id}`).toBe(measure(l).par);
        expect(g.state.gone, `scene ${l.id}`).toEqual(l.queue);
        expect([stars(g.state), g.state.tries]).toEqual([3, 0]);
    }
});

it(`a robot taking the help half of the time finishes every scene: median at most ${RANDOM_MEDIAN_MAX} touches over 200 seeds, never more than ${RANDOM_WORST_MAX}`, { timeout: 60_000 }, () => {
    let states = 0;
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, 1000, () => { states++; }, undefined, .5));
        for (const r of runs) {
            expect(r.state.finished, `scene ${l.id}`).toBe(true);
            expect(r.moves, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX);
        }
        const n = runs.map(r => r.moves).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
    expect(states).toBeGreaterThan(50_000);
});

it('every funny try is met, has its own animations, and changes nothing but the counters', () => {
    const seen = new Map<Fail, Set<number>>();
    for (const l of levels) for (let k = 0; k < 10; k++) randomPlayer(l.id, 50 + k, 1000, undefined, e => { if (e.kind === 'fail') { const set = seen.get(e.fail) ?? new Set<number>(); set.add(l.id); seen.set(e.fail, set); } }, .5);
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    // One of each: the vehicles, the children and the stars stay as they were; only the counters move.
    const tries: [number, string[], string, Fail, string][] = [[2, [], 'r', 'klaxon', 'r'], [10, [], 'r', 'pasmoi', 'r'], [4, [], coneId(0), 'plot', coneId(0)], [1, [], ARRET, 'coucou', ARRET], [1, [], COUR, 'pigeon', COUR], [1, [], CALIROUX, 'roulade', CALIROUX]];
    for (const [id, path, target, fail, on] of tries) {
        const s = go(id, path);
        const r = play(s, target)!;
        expect(r.events, fail).toEqual([{ kind: 'fail', fail, on }]);
        expect([r.state.pos, r.state.gone, r.state.helps, r.state.tries, r.state.misses], fail).toEqual([s.pos, s.gone, s.helps, s.tries + 1, s.misses + 1]);
    }
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    expect(new Set(Object.values(thingAnimations)).size).toBe(fails.length);
    for (const name of [...Object.values(failAnimations), ...Object.values(thingAnimations)]) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
});

it(`after ${HELP_AFTER} funny tries the vehicle to touch shines until the next bus leaves; taking it costs one star, and only that`, () => {
    // Scene 8: two grey cars over the red bus.
    let s = start(8);
    expect(goodTap(s)).toBe('w'); expect(hint(s)).toEqual([]);
    s = play(s, 'r')!.state; s = play(s, COUR)!.state;
    expect([s.misses, s.tries, hint(s)]).toEqual([2, 2, []]);
    // A useful touch between funny tries does not hide the help that is coming.
    s = play(s, 'x')!.state; expect(s.misses).toBe(2);
    s = play(s, ARRET)!.state;
    const shining = hint(s); expect(shining).toHaveLength(1);
    let r = play(s, shining[0]!)!;
    expect(r.events[0]).toMatchObject({ helped: true });
    s = r.state; expect(s.helps).toBe(1); expect(hint(s)).toHaveLength(1);
    while (!s.finished) s = play(s, hint(s)[0]!)!.state;
    expect([s.finished, stars(s), s.misses]).toEqual([true, 2, 0]);
    expect(stars({ helps: 0 })).toBe(3); expect(stars({ helps: 3 })).toBe(2);
    // Another vehicle than the shining one is free of charge, and the help goes out when a bus leaves.
    let t = start(9); for (const x of [COUR, COUR, COUR]) t = play(t, x)!.state;
    expect(hint(t)).toEqual(['y']);
    expect(play(t, 'r')!.state.helps).toBe(0);
    r = play(play(t, 'y')!.state, 'r')!;
    expect(r.events.some(e => e.kind === 'part')).toBe(true); expect(r.state.misses).toBe(0);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedyPlayer(3).state;
    expect(complete({ 3: 2 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
    expect(play(won, 'r')).toBeNull();
});

it('readable at four: cells big, the stop, the yard and CaliRoux apart, every touch lands on what it shows', () => {
    // At 390 × 844 the board is about 340 px wide for 180 units: about 1.9 px a unit. A cell is 26 units (49 px) in the big
    // yard, 31 (59 px) in a yard of five, 36 (68 px) in a yard of four.
    expect([W, H]).toEqual([180, 300]);
    expect(colors.length).toBe(5);
    for (const l of levels) {
        const g = geometry(l), s = start(l.id);
        expect(g.cell, `scene ${l.id}`).toBeGreaterThanOrEqual(26);
        expect(g.x0, `scene ${l.id}`).toBeGreaterThanOrEqual(12); expect(g.x1).toBeLessThanOrEqual(W - 12);
        expect(g.y0 - 20, `scene ${l.id}: the top gates’ road below the stop`).toBeGreaterThanOrEqual(STOP.y1);
        expect(g.y1 + 2, `scene ${l.id}: the yard above CaliRoux`).toBeLessThanOrEqual(CALI.y0);
        expect(targets(s).length, `scene ${l.id}`).toBe(l.vehicles.length + l.cones.length + 3);
        for (const [i, v] of l.vehicles.entries()) for (let k = 0; k < v.len; k++) {
            const row = v.axis === 'v' ? s.pos[i]! + k : v.lane, col = v.axis === 'v' ? v.lane : s.pos[i]! + k;
            expect(touched(s, g.x0 + (col + .5) * g.cell, g.y0 + (row + .5) * g.cell), `scene ${l.id} ${v.id}`).toBe(v.id);
            expect(touched(s, g.x0 + col * g.cell + 1, g.y0 + row * g.cell + 1), `scene ${l.id} ${v.id}`).toBe(v.id);
        }
        l.cones.forEach((c, k) => expect(touched(s, g.x0 + (c.col + .5) * g.cell, g.y0 + (c.row + .5) * g.cell)).toBe(coneId(k)));
        expect(touched(s, 90, 30)).toBe(ARRET);
        expect(touched(s, (CALI.x0 + CALI.x1) / 2, (CALI.y0 + CALI.y1) / 2)).toBe(CALIROUX);
        expect(touched(s, 2, 150)).toBeNull();
    }
    // Scene 1: the empty yard is the pigeon’s; once the bus has gone, its cells are empty too.
    expect(touched(start(1), 20, 100)).toBe(COUR);
    const s = play(start(1), 'r')!.state;
    expect(touched(s, 66, 170)).toBe(COUR);
});

it('what CaliRoux says when a scene opens names the goal once: the gesture and the new thing never repeat it', async () => {
    const { instruction } = await import('../src/games/autobus/view');
    const goal = { fr: /emmène/gi, en: /send/gi };
    for (const l of levels) for (const locale of ['fr', 'en'] as const) {
        const words = instruction(l, locale), said = words.slice(1).join(' ');
        expect(said.match(goal[locale])?.length, `scene ${l.id} ${locale}: ${said}`).toBe(1);
        expect(new Set(words).size, `scene ${l.id} ${locale}`).toBe(words.length);
    }
});
