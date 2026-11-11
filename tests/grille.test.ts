import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { candidates, complete, difficulty, distance, fails, features, featuresOf, forced, gestures, givenOf, helpOn, hint, imagesOf, isUnlocked, levels, MIN_GAP, parseRecords, peersOf, problems, reading, sizeOf, solutionOf, solutions, stars, start, step, TRIES_BEFORE_HELP, unitsOf, type Action, type Fail, type State } from '../src/engines/grille';
import { bestStep, randomPlayer } from '../src/engines/grille/solver';
import { dances, failAnimations } from '../src/games/grille/art';
import { instruction } from '../src/games/grille/view';

/** A robot child (see `randomPlayer`): half of the time the gesture the help would show, otherwise any gesture at all, funny
 * tries included, over 200 seeds. Measured on the 34 scenes: median at most 20 gestures (scene 33), worst game 35 gestures
 * (scene 33); never taking the help, 624 gestures on scene 34. The bounds leave a little room and fail as soon as a scene
 * gets clearly longer. */
const RANDOM_MEDIAN_MAX = 25;
const RANDOM_WORST_MAX = 45;
const RANDOM_LIMIT = 3000;

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
    }
    expect(new Set(levels.map(l => l.title.fr)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.title.en)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    // The very first scenes have one or two empty cells, each the last of its row, its column or its square.
    for (const l of levels.slice(0, 4)) expect(givenOf(l).filter(v => v < 0).length, `scene ${l.id}`).toBeLessThanOrEqual(2);
    expect(givenOf(levels[0]!).filter(v => v < 0).length).toBe(1);
    // The big grid only at the end: every grid of six comes after every grid of four.
    const firstSix = levels.findIndex(l => sizeOf(l) === 6);
    expect(firstSix).toBeGreaterThan(15);
    expect(levels.slice(firstSix).every(l => sizeOf(l) === 6)).toBe(true);
    // The three themes take turns, never twice in a row.
    for (let i = 1; i < levels.length; i++) expect(levels[i]!.theme, `scene ${i + 1}`).not.toBe(levels[i - 1]!.theme);
});

it('every grid has exactly one way to be filled, found by looking only, never by guessing', () => {
    for (const l of levels) {
        const given = givenOf(l), n = sizeOf(l), images = imagesOf(l);
        expect(solutions(given, n, images, 5).length, `scene ${l.id}`).toBe(1);
        expect(reading(l).solved, `scene ${l.id}`).toBe(true);
        // The solution is a true grid: every picture once in every row, column and square.
        const sol = solutionOf(l);
        for (const u of unitsOf(n)) expect(new Set(u.cells.map(i => sol[i])).size, `scene ${l.id}`).toBe(n);
        given.forEach((v, i) => { if (v >= 0) expect(sol[i]).toBe(v); });
    }
    // The proof can fail: a grid with two ways, and one that needs a guess, are refused.
    const two = { ...levels[0]!, rows: ['..cd', 'cdab', '..dc', 'dcba'] };
    expect(problems(two)).toContain('exactly one way to fill the grid');
    expect(problems({ ...levels[0]!, rows: ['dbac', 'cabd', 'bc.a', 'adca'] })).toEqual(['twins at 11', 'twins at 12', 'twins at 15']);
});

it('every new thing comes as the only new thing of its first scene, the row, column, square and crossing alone, then combined', () => {
    const met = new Set<string>();
    expect(featuresOf(levels[0]!)).toEqual([]);
    for (const l of levels) {
        const fs = featuresOf(l), fresh = fs.filter(f => !met.has(f));
        expect(fresh.length, `scene ${l.id} brings in ${fresh.join(', ')}`).toBeLessThanOrEqual(1);
        if (fresh.length && ['ligne', 'colonne', 'carre', 'croise', 'six'].includes(fresh[0]!)) expect(fs, `scene ${l.id} brings in ${fresh[0]}`).toEqual(fresh[0] === 'six' ? ['six'] : fresh);
        fresh.forEach(f => met.add(f));
    }
    expect([...met].sort()).toEqual([...features].sort());
    // The order of the brief: one empty cell, a row, a column, a square, two to cross, several cells, then the big grid.
    const first = (f: string): number => levels.find(l => featuresOf(l).includes(f as never))!.id;
    expect(features.map(first)).toEqual([...features.map(first)].sort((a, b) => a - b));
    for (const f of features) expect(levels.filter(l => featuresOf(l).length > 1 && featuresOf(l).includes(f)).length, f).toBeGreaterThanOrEqual(1);
});

