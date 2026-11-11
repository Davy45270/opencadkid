import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { actions, boardOf, breeze, complete, distance, explore, fails, features, featuresOf, height, helpOn, hint, IDLE_BEFORE_HELP, isUnlocked, layAt, levels, MIN_GAP, next, parseRecords, problems, slide, slides, solve, stars, start, step, TRIES_BEFORE_HELP, width, type Fail, type LevelDef, type State } from '../src/engines/eclosion';
import { randomPlayer } from '../src/engines/eclosion/solver';
import { failAnimations } from '../src/games/eclosion/art';
import { DIAGONAL, gestureOf, SLIDE_PX } from '../src/games/eclosion/interaction';

/** A robot child (see `randomPlayer`): half of the time the slide the help would show, otherwise any of the eight gestures,
 * funny tries included, over 200 seeds. Measured on the 32 scenes: median at most 13 gestures (scene 32), worst game 28
 * gestures (scene 32). The bounds leave a little room and fail as soon as a scene gets clearly longer. */
const RANDOM_MEDIAN_MAX = 15;
const RANDOM_WORST_MAX = 35;
/** Every nest reachable in a scene is explored by the tests: measured, 77 760 at most (scene 32). */
const NODES_MAX = 100_000;
const scene = (rows: string[], target: number, more: Partial<LevelDef> = {}): LevelDef => ({ id: 999, title: { fr: 'x', en: 'x' }, moment: 'x', rows, target, count: 1, ...more });

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
    // The nest starts at 3 × 3 and never goes beyond 4 × 4.
    expect([width(levels[0]!), height(levels[0]!)]).toEqual([3, 3]);
    expect(levels.some(l => width(l) === 4 && height(l) === 4)).toBe(true);
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
    // The order of the brief: one hatching, two of them, a hen, the big nest, the stone, the laying, the peacock and dragon.
    expect([...met]).toEqual(['deux', 'poule', 'grand', 'pierre', 'ponte', 'loin']);
});

it(`two scenes always differ by at least MIN_GAP (${MIN_GAP}), and the closest pair is exactly that far apart`, () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBe(MIN_GAP);
    const one = levels[0]!;
    expect(distance(one, one)).toBe(0);
    expect(distance(one, { ...one, rows: ['0..', '..0', '...'] })).toBe(2);
    expect(distance(one, { ...one, rows: [...one.rows, '...'] })).toBe(2 + 3);
    expect(distance(one, { ...one, target: 2 })).toBe(2 + 3);
});

it('a scene always starts the same way', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
});

it('every scene can be finished, the first ones in one to three slides, and no reachable nest is a dead end', { timeout: 60_000 }, () => {
    const shortest: number[] = [];
    let largest = 0;
    for (const l of levels) {
        const way = solve(l, boardOf(l));
        expect(way, `scene ${l.id}`).not.toBeNull();
        let s = start(l.id);
        for (const a of way!) { const r = step(s, a)!; expect(r.fail, `scene ${l.id}`).toBeNull(); s = r.state; }
        expect(s.finished, `scene ${l.id}`).toBe(true);
        shortest.push(way!.length);
        const g = explore(l, boardOf(l), NODES_MAX);
        expect(g.complete, `scene ${l.id}: ${g.nodes.size} nests`).toBe(true);
        largest = Math.max(largest, g.nodes.size);
        const back = new Map<string, string[]>();
        for (const [k, n] of g.nodes) for (const e of n) { const b = back.get(e); if (b) b.push(k); else back.set(e, [k]); }
        const alive = new Set(g.goals), queue = [...g.goals];
        for (let i = 0; i < queue.length; i++) for (const b of back.get(queue[i]!) ?? []) if (!alive.has(b)) { alive.add(b); queue.push(b); }
        expect(g.nodes.size - alive.size, `scene ${l.id}: dead ends`).toBe(0);
    }
    expect(shortest.slice(0, 2)).toEqual([1, 1]);
    expect(Math.max(...shortest.slice(0, 8))).toBeLessThanOrEqual(3);
    expect(Math.max(...shortest)).toBeLessThanOrEqual(10);
    expect(largest).toBeGreaterThan(10_000);
});

it(`a robot playing at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} gestures over 200 seeds, never more than ${RANDOM_WORST_MAX}`, { timeout: 120_000 }, () => {
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.steps, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const n = runs.map(r => r.steps).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
});

it('every funny try exists in some scene, has its own animation, and changes nothing in the nest', { timeout: 60_000 }, () => {
    const seen = new Map<Fail, number>(), changed: string[] = [];
    for (const l of levels) {
        for (const b of explore(l, boardOf(l)).nodes.keys()) {
            const before: State = { ...start(l.id), board: b, steps: 5, tries: 2, dry: 1, idle: 3, helps: 1 };
            if (before.finished || b.includes(String(l.target))) continue;
            for (const a of actions) {
                const r = step(before, a)!;
                if (!r.fail) continue;
                seen.set(r.fail, (seen.get(r.fail) ?? 0) + 1);
                const after = r.state, onNest = a !== 'lumi' && a !== 'cible';
                if (after.board !== before.board || after.finished || after.steps !== 6 || after.tries !== 3 || after.dry !== (onNest ? 2 : 1) || after.idle !== 3 || after.helps !== 1) changed.push(`scene ${l.id} ${r.fail}`);
            }
        }
    }
    expect(changed).toEqual([]);
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    for (const name of [...Object.values(failAnimations), 'eclosion-eclot', 'eclosion-pond', 'eclosion-envole']) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
    // The three ways a slide moves nothing, told apart.
    expect(step(start(1), 'haut')!.fail).toBeNull();
    const edge = { ...start(1), board: '0.......1' };
    expect(step(edge, 'gauche')!.fail).toBeNull();
    expect(step({ ...start(1), board: '01.......' }, 'gauche')!.fail).toBe('tete');
    expect(step({ ...start(1), board: '0........' }, 'haut')!.fail).toBe('mur');
    expect(step({ ...start(11), board: '0#.......' }, 'droite')!.fail).toBe('pierre');
});

