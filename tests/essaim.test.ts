import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { advance, arrival, complete, distance, EARLY, EARLY_GOALS, fails, features, featuresOf, goalCount, GLIDE, helpLanes, HOLE_ROWS, isUnlocked, LANES, lapOf, levelOf, levels, MIN_GAP, nextGoal, parseRecords, problems, ROW, rowsOf, stars, start, tick, touch, TRIES_BEFORE_HELP, type Event, type Fail, type Feature, type State } from '../src/engines/essaim';
import { greedyPlayer, idle, randomPlayer } from '../src/engines/essaim/solver';
import { failAnimations, thingAnimations } from '../src/games/essaim/art';

/** A robot child that waits a random while (up to one turn of the sky) and touches a random lane, the edges included, 200
 * seeds per scene; every touch counts. Measured on the 32 scenes: median at most 18.5 touches (scene 15), worst game 95
 * touches (scene 27), at most 2 580 ticks of sky (scene 27, under 11 minutes). The bounds are the ones asked for a
 * five-year-old and fail as soon as a scene gets longer. */
const RANDOM_MEDIAN_MAX = 25;
const RANDOM_WORST_MAX = 150;
const RANDOM_TICKS_MAX = 3000;
/** A robot child that touches nothing for long periods (waits up to eight turns of the sky between touches). Measured: at
 * most 764 ticks; nobody touching at all: at most 244 ticks (scene 32, about a minute). */
const IDLE_TICKS_MAX = 1000;
const NOBODY_TICKS_MAX = 300;
/** The greedy player (the lane of the next goal). Measured: 8 touches at most (scenes 18 and 22). */
const GREEDY_MAX = 10;

const at = (k: number): number => arrival(k);
/** The sky runs to the arrival of row k, the rocket heading for `lane` from the start. */
const go = (s: State, lane: number, k: number): { state: State; events: Event[] } => { const r = touch(s, { lane, at: s.t })!; const a = advance(r.state, at(k)); return { state: a.state, events: [...r.events, ...a.events] }; };

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
        if (l.id < EARLY) {
            expect(goalCount(l), `scene ${l.id}`).toBeLessThanOrEqual(EARLY_GOALS);
            for (const row of l.sky) expect(row.replace(/\./g, '').length, `scene ${l.id}`).toBeLessThanOrEqual(1);
        }
    }
    for (const key of ['fr', 'en'] as const) expect(new Set(levels.map(l => l.title[key])).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    const one = levelOf(1);
    expect(problems({ ...one, sky: [...one.sky.slice(1), '*.*..'] })).toContain(`one thing per row at most before scene ${EARLY}`);
    expect(problems({ ...one, sky: ['*****', '**...'] })).toContain(`at most ${EARLY_GOALS} goals before scene ${EARLY}`);
    expect(problems({ ...levelOf(20), sky: ['..P..', '.*.*.', '.....', '.....', '..*..'] })).toContain('a friend for the gate');
    expect(problems({ ...levelOf(20), sky: ['<.*..', '.....', '.....', '..*..', '.....'] })).toContain('a carpet never pushes against the edge');
    expect(problems({ ...levelOf(20), sky: ['..*..', '.....', '..*..', '..@..', '.....'] })).toContain('row 1: goals hidden behind a black hole');
    expect(problems({ ...one, sky: ['..x..', ...one.sky.slice(1)] })).toContain('known things');
});

it('every new thing comes alone in a scene before it is combined (the gate with a friend), and all come back in combinations', () => {
    const met = new Set<Feature>();
    for (const l of levels) {
        const fs = featuresOf(l), fresh = fs.filter(f => !met.has(f));
        expect(fresh.length, `scene ${l.id} brings in ${fresh.join(', ')}`).toBeLessThanOrEqual(1);
        if (fresh.length) {
            const f = fresh[0]!;
            expect(fs.filter(x => x !== f && !(f === 'porte' && x === 'ami')), `scene ${l.id} brings in ${f} alone`).toEqual([]);
            met.add(f);
        }
    }
    expect([...met].sort()).toEqual([...features].sort());
    for (const f of features) expect(levels.filter(l => featuresOf(l).includes(f) && featuresOf(l).filter(x => x !== 'ami' || f === 'ami').length > 1).length, f).toBeGreaterThanOrEqual(1);
    for (const id of [1, 2, 3]) expect(featuresOf(levelOf(id))).toEqual([]);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    const one = levelOf(1);
    expect(distance(one, one)).toBe(0);
    expect(distance(one, { ...one, sky: ['.*...', ...one.sky.slice(1)] })).toBe(2);
    expect(distance(one, { ...one, sky: ['o....', ...one.sky.slice(1)] })).toBe(4);
});

