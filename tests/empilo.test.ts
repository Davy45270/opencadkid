import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { allPoses, complete, distance, fails, features, featuresOf, funnies, height, helpOn, hint, isUnlocked, levelOf, levels, MIN_GAP, NEEDS, parseRecords, pose, possible, problems, rotationsOf, shapeOf, skyOf, SPINS, stars, start, startCols, swap, TRIES_BEFORE_HELP, turn, width, type Feature, type Funny, type Pose, type State } from '../src/engines/empilo';
import { greedyPlayer, randomPlayer } from '../src/engines/empilo/solver';
import { failAnimations, thingAnimations } from '../src/games/empilo/art';

/** A robot child that poses at random among the poses that can happen (the piece in hand or the other, any turn, any
 * column), 200 seeds per scene. Measured on the 32 scenes: median at most 24 poses (scene 23, six rows with every piece),
 * worst game 56 poses (scene 27). The bounds are the ones asked for a five-year-old and fail as soon as a scene gets longer. */
const RANDOM_MEDIAN_MAX = 25;
const RANDOM_WORST_MAX = 120;
/** The greedy player (always the good place of the help). Measured: 16 poses at most (scene 2). */
const GREEDY_MAX = 20;

const main = (col: number, rot = 0): Pose => ({ piece: 'main', rot, col });
const other = (col: number, rot = 0): Pose => ({ piece: 'autre', rot, col });
const heights = (s: State): number[] => s.cols.map(c => c.length);
/** Plays poses from the start of a scene. */
const play = (id: number, ...poses: Pose[]): State => { let s = start(id); for (const p of poses) s = pose(s, p)!.state; return s; };

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(width(l), `scene ${l.id}`).toBeLessThanOrEqual(6); expect(height(l), `scene ${l.id}`).toBeLessThanOrEqual(8);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
        if (l.id < 6) expect(l.rotate, `scene ${l.id}: no turning before scene 6`).toBe(false);
    }
    expect(levelOf(6).rotate).toBe(true);
    for (const key of ['fr', 'en'] as const) expect(new Set(levels.map(l => l.title[key])).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    // A seventh column, a floating cube, a full row, a friend on top, two special cubes in a row are refused.
    const seven = levelOf(7);
    expect(problems({ ...seven, rows: seven.rows.map(r => `${r}..`) })).toContain('three to six columns');
    expect(problems({ ...seven, rows: ['u....', ...seven.rows.slice(1)] })).toContain('column 0: rests on what is under it');
    expect(problems({ ...seven, rows: [...seven.rows.slice(0, -1), 'ttudd'] })).toContain('no full row at the start');
    expect(problems({ ...seven, rows: [...seven.rows.slice(0, -1), 'tt.dA'] })).toContain('column 4: a friend stuck under something');
    expect(problems({ ...seven, pieces: 'uab' })).toContain('never two special cubes in a row');
    expect(problems({ ...levelOf(3), rotate: true })).toContain('no turning before scene 6');
});

it('every new thing comes alone in a scene (with only what it needs) before it is combined, and all of them come back in combinations', () => {
    const met = new Set<Feature>();
    for (const l of levels) {
        const fs = featuresOf(l);
        for (const f of fs) if (!met.has(f)) {
            const allowed = new Set<Feature>([f, ...NEEDS[f] ?? []]);
            expect(fs.filter(g => !allowed.has(g)), `scene ${l.id} brings in ${f}`).toEqual([]);
            expect(fs.filter(g => g !== f && !met.has(g)), `scene ${l.id} brings in ${f} with nothing else new`).toEqual([]);
            met.add(f);
        }
    }
    expect([...met].sort()).toEqual([...features].sort());
    for (const f of features) {
        const allowed = new Set<Feature>([f, ...NEEDS[f] ?? []]);
        expect(levels.filter(l => featuresOf(l).includes(f) && featuresOf(l).some(g => !allowed.has(g))).length, f).toBeGreaterThanOrEqual(1);
    }
    // The first two scenes: single cubes only.
    for (const id of [1, 2]) expect(featuresOf(levelOf(id))).toEqual([]);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    // The distance counts a changed cell, a row or a column more, a row to make more, a new thing, a piece of the order.
    const seven = levelOf(7);
    expect(distance(seven, seven)).toBe(0);
    expect(distance(seven, { ...seven, rows: [...seven.rows.slice(0, -1), 'tt.du'] })).toBe(1);
    expect(distance(seven, { ...seven, rows: ['.....', ...seven.rows] })).toBe(2);
    expect(distance(seven, { ...seven, goal: 4 })).toBe(2);
    expect(distance(seven, { ...seven, pieces: 'uu' })).toBe(1);
    expect(distance(seven, { ...seven, pieces: 'd' })).toBe(4);
});

