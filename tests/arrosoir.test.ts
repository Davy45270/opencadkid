import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { ACTION_SHARE, actionTop, BASE, BIG_SPLASH, canAt, FLOWER_H, HEIGHT, overlaps, cloudAt, complete, distance, DRY_HELP, features, fire, flight, grid, groundAt, has, helpOn, hint, isUnlocked, launch, levelOf, levels, MIN_GAP, misses, parseRecords, PHASES, problems, quantize, reach, SPLASH, start, stars, usefulShots, type Miss, type Result, type State } from '../src/engines/arrosoir';
import { childPlayer, greedyPlayer, randomPlayer } from '../src/engines/arrosoir/solver';
import { missAnimations } from '../src/games/arrosoir/art';

/** The greedy player (the help's good pull every time) opens every scene in 4 balloons at most (measured: 4, scene 25 and
 * its five flowers), never more than one balloon per flower. */
const GREEDY_MAX = 4;
/** A robot pulling blindly (angle 0–180°, power 10–100 %, uniform), 200 seeds per scene: medians measured at 31 balloons at
 * most (scenes 19 and 25), longest game 159 (scene 15). The cap only stops a game that would never end. */
const RANDOM_MEDIAN_MAX = 60;
const RANDOM_WORST_MAX = 400;
/** A robot child who corrects half the gap with a shaky hand: medians measured at 8 balloons at most (scenes 19 and 25),
 * longest game 14 (scenes 16, 25 and 32). */
const CHILD_MEDIAN_MAX = 10;
const CHILD_WORST_MAX = 30;
const median = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return (s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2; };

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with its own title in both languages and its own strong moment', { timeout: 60_000 }, () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
    }
    for (const key of [(l: typeof levels[number]) => l.title.fr, (l: typeof levels[number]) => l.title.en, (l: typeof levels[number]) => l.moment]) expect(new Set(levels.map(key)).size).toBe(levels.length);
});

it('problems() sees an unfair scene', () => {
    const one = levelOf(1);
    expect(problems({ ...one, features: ['vent'] })).toContain('vent where the scene says so');
    expect(problems({ ...one, flowers: [70, 78] }).join()).toMatch(/flowers apart/);
    expect(problems({ ...one, flowers: [30] }).join()).toMatch(/CaliRoux and flower 30 apart/);
    expect(problems({ ...one, flowers: [60, 80, 100, 120, 140] })).toContain('four flowers at most before scene 8');
    // A flower walled in by a tower nobody can throw over.
    expect(problems({ ...one, flowers: [150], mesas: [{ x0: 128, x1: 140, h: 200 }] }).join()).toMatch(/some pull waters it/);
});

it('nothing in a scene covers anything else: flowers, CaliRoux, apple trees, the cow, the can, the pond and the sand stay half a flower apart', () => {
    for (const l of levels) expect(overlaps(l), `scene ${l.id}`).toEqual([]);
    const one = levelOf(1);
    // A cow on a flower, a flower in the sand, an apple tree's crown over a flower, two flowers one on the other: all seen.
    expect(overlaps({ ...one, flowers: [120], cows: [126] })).toEqual(['flower 120 and cow 126 apart']);
    expect(overlaps({ ...one, flowers: [120], sand: [{ x0: 128, x1: 150 }] })).toEqual(['flower 120 and sand 128 apart']);
    expect(overlaps({ ...one, flowers: [120], trees: [{ x: 142, h: 40 }] })).toEqual(['flower 120 and crown 142 apart']);
    expect(overlaps({ ...one, flowers: [120, 138] })).toEqual(['flower 120 and flower 138 apart']);
    // High enough, a crown does not hide the flower under it; a bouquet stands tight without overlapping.
    expect(overlaps({ ...one, flowers: [120], trees: [{ x: 142, h: 60 }] })).toEqual([]);
    expect(overlaps({ ...one, flowers: [100, 120, 140] })).toEqual([]);
});

it(`the action fills at least ${ACTION_SHARE * 100} % of the board's height in every scene: CaliRoux throws from up high over a tiered meadow`, () => {
    for (const l of levels) expect((BASE - actionTop(l)) / HEIGHT, `scene ${l.id}`).toBeGreaterThanOrEqual(ACTION_SHARE);
    // A flat meadow with CaliRoux on a little hill fails.
    expect((BASE - actionTop({ ...levelOf(1), caliroux: { x: 34, h: 16 } })) / HEIGHT).toBeLessThan(ACTION_SHARE);
});