it('sliding: everything goes to the edge, a pair hatches once per slide, the front pair first, a stone cuts the line', () => {
    const row = scene(['....', '....', '....', '....'], 4);
    expect(slide(row, '0000' + '.'.repeat(12), 'gauche').board.slice(0, 4)).toBe('11..');
    expect(slide(row, '000.' + '.'.repeat(12), 'gauche').board.slice(0, 4)).toBe('10..');
    expect(slide(row, '000.' + '.'.repeat(12), 'droite').board.slice(0, 4)).toBe('..01');
    expect(slide(row, '110.' + '.'.repeat(12), 'gauche').board.slice(0, 4)).toBe('20..');
    // A chick just hatched does not hatch again in the same slide.
    expect(slide(row, '100.' + '.'.repeat(12), 'gauche').board.slice(0, 4)).toBe('11..');
    const stony = scene(['0#.0'], 1);
    expect(slide(stony, '0#.0', 'gauche').board).toBe('0#0.');
    expect(slide(stony, '0#.0', 'droite').board).toBe('0#.0');
    const r = slide(row, '0.0.' + '.'.repeat(12), 'gauche');
    expect(r.hatched).toEqual([0]); expect(r.ways.filter(w => w.merged).map(w => w.from).sort()).toEqual([0, 2]);
});

it('Lumi lays her egg behind, in a fixed place, and the breeze empties a nest that can no longer slide', { timeout: 60_000 }, () => {
    // Scene 13: the egg slides left, Lumi lays on the right column, in the middle row, where the egg was.
    const l13 = levels[12]!, r = next(l13, boardOf(l13), 'gauche')!;
    expect(r.laid).toBe(5); expect(r.board).toBe('...0.0...');
    expect(layAt(l13, '0........', 'haut')).toBe(7);
    expect(next(l13, r.board, 'gauche')!.finished).toBe(true);
    expect(next(levels[0]!, boardOf(levels[0]!), 'gauche')!.laid).toBe(-1);
    // A full nest where nothing can slide: the smallest creatures fly to Lumi's basket.
    expect(breeze('010101012')).toEqual({ board: '.1.1.1.12', gone: [0, 2, 4, 6] });
    // The breeze really blows in the scenes where Lumi lays: in the first one with a nest that can fill up (scene 20).
    const l20 = levels[19]!, blown = [...explore(l20, boardOf(l20)).nodes.keys()].filter(b => slides.some(d => (next(l20, b, d)?.gone.length ?? 0) > 0));
    expect(blown.length).toBeGreaterThan(0);
});

it('the target needs two in the « deux » scenes, and a bigger creature comes from two of the one before', () => {
    let s = start(4);
    s = step(s, 'gauche')!.state;
    expect(s.finished).toBe(true); expect(s.board.split('').filter(c => c === '1').length).toBe(2);
    let p = start(15);
    for (const a of solve(levels[14]!, p.board)!) p = step(p, a)!.state;
    expect(p.finished).toBe(true); expect(p.board).toContain('3');
    let d = start(16);
    for (const a of solve(levels[15]!, d.board)!) d = step(d, a)!.state;
    expect(d.board).toContain('4');
});

it(`${TRIES_BEFORE_HELP} funny tries in a row, or ${IDLE_BEFORE_HELP} slides that hatch nothing, make the right arrow shine; taking it costs a star`, () => {
    let s = start(3);
    for (let k = 0; k < TRIES_BEFORE_HELP - 1; k++) s = step(s, 'diagonale')!.state;
    s = step(s, 'lumi')!.state; s = step(s, 'cible')!.state;
    expect(helpOn(s)).toBe(false);
    s = step(s, 'secoue')!.state;
    expect(helpOn(s)).toBe(true);
    const h = hint(s)!, helped = step(s, h)!;
    expect(h).toBe(solve(levels[2]!, s.board)![0]);
    expect(helped.helped).toBe(true); expect(helped.state.dry).toBe(0); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    // Sliding round and round without hatching anything.
    let w = start(9);
    for (let k = 0; k < IDLE_BEFORE_HELP; k++) { expect(helpOn(w), `slide ${k}`).toBe(false); const r = step(w, k % 2 ? 'bas' : 'haut')!; expect(r.fail).toBeNull(); w = r.state; }
    expect(helpOn(w)).toBe(true);
    expect(stars({ ...helped.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...helped.state, helps: 2 })).toBe(1);
});

it('a finger slide is read from its bigger side, a short touch is no slide, a slide near 45° is a diagonal', () => {
    expect(gestureOf(SLIDE_PX - 1, 0)).toBeNull();
    expect(gestureOf(40, 10)).toBe('droite'); expect(gestureOf(-40, -20)).toBe('gauche');
    expect(gestureOf(12, 60)).toBe('bas'); expect(gestureOf(-25, -50)).toBe('haut');
    expect(gestureOf(50, 50 * DIAGONAL)).toBe('diagonale'); expect(gestureOf(-40, 38)).toBe('diagonale');
    expect(gestureOf(50, 50 * DIAGONAL - 2)).toBe('droite');
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    let won = start(3);
    for (const a of solve(levels[2]!, won.board)!) won = step(won, a)!.state;
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
    expect(step(won, 'haut')).toBeNull();
});