it('a scene always starts the same way, and the same poses give the same well', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    const a = randomPlayer(23, 7), b = randomPlayer(23, 7);
    expect(a.state).toEqual(b.state);
});

it(`every scene can be finished: the greedy player does it in at most ${GREEDY_MAX} poses`, () => {
    let longest = 0;
    for (const l of levels) {
        const g = greedyPlayer(l.id, 500);
        expect(g.state.finished, `scene ${l.id}`).toBe(true);
        longest = Math.max(longest, g.poses);
    }
    expect(longest).toBeLessThanOrEqual(GREEDY_MAX);
});

it(`a robot posing at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} poses over 200 seeds, never more than ${RANDOM_WORST_MAX}; there is always a useful pose`, { timeout: 60_000 }, () => {
    let states = 0;
    const stuck: string[] = [];
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, 1000, (s, options) => {
            states++;
            // Never a dead end: the piece in hand or the other one has a pose that moves a goal forward.
            if (!options.some(r => r.useful)) stuck.push(`scene ${l.id}: ${s.cols.join('/')}`);
        }));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.poses, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const n = runs.map(r => r.poses).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
    expect(stuck.slice(0, 5)).toEqual([]);
    expect(states).toBeGreaterThan(30_000);
});

it('every funny try is reached in some scene, has its own animation, and a try that does not happen costs nothing', () => {
    const seen = new Map<Funny, Set<number>>(), changed: string[] = [];
    const note = (kind: Funny, id: number): void => { const s = seen.get(kind) ?? new Set<number>(); s.add(id); seen.set(kind, s); };
    for (const l of levels) for (let k = 0; k < 10; k++) randomPlayer(l.id, 50 + k, 1000, s => {
        for (const p of allPoses(s)) {
            const before: State = { ...s, tries: 2, dry: 1, helps: 1 }, r = pose(before, p)!;
            if (r.holes.length) note('trou', l.id);
            if (!r.fail) continue;
            note(r.fail.kind, l.id);
            if (JSON.stringify(r.state) !== JSON.stringify({ ...before, tries: 3, dry: 2 })) changed.push(`scene ${l.id} ${r.fail.kind}`);
        }
        let t = s;
        for (let i = 0; i < SPINS; i++) { const r = turn(t); if (!r) break; if (r.dizzy) note('tournis', l.id); t = r.state; }
    });
    expect(changed).toEqual([]);
    expect([...seen.keys()].sort()).toEqual([...funnies].sort());
    expect(funnies.length).toBeGreaterThanOrEqual(6);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(funnies.length);
    for (const name of [...Object.values(failAnimations), ...Object.values(thingAnimations)]) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
    expect(fails).not.toContain('trou');
});

it('soft cubes, rows that fly, the wall, the hole that echoes, the cloud that blows the top row', () => {
    // Scene 1: three single cubes make a row fly; the wall is a funny try.
    let s = play(1, main(0), main(1));
    expect(heights(s)).toEqual([1, 1, 0]);
    const row = pose(s, main(2))!;
    expect(row.cleared).toBe(1); expect(heights(row.state)).toEqual([0, 0, 0]); expect(row.state.rows).toBe(1); expect(row.useful).toBe(true);
    expect(pose(s, main(3))).toBeNull();
    expect(pose(start(3), main(3))!.fail?.kind).toBe('mur');
    // Scene 7: one cube in the gap and the whole row flies.
    expect(pose(start(7), main(2))!.cleared).toBe(1);
    // Scene 8: a train of three turned standing fills the gap of three rows at once.
    expect(shapeOf('t', 1)).toEqual([[0, 0], [0, 1], [0, 2]]);
    const three = pose(start(8), main(2, 1))!;
    expect(three.cleared).toBe(3); expect(heights(three.state)).toEqual([0, 0, 0, 0, 0]);
    // Scene 4: the corner resting over an empty cell leaves a hole; its cube slides down into it.
    s = play(4, main(0));
    expect(heights(s)).toEqual([1, 1, 1, 0, 0]);
    s = pose(s, main(0))!.state;
    const hole = pose(s, main(2))!;
    expect(hole.kind).toBe('c'); expect(hole.holes.length).toBeGreaterThan(0);
    expect(hole.fail).toBeNull();
    for (let x = 0; x < 5; x++) expect(hole.landed[x]!.length, `column ${x}`).toBe(heights(s)[x]! + shapeOf('c', 0).filter(c => c[0] + 2 === x).length);
    // Scene 20: a cube on the tall tower: the well nearly full, the cloud blows the top row away.
    const blow = pose(start(20), main(0))!;
    expect(blow.landed[0]!.length).toBe(6); expect(blow.blown.length).toBe(1); expect(heights(blow.state)[0]).toBe(5);
    // A piece always waits above the well, in a sky as tall as the tallest piece of the scene.
    expect(skyOf(levelOf(1))).toBe(1); expect(skyOf(levelOf(11))).toBe(2); expect(skyOf(levelOf(8))).toBe(3);
});