it('every new thing comes alone before it is combined, and comes back in at least two combinations; at most four flowers before scene 8', () => {
    const met = new Set<string>();
    for (const l of levels) {
        for (const f of l.features) if (!met.has(f)) { expect(l.features, `scene ${l.id} brings in ${f}`).toEqual([f]); met.add(f); }
        if (l.features.length > 1) for (const f of l.features) expect(levels.some(o => o.id < l.id && o.features.length === 1 && o.features[0] === f), `scene ${l.id}: ${f}`).toBe(true);
        if (l.id < 8) expect(l.flowers.length, `scene ${l.id}`).toBeLessThanOrEqual(4);
    }
    expect([...met].sort()).toEqual([...features].sort());
    for (const f of features) expect(levels.filter(l => l.features.length > 1 && l.features.includes(f)).length, f).toBeGreaterThanOrEqual(2);
    expect(levels.slice(0, 3).every(l => l.features.length === 0)).toBe(true);
    // The dotted line shows the whole flight in the first scenes, then shorter and shorter, never longer again.
    const dots = levels.map(l => l.dots);
    expect(dots.slice(0, 13).every(d => d === 1)).toBe(true);
    for (let i = 1; i < dots.length; i++) if (i >= 14) expect(dots[i]!, `scene ${i + 1}`).toBeLessThanOrEqual(dots[i - 1]!);
    expect(Math.min(...dots)).toBeLessThanOrEqual(0.3);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    const one = levelOf(1);
    expect(distance(one, { ...one })).toBe(0);
    expect(distance(one, { ...one, wind: 1, features: ['vent'] })).toBe(5);
    // Two scenes too alike fail.
    expect(distance(one, { ...one, flowers: [72] })).toBeLessThan(MIN_GAP);
});

it('a scene always starts the same way; a flight is a pure function of the angle, the power and the wind', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    expect(quantize({ angle: 44.6, power: 120 })).toEqual({ angle: 45, power: 100 });
    expect(quantize({ angle: -12, power: 2 })).toEqual({ angle: 0, power: 10 });
    expect(flight(levelOf(5), { angle: 45, power: 60 }, null)).toEqual(flight(levelOf(5), { angle: 45.2, power: 60.3 }, null));
    expect(randomPlayer(30, 7).state).toEqual(randomPlayer(30, 7).state);
    expect(childPlayer(24, 3).state).toEqual(childPlayer(24, 3).state);
    // Stronger goes further, the wind pushes, the balloon leaves the sling.
    const one = levelOf(1), calm = { ...one, flowers: [] }, far = (p: number, l = calm): number => flight(l, { angle: 45, power: p }, null).impact.x;
    expect(far(30)).toBeLessThan(far(40)); expect(far(40)).toBeLessThan(far(50));
    expect(far(40, { ...calm, wind: 1 })).toBeGreaterThan(far(40) + 5);
    expect(far(40, { ...calm, wind: -1 })).toBeLessThan(far(40) - 5);
    expect(flight(one, { angle: 45, power: 60 }, null).points[0]).toEqual(launch(one));
});

it(`the greedy player opens every scene within ${GREEDY_MAX} balloons, never more than one balloon per flower`, () => {
    let most = 0;
    for (const l of levels) {
        const g = greedyPlayer(start(l.id));
        expect(g.stuck, `scene ${l.id}`).toBe(false);
        expect(g.state.finished, `scene ${l.id}`).toBe(true);
        expect(g.state.tries, `scene ${l.id}`).toBe(0);
        expect(g.shots, `scene ${l.id}`).toBeLessThanOrEqual(Math.min(GREEDY_MAX, l.flowers.length));
        most = Math.max(most, g.shots);
    }
    expect(most).toBeLessThanOrEqual(GREEDY_MAX);
});

