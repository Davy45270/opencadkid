import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { birdAt, cloudsOf, complete, cycleOf, distance, dropsAt, EARLY_CLOUDS, fails, FALL, features, featuresOf, funnies, helpOn, hint, isUnlocked, levelOf, levels, MIN_GAP, nextGood, offsetAt, parseRecords, problems, RAIN_PERIOD, REST, stars, start, STEP, throwHeart, TRIES_BEFORE_HELP, type Feature, type Funny, type State } from '../src/engines/orbite';
import { greedyPlayer, randomPlayer } from '../src/engines/orbite/solver';
import { failAnimations, thingAnimations } from '../src/games/orbite/art';

/** A robot child that waits a random while (up to one turn of the sky) and touches a random column, 200 seeds per scene;
 * every touch counts, the drops on Lumi included. Measured on the 32 scenes: median at most 24 touches (scene 24, helmets
 * hidden behind helmets in the wind), worst game 93 touches (scene 19). The bounds are the ones asked for a five-year-old and
 * fail as soon as a scene gets longer. */
const RANDOM_MEDIAN_MAX = 25;
const RANDOM_WORST_MAX = 120;
/** The greedy player (the help's column at the first good moment). Measured: 8 touches at most (scenes 24 and 26). */
const GREEDY_MAX = 10;

/** Plays throws from the start of a scene, each at the sky's tick. */
const play = (id: number, ...cols: number[]): State => { let s = start(id); for (const col of cols) s = throwHeart(s, { col, at: s.t })!.state; return s; };
const grumpy = (s: State): number => s.troop.join('').replace(/[.s]/g, '').length;

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.cols, `scene ${l.id}`).toBeLessThanOrEqual(6);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
        if (l.id < 8) expect(cloudsOf(l), `scene ${l.id}`).toBeLessThanOrEqual(EARLY_CLOUDS);
    }
    for (const key of ['fr', 'en'] as const) expect(new Set(levels.map(l => l.title[key])).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    // A seventh column, a grumpy cloud behind a smiling one, a cloud under a rain cloud, rain or wind in a turn by turn
    // scene, a cloud out of the wind's reach, too many clouds early are refused.
    const one = levelOf(1);
    expect(problems({ ...one, cols: 7 })).toContain('five or six columns');
    expect(problems({ ...one, troop: ['n.n', 'sns'] })).toContain('column 0: a grumpy cloud behind a smiling one');
    expect(problems({ ...one, troop: ['ngn', 'nnn'] })).toContain('column 1: a rain cloud with a cloud under it');
    expect(problems({ ...levelOf(4), troop: ['ngn'] })).toContain('no rain in a turn by turn scene');
    expect(problems({ ...levelOf(4), wind: 1 })).toContain('no wind in a turn by turn scene');
    expect(problems({ ...levelOf(18), x: 0 })).toContain('every cloud within the wind’s reach');
    expect(problems({ ...one, troop: ['nnn', 'nnn', 'n.n'] })).toContain(`at most ${EARLY_CLOUDS} clouds before scene 8`);
    expect(problems({ ...one, troop: ['sss'] })).toContain('a grumpy cloud');
});

it('every new thing comes alone in a scene before it is combined, and all of them come back in combinations', () => {
    const met = new Set<Feature>();
    for (const l of levels) {
        const fs = featuresOf(l);
        for (const f of fs) if (!met.has(f)) { expect(fs, `scene ${l.id} brings in ${f} alone`).toEqual([f]); met.add(f); }
    }
    expect([...met].sort()).toEqual([...features].sort());
    for (const f of features) expect(levels.filter(l => featuresOf(l).includes(f) && featuresOf(l).length > 1).length, f).toBeGreaterThanOrEqual(1);
    // The first three scenes: still clouds only.
    for (const id of [1, 2, 3]) expect(featuresOf(levelOf(id))).toEqual([]);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    // The distance counts a changed place, a column more, a new thing, another way of moving.
    const one = levelOf(1);
    expect(distance(one, one)).toBe(0);
    expect(distance(one, { ...one, troop: ['nn.'] })).toBe(1);
    expect(distance(one, { ...one, cols: 6 })).toBe(2);
    expect(distance(one, { ...one, troop: ['ncn'] })).toBe(4);
    expect(distance(one, { ...one, move: 'pas' })).toBe(5);
});

