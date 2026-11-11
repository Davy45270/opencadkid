import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { actions, BASE_RANGE, cartonsOf, complete, COUNTDOWN, cross, distance, fails, features, featuresOf, friendsAt, funnies, greedyAction, height, helpOn, hint, isUnlocked, levels, MIN_GAP, parseRecords, POUFS_BEFORE_HELP, problems, reactions, start, stars, step, treasuresOf, width, type Fail, type Reaction, type State } from '../src/engines/cartons';
import { childPlayer, greedyPlayer, randomPlayer } from '../src/engines/cartons/solver';
import { funnyAnimations } from '../src/games/cartons/art';

/** The greedy player (the plan of the help: walk to the nearest cell where a box finds a treasure, put it down, wait) finishes
 * every scene. Measured on the 32 scenes: 47 gestures at most (scene 24). */
const GREEDY_MAX = 50;
/** A robot pressing one of the six gestures at random, over 200 seeds. The game is a little maze: the robot has to wander
 * to the right cell AND press « put down » there, so pure chance is slow. Measured: median at most 847 gestures (scene 32,
 * the finale with four treasures, two of them behind the fan), worst game 3 935 (scene 18). The first scenes stay short
 * (median 23 gestures on scene 1). The bounds leave a little room and fail as soon as a scene gets clearly longer. */
const RANDOM_MEDIAN_MAX = 900;
const RANDOM_WORST_MAX = 4500;
const RANDOM_LIMIT = 5000;
/** A robot child with a little idea (a carton in reach at random, a short walk with a random gesture now and then, the box,
 * the wait), over 200 seeds. Measured: median at most 11 boxes (scene 32), worst game 18 boxes (scene 30). */
const CHILD_MEDIAN_MAX = 14;
const CHILD_WORST_MAX = 25;

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
        if (l.id < 8) expect(cartonsOf(l), `scene ${l.id}: six cartons at most before scene 8`).toBeLessThanOrEqual(6);
        if (l.id <= 15) { expect(width(l), `scene ${l.id}`).toBeLessThanOrEqual(7); expect(height(l), `scene ${l.id}: 7 × 7 at most up to scene 15`).toBeLessThanOrEqual(7); }
    }
    expect(new Set(levels.map(l => l.title.fr)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.title.en)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    expect(levels.some(l => treasuresOf(l).length >= 4)).toBe(true);
});

it('every new thing comes alone in a scene before it is combined, and all of them come back in combinations', () => {
    const met = new Set<string>();
    for (const l of levels) {
        const fs = featuresOf(l);
        for (const f of fs) if (!met.has(f)) { expect(fs, `scene ${l.id} brings in ${f}`).toEqual([f]); met.add(f); }
    }
    expect([...met].sort()).toEqual([...features].sort());
    for (const f of features) expect(levels.filter(l => featuresOf(l).length > 1 && featuresOf(l).includes(f)).length, f).toBeGreaterThanOrEqual(1);
    expect(featuresOf(levels[0]!)).toEqual([]);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    const one = levels[0]!;
    expect(distance(one, one)).toBe(0);
    expect(distance(one, { ...one, rows: [one.rows[0]!, '.c...', ...one.rows.slice(2)] })).toBe(1);
    expect(distance(one, { ...one, rows: [...one.rows, '.....'] })).toBe(2);
    expect(distance(one, { ...one, rows: one.rows.map(r => `${r}#`) })).toBe(2 + 3);
});

it('a scene always starts the same way', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
});

