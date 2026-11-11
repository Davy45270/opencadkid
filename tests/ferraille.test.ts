import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { allPlats, boubouAt, BODY, complete, distance, EARLY, EARLY_PARTS, fails, features, featuresOf, FLOOR, goodTargets, H, HELP_AFTER, hint, hitBox, isUnlocked, levelOf, levels, lift, liftY, LIFT, MIN_GAP, overlaps, parseRecords, partsOf, plat, platOf, play, problems, reachable, robotBox, ROBOT, start, stars, THICK, touched, touchesLeft, W, type Fail, type LevelDef, type State } from '../src/engines/ferraille';
import { greedyPlayer, randomPlayer } from '../src/engines/ferraille/solver';
import { failAnimations, thingAnimations } from '../src/games/ferraille/art';

/** A robot child touching any platform shown or the robot at random, at a random instant, 200 seeds per scene. Measured on
 * the 32 scenes: median at most 23 touches (scenes 17, 24 and 29), worst game 148 touches (scene 29), at most 4 670 ticks
 * (scene 29, about 7 minutes 47 at 100 ms a tick). The median bound is the one asked for a five-year-old; with it at 22 the
 * test fails (scene 17 first). */
const RANDOM_MEDIAN_MAX = 25;
const RANDOM_WORST_MAX = 150;
const RANDOM_TICKS_MAX = 5000;
/** Touches `target` as soon as Boubou is free (waiting for the lift when it must), and returns the state once landed. */
function go(s: State, target: string): State {
    for (let w = 0; w < LIFT; w++) { const r = play(s, { target, at: s.busy + w }); if (r && (r.events[0]!.kind !== 'move' || !r.events.some(e => e.kind === 'fail') || w === LIFT - 1)) return r.state; }
    return play(s, { target, at: s.busy })!.state;
}
const scene = (l: LevelDef, plats: string[]): LevelDef => ({ ...l, plats: plats.map(plat) });

it('at least 30 scenes, numbered in order, each fair to a five-year-old, with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        if (l.id < EARLY) expect(partsOf(l).length, `scene ${l.id}`).toBeLessThanOrEqual(EARLY_PARTS);
    }
    for (const key of ['fr', 'en'] as const) expect(new Set(levels.map(l => l.title[key])).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    // What problems() catches: too many parts early, a crate in the air, a covered robot, a scene that cannot be finished,
    // a dead end (a belt that throws Boubou where nothing leads back while a part is left).
    const one = levelOf(1);
    expect(problems(scene(one, ['a:c1 0-1 *b', 'b:c1 1-2 *b', 'c:c1 2-3 *b', 'd:e2 0-1 *g']))).toContain(`at most ${EARLY_PARTS} parts before scene ${EARLY}`);
    expect(problems(scene(one, ['a:c2 0-2 *b']))).toContain('a: a crate stands on something');
    expect(problems(scene(one, ['a:e1 4-6 *b'])).some(p => p.includes('covers robot'))).toBe(true);
    expect(problems(scene(one, ['a:e3 0-2 *b']))).toContain('cannot be finished');
    expect(problems(scene(levelOf(6), ['a:c1 0-2', 'c:e2 0-1', 't:t3 0-2 >b', 'b:e3 4-6 *g', 'd:e2 1-2 *b'])).some(p => p.startsWith('a dead end'))).toBe(true);
});

it('every new thing comes alone in a scene before it is combined, and each comes back in at least two combinations', () => {
    const met = new Set<string>();
    for (const l of levels) {
        const fs = featuresOf(l), fresh = fs.filter(f => !met.has(f));
        expect(fresh.length, `scene ${l.id} brings in ${fresh.join(', ')}`).toBeLessThanOrEqual(1);
        if (fresh.length) { expect(fs, `scene ${l.id} brings in ${fresh[0]} alone`).toEqual(fresh); met.add(fresh[0]!); }
    }
    expect([...met].sort()).toEqual([...features].sort());
    for (const f of features) expect(levels.filter(l => featuresOf(l).includes(f) && featuresOf(l).length > 1).length, f).toBeGreaterThanOrEqual(2);
    for (const id of [1, 2, 3]) expect(featuresOf(levelOf(id))).toEqual([]);
});