it('a scene always starts the same way, and the same touches give the same sky', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    const a = randomPlayer(32, 7), b = randomPlayer(32, 7);
    expect(a.state).toEqual(b.state);
    // A throw is (column, instant): the same at another instant can do something else.
    const s = start(6);
    expect(throwHeart(s, { col: 0, at: 0 })!.useful).toBe(true);
    expect(throwHeart(s, { col: 0, at: STEP })!.useful).toBe(false);
    expect(throwHeart(s, { col: 0, at: -1 })).toBeNull(); expect(throwHeart({ ...s, t: 5 }, { col: 0, at: 4 })).toBeNull();
    expect(throwHeart(s, { col: 6, at: 0 })).toBeNull();
});

it(`every scene can be finished: the greedy player does it in at most ${GREEDY_MAX} touches`, () => {
    let longest = 0;
    for (const l of levels) {
        const g = greedyPlayer(l.id, 500);
        expect(g.state.finished, `scene ${l.id}`).toBe(true);
        longest = Math.max(longest, g.throws);
    }
    expect(longest).toBeLessThanOrEqual(GREEDY_MAX);
});

it(`a robot touching a random column at a random instant finishes every scene: median at most ${RANDOM_MEDIAN_MAX} touches over 200 seeds, never more than ${RANDOM_WORST_MAX}; a good moment always comes`, { timeout: 60_000 }, () => {
    let states = 0;
    const stuck: string[] = [];
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, 1000, s => {
            states++;
            // Never a dead end: within one turn of the sky, some column makes a cloud smile or blush.
            if (!nextGood(s)) stuck.push(`scene ${l.id}: ${s.troop.join('/')} at ${s.t}`);
        }));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.throws, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const n = runs.map(r => r.throws).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
    expect(stuck.slice(0, 5)).toEqual([]);
    expect(states).toBeGreaterThan(50_000);
});

it('every funny try is reached in some scene, has its own animation, and a try changes nothing but the counters', () => {
    const seen = new Map<Funny, Set<number>>(), changed: string[] = [];
    for (const l of levels) for (let k = 0; k < 10; k++) randomPlayer(l.id, 50 + k, 1000, (s, r) => {
        const kind: Funny | null = r.fail ?? (r.blushed ? 'rougit' : null);
        if (kind) { const set = seen.get(kind) ?? new Set<number>(); set.add(l.id); seen.set(kind, set); }
        if (r.fail) {
            const moved = l.move === 'pas' && r.fail !== 'pluie' ? 1 : 0, wet = r.fail === 'pluie';
            const want = { ...s, t: r.throw.at, steps: s.steps + moved, lumi: r.throw.col, touches: s.touches + 1, hearts: s.hearts + (wet ? 0 : 1), tries: s.tries + 1, dry: s.dry + 1 };
            if (JSON.stringify(r.state) !== JSON.stringify(want)) changed.push(`scene ${l.id} ${r.fail}`);
        }
    });
    expect(changed).toEqual([]);
    expect([...seen.keys()].sort()).toEqual([...funnies].sort());
    expect(funnies.length).toBeGreaterThanOrEqual(6);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(funnies.length);
    expect(new Set(Object.values(thingAnimations)).size).toBe(funnies.length);
    for (const name of [...Object.values(failAnimations), ...Object.values(thingAnimations)]) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
    expect(fails).not.toContain('rougit');
});

it('a heart makes the lowest cloud of its column smile; the Moon, the gaps, the helmet, the rainbow, the kiss', () => {
    // Scene 1: three clouds over columns 1 to 3 of five.
    const s = start(1);
    const hit = throwHeart(s, { col: 2, at: 0 })!;
    expect(hit.smiled).toEqual([{ r: 0, j: 1, kind: 'n' }]); expect(hit.state.troop).toEqual(['n.n']); expect(hit.useful).toBe(true);
    expect(throwHeart(s, { col: 0, at: 0 })!.fail).toBe('lune');
    // Inside the troop, through the gap a smile left: between two clouds.
    expect(throwHeart(hit.state, { col: 2, at: 0 })!.fail).toBe('entre');
    expect(play(1, 1, 2, 3).finished).toBe(true);
    // Scene 14: the little clouds hide behind the big ones: the lowest smiles first.
    const hide = play(14, 1);
    expect(hide.troop).toEqual(['n.n', '.nn']); expect(play(14, 1, 1).troop).toEqual(['..n', '.nn']);
    // Scene 8: the helmet blushes at the first heart, smiles at the second.
    const blush = throwHeart(start(8), { col: 3, at: 0 })!;
    expect(blush.blushed).toEqual({ r: 0, j: 1, kind: 'c' }); expect(blush.useful).toBe(true); expect(blush.state.troop).toEqual(['nrn']);
    expect(play(8, 3, 3).troop).toEqual(['n.n']);
    // Scene 16: the rainbow cloud makes its two neighbours smile.
    const rainbow = throwHeart(start(16), { col: 2, at: 0 })!;
    expect(rainbow.smiled.length).toBe(3); expect(rainbow.state.troop).toEqual(['n...n']);
    // Scene 20: a heart on a cloud that already smiles gets a kiss.
    expect(throwHeart(start(20), { col: 2, at: 0 })!.fail).toBe('bisou');
    expect(grumpy(play(20, 1, 3))).toBe(0); expect(play(20, 1, 3).finished).toBe(true);
});