it(`a greedy player finishes every scene within ${GREEDY_MAX} gestures, and from every state a random robot reaches the end is still reachable`, { timeout: 60_000 }, () => {
    let longest = 0;
    for (const l of levels) {
        const g = greedyPlayer(start(l.id));
        expect(g.stuck, `scene ${l.id}`).toBe(false);
        expect(g.state.finished, `scene ${l.id}`).toBe(true);
        expect(g.steps, `scene ${l.id}`).toBeLessThanOrEqual(GREEDY_MAX);
        longest = Math.max(longest, g.steps);
        // No dead end: from states met by a robot playing at random, the greedy player still finishes.
        for (const seed of [1, 2, 3]) {
            let k = 0;
            randomPlayer(l.id, seed, 1500, s => { if (k++ % 15 === 0) { const r = greedyPlayer(s, 200); expect(r.state.finished, `scene ${l.id} seed ${seed} gesture ${k}`).toBe(true); } });
        }
    }
    expect(longest).toBeGreaterThan(20);
});

it(`a robot playing at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} gestures over 200 seeds, never more than ${RANDOM_WORST_MAX}`, { timeout: 60_000 }, () => {
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, RANDOM_LIMIT));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.steps, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const n = runs.map(r => r.steps).sort((a, b) => a - b);
        expect((n[99]! + n[100]!) / 2, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
});

it(`a robot child finishes every scene: median at most ${CHILD_MEDIAN_MAX} boxes over 200 seeds, never more than ${CHILD_WORST_MAX}`, { timeout: 60_000 }, () => {
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => childPlayer(l.id, 1000 + k));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.boxes, `scene ${l.id}`).toBeLessThanOrEqual(CHILD_WORST_MAX); }
        const n = runs.map(r => r.boxes).sort((a, b) => a - b);
        expect((n[99]! + n[100]!) / 2, `scene ${l.id}`).toBeLessThanOrEqual(CHILD_MEDIAN_MAX);
    }
});

it('every funny try and every funny reaction happens in some scene and has its own animation; a funny try changes nothing', { timeout: 60_000 }, () => {
    const seen = new Set<Fail | Reaction>(), changed: string[] = [];
    for (const l of levels) for (const seed of [7, 8]) randomPlayer(l.id, seed, 600, s => {
        for (const a of actions) {
            const before: State = { ...s, steps: 5, tries: 2, dry: 1, helps: 1 }, r = step(before, a)!;
            if (r.fail) {
                seen.add(r.fail.kind);
                const after = r.state;
                if (after.grid !== before.grid || after.boxes !== before.boxes || after.x !== before.x || after.y !== before.y || after.t !== before.t || after.steps !== 6 || after.tries !== 3 || after.dry !== 1 || after.helps !== 1) changed.push(`scene ${l.id} ${r.fail.kind}`);
            }
            for (const x of r.reactions) seen.add(x);
        }
    });
    expect(changed).toEqual([]);
    expect([...seen].sort()).toEqual([...funnies].sort());
    expect(fails.length + reactions.length).toBeGreaterThanOrEqual(6);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(funnyAnimations)).size).toBe(funnies.length);
    for (const name of Object.values(funnyAnimations)) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
});

it('the box counts 3, 2, 1 with the gestures, then goes pouf in a cross that opens the cartons; the box comes back', () => {
    // Scene 1: the kitten two cells right of Tutu.
    let s = start(1);
    let r = step(s, 'poser')!;
    expect(r.state.boxes).toEqual([{ x: 1, y: 2, count: COUNTDOWN }]);
    expect(step(r.state, 'poser')!.fail?.kind).toBe('boite');
    s = step(r.state, 'bas')!.state; expect(s.boxes[0]!.count).toBe(2);
    expect(step(s, 'poser')!.fail?.kind).toBe('poche');
    s = step(s, 'attendre')!.state; expect(s.boxes[0]!.count).toBe(1);
    r = step(s, 'attendre')!;
    expect(r.poufs).toHaveLength(1);
    expect(r.poufs[0]!.hits).toEqual([{ x: 3, y: 2, opened: true, treasure: 'chaton' }]);
    expect(r.found).toEqual(['chaton']); expect(r.state.boxes).toEqual([]); expect(r.state.finished).toBe(true);
    expect(BASE_RANGE).toBe(2);
    // A double carton needs two poufs (scene 6), and confetti stop at the first carton and at bricks.
    const l6 = levels[5]!;
    expect(cross(l6, start(6).grid, 2, 4, 2).cartons).toEqual([{ x: 2, y: 2 }]);
    let d = start(6);
    for (const a of ['poser', 'attendre', 'attendre', 'attendre'] as const) d = step(d, a)!.state;
    expect(d.grid[2 * 5 + 2]).toBe('b'); expect(d.finished).toBe(false);
    const l4 = levels[3]!, c = cross(l4, start(4).grid, 2, 2, 2);
    expect(c.bricks).toEqual([{ x: 2, y: 1 }, { x: 1, y: 2 }]); expect(c.cartons).toEqual([{ x: 3, y: 2 }]);
});