it(`two scenes always differ by at least MIN_GAP = ${MIN_GAP}`, () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    const one = levelOf(1);
    expect(distance(one, one)).toBe(0);
    // The same scene with a gear instead of the bolt: two things differ, too close to count as another scene.
    const other = scene(one, ['a:c1 1-3', 'b:e2 0-2', 'c:e3 1-3 *g']);
    expect(distance(one, other)).toBe(2); expect(distance(one, other)).toBeLessThan(MIN_GAP);
});

it('a scene always starts the same way and the same gestures give the same game; a gesture is (what is touched, instant)', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    expect(randomPlayer(30, 7).state).toEqual(randomPlayer(30, 7).state);
    const s = start(1);
    expect([s.at, s.carried, s.moves, s.finished]).toEqual(['sol', [], 0, false]);
    // Nothing happens for an unknown target, the floor, a past instant, or while Boubou is still in the air.
    expect(play(s, { target: 'zz', at: 0 })).toBeNull(); expect(play(s, { target: 'sol', at: 0 })).toBeNull(); expect(play(s, { target: 'a', at: .5 })).toBeNull();
    const r = play(s, { target: 'a', at: 3 })!;
    expect(r.events[0]).toEqual({ kind: 'move', how: 'saut', target: 'a', good: true, helped: false });
    expect(play(r.state, { target: 'b', at: 2 })).toBeNull(); expect(play(r.state, { target: 'b', at: r.state.busy - 1 })).toBeNull();
    // Boubou flies in an arc above the line from the floor to the crate, and stands there once landed.
    const mid = boubouAt(r.state, 3 + 4), from = { x: 105, y: FLOOR }, to = { x: 60, y: platOf(levelOf(1), 'a').y };
    expect(mid.y).toBeLessThan(Math.min(from.y, to.y)); expect(boubouAt(r.state, r.state.busy)).toEqual(to);
    expect(play(r.state, { target: 'a', at: r.state.busy })).toBeNull();
});

it('every scene can be finished: the greedy player does it in exactly the fewest touches written in levels.ts', () => {
    for (const l of levels) {
        const g = greedyPlayer(l.id);
        expect(g.state.finished, `scene ${l.id}`).toBe(true);
        expect([g.moves, touchesLeft(start(l.id))], `scene ${l.id}`).toEqual([l.best, l.best]);
        expect(g.state.delivered.sort(), `scene ${l.id}`).toEqual(partsOf(l).map(p => p.id).sort());
        expect([stars(g.state), g.state.tries]).toEqual([3, 0]);
    }
});

it(`a robot touching at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} touches over 200 seeds, never more than ${RANDOM_WORST_MAX}, within ${RANDOM_TICKS_MAX} ticks; never a dead end`, { timeout: 60_000 }, () => {
    let states = 0;
    const lost: string[] = [];
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, 1000, s => {
            states++;
            // Never a dead end: from every state the robot touches from, every part and the end can still be reached.
            if (touchesLeft(s) === Infinity || goodTargets(s).length === 0) lost.push(`scene ${l.id} at ${s.at}`);
        }));
        for (const r of runs) {
            expect(r.state.finished, `scene ${l.id}`).toBe(true);
            expect(r.moves, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX);
            expect(r.state.busy, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_TICKS_MAX);
        }
        const n = runs.map(r => r.moves).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
    expect(lost.slice(0, 5)).toEqual([]);
    expect(states).toBeGreaterThan(50_000);
});