it('the difficulty goes up: never easier than the scene three before, and the last scenes are the hardest', () => {
    const d = levels.map(difficulty);
    for (let i = 3; i < d.length; i++) expect(d[i], `scene ${i + 1}`).toBeGreaterThanOrEqual(d[i - 3]!);
    expect(Math.max(...d)).toBe(d[d.length - 1]);
    expect(d[0]).toBe(Math.min(...d));
    // The bound can fail: the same scenes in another order break it.
    const swapped = [d[12]!, ...d.slice(1, 12), d[0]!];
    expect(swapped.some((v, i) => i >= 3 && v < swapped[i - 3]!)).toBe(true);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const dd = distance(a, b); if (dd < smallest) { smallest = dd; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    const one = levels[0]!;
    expect(distance(one, one)).toBe(0);
    // The same grid with one more empty cell on the same row is too close.
    expect(distance(one, { ...one, rows: ['dbac', 'cabd', 'b..a', 'adcb'] })).toBeLessThan(MIN_GAP);
});

it('a scene always starts the same way', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
});

it('every scene can be finished by putting the pictures it can see, and no state reached has a dead end', () => {
    for (const l of levels) {
        // Every state reached by right pictures still has a cell found by looking: the help never runs dry.
        let s = start(l.id), moves = 0;
        while (!s.finished) {
            const h = hint(s);
            expect(h, `scene ${l.id}`).not.toBeNull();
            const r = step(s, { kind: 'pose', ...h! })!;
            expect(r.fail, `scene ${l.id}`).toBeNull();
            s = r.state; moves++;
        }
        expect(moves).toBe(givenOf(l).filter(v => v < 0).length);
        // Whatever the order of the right pictures, the end can still be reached: the grid only ever holds right pictures,
        // so any state is a part of the one solution, and the solution still fits it.
        const sol = solutionOf(l), empty = givenOf(l).map((v, i) => v < 0 ? i : -1).filter(i => i >= 0);
        for (let mask = 0; mask < 1 << Math.min(empty.length, 10); mask++) {
            const cells = givenOf(l).map((v, i) => { const k = empty.indexOf(i); return k >= 0 && mask & 1 << k ? sol[i]! : v; });
            const st: State = { ...start(l.id), cells };
            if (cells.every(v => v >= 0)) continue;
            expect(solutions(cells, sizeOf(l), imagesOf(l), 2).length, `scene ${l.id} mask ${mask}`).toBe(1);
            expect(hint(st), `scene ${l.id} mask ${mask}`).not.toBeNull();
        }
    }
});

it(`a robot playing at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} gestures over 200 seeds, never more than ${RANDOM_WORST_MAX}`, { timeout: 60_000 }, () => {
    let worstMedian = 0, worst = 0;
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, RANDOM_LIMIT));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.gestures, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); worst = Math.max(worst, r.gestures); }
        const n = runs.map(r => r.gestures).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        worstMedian = Math.max(worstMedian, median);
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
    // The bounds can fail: a robot that never takes the help needs far more gestures.
    expect(randomPlayer(levels.length, 1, RANDOM_LIMIT, 0).gestures).toBeGreaterThan(RANDOM_WORST_MAX);
    expect(worstMedian).toBeGreaterThan(5); expect(worst).toBeGreaterThan(10);
});

it('every funny try exists in some scene, has its own animation, and changes nothing in the grid', () => {
    const seen = new Map<Fail, Set<number>>(), changed: string[] = [];
    for (const l of levels) {
        // The start, and the grid half filled by the help.
        let s = start(l.id);
        const states = [s];
        for (let k = 0; k < 3 && !s.finished; k++) { s = step(s, bestStep(s)!)!.state; states.push(s); }
        for (const st of states) if (!st.finished) for (const a of gestures(st)) {
            const before: State = { ...st, gestures: 5, tries: 2, dry: 1, helps: 1 }, r = step(before, a);
            if (!r?.fail) continue;
            const ids = seen.get(r.fail.kind) ?? new Set(); ids.add(l.id); seen.set(r.fail.kind, ids);
            const after = r.state;
            if (after.cells !== before.cells || after.finished || after.gestures !== 6 || after.tries !== 3 || after.dry !== 2 || after.helps !== 1) changed.push(`scene ${l.id} ${r.fail.kind}`);
        }
    }
    expect(changed).toEqual([]);
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    // A twin makes a face in the colour of its theme: fruits pull a face, animals squabble, shapes bump.
    expect([...seen.get('grimace')!].every(id => levels[id - 1]!.theme === 'fruits')).toBe(true);
    expect([...seen.get('chamaille')!].every(id => levels[id - 1]!.theme === 'animaux')).toBe(true);
    expect([...seen.get('cogne')!].every(id => levels[id - 1]!.theme === 'formes')).toBe(true);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    for (const name of [...Object.values(failAnimations), ...Object.values(dances), 'grille-hint', 'grille-pose']) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
});

