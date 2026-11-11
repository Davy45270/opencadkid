import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { CARROT_FROM, carrotsOn, complete, countAt, distance, EARLY, EARLY_MOLES, fails, features, featuresOf, freeCells, goodCell, height, HELP_AFTER, hint, isUnlocked, levelOf, levels, MIN_GAP, molesOf, parseRecords, play, problems, solve, start, stars, width, type Fail, type LevelDef, type State } from '../src/engines/taupes';
import { greedyPlayer, randomPlayer, wildPlayer } from '../src/engines/taupes/players';
import { funnyAnimations, tutuAnimations } from '../src/games/taupes/art';
import { instruction, labels } from '../src/games/taupes/view';

/** A robot child digging covered clods at random (it puts a carrot on a mole it has just woken, and takes a shining clod one
 * time in two), 200 seeds per scene. Measured on the 32 scenes: median at most 24 gestures (scene 31, six moles to find by
 * crossing), worst game 25 gestures (scene 32). With the median bound at 23 the test fails (scene 31), with the worst at 24
 * too (scene 32). */
const RANDOM_MEDIAN_MAX = 25;
const RANDOM_WORST_MAX = 30;
const scene = (rows: string[], id = 20): LevelDef => ({ id, title: { fr: 'Essai', en: 'Try' }, moment: 'test', rows });
const dig = (s: State, cell: number): State => play(s, { kind: 'creuser', cell })!.state;

it('at least 30 scenes, numbered in order, each fair to a five-year-old, with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        if (l.id < EARLY) expect(molesOf(l).length, `scene ${l.id}`).toBeLessThanOrEqual(EARLY_MOLES);
        expect(width(l) >= 3 && width(l) <= 6 && height(l) >= 3 && height(l) <= 6, `scene ${l.id}`).toBe(true);
    }
    for (const key of ['fr', 'en'] as const) expect(new Set(levels.map(l => l.title[key])).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    // The very first garden is 3 × 3 with one mole; the last ones 6 × 6.
    expect([width(levelOf(1)), height(levelOf(1)), molesOf(levelOf(1)).length]).toEqual([3, 3, 1]);
    expect([width(levels.at(-1)!), height(levels.at(-1)!)]).toEqual([6, 6]);
    // What problems() catches: a guess (two clods, one mole, nothing to tell them apart), too many moles early, five dots,
    // no first open zone, a garden wider than tall.
    expect(problems(scene(['ooo', 'oo#', 'T.#']))).toEqual(['needs a guess']);
    expect(problems(scene(['TTo', 'Too', 'ooo', '..o'], 3))).toContain(`at most ${EARLY_MOLES} moles before scene ${EARLY}`);
    expect(problems(scene(['TTT', 'ToT', 'oo.']))).toContain('at most four moles around a flower');
    expect(problems(scene(['...', '..T', '...']))).toContain('a first zone already open');
    expect(problems(scene(['oooo', 'oo.T', 'oooo']))).toContain('a garden as tall as it is wide or taller (portrait phone)');
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
    // One mole, then two, then the carrot (alone, with a single mole), then the empty clod, then crossing two clues.
    expect([1, 2, 4].map(id => featuresOf(levelOf(id)))).toEqual([[], [], []]);
    expect(features.map(f => levels.find(l => featuresOf(l).includes(f))!.id)).toEqual([3, 6, 8, 10, 12]);
    expect(CARROT_FROM).toBe(4); expect(carrotsOn(3)).toBe(false); expect(carrotsOn(4)).toBe(true);
    expect(molesOf(levelOf(CARROT_FROM)).length).toBe(1);
});

it(`two scenes always differ by at least MIN_GAP = ${MIN_GAP}`, () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    // Measured: 6 (scenes 2 and 3); the test fails at 7.
    expect([smallest, pair]).toEqual([MIN_GAP, '2~3']);
    const one = levelOf(1);
    expect(distance(one, one)).toBe(0);
    // The same garden with one more clod open: one cell differs, far too close to count as another scene.
    expect(distance(one, scene(['ooo', 'ooo', 'o.T']))).toBe(1);
});