it('every funny try is reached in some scene, has its own animations, and changes nothing but the counters (the balls aside, Boubou stays home)', () => {
    const seen = new Map<Fail, Set<number>>();
    for (const l of levels) for (let k = 0; k < 20; k++) randomPlayer(l.id, 50 + k, 1000, undefined, e => { if (e.kind === 'fail') { const set = seen.get(e.fail) ?? new Set<number>(); set.add(l.id); seen.set(e.fail, set); } });
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    // One of each, from the start of a scene: Boubou keeps his place and his parts; only the counters move.
    const tries: [number, string[], string, Fail][] = [[2, [], 'b', 'bong'], [1, [], ROBOT, 'eternue'], [4, [], 'd', 'canard'], [11, ['a', 'b'], 'c', 'coussin'], [25, ['a', 'b', 't'], 't', 'surplace'], [5, [], 'k', 'balles']];
    for (const [id, path, target, fail] of tries) {
        let s = start(id); for (const p of path) s = go(s, p);
        const r = play(s, { target, at: s.busy })!;
        expect(r.events.find(e => e.kind === 'fail'), fail).toEqual({ kind: 'fail', fail });
        expect([r.state.at, r.state.carried, r.state.delivered, r.state.tries, r.state.finished], fail).toEqual([fail === 'balles' ? 'k' : s.at, s.carried, s.delivered, s.tries + 1, false]);
        expect(r.state.busy - r.state.t, fail).toBeGreaterThanOrEqual(12);
    }
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    expect(new Set(Object.values(thingAnimations)).size).toBe(fails.length);
    for (const name of [...Object.values(failAnimations), ...Object.values(thingAnimations)]) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
});

it(`after ${HELP_AFTER} touches that bring nothing nearer, the good platform shines; taking it costs one star, and only that`, () => {
    // Scene 2: the crate, then the shelf with the gear, then the shelf with the bolt.
    let s = start(2);
    expect(goodTargets(s)).toEqual(['a']); expect(hint(s)).toEqual([]);
    s = go(s, 'b'); s = go(s, ROBOT); // bong, atchoum
    expect([s.wrong, s.tries, hint(s)]).toEqual([2, 2, []]);
    s = go(s, 'a'); s = go(s, ROBOT); // the crate (good), atchoum
    expect(s.wrong).toBe(HELP_AFTER); expect(hint(s)).toEqual(['b']);
    s = go(s, 'b'); expect([s.carried, s.helps, s.finished]).toEqual([['b'], 1, false]);
    s = go(s, 'c');
    expect(s.finished).toBe(true); expect(s.helps).toBe(2); expect(stars(s)).toBe(2);
    expect(stars({ helps: 0 })).toBe(3); expect(stars({ helps: 3 })).toBe(2);
});

it('the trampoline sends Boubou three rows up, the belt carries him over a gap, the ladder climbs, the button brings the bridge out', () => {
    let s = go(start(4), 't'); expect(s.move!.how).toBe('saut');
    s = go(s, 'a'); expect([s.move!.how, s.finished]).toEqual(['trampo', true]);
    s = go(go(go(start(6), 'a'), 'c'), 't'); expect([s.move!.how, s.at]).toEqual(['tapis', 'b']);
    s = go(go(start(8), 'a'), 'b'); expect([s.move!.how, s.at]).toEqual(['echelle', 'b']);
    // Scene 11: the bridge is hidden and cannot be touched until Boubou lands on the button.
    s = start(11); expect(play(go(s, 'a'), { target: 'p', at: 999 })).not.toBeNull();
    expect(play(s, { target: 'p', at: 0 })).toBeNull();
    const r = play(s, { target: 'a', at: 0 })!; expect(r.events).toContainEqual({ kind: 'pont' }); expect(r.state.bridge).toBe(true);
});