it(`a robot pulling blindly finishes every scene on 200 seeds, median at most ${RANDOM_MEDIAN_MAX}, and never meets a dead end (every state of its first 20 seeds checked)`, { timeout: 60_000 }, () => {
    const medians: number[] = [], worst: number[] = [];
    let states = 0;
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, RANDOM_WORST_MAX * 4, (r: Result, before: State) => {
            if (k < 20) { states++; expect(usefulShots(before), `scene ${l.id} turn ${before.turn}`).toBeGreaterThan(0); }
            void r;
        }));
        for (const r of runs) expect(r.state.finished, `scene ${l.id}`).toBe(true);
        const shots = runs.map(r => r.shots);
        medians.push(median(shots)); worst.push(Math.max(...shots));
        expect(median(shots), `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
        expect(Math.max(...shots), `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX);
    }
    expect(states).toBeGreaterThan(5000);
    expect(Math.max(...medians)).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    expect(Math.max(...worst)).toBeLessThanOrEqual(RANDOM_WORST_MAX);
});

it(`a robot child who corrects half the gap finishes every scene with a median of at most ${CHILD_MEDIAN_MAX} balloons`, () => {
    for (const l of levels) {
        const shots = Array.from({ length: 200 }, (_, k) => { const r = childPlayer(l.id, 1000 + k); expect(r.state.finished, `scene ${l.id}`).toBe(true); return r.shots; });
        expect(median(shots), `scene ${l.id}`).toBeLessThanOrEqual(CHILD_MEDIAN_MAX);
        expect(Math.max(...shots), `scene ${l.id}`).toBeLessThanOrEqual(CHILD_WORST_MAX);
    }
});

it('every funny try is met in some scene, has its own animation, and changes nothing but the counters', () => {
    const seen = new Map<Miss, Set<number>>();
    for (const l of levels) for (const seed of [1, 2, 3, 4]) {
        randomPlayer(l.id, seed, 400, (r, before) => {
            if (!r.miss) return;
            if (!seen.has(r.miss)) seen.set(r.miss, new Set());
            seen.get(r.miss)!.add(l.id);
            const s = r.state;
            expect([s.open, s.big, s.finished, s.dry, s.tries, s.helps, s.turn], `scene ${l.id} ${r.miss}`).toEqual([before.open, before.big, false, before.dry + 1, before.tries + 1, before.helps, before.turn + 1]);
        });
    }
    expect([...seen.keys()].sort()).toEqual([...misses].sort());
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(missAnimations)).size).toBe(misses.length);
    for (const m of misses) {
        expect(css, m).toContain(`@keyframes ${missAnimations[m]}{`);
        expect(css, m).toContain(`.${missAnimations[m]}{animation:${missAnimations[m]} `);
    }
});

it('each funny try where it belongs: the cow, the pond, the apple tree, too short, far away, the cloud, the sand, the grass, a kiss', () => {
    const missOf = (id: number, angle: number, power: number, s: State = start(id)): Miss | null => fire(s, { angle, power }).miss;
    const find = (id: number, want: Miss, s: State = start(id)): { angle: number; power: number } | null => {
        for (let angle = 0; angle <= 180; angle++) for (let power = 10; power <= 100; power += 3) if (missOf(id, angle, power, s) === want) return { angle, power };
        return null;
    };
    expect(find(8, 'vache')).not.toBeNull(); expect(find(9, 'etang')).not.toBeNull(); expect(find(7, 'arbre')).not.toBeNull();
    expect(find(11, 'nuage')).not.toBeNull(); expect(find(10, 'mare')).not.toBeNull();
    expect(missOf(1, 90, 60)).toBe('court'); expect(missOf(1, 45, 100)).toBe('loin'); expect(missOf(1, 170, 60)).toBe('loin');
    expect(find(1, 'pousse')).not.toBeNull(); expect(find(1, 'vache')).toBeNull();
    // A kiss: the near flower is open already, a balloon falls on it again.
    const two = start(2), near = hint({ ...two, open: [false, true] })!, opened = fire(two, near).state;
    expect(opened.open).toEqual([true, false]);
    expect(fire(opened, near).miss).toBe('bisou');
    // The traces stay cosmetic: a puddle in the sand, a tuft on the grass.
    const sand = find(10, 'mare')!;
    expect(fire(start(10), sand).state.puddles).toHaveLength(1);
});

