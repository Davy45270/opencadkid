import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { advance, canDrift, choicesLeft, choose, complete, distance, drift, EARLY, EARLY_FORKS, EXIT, fails, features, featuresOf, forks, goodRoads, hint, HELP_AFTER, isUnlocked, levelOf, levels, MIN_GAP, ONE_WAY, openRoads, parseRecords, problems, roll, screenOf, signOf, spotOf, START, starWindow, stars, start, stretchTicks, tick, type Fail, type Feature, type LevelDef, type Spot, type State } from '../src/engines/derapage';
import { greedyPlayer, randomPlayer } from '../src/engines/derapage/solver';
import { failAnimations, thingAnimations } from '../src/games/derapage/art';
import { ARROW, boxesOf, H, kartAt, overlaps, STOP } from '../src/games/derapage/geometry';

/** A robot child touching one of the arrows at random at every fork (and « Dérape ! » one time in two), 200 seeds per scene.
 * Measured on the 32 scenes: median at most 8 choices (scenes 21, 30 and 32), worst game 38 choices (scene 27), at most
 * 2 164 ticks of road (scene 27, about 3 minutes 15 at 90 ms a tick). The median bound is the one asked for a five-year-old;
 * all three fail as soon as a scene gets longer. */
const RANDOM_MEDIAN_MAX = 10;
const RANDOM_WORST_MAX = 50;
const RANDOM_TICKS_MAX = 3000;

const fork = (l: LevelDef, id: string): Extract<Spot, { kind: 'fourche' }> => spotOf(l, id) as Extract<Spot, { kind: 'fourche' }>;
/** Rolls to the fork, then picks road i there. */
const pick = (s: State, i: number): State => { const r = roll(s).state; return choose(r, r.spot, i)!.state; };

it('at least 30 scenes, numbered in order, each fair to a five-year-old, with its own title, friend, gift and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.title.fr.length && l.title.en.length && l.moment.length && l.deliver.length, `scene ${l.id}`).toBeTruthy();
        if (l.id < EARLY) expect(forks(l).length, `scene ${l.id}`).toBeLessThanOrEqual(EARLY_FORKS);
    }
    for (const key of ['fr', 'en'] as const) expect(new Set(levels.map(l => l.title[key])).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    const one = levelOf(1), three = levelOf(3), many = levelOf(19);
    expect(problems({ ...many, id: 5 })).toContain(`at most ${EARLY_FORKS} forks before scene ${EARLY}`);
    expect(problems({ ...one, spots: { ...one.spots, a: { ...fork(one, 'a'), to: ['ours', ONE_WAY] } } })).toContain('a: two roads to pick at least');
    expect(problems({ ...one, spots: { ...one.spots, boue: { kind: 'drole', road: one.spots.boue!.road, fail: 'boue', then: 'ours' } } })).toContain('boue: a funny try goes back to a fork');
    expect(problems({ ...one, spots: { ...one.spots, a: { ...fork(one, 'a'), to: ['boue', 'boue'] } } })).toContain('a: two roads to the same spot');
    // A fork whose only way on loops between funny tries: the friend can never be reached.
    expect(problems({ ...three, spots: { ...three.spots, b: { ...fork(three, 'b'), to: ['ours', 'foin'] } } })).toContain('hibou is never reached');
    expect(problems({ ...one, spots: { ...one.spots, a: { ...fork(one, 'a'), road: { shape: 'droit', star: true, deco: null } } } })).toContain('a: a starred bend needs a bend');
});

it('every new thing comes alone in a scene before it is combined, and each comes back in a combination', () => {
    const met = new Set<Feature>();
    for (const l of levels) {
        const fs = featuresOf(l), fresh = fs.filter(f => !met.has(f));
        expect(fresh.length, `scene ${l.id} brings in ${fresh.join(', ')}`).toBeLessThanOrEqual(1);
        if (fresh.length) { expect(fs, `scene ${l.id} brings in ${fresh[0]} alone`).toEqual(fresh); met.add(fresh[0]!); }
    }
    expect([...met].sort()).toEqual([...features].sort());
    for (const f of features) expect(levels.filter(l => featuresOf(l).includes(f) && featuresOf(l).length > 1).length, f).toBeGreaterThanOrEqual(2);
    for (const id of [1, 2]) expect(featuresOf(levelOf(id))).toEqual([]);
});

it(`two scenes always differ by at least MIN_GAP = ${MIN_GAP}`, () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    const one = levelOf(1);
    expect(distance(one, one)).toBe(0);
    // The same scene with another funny try: two things differ.
    expect(distance(one, { ...one, spots: { ...one.spots, boue: { ...one.spots.boue!, fail: 'foin' } as Spot } })).toBe(2);
});