it('the troop steps after each heart or swings by itself; the bird flies; the wind pushes; the drops fall', () => {
    // Scene 4: a step after each heart, there and back.
    expect([0, 1, 2, 3, 4, 5].map(k => offsetAt(levelOf(4), k, 0))).toEqual([0, 1, 2, 1, 0, 1]);
    expect(play(4, 4).steps).toBe(1);
    // Scene 6: a swing of one column every STEP ticks, gliding in quarters after REST ticks.
    const six = levelOf(6);
    expect(offsetAt(six, 0, REST - 1)).toBe(0); expect(offsetAt(six, 0, REST)).toBe(.25); expect(offsetAt(six, 0, STEP)).toBe(1);
    expect(cycleOf(six)).toBe(6 * STEP);
    // While it glides between two columns, the heart passes between two clouds.
    expect(throwHeart(start(6), { col: 1, at: STEP - 2 })!.fail).toBe('entre');
    // Scene 10: the bird crosses under the troop: a heart on it makes it loop.
    const ten = levelOf(10), at = Array.from({ length: 80 }, (_, t) => t).find(t => birdAt(ten, t) === 2)!;
    expect(throwHeart({ ...start(10), t: at }, { col: 2, at })!.fail).toBe('oiseau');
    expect(throwHeart({ ...start(10), t: at }, { col: 3, at })!.useful).toBe(true);
    // Scene 18: the wind pushes every heart one column to the right; from the last column, it bonks the edge.
    const wind = throwHeart(start(18), { col: 1, at: 0 })!;
    expect(wind.x).toBe(2); expect(wind.smiled.length).toBe(1);
    expect(throwHeart(start(18), { col: 5, at: 0 })!.fail).toBe('bord');
    // Scene 12: the rain cloud lets a drop go every RAIN_PERIOD ticks; while it falls, Lumi under it opens her umbrella.
    const twelve = levelOf(12), s = start(12);
    expect(dropsAt(twelve, s, 0)).toEqual([]);
    expect(dropsAt(twelve, s, 3)).toEqual([{ x: 4, r: 0, j: 1, fall: 3 }]);
    const wet = throwHeart({ ...s, t: 3 }, { col: 4, at: 3 })!;
    expect(wet.fail).toBe('pluie'); expect(wet.state.hearts).toBe(0); expect(wet.state.touches).toBe(1);
    expect(throwHeart(s, { col: 4, at: FALL + 1 })!.useful).toBe(true);
    expect(throwHeart(s, { col: 4, at: RAIN_PERIOD + 1 })!.fail).toBe('pluie');
});

it('three touches that make no cloud smile make the good column shine; taking it costs one star', () => {
    let s = start(1);
    for (let k = 0; k < TRIES_BEFORE_HELP; k++) { expect(helpOn(s), `touch ${k}`).toBe(false); s = throwHeart(s, { col: 0, at: s.t })!.state; }
    expect(s.dry).toBe(TRIES_BEFORE_HELP); expect(helpOn(s)).toBe(true);
    const c = hint(s, s.t)!, helped = throwHeart(s, { col: c, at: s.t })!;
    expect(helped.useful).toBe(true); expect(helped.helped).toBe(true); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    expect(helped.state.dry).toBe(0);
    // A throw elsewhere while the help shines does not use it.
    expect(throwHeart(s, { col: c === 1 ? 3 : 1, at: s.t })!.helped).toBe(false);
    // The good column is always useful, in every scene, at the first good moment.
    for (const l of levels) { const st = start(l.id), g = nextGood(st)!; expect(throwHeart(st, { col: g.col, at: g.at })!.useful, `scene ${l.id}`).toBe(true); }
    expect(stars({ ...helped.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...helped.state, helps: 2 })).toBe(1);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedyPlayer(3).state;
    expect(won.finished).toBe(true);
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
    expect(throwHeart(won, { col: 0, at: won.t })).toBeNull();
});