it('a wrong picture is refused: its twins are named, and a picture with no twin but not its cell shrugs', () => {
    // Scene 1: the grapes go in the one empty cell (row 2, column 2).
    const s = start(1), l = levels[0]!;
    expect(solutionOf(l)[10]).toBe(3);
    const apple = step(s, { kind: 'pose', cell: 10, image: 0 })!;
    expect(apple.fail).toMatchObject({ kind: 'grimace', cell: 10, image: 0 });
    expect(apple.fail!.twins.length).toBeGreaterThan(0);
    for (const t of apple.fail!.twins) { expect(s.cells[t]).toBe(0); expect(peersOf(4)[10]).toContain(t); }
    expect(step(s, { kind: 'pose', cell: 0, image: 3 })!.fail?.kind).toBe('salto');
    expect(step(s, { kind: 'touche', cell: 0 })!.fail?.kind).toBe('coucou');
    expect(step(s, { kind: 'touche', cell: 10 })).toBeNull();
    expect(step(s, { kind: 'secoue', image: 2 })!.fail?.kind).toBe('tournis');
    expect(step(s, { kind: 'caliroux' })!.fail?.kind).toBe('roulade');
    const won = step(s, { kind: 'pose', cell: 10, image: 3 })!;
    expect(won.fail).toBeNull(); expect(won.state.finished).toBe(true); expect(step(won.state, { kind: 'caliroux' })).toBeNull();
    // A crossing scene: a picture with no twin in the row, the column or the square, but whose cell is elsewhere.
    let shrug: { id: number; a: Action } | null = null;
    for (const lv of levels) {
        const st = start(lv.id), n = sizeOf(lv);
        for (let i = 0; i < n * n && !shrug; i++) if (st.cells[i]! < 0) for (const v of candidates(st.cells, n, imagesOf(lv), i)) if (v !== solutionOf(lv)[i]) { shrug = { id: lv.id, a: { kind: 'pose', cell: i, image: v } }; break; }
        if (shrug) break;
    }
    expect(shrug).not.toBeNull();
    const r = step(start(shrug!.id), shrug!.a)!;
    expect(r.fail).toMatchObject({ kind: 'pasici', twins: [] });
});

it('three funny tries in a row make the right picture and its cell shine; taking it costs a star', () => {
    let s = start(5);
    for (let k = 0; k < TRIES_BEFORE_HELP - 1; k++) s = step(s, { kind: 'caliroux' })!.state;
    expect(helpOn(s)).toBe(false);
    s = step(s, { kind: 'caliroux' })!.state;
    expect(helpOn(s)).toBe(true);
    const h = hint(s)!;
    // The cell shown is one the child can see: the last of the most rows, columns and squares.
    const f = forced(s.cells, 4, imagesOf(levels[4]!));
    expect(f.map(x => x.cell)).toContain(h.cell);
    expect(Math.max(...f.map(x => x.units.length))).toBe(f.find(x => x.cell === h.cell)!.units.length);
    const helped = step(s, { kind: 'pose', ...h })!;
    expect(helped.helped).toBe(true); expect(helped.state.dry).toBe(0); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    // A right picture found alone, before the help, costs nothing.
    const alone = step(start(5), { kind: 'pose', ...hint(start(5))! })!;
    expect(alone.helped).toBe(false); expect(stars(alone.state)).toBe(3);
    expect(stars({ ...helped.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...helped.state, helps: 2 })).toBe(1);
});

it('what CaliRoux says: the gesture and the rule first, then each new thing when it comes', () => {
    expect(instruction(levels[0]!, 'fr')).toEqual(['Il manque un fruit', 'Touche la case vide, puis l’image qui manque.', 'Chaque image une seule fois par ligne, par colonne et par carré.', 'Remplis la grille.']);
    const firstSix = levels.find(l => sizeOf(l) === 6)!;
    expect(instruction(firstSix, 'en')).toContain('Now six pictures, and squares of six cells.');
    expect(instruction(levels[1]!, 'fr')).toEqual([levels[1]!.title.fr, 'Remplis la grille.']);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    let won = start(3);
    while (!won.finished) won = step(won, bestStep(won)!)!.state;
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