it('a scene always starts the same way and the same gestures give the same road; a gesture is a choice (fork, road) or a drift (instant)', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    expect(randomPlayer(32, 7).state).toEqual(randomPlayer(32, 7).state);
    const s = start(1);
    // The kart rolls by itself, slowly and at a constant speed, up to the fork, and waits there.
    expect(s.d).toBe(EXIT); expect(screenOf(s)).toBe(START);
    const at = roll(s).state;
    expect(at.waiting).toBe(true); expect(at.t).toBe(stretchTicks(spotOf(levelOf(1), START).road) - EXIT);
    expect(tick(at).state).toBe(at); expect(advance(at, at.t + 100).state).toBe(at);
    // A choice is only for the fork the kart waits at, a road that exists, and never the one-way road.
    expect(choose(s, START, 0)).toBeNull(); expect(choose(at, 'b', 0)).toBeNull(); expect(choose(at, START, 2)).toBeNull(); expect(choose(at, START, .5)).toBeNull();
    const nine = roll(start(9)).state;
    expect(fork(levelOf(9), 'a').to[1]).toBe(ONE_WAY); expect(choose(nine, 'a', 1)).toBeNull(); expect(openRoads(fork(levelOf(9), 'a'))).toEqual([0, 2]);
    expect(drift(s, -1)).toBeNull(); expect(drift({ ...s, t: 5 }, 4)).toBeNull();
    // The screen left stays shown while the kart drives out of it.
    const out = choose(at, START, 0)!.state;
    expect(screenOf(out)).toBe(START); expect(screenOf(advance(out, out.t + EXIT).state)).toBe('ours');
});

it('every scene can be finished: the greedy player does it in exactly the fewest choices written in levels.ts', () => {
    for (const l of levels) {
        const g = greedyPlayer(l.id);
        expect(g.state.finished, `scene ${l.id}`).toBe(true);
        expect([g.choices, choicesLeft(l, START, l.deliver)], `scene ${l.id}`).toEqual([l.best, l.best]);
        expect(g.state.delivered.sort(), `scene ${l.id}`).toEqual([...l.deliver].sort());
        expect(stars(g.state)).toBe(3);
    }
});

it(`a robot picking roads at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} choices over 200 seeds, never more than ${RANDOM_WORST_MAX}, within ${RANDOM_TICKS_MAX} ticks; never a dead end`, { timeout: 60_000 }, () => {
    let states = 0;
    const lost: string[] = [];
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, 1000, s => {
            states++;
            // Never a dead end: from every fork the robot waits at, every parcel can still be delivered.
            if (choicesLeft(l, s.spot, s.pending) === Infinity || goodRoads(s).length === 0) lost.push(`scene ${l.id} at ${s.spot}`);
        }));
        for (const r of runs) {
            expect(r.state.finished, `scene ${l.id}`).toBe(true);
            expect(r.choices, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX);
            expect(r.state.t, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_TICKS_MAX);
        }
        const n = runs.map(r => r.choices).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
    expect(lost.slice(0, 5)).toEqual([]);
    expect(states).toBeGreaterThan(20_000);
});

it('the drift never changes the end of a scene: with and without drifts, the same deliveries at the same instants', () => {
    let starred = 0;
    for (const l of levels) {
        const plain = greedyPlayer(l.id, false).state, drifting = greedyPlayer(l.id, true).state;
        const keep = (s: State): unknown => [s.finished, s.delivered, s.choices, s.t, s.tries, s.helps];
        expect(keep(drifting), `scene ${l.id}`).toEqual(keep(plain));
        expect(plain.bonus).toBe(0);
        if (Object.values(l.spots).some(sp => sp.road.star)) { starred++; expect(drifting.bonus, `scene ${l.id}`).toBeGreaterThan(0); }
        else expect(drifting.bonus, `scene ${l.id}`).toBe(0);
        for (let seed = 0; seed < 5; seed++) expect(randomPlayer(l.id, seed).state.delivered.length, `scene ${l.id}`).toBe(l.deliver.length);
    }
    expect(starred).toBeGreaterThanOrEqual(6);
    // Scene 4: the starred bend; one drift per bend, only inside it.
    const s = start(4), w = starWindow(spotOf(levelOf(4), START).road)!;
    expect(canDrift(s)).toBe(false);
    const before = drift(s, s.t + (w[0] - s.d) - 1)!; expect(before.drifted).toBe(false);
    const inBend = drift(before.state, before.state.t + 1)!; expect(inBend.drifted).toBe(true); expect(inBend.state.bonus).toBe(1);
    expect(drift(inBend.state, inBend.state.t)!.drifted).toBe(false);
    expect(drift(s, s.t + (w[1] - s.d))!.drifted).toBe(false);
});