it('a scene always starts the same way, and the same gestures give the same sky; a gesture is (lane, instant)', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    expect(randomPlayer(32, 7).state).toEqual(randomPlayer(32, 7).state);
    // Scene 1: the far star on the left (row 7) is picked up when the rocket heads there in time (the magnet takes it from
    // lane 1), not when it is too late.
    const s = start(1);
    expect(advance(touch(s, { lane: 0, at: at(6) })!.state, at(7)).state.goals[3]!.got).toBe(true);
    expect(advance(touch(s, { lane: 0, at: at(7) })!.state, at(7)).state.goals[3]!.got).toBe(false);
    expect(touch(s, { lane: 0, at: -1 })).toBeNull(); expect(touch({ ...s, t: 5 }, { lane: 0, at: 4 })).toBeNull();
    expect(touch(s, { lane: LANES + 1, at: 0 })).toBeNull(); expect(touch(s, { lane: 1.5, at: 0 })).toBeNull();
});

it(`every scene can be finished: the greedy player does it in at most ${GREEDY_MAX} gestures`, () => {
    let longest = 0;
    for (const l of levels) {
        const g = greedyPlayer(l.id);
        expect(g.state.finished, `scene ${l.id}`).toBe(true);
        longest = Math.max(longest, g.gestures);
    }
    expect(longest).toBeLessThanOrEqual(GREEDY_MAX);
});

it(`a robot touching a random lane at a random instant finishes every scene: median at most ${RANDOM_MEDIAN_MAX} gestures over 200 seeds, never more than ${RANDOM_WORST_MAX}, within ${RANDOM_TICKS_MAX} ticks; what is missed always comes back`, { timeout: 60_000 }, () => {
    let states = 0;
    const lost: string[] = [];
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, 1000, 1, (s, r) => {
            states++;
            // Never a dead end: every goal missed is still there to pick up on the next turn of the sky.
            for (const e of r.events) if (e.kind === 'miss') { const g = r.state.goals[e.goal]!; if (g.got || Math.abs(e.to - e.from) > 1) lost.push(`scene ${l.id}: goal ${e.goal}`); }
            if (!r.state.finished && !nextGoal(r.state)) lost.push(`scene ${l.id}: nothing left to pick up at ${r.state.t}`);
        }));
        for (const r of runs) {
            expect(r.state.finished, `scene ${l.id}`).toBe(true);
            expect(r.gestures, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX);
            expect(r.state.t, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_TICKS_MAX);
        }
        const n = runs.map(r => r.gestures).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
    expect(lost.slice(0, 5)).toEqual([]);
    expect(states).toBeGreaterThan(50_000);
});

it(`a robot that touches nothing for long periods finishes every scene within ${IDLE_TICKS_MAX} ticks, and nobody touching at all within ${NOBODY_TICKS_MAX}`, { timeout: 60_000 }, () => {
    for (const l of levels) {
        for (let k = 0; k < 200; k++) {
            const r = randomPlayer(l.id, 5000 + k, 1000, 8);
            expect(r.state.finished, `scene ${l.id}`).toBe(true);
            expect(r.state.t, `scene ${l.id}`).toBeLessThanOrEqual(IDLE_TICKS_MAX);
        }
        const z = idle(l.id);
        expect(z.finished, `scene ${l.id}`).toBe(true); expect(z.t, `scene ${l.id}`).toBeLessThanOrEqual(NOBODY_TICKS_MAX);
        expect(z.touches).toBe(0);
    }
});

it('every funny try is reached in some scene, has its own animation, and a try changes nothing but the counters', () => {
    const seen = new Map<Fail, Set<number>>(), changed: string[] = [];
    const mark = (f: Fail, id: number): void => { const set = seen.get(f) ?? new Set<number>(); set.add(id); seen.set(f, set); };
    for (const l of levels) for (let k = 0; k < 10; k++) {
        randomPlayer(l.id, 50 + k, 1000, 1, (_, r) => { for (const e of r.events) if (e.kind === 'fail') mark(e.fail, l.id); });
        // Tick by tick, so that each funny try is checked against the tick that made it.
        let s = start(l.id);
        for (let n = 0; n < 4000 && !s.finished; n++) {
            if (n % 23 === 0) s = touch(s, { lane: (n * 7 + k) % LANES, at: s.t })!.state;
            const step = tick(s);
            if (step.events.some(e => e.kind === 'fail') && !step.events.some(x => x.kind === 'got' || x.kind === 'tapis' || x.kind === 'trou')) {
                const keep = (x: State): string => JSON.stringify([x.goals.map(g => g.got), x.train, x.hidden, x.touches, x.helps]);
                if (keep(s) !== keep(step.state) || step.state.pos !== s.pos + Math.sign(2 * s.target - s.pos) || step.state.target !== s.target || step.state.tries !== s.tries + 1) changed.push(`scene ${l.id}`);
            }
            s = step.state;
        }
    }
    expect(changed).toEqual([]);
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    expect(new Set(Object.values(thingAnimations)).size).toBe(fails.length);
    for (const name of [...Object.values(failAnimations), ...Object.values(thingAnimations)]) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
});