it('a scene always starts the same way, with a first zone open; nothing happens outside the garden or once it is over', () => {
    for (const l of levels) {
        expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
        expect(start(l.id).open.length, `scene ${l.id}`).toBeGreaterThan(0);
    }
    expect(randomPlayer(30, 7).state).toEqual(randomPlayer(30, 7).state);
    const s = start(1);
    expect([s.open, s.carrots, s.moves, s.finished]).toEqual([[0, 1, 2, 3, 4, 6], [], 0, false]);
    expect(play(s, { kind: 'creuser', cell: 9 })).toBeNull(); expect(play(s, { kind: 'creuser', cell: -1 })).toBeNull(); expect(play(s, { kind: 'creuser', cell: 1.5 })).toBeNull();
    // No carrot before scene 4.
    expect(play(s, { kind: 'carotte', cell: 8 })).toBeNull();
    let r = play(s, { kind: 'creuser', cell: 5 })!;
    expect(r.events).toEqual([{ kind: 'ouvre', cells: [5], helped: false }]);
    r = play(r.state, { kind: 'creuser', cell: 7 })!;
    expect(r.events).toEqual([{ kind: 'ouvre', cells: [7], helped: false }, { kind: 'fini' }]);
    expect([r.state.finished, stars(r.state)]).toEqual([true, 3]);
    expect(play(r.state, { kind: 'creuser', cell: 8 })).toBeNull(); expect(play(r.state, { kind: 'tutu' })).toBeNull();
});

it('no scene asks to guess: from its first open zone every clod is proved, and a careful child opens them all without a funny try', () => {
    for (const l of levels) {
        expect(solve(l).solved, `scene ${l.id}`).toBe(true);
        const g = greedyPlayer(l.id);
        expect(g.state.finished, `scene ${l.id}`).toBe(true);
        expect([g.state.tries, stars(g.state)], `scene ${l.id}`).toEqual([0, 3]);
        expect(g.moves, `scene ${l.id}`).toBeLessThanOrEqual(freeCells(l).length - start(l.id).open.length);
    }
    // Crossing needs two flowers at once: scene 8 cannot be done one flower at a time, scene 1 can.
    expect(solve(levelOf(8)).techniques).toContain('croise'); expect(solve(levelOf(1)).techniques).not.toContain('croise');
});

it(`a robot child digging at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} gestures over 200 seeds, never more than ${RANDOM_WORST_MAX}; never a dead end`, { timeout: 60_000 }, () => {
    let states = 0, worst = 0, worstMedian = 0;
    const lost: string[] = [];
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, 1000, s => {
            states++;
            // Never a dead end: from every state there is a clod the flowers prove free.
            if (goodCell(s) === null) lost.push(`scene ${l.id} after ${s.moves}`);
        }));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.moves, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); worst = Math.max(worst, r.moves); }
        const n = runs.map(r => r.moves).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
        worstMedian = Math.max(worstMedian, median);
    }
    expect(lost.slice(0, 5)).toEqual([]);
    expect([worstMedian, worst]).toEqual([24, 25]);
    expect(states).toBeGreaterThan(50_000);
});

it('every funny try is reached in some scene, has its own animations, and changes nothing but the counters', () => {
    const seen = new Map<Fail, Set<number>>();
    for (const l of levels) for (let k = 0; k < 10; k++) wildPlayer(l.id, 50 + k, 3000, e => { if (e.kind === 'fail') { const set = seen.get(e.fail) ?? new Set<number>(); set.add(l.id); seen.set(e.fail, set); } });
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    // One of each, in scene 12 (a rock, the carrot): only the counters move.
    let s = start(12);
    const l = levelOf(12), mole = molesOf(l)[0]!, rock = l.rows.join('').indexOf('#'), flower = s.open[0]!, empty = l.rows.join('').indexOf('.');
    s = play(s, { kind: 'carotte', cell: mole })!.state;
    const tries: [Parameters<typeof play>[1], Fail][] = [[{ kind: 'creuser', cell: mole }, 'saute'], [{ kind: 'carotte', cell: empty }, 'lapin'], [{ kind: 'creuser', cell: flower }, 'pollen'], [{ kind: 'creuser', cell: rock }, 'rocher'], [{ kind: 'tutu' }, 'galipette'], [{ kind: 'bord' }, 'ver']];
    for (const [a, fail] of tries) {
        const r = play(s, a)!;
        expect(r.events, fail).toEqual([{ kind: 'fail', fail, cell: 'cell' in a ? a.cell : null }]);
        expect([r.state.open, r.state.carrots, r.state.tries, r.state.wrong, r.state.finished], fail).toEqual([s.open, s.carrots, s.tries + 1, s.wrong + 1, false]);
    }
    // The yawning mole, before its carrot.
    expect(play(start(12), { kind: 'creuser', cell: mole })!.events).toEqual([{ kind: 'fail', fail: 'baille', cell: mole }]);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(funnyAnimations)).size).toBe(fails.length);
    expect(new Set(Object.values(tutuAnimations)).size).toBe(fails.length);
    for (const name of [...Object.values(funnyAnimations), ...Object.values(tutuAnimations)]) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
    for (const locale of ['fr', 'en'] as const) for (const f of fails) expect(labels[locale].funny[f].length, f).toBeGreaterThan(10);
});