it('the drawing lights up and holds its rows until it is whole; a friend is free when its row flies', () => {
    // Scene 9: the bottom of the house lights up, and the full row stays while the house is not whole.
    const s = play(9, main(0), main(1), main(2));
    const r = pose(s, main(3))!;
    expect(r.lit.length).toBe(1); expect(r.cleared).toBe(0); expect(heights(r.state)).toEqual([1, 1, 1, 1]);
    expect(r.state.lit.split('').filter(c => c === '1').length).toBe(4);
    // Scene 13: the chick under its stones is free when its row flies.
    expect(startCols(levelOf(13))[1]).toBe('App');
    const chick = pose(play(13, main(0), main(2)), main(3))!;
    expect(chick.freed).toEqual([{ x: 1, y: 0 }]); expect(chick.state.finished).toBe(true);
    // Scene 16: the deeper chick needs one row more.
    const two = play(16, main(1), main(3));
    expect(two.freed).toBe(1); expect(two.cols[0]![0]).toBe('A'); expect(two.finished).toBe(false);
});

it('the rainbow fills the hole it is dropped in, the candy lifts its column but not the stones, the cloud floats and sneezes', () => {
    // Scene 18: a deep hole between two towers of three, the rainbow fills it to the top: three rows fly.
    let s = pose(start(18), main(0))!.state;
    expect(s.other).toBe('a');
    const fill = pose(s, other(2))!;
    expect(fill.filled.length).toBe(3); expect(fill.cleared).toBe(3);
    // On a flat column there is no hole: a funny try.
    s = play(18, main(0), main(4));
    expect(s.hand).toBe('a');
    expect(pose(s, main(0))!.fail?.kind).toBe('arc');
    // Scene 20: the candy makes the tower fly away; on an empty column it has nothing to lift.
    const candy = pose(start(20), other(0))!;
    expect(candy.lifted.length).toBe(5); expect(heights(candy.state)[0]).toBe(0);
    expect(pose(start(20), other(1))!.fail?.kind).toBe('bonbon');
    // Scene 25: the candy lifts the cubes and the chick, the stone stays.
    const lift = pose(start(25), other(1))!;
    expect(lift.freed.length).toBe(1); expect(lift.state.cols[1]).toBe('p'); expect(lift.state.finished).toBe(true);
    // Scene 15: the cloud floats one column after each pose; a cube dropped on it makes it sneeze.
    s = start(15);
    expect(s.cloud).toBe(1);
    expect(pose(s, main(1))!.fail?.kind).toBe('nuage');
    s = pose(s, main(0))!.state;
    expect(s.cloud).toBe(2);
});

it('the turn button turns the piece in hand, the fourth turn in a row makes it dizzy; the swap is free', () => {
    expect(turn(start(5))).toBeNull();
    let s = start(12);
    for (let k = 1; k < SPINS; k++) { const r = turn(s)!; expect(r.dizzy).toBe(false); s = r.state; }
    const dizzy = turn(s)!;
    expect(dizzy.dizzy).toBe(true); expect(dizzy.state.rot).toBe(0); expect(dizzy.state.tries).toBe(1);
    expect(rotationsOf('k', levelOf(12))).toEqual([0]); expect(rotationsOf('T', levelOf(12)).length).toBe(4); expect(rotationsOf('T', levelOf(11))).toEqual([0]);
    const swapped = swap(start(3));
    expect([swapped.hand, swapped.other]).toEqual([start(3).other, start(3).hand]);
    expect(swap(swapped)).toEqual({ ...start(3) });
    // Posing the other piece keeps the one in hand.
    const kept = pose(start(3), other(0))!.state;
    expect(kept.hand).toBe(start(3).hand);
});

it('three poses that move no goal make a good place pulse; taking it costs a star', () => {
    // Scene 2: three cubes on the same column, the lowest columns stay empty.
    let s = play(2, main(0));
    for (let k = 0; k < TRIES_BEFORE_HELP; k++) { expect(helpOn(s), `pose ${k}`).toBe(false); s = pose(s, main(0))!.state; }
    expect(s.dry).toBe(TRIES_BEFORE_HELP); expect(helpOn(s)).toBe(true);
    const h = hint(s)!, helped = pose(s, h)!;
    expect(helped.useful).toBe(true); expect(helped.helped).toBe(true); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    // The good place is always a useful pose, in every scene, from the start.
    for (const l of levels) { const st = start(l.id); expect(possible(st).find(r => JSON.stringify(r.pose) === JSON.stringify(hint(st)))?.useful, `scene ${l.id}`).toBe(true); }
    expect(stars({ ...helped.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...helped.state, helps: 2 })).toBe(1);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedyPlayer(3).state;
    expect(won.finished).toBe(true);
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