it('the rocket glides lane by lane, picks up stars (its magnet takes the next lane too) and friends, who line up behind it', () => {
    // From lane 2 to lane 0: two lanes, GLIDE ticks each.
    let s = touch(start(1), { lane: 0, at: 0 })!.state;
    for (let k = 0; k < 2 * GLIDE; k++) s = tick(s).state;
    expect(s.pos).toBe(0);
    // Scene 1: the three stars straight ahead come by themselves.
    const one = advance(start(1), at(4)).state;
    expect(one.goals.map(g => g.got)).toEqual([true, true, true, false]);
    // The magnet: a star one lane away is picked up, two lanes away it is missed.
    expect(go(start(2), 1, 1).state.goals[0]!.got).toBe(true);
    expect(go(start(2), 2, 1).state.goals[0]!.got).toBe(false);
    // Scene 4: the little rocket needs its own lane, then follows Boubou.
    const four = levelOf(4), friendRow = rowsOf(four).findIndex(r => r.includes('F'));
    expect(go(start(4), 2, friendRow).state.train).toEqual([]);
    expect(go(start(4), 3, friendRow).state.train).toEqual(['F']);
});

it('the gate opens only with a friend, the carpets push, the black hole lets the rocket out further on, friends hug, the edge bounces', () => {
    // Scene 15: the gate (row 6) bounces the rocket without a friend, and opens with the little rocket behind it.
    const gate = go(start(15), 2, 6);
    expect(gate.events.some(e => e.kind === 'fail' && e.fail === 'porte')).toBe(true); expect(gate.state.goals.find(g => g.kind === 'P')!.got).toBe(false);
    let s = go(start(15), 3, 2).state; expect(s.train).toEqual(['F']);
    s = go(s, 2, 6).state; expect(s.goals.find(g => g.kind === 'P')!.got).toBe(true);
    // Scene 13: the carpet in lane 2 (row 2) pushes the rocket to lane 3; the slide (rows 5 to 7) brings it to lane 0.
    const slide = advance(start(13), at(7)).state;
    expect(slide.pos).toBe(0); expect(slide.target).toBe(0);
    expect(advance(start(13), at(8)).state.finished).toBe(true);
    // Scene 17: the black hole (row 2) hides the rocket for HOLE_ROWS rows: nothing is met under it.
    const hole = advance(start(17), at(2));
    expect(hole.events.some(e => e.kind === 'trou')).toBe(true); expect(hole.state.hidden).toBe(HOLE_ROWS);
    expect(advance(hole.state, at(2 + HOLE_ROWS)).state.hidden).toBe(0);
    // Scene 4: the little rocket picked up, the next turn of the sky passes its place again: it comes for a hug.
    const four = levelOf(4), j = rowsOf(four).findIndex(r => r.includes('F'));
    const got = go(start(4), 3, j).state;
    const hug = advance(got, at(j + lapOf(four)));
    expect(hug.events.some(e => e.kind === 'fail' && e.fail === 'calin')).toBe(true);
    // A touch beyond the edge: the rocket goes to the edge lane and bounces.
    const edge = touch(start(1), { lane: -1, at: 0 })!;
    expect(edge.fail).toBe('bord'); expect(edge.state.target).toBe(0); expect(edge.state.tries).toBe(1); expect(edge.state.touches).toBe(1);
    expect(touch(start(1), { lane: LANES, at: 0 })!.state.target).toBe(LANES - 1);
});

it(`a goal missed ${TRIES_BEFORE_HELP} times makes its lane shine and comes one lane nearer each time after; picking it up then costs a star`, () => {
    // Scene 2: the rocket stays in lane 4; the first star (lane 0, row 1) is missed turn after turn, and so is the third.
    const l = levelOf(2), lap = lapOf(l);
    let s = touch(start(2), { lane: 4, at: 0 })!.state;
    for (let turn = 0; turn < TRIES_BEFORE_HELP; turn++) { expect(helpLanes(s), `turn ${turn}`).toEqual([]); s = advance(s, at(1 + turn * lap)).state; }
    expect(s.goals[0]!.misses).toBe(TRIES_BEFORE_HELP); expect(s.goals[0]!.lane).toBe(1);
    expect(helpLanes(s)).toContainEqual({ goal: 0, lane: 1 });
    s = advance(s, at(1 + TRIES_BEFORE_HELP * lap)).state; expect(s.goals[0]!.lane).toBe(2);
    s = advance(s, at(1 + (TRIES_BEFORE_HELP + 1) * lap)).state; expect(s.goals[0]!.lane).toBe(3);
    // One lane from the rocket: the magnet takes it, helped; the third star the same way.
    s = advance(s, at(1 + (TRIES_BEFORE_HELP + 2) * lap)).state;
    expect(s.goals[0]!.got).toBe(true); expect(s.helps).toBe(1); expect(stars(s)).toBe(2);
    s = advance(s, at(5 + (TRIES_BEFORE_HELP + 2) * lap)).state;
    expect(s.finished).toBe(true); expect(s.helps).toBe(2); expect(stars(s)).toBe(1); expect(helpLanes(s)).toEqual([]);
    expect(stars({ ...s, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...s, helps: 3 })).toBe(1);
    expect(ROW).toBeGreaterThanOrEqual(GLIDE);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedyPlayer(3).state;
    expect(won.finished).toBe(true);
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
    expect(touch(won, { lane: 0, at: won.t })).toBeNull();
});