it('the carrot: on a mole it stays, touched again with the carrot it comes back to the pocket; dug, it jumps; on an empty clod a rabbit takes it', () => {
    let s = start(4);
    const l = levelOf(4), mole = molesOf(l)[0]!;
    let r = play(s, { kind: 'carotte', cell: mole })!;
    expect(r.events).toEqual([{ kind: 'carotte', cell: mole }]); s = r.state;
    expect([s.carrots, s.tries, s.wrong]).toEqual([[mole], 0, 0]);
    r = play(s, { kind: 'carotte', cell: mole })!;
    expect(r.events).toEqual([{ kind: 'reprise', cell: mole }]); expect(r.state.carrots).toEqual([]);
    // The carrots are never needed: the scene ends when every clod without a mole is open.
    expect(greedyPlayer(4).state.carrots).toEqual([]);
});

it('a clod with no mole around opens its neighbours by itself, as far as it goes', () => {
    // Scene 6: the bottom row; its right-hand clod has no mole around and opens the middle one too.
    const s = start(6), r = play(s, { kind: 'creuser', cell: 11 })!;
    expect(countAt(levelOf(6), 11)).toBe(0);
    expect(r.events[0]).toEqual({ kind: 'ouvre', cells: [11, 10], helped: false });
    expect(featuresOf(levelOf(6))).toEqual(['zero']);
});

it(`after ${HELP_AFTER} funny tries in a row, a clod the flowers prove free shines; digging it costs one star, and only that`, () => {
    let s = start(10);
    for (let k = 0; k < HELP_AFTER - 1; k++) s = play(s, { kind: 'tutu' })!.state;
    expect(hint(s)).toBeNull();
    s = play(s, { kind: 'bord' })!.state;
    const h = hint(s)!;
    expect(h).not.toBeNull(); expect(molesOf(levelOf(10))).not.toContain(h);
    const r = play(s, { kind: 'creuser', cell: h })!;
    expect(r.events[0]).toMatchObject({ kind: 'ouvre', helped: true });
    s = r.state;
    expect([s.helps, s.wrong, hint(s)]).toEqual([1, 0, null]);
    while (!s.finished) s = dig(s, goodCell(s)!);
    expect(stars(s)).toBe(2); expect(stars({ helps: 0 })).toBe(3); expect(stars({ helps: 4 })).toBe(2);
    // A good dig resets the count: the help goes out until three more funny tries.
    s = start(10); for (let k = 0; k < 2; k++) s = play(s, { kind: 'tutu' })!.state;
    s = dig(s, goodCell(s)!); s = play(s, { kind: 'tutu' })!.state;
    expect(hint(s)).toBeNull();
});

it('records keep the best stars, unlock the next scene and ignore what is not a record', () => {
    const done = greedyPlayer(1).state;
    expect(complete({}, done)).toEqual({ 1: 3 }); expect(complete({ 1: 3 }, { ...done, helps: 1 })).toEqual({ 1: 3 });
    expect(complete({}, start(1))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(2, {})).toBe(false); expect(isUnlocked(2, { 1: 2 })).toBe(true);
    expect(parseRecords('{"1":3,"2":7,"x":2,"40":3,"3":2.5}')).toEqual({ 1: 3 });
    expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({}); expect(parseRecords(null)).toEqual({});
});

it('the sentence said when a scene opens: its title, the gesture or what is new, and the goal once', () => {
    expect(instruction(levelOf(1), 'fr')).toEqual(['Une taupe dort', labels.fr.gesture, 'Ouvre toutes les mottes, sauf celle de la taupe.']);
    expect(instruction(levelOf(4), 'en')[1]).toBe(labels.en.carrot);
    expect(instruction(levelOf(12), 'fr')[1]).toBe(labels.fr.intro.rocher);
    for (const l of levels) for (const locale of ['fr', 'en'] as const) {
        const words = instruction(l, locale);
        expect(words.filter(w => w === labels[locale].goal(molesOf(l).length)).length, `scene ${l.id}`).toBe(1);
        expect(new Set(words).size, `scene ${l.id}`).toBe(words.length);
    }
});
