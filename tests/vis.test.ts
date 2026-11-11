import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { BAR, CHEST, COFFRE, colorsOf, complete, coversOf, depth, distance, EARLY, EARLY_SCREWS, fails, features, featuresOf, freeScrews, goodScrew, GRAND, H, HEAD, HELP_AFTER, hint, HIT, isUnlocked, JOUET, levelOf, levels, needs, overlaps, parse, parseRecords, PEST, PESTOUILLE, play, potBox, potId, problems, remaining, screwOf, start, stars, targets, TOY, toyBox, touched, W, type Fail, type LevelDef } from '../src/engines/vis';
import { greedyPlayer, randomPlayer } from '../src/engines/vis/solver';
import { failAnimations, thingAnimations } from '../src/games/vis/art';

/** A robot child touching at random anything that can be touched (the screws left, the plates still on, the pots, the toy,
 * the chest, Pestouille), 200 seeds per scene. Measured on the 32 scenes: median at most 24.5 touches (scene 29), worst game
 * 79 touches (scene 32). With the median bound at 24 the test fails (scene 29). */
const RANDOM_MEDIAN_MAX = 25;
const RANDOM_WORST_MAX = 150;
const scene = (l: LevelDef, specs: string[]): LevelDef => ({ ...l, ...parse(specs) });
const go = (id: number, path: string[]) => path.reduce((s, t) => play(s, t)!.state, start(id));

it('at least 30 scenes, numbered in order, each fair to a five-year-old, with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(overlaps(l), `scene ${l.id}`).toEqual([]);
        if (l.id < EARLY) expect(l.screws.length, `scene ${l.id}`).toBeLessThanOrEqual(EARLY_SCREWS);
    }
    for (const key of ['fr', 'en'] as const) expect(new Set(levels.map(l => l.title[key])).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    // The first scenes are tiny.
    expect(levels.slice(0, 2).map(l => l.screws.length)).toEqual([1, 2]);
    // What problems() catches: too many screws early, a plate with no screw, a screw out of its plate, a plate that half
    // covers a screw, two screws too close for a finger, a plate out of the toy.
    const one = levelOf(1);
    expect(problems(scene(one, ['p 20 100 60 140 : r 40 120', 'p 70 100 110 140 : b 90 120', 'p 120 100 160 140 : j 140 120', 'p 70 150 110 190 : v 90 170']))).toContain(`at most ${EARLY_SCREWS} screws before scene ${EARLY}`);
    expect(problems(scene(one, ['p 20 100 60 140 : r 100 120']))).toContain('a1: a screw inside its plate');
    expect(problems(scene(one, ['p 20 100 60 140 : r 40 120', 'b 60 100 60 180 : b 60 170']))).toContain('a1: b half covers it');
    expect(problems(scene(one, ['p 20 100 80 140 : r 40 120, r 60 120']))).toContain('a1 and a2: too close to touch');
    expect(problems(scene(one, ['b 0 100 60 100 : r 40 100']))).toContain('a: inside the toy');
    expect(() => parse(['p 20 100 60 140'])).toThrow();
});

it('every new thing comes alone in a scene before it is combined, and each comes back in at least two combinations', () => {
    const met = new Set<string>();
    for (const l of levels) {
        const fs = featuresOf(l), fresh = fs.filter(f => !met.has(f));
        expect(fresh.length, `scene ${l.id} brings in ${fresh.join(', ')}`).toBeLessThanOrEqual(1);
        if (fresh.length) { const f = fresh[0]!; expect(fs, `scene ${l.id} brings in ${f} alone`).toEqual(features.filter(x => x === f || (needs[f] ?? []).includes(x))); met.add(f); }
    }
    expect([...met].sort()).toEqual([...features].sort());
    for (const f of features) expect(levels.filter(l => featuresOf(l).includes(f) && featuresOf(l).length > 1 + (needs[f]?.length ?? 0)).length, f).toBeGreaterThanOrEqual(2);
    expect(featuresOf(levelOf(1))).toEqual([]); expect(featuresOf(levelOf(2))).toEqual([]);
    expect(levels.find(l => featuresOf(l).includes('grand'))!.screws.length).toBeGreaterThanOrEqual(GRAND);
});

it('two scenes always differ by at least MIN_GAP = 10 (10 measured, scenes 1 and 2)', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(10);
    const one = levelOf(1);
    expect(distance(one, one)).toBe(0);
    // The same door with a blue screw: two things differ, too close to count as another scene.
    expect(distance(one, scene(one, ['p 62 138 118 186 : b 90 162']))).toBe(2);
});

it('a scene always starts the same way and the same touches give the same game', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    expect(randomPlayer(30, 7).state).toEqual(randomPlayer(30, 7).state);
    const s = start(1);
    expect([s.out, s.fallen, s.moves, s.finished]).toEqual([[], [], 0, false]);
    expect(play(s, 'zz')).toBeNull(); expect(play(s, potId('b'))).toBeNull();
    expect(() => start(99)).toThrow();
});