it('the splash: a flower drinks within half a flower plus the margin of its stem, never further; the giant can makes it big', () => {
    // On flat ground, far from CaliRoux's slope.
    const one = { ...levelOf(1), flowers: [120] }, fx = 120, g = groundAt(one, fx);
    expect(reach(one, { x: fx + SPLASH, y: g }, fx)).toBe(SPLASH);
    expect(reach(one, { x: fx, y: g - 60 }, fx)).toBeCloseTo(60 - FLOWER_H);
    // Grid shots that land just inside or outside the splash.
    const gr = grid(one, 0);
    let inside = 0, outside = 0;
    gr.shots.forEach((shot, k) => {
        const { impact } = flight(one, shot, null);
        if (impact.kind !== 'sol') return;
        const d = Math.abs(impact.x - fx);
        if (d <= SPLASH) { inside++; expect(gr.small[k], `${shot.angle}° ${shot.power}%`).toBe(1); }
        if (d > SPLASH + 0.5) { outside++; expect(gr.small[k]).toBe(0); }
    });
    expect(inside).toBeGreaterThan(50); expect(outside).toBeGreaterThan(1000);
    // Scene 13: splash the giant can, then the balloons are big.
    const s13 = start(13), c = canAt(levelOf(13))!;
    let hitCan: Result | null = null;
    for (let angle = 20; angle <= 80 && !hitCan; angle++) for (let power = 10; power <= 100 && !hitCan; power++) { const r = fire(s13, { angle, power }); if (r.bonus && !r.drank.length) hitCan = r; }
    expect(hitCan).not.toBeNull();
    expect(hitCan!.state.big).toBe(true); expect(hitCan!.miss).toBeNull(); expect(hitCan!.state.dry).toBe(0);
    expect(Math.hypot(hitCan!.impact.x - c.x, hitCan!.impact.y - c.y)).toBeLessThanOrEqual(SPLASH);
    expect(BIG_SPLASH).toBeGreaterThan(SPLASH * 1.5);
    // Only a bouquet drinks three flowers at once.
    for (const l of levels) if (!has(l, 'groupe')) for (let p = 0; p < (l.cloud ? PHASES : 1); p++) expect(Math.max(...Array.from(grid(l, p).small, m => m.toString(2).replace(/0/g, '').length)), `scene ${l.id}`).toBeLessThanOrEqual(2);
});

it('the cloud passes one notch after each balloon and comes round again', () => {
    const l = levelOf(11), xs = Array.from({ length: PHASES + 1 }, (_, t) => cloudAt(l, t)!.x);
    expect(new Set(xs.slice(0, PHASES)).size).toBe(PHASES); expect(xs[PHASES]).toBe(xs[0]);
    expect(cloudAt(levelOf(1), 3)).toBeNull();
    let s = start(11);
    s = fire(s, { angle: 90, power: 50 }).state;
    expect(s.turn).toBe(1); expect(cloudAt(l, s.turn)!.x).toBe(cloudAt(l, 0)!.x + 20);
});

it(`after ${DRY_HELP} balloons that water nothing the help shows the good pull; watering with it costs a star`, () => {
    let s = start(3);
    for (let k = 0; k < DRY_HELP; k++) { expect(helpOn(s)).toBe(false); s = fire(s, { angle: 90, power: 50 }).state; }
    expect(helpOn(s)).toBe(true);
    const h = hint(s)!;
    const r = fire(s, h);
    expect(r.drank.length).toBeGreaterThan(0); expect(r.helped).toBe(true); expect(r.state.dry).toBe(0); expect(helpOn(r.state)).toBe(false);
    const done = greedyPlayer(r.state).state;
    expect(done.finished).toBe(true); expect(done.helps).toBe(1); expect(stars(done)).toBe(2);
    expect(stars({ ...done, helps: 0 })).toBe(3); expect(stars({ ...done, helps: 3 })).toBe(1);
    // Without the help, no star is lost however many funny tries.
    let t = start(1);
    for (let k = 0; k < 2; k++) t = fire(t, { angle: 90, power: 50 }).state;
    t = greedyPlayer(t).state;
    expect(t.tries).toBe(2); expect(stars(t)).toBe(3);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedyPlayer(start(3)).state;
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