it('the lift goes up and down in a slow loop: the same touch reaches it or bumps, depending on the instant', () => {
    const l = levelOf(10), p = lift(l)!;
    expect([liftY(p, 0), liftY(p, LIFT / 2), liftY(p, LIFT)]).toEqual([p.y, p.top, p.y]);
    const s = start(10), low = play(s, { target: 'l', at: 0 })!, high = play(s, { target: 'l', at: LIFT / 2 - 4 })!;
    expect([low.state.move!.how, high.state.move!.how]).toEqual(['saut', 'bong']);
    expect(reachable(s, 0)).toContain('l'); expect(reachable(s, LIFT / 2)).not.toContain('l');
    // Riding the lift, Boubou goes up with it.
    expect(boubouAt(low.state, low.state.busy + LIFT / 2).y).toBe(p.top);
});

it('batteries are heavy: one at a time, handed to the robot; the last part brings everything back at once', () => {
    let s = go(go(start(12), 'a'), 'c');
    expect(s.carried).toEqual(['a']);
    const r = play(s, { target: 'b', at: s.busy })!;
    expect(r.events).toContainEqual({ kind: 'lourd', at: 'b' }); expect(r.state.carried).toEqual(['a']);
    s = go(r.state, ROBOT); expect([s.carried, s.delivered, s.tries]).toEqual([[], ['a'], 0]);
    s = go(go(s, 'c'), 'b');
    expect([s.finished, s.delivered.sort()]).toEqual([true, ['a', 'b']]);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedyPlayer(3).state;
    expect(complete({ 3: 2 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
    expect(play(won, { target: ROBOT, at: won.busy })).toBeNull();
});

it('readable at five: nothing covers anything else, platforms thick and easy to touch, the action fills the height, every touch lands on what it shows', () => {
    // At 390 × 844 the workshop is about 360 px wide for 180 units: 2 px a unit. A plank is 12 units (24 px), a touch zone
    // 44 units (88 px) at least, a part about 24 units (48 px), Boubou 42 units (84 px), the robot 52 × 90.
    expect(THICK).toBeGreaterThanOrEqual(12); expect(BODY).toBeGreaterThanOrEqual(30);
    let least = 1;
    for (const l of levels) {
        expect(overlaps(l), `scene ${l.id}`).toEqual([]);
        const r = robotBox(l);
        expect([r.x1 - r.x0, r.y1 - r.y0]).toEqual([52, 90]);
        const top = Math.min(...allPlats(l).map(p => Math.min(p.y, p.top) - BODY), r.y0);
        least = Math.min(least, (H - top) / H);
        for (const p of l.plats) {
            const b = hitBox(p, 0);
            expect(b.y1 - b.y0, `scene ${l.id} ${p.id}`).toBeGreaterThanOrEqual(44); expect(b.x1 - b.x0).toBeGreaterThanOrEqual(30);
            // A touch in the middle of the platform, or on its part, picks that very platform.
            if (p.kind !== 'pont' && p.kind !== 'ascenseur') { expect(touched(l, false, (p.x0 + p.x1) / 2, p.y + 4, 0), `scene ${l.id} ${p.id}`).toBe(p.id); expect(touched(l, false, (p.x0 + p.x1) / 2, p.y - 16, 0), `scene ${l.id} ${p.id} part`).toBe(p.id); }
        }
        expect(touched(l, true, (r.x0 + r.x1) / 2, r.y0 + 30, 0)).toBe(ROBOT);
    }
    expect(least).toBeGreaterThanOrEqual(.6);
    expect(W).toBe(180);
});
it('what Boubou says when a scene opens names the goal once: the gesture and the new thing never repeat it', async () => {
    const { instruction } = await import('../src/games/ferraille/view');
    const goal = { fr: /ramass/gi, en: /pick(s|ed)? up/gi };
    for (const l of levels) for (const locale of ['fr', 'en'] as const) {
        const words = instruction(l, locale), said = words.slice(1).join(' ');
        expect(said.match(goal[locale])?.length, `scene ${l.id} ${locale}: ${said}`).toBe(1);
        expect(new Set(words).size, `scene ${l.id} ${locale}`).toBe(words.length);
    }
});