it('every scene can be finished: the greedy player takes exactly one screw per touch', () => {
    for (const l of levels) {
        const g = greedyPlayer(l.id);
        expect(g.state.finished, `scene ${l.id}`).toBe(true);
        expect(g.moves, `scene ${l.id}`).toBe(l.screws.length);
        expect(g.state.fallen.sort(), `scene ${l.id}`).toEqual(l.plates.map(p => p.id).sort());
        expect([stars(g.state), g.state.tries]).toEqual([3, 0]);
    }
});

it(`a robot touching at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} touches over 200 seeds, never more than ${RANDOM_WORST_MAX}; never a dead end`, { timeout: 60_000 }, () => {
    let states = 0;
    const lost: string[] = [];
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, 1000, s => {
            states++;
            // Never a dead end: from every state the robot touches from, a screw can be taken out.
            if (!s.finished && freeScrews(s).length === 0) lost.push(`scene ${l.id} after ${s.out.join(',')}`);
        }));
        for (const r of runs) {
            expect(r.state.finished, `scene ${l.id}`).toBe(true);
            expect(r.moves, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX);
        }
        const n = runs.map(r => r.moves).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
    expect(lost.slice(0, 5)).toEqual([]);
    expect(states).toBeGreaterThan(50_000);
});

it('every funny try is reached, has its own animations, and changes nothing but the counters', () => {
    const seen = new Map<Fail, Set<number>>();
    for (const l of levels) for (let k = 0; k < 10; k++) randomPlayer(l.id, 50 + k, 1000, undefined, e => { if (e.kind === 'fail') { const set = seen.get(e.fail) ?? new Set<number>(); set.add(l.id); seen.set(e.fail, set); } });
    // The robot does not touch a screw on its way to the pot: the top is reached by hand below.
    expect([...seen.keys()].sort()).toEqual(fails.filter(f => f !== 'toupie').sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    // One of each: the screws, the plates and the stars stay as they were; only the counters move.
    const tries: [number, string[], string, Fail, string][] = [[3, [], 'a1', 'toc', 'b'], [2, ['a1'], 'a1', 'toupie', 'a1'], [2, [], potId('b'), 'rot', potId('b')], [1, [], JOUET, 'klaxon', JOUET], [1, [], COFFRE, 'ressort', COFFRE], [1, [], PESTOUILLE, 'chapeau', PESTOUILLE]];
    for (const [id, path, target, fail, on] of tries) {
        const s = go(id, path);
        const r = play(s, target)!;
        expect(r.events, fail).toEqual([{ kind: 'fail', fail, on }]);
        expect([r.state.out, r.state.fallen, r.state.helps, r.state.tries, r.state.misses], fail).toEqual([s.out, s.fallen, s.helps, s.tries + 1, s.misses + 1]);
    }
    // A plate whose screws are all covered knocks too; a plate still held gives its free screw.
    expect(play(start(3), 'a')!.events).toEqual([{ kind: 'fail', fail: 'toc', on: 'b' }]);
    expect(play(start(3), 'b')!.events[0]).toEqual({ kind: 'devisse', screw: 'b1', color: 'r', helped: false });
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    expect(new Set(Object.values(thingAnimations)).size).toBe(fails.length);
    for (const name of [...Object.values(failAnimations), ...Object.values(thingAnimations)]) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
});

it('a screw goes to the pot of its colour, a plate with no screw falls, the last screw ends the scene', () => {
    // Scene 3: the yellow screw is under the red bar.
    let s = start(3);
    expect(freeScrews(s)).toEqual(['b1']);
    expect(coversOf(levelOf(3), screwOf(levelOf(3), 'a1')).map(p => p.id)).toEqual(['b']);
    let r = play(s, 'b1')!;
    expect(r.events).toEqual([{ kind: 'devisse', screw: 'b1', color: 'r', helped: false }, { kind: 'tombe', plate: 'b' }]);
    s = r.state; expect(freeScrews(s)).toEqual(['a1']);
    r = play(s, 'a1')!;
    expect(r.events).toEqual([{ kind: 'devisse', screw: 'a1', color: 'j', helped: false }, { kind: 'tombe', plate: 'a' }, { kind: 'fini' }]);
    expect(play(r.state, 'a1')).toBeNull();
    // Scene 6: the boiler plate falls only when both its screws are out.
    s = play(start(6), 'a1')!.state; expect(s.fallen).toEqual([]);
    expect(play(s, 'a2')!.events).toContainEqual({ kind: 'tombe', plate: 'a' });
    // A pile three deep: each plate waits for the one above it.
    const l = levelOf(14);
    expect(levels.filter(x => x.screws.some(y => depth(x, y) >= 2)).length).toBeGreaterThanOrEqual(3);
    expect(l.screws.map(y => depth(l, y))).toEqual([2, 1, 0]);
});

it(`after ${HELP_AFTER} touches that take no screw out, the good screw shines; taking it costs one star, and only that`, () => {
    let s = start(3);
    expect(goodScrew(s)).toBe('b1'); expect(hint(s)).toEqual([]);
    s = play(s, 'a1')!.state; s = play(s, JOUET)!.state;
    expect([s.misses, s.tries, hint(s)]).toEqual([2, 2, []]);
    s = play(s, COFFRE)!.state;
    expect(hint(s)).toEqual(['b1']);
    const r = play(s, 'b1')!;
    expect(r.events[0]).toEqual({ kind: 'devisse', screw: 'b1', color: 'r', helped: true });
    s = r.state; expect([s.helps, s.misses, hint(s)]).toEqual([1, 0, []]);
    s = play(s, 'a1')!.state;
    expect([s.finished, stars(s)]).toEqual([true, 2]);
    expect(stars({ helps: 0 })).toBe(3); expect(stars({ helps: 3 })).toBe(2);
    // Another free screw than the shining one is free of charge.
    let t = start(2); for (const x of [JOUET, JOUET, JOUET]) t = play(t, x)!.state;
    const [shining] = hint(t), other = freeScrews(t).find(x => x !== shining)!;
    expect(play(t, other)!.state.helps).toBe(0);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedyPlayer(3).state;
    expect(complete({ 3: 2 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
    expect(play(won, 'a1')).toBeNull();
});

it('readable at five: screws big and apart, pots, chest and Pestouille apart, every touch lands on what it shows', () => {
    // At 390 × 844 the board is about 340 px wide for 180 units: about 1.9 px a unit. A screw head is 19 units (36 px), a
    // finger touches it within 28 units (53 px), a bar is 26 units wide (49 px).
    expect([2 * HEAD, 2 * HIT, 2 * BAR].every(v => v >= 19)).toBe(true); expect([W, H]).toEqual([180, 300]);
    for (const l of levels) {
        const s = start(l.id);
        expect(targets(s).length, `scene ${l.id}`).toBe(l.screws.length + l.plates.length + colorsOf(l).length + 3);
        for (const c of colorsOf(l)) { const b = potBox(l, c); expect(b.x0, `scene ${l.id}`).toBeGreaterThanOrEqual(4); expect(b.x1).toBeLessThanOrEqual(W - 4); expect(touched(s, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2)).toBe(potId(c)); expect(b.x1 - b.x0).toBeGreaterThanOrEqual(24); }
        for (const x of l.screws) {
            // On the head, and at its rim: that screw.
            expect(touched(s, x.x, x.y), `scene ${l.id} ${x.id}`).toBe(x.id);
            expect(touched(s, x.x + HIT - 1, x.y), `scene ${l.id} ${x.id}`).toBe(x.id);
            expect(x.y - HIT).toBeGreaterThanOrEqual(TOY.y0); expect(x.y + HIT).toBeLessThanOrEqual(TOY.y1 + 4);
        }
        expect(touched(s, (CHEST.x0 + CHEST.x1) / 2, (CHEST.y0 + CHEST.y1) / 2)).toBe(COFFRE);
        expect(touched(s, (PEST.x0 + PEST.x1) / 2, (PEST.y0 + PEST.y1) / 2)).toBe(PESTOUILLE);
        expect(toyBox[l.toy].y1).toBeLessThanOrEqual(TOY.y1);
    }
    // Scene 6: a finger on the boiler plate, near its right screw; a screw on its way to the pot is touched again.
    expect(touched(start(6), 80, 182)).toBe('a2');
    const flying = play(start(6), 'a2')!.state;
    expect(touched(flying, 84, 162)).toBe('a1'); expect(touched(flying, 84, 162, ['a2'])).toBe('a2');
    expect(play(flying, 'a2')!.events[0]).toEqual({ kind: 'fail', fail: 'toupie', on: 'a2' });
    // Once its screw is out, a plate's place is the toy again (scene 1: the door, then the car).
    const s = play(start(1), 'a1')!.state;
    expect(remaining(s)).toEqual([]); expect(touched(s, 90, 170)).toBe(JOUET);
});

it('what Pestouille says when a scene opens names the goal once: the gesture and the new thing never repeat it', async () => {
    const { instruction } = await import('../src/games/vis/view');
    const goal = { fr: /dévisse/gi, en: /unscrew/gi };
    for (const l of levels) for (const locale of ['fr', 'en'] as const) {
        const words = instruction(l, locale), said = words.slice(1).join(' ');
        expect(said.match(goal[locale])?.length, `scene ${l.id} ${locale}: ${said}`).toBe(1);
        expect(new Set(words).size, `scene ${l.id} ${locale}`).toBe(words.length);
    }
});