it('every funny try is reached in some scene, has its own animations, sends the kart back to a fork and changes nothing but the counters', () => {
    const seen = new Map<Fail, Set<number>>(), changed: string[] = [];
    let checked = 0;
    for (const l of levels) for (let k = 0; k < 20; k++) randomPlayer(l.id, 50 + k, 1000, undefined, e => { if (e.kind === 'fail') { const set = seen.get(e.fail) ?? new Set<number>(); set.add(l.id); seen.set(e.fail, set); } });
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    for (const l of levels) for (const id of forks(l)) for (const i of openRoads(fork(l, id))) {
        // From the first time the kart can wait at this fork, take road i: a funny try only adds to the counters.
        let s = start(l.id);
        for (let n = 0; n < 6 && !(s.waiting && s.spot === id); n++) { s = roll(s).state; if (!s.finished && s.spot !== id) s = choose(s, s.spot, goodRoads(s)[0]!)!.state; }
        if (!(s.waiting && s.spot === id)) continue;
        const r = choose(s, id, i)!.state, after = advance(r, r.t + stretchTicks(spotOf(l, r.spot).road));
        const f = after.events.find(e => e.kind === 'fail');
        if (!f) continue;
        checked++;
        const keep = (x: State): string => JSON.stringify([x.pending, x.delivered, x.choices, x.helps, x.bonus, x.finished]);
        if (keep(after.state) !== keep(r) || after.state.tries !== r.tries + 1 || spotOf(l, after.state.spot).kind !== 'fourche' || after.state.from?.road !== -1) changed.push(`scene ${l.id} ${id}/${i}`);
    }
    expect(changed).toEqual([]);
    expect(checked).toBeGreaterThan(40);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    expect(new Set(Object.values(thingAnimations)).size).toBe(fails.length);
    for (const name of [...Object.values(failAnimations), ...Object.values(thingAnimations)]) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
});

it(`after ${HELP_AFTER} wrong roads in a scene the good arrow shines; taking it costs one star, and only that`, () => {
    // Scene 3: fork a (b or the hay), fork b (the owl or the bear).
    let s = roll(start(3)).state;
    expect(goodRoads(s)).toEqual([0]); expect(hint(s)).toEqual([]);
    s = pick(s, 1); // the hay: boing, back to a
    expect(s.wrong).toBe(1); expect(roll(s).state.spot).toBe('a');
    s = pick(s, 0); // b, the good road
    s = pick(s, 1); // the bear: « it's not for me! », back to b
    s = roll(s).state;
    expect(s.wrong).toBe(HELP_AFTER); expect(hint(s)).toEqual([0]);
    s = choose(s, 'b', 0)!.state; s = roll(s).state;
    expect(s.finished).toBe(true); expect(s.helps).toBe(1); expect(stars(s)).toBe(2);
    expect(s.tries).toBe(2); expect(stars({ helps: 0 })).toBe(3); expect(stars({ helps: 4 })).toBe(2);
    // Two parcels in the same scene, any order: both roads of scene 6 are good at first; the friend served then says thank you.
    let six = roll(start(6)).state;
    expect(goodRoads(six)).toEqual([0, 1]);
    six = pick(six, 0); six = roll(six).state;
    expect(six.delivered).toEqual(['ours']); expect(goodRoads(six)).toEqual([1]);
    const again = advance(choose(six, 'a', 0)!.state, Infinity);
    expect(again.events).toContainEqual({ kind: 'fail', spot: 'ours', fail: 'mauvais', who: 'ours', again: true });
});

it('signs show where each road leads, two or three pictures at most', () => {
    expect(signOf(levelOf(1), 'a', 0)).toEqual([{ kind: 'ami', who: 'ours' }]);
    expect(signOf(levelOf(3), 'a', 0)).toEqual([{ kind: 'ami', who: 'hibou' }, { kind: 'ami', who: 'ours' }]);
    expect(signOf(levelOf(19), 'a', 0).length).toBe(3);
    for (const l of levels) for (const id of forks(l)) fork(l, id).to.forEach((to, i) => { if (to !== ONE_WAY) expect(signOf(l, id, i).length, `scene ${l.id} ${id}/${i}`).toBeGreaterThan(0); });
});

it('on every screen of every scene nothing covers anything else, and the action fills at least 60 % of the board’s height', () => {
    const found: string[] = [];
    let least = 1;
    for (const l of levels) for (const [id, sp] of Object.entries(l.spots)) {
        for (const o of overlaps(sp)) found.push(`scene ${l.id} ${id}: ${o}`);
        const boxes = boxesOf(sp), share = (Math.max(...boxes.map(b => b.y1)) - Math.min(...boxes.map(b => b.y0))) / H;
        least = Math.min(least, share);
    }
    expect(found).toEqual([]);
    expect(least).toBeGreaterThanOrEqual(.6);
    expect(ARROW).toBeGreaterThanOrEqual(34);
    // The kart stops at the same place on every screen, straight, facing the fork.
    for (const l of levels) { const s = roll(start(l.id)).state, p = kartAt(s); expect([Math.round(p.x), Math.round(p.y), Math.round(p.angle) + 0]).toEqual([STOP.x, STOP.y, 0]); }
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedyPlayer(3).state;
    expect(complete({ 3: 2 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
    expect(choose(won, won.spot, 0)).toBeNull(); expect(drift(won, won.t)).toBeNull();
});