it('a box touching no carton goes « pfff »; Tutu in the cross sneezes; an empty carton has its clown; a friend dances', () => {
    let s = start(2);
    s = step(s, 'poser')!.state;
    for (let k = 0; k < 2; k++) s = step(s, 'attendre')!.state;
    const r = step(s, 'attendre')!;
    // From (2, 3) the arms only meet the yard.
    expect(r.poufs[0]!.pfff).toBe(true); expect(r.reactions).toEqual(['pfff']);
    let t = step(start(2), 'haut')!.state;
    t = step(t, 'haut')!.state;
    t = step(t, 'poser')!.state;
    for (let k = 0; k < 2; k++) t = step(t, 'attendre')!.state;
    const p = step(t, 'attendre')!;
    expect(p.reactions).toEqual(expect.arrayContaining(['coucou', 'eternue']));
    expect(p.state.finished).toBe(true);
    // Scene 13: the snail walks its round, one cell a gesture, and comes back.
    const l13 = levels[12]!;
    expect(friendsAt(l13, 0)).toEqual([{ x: 2, y: 2 }]); expect(friendsAt(l13, 1)).toEqual([{ x: 3, y: 2 }]); expect(friendsAt(l13, 6)).toEqual(friendsAt(l13, 0));
});

it('the fan blows the box one cell; the big box makes the confetti fly further; a second box goes in the pocket', () => {
    let s = start(16);
    for (const a of ['gauche', 'gauche', 'haut', 'haut'] as const) s = step(s, a)!.state;
    expect([s.x, s.y]).toEqual([1, 2]);
    const r = step(s, 'poser')!;
    expect(r.placed).toEqual({ x: 1, y: 2, to: { x: 2, y: 2 }, blown: true });
    let g = start(10);
    g = step(g, 'haut')!.state;
    expect(g.range).toBe(BASE_RANGE + 1);
    let m = start(19);
    m = step(m, 'haut')!.state;
    expect(m.capacity).toBe(2);
    m = step(m, 'poser')!.state; m = step(m, 'gauche')!.state;
    expect(step(m, 'poser')!.state.boxes).toHaveLength(2);
});

it('three poufs in a row without a treasure make the best cell shine; putting the box there costs one star', () => {
    let s = start(3);
    for (let k = 0; k < POUFS_BEFORE_HELP; k++) {
        expect(helpOn(s)).toBe(false);
        s = step(s, 'poser')!.state;
        for (let j = 0; j < COUNTDOWN; j++) s = step(s, 'attendre')!.state;
    }
    expect(helpOn(s)).toBe(true);
    const h = hint(s)!;
    expect(h.kind).toBe('poser');
    while (greedyAction(s) !== 'poser') s = step(s, greedyAction(s)!)!.state;
    expect([s.x, s.y]).toEqual([h.x, h.y]);
    const r = step(s, 'poser')!;
    expect(r.helped).toBe(true); expect(r.state.helps).toBe(1); expect(r.state.dry).toBe(0); expect(stars(r.state)).toBe(2);
    expect(stars({ ...r.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...r.state, helps: 3 })).toBe(1);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedyPlayer(start(3)).state;
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
