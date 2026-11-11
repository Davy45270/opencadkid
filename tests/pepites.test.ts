import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cellXY, complete, distance, explore, fails, features, featuresOf, height, helpOn, hint, IDLE_BEFORE_HELP, isUnlocked, keyOf, levelOf, levels, MIN_GAP, moves, NEEDS, nuggetsLeft, parseRecords, problems, rocksOf, solve, stars, start, step, TRIES_BEFORE_HELP, undo, width, type Fail, type Feature, type Move, type State } from '../src/engines/pepites';
import { bestStep, randomPlayer } from '../src/engines/pepites/solver';
import { failAnimations } from '../src/games/pepites/art';

/** A robot child (see `randomPlayer`): half of the time the step the help would show, otherwise any of the four steps,
 * funny tries included, over 200 seeds. Measured on the 30 scenes: median at most 99.5 steps (scene 30), worst game 160
 * steps (scene 30). The bounds leave a little room and fail as soon as a scene gets clearly longer. */
const RANDOM_MEDIAN_MAX = 110;
const RANDOM_WORST_MAX = 190;
const RANDOM_LIMIT = 3000;
/** The reachable graph of every scene stays small: the help runs a breadth-first search in the browser. Measured: 3 618
 * states at most (scene 17). */
const NODES_MAX = 5_000;

const KEYS: Record<string, Move> = { h: 'haut', b: 'bas', g: 'gauche', d: 'droite' };
/** Plays `steps` (`h`, `b`, `g`, `d`, separated by spaces) from the start of a scene. */
const play = (id: number, steps: string): State => { let s = start(id); for (const m of steps.split(' ').filter(Boolean)) s = step(s, KEYS[m]!)!.state; return s; };
const at = (s: State, x: number, y: number): string => s.grid[y * width(levelOf(s.level)) + x]!;
const lumi = (s: State): { x: number; y: number } => cellXY(levelOf(s.level), s.lumi);

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(width(l), `scene ${l.id}`).toBeLessThanOrEqual(7); expect(height(l), `scene ${l.id}`).toBeLessThanOrEqual(9);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
    }
    expect(new Set(levels.map(l => l.title.fr)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.title.en)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    for (const l of levels.filter(l => l.id < 10)) expect(rocksOf(l), `scene ${l.id}: at most three rocks before scene 10`).toBeLessThanOrEqual(3);
    // A scene that would start with something falling is refused.
    expect(problems({ ...levels[0]!, rows: ['..@..', '..o..', '.._..', '..*..', '..P..'] })).toContain('nothing falls before the first step');
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
    expect(featuresOf(levels[0]!)).toEqual([]);
    // The scene that brings in pushing cannot be finished without it.
    const push = levels.find(l => featuresOf(l).includes('pousser'))!;
    expect(solve(start(push.id), { push: false })).toBeNull();
    expect(solve(start(push.id))).not.toBeNull();
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    // The distance counts a changed cell, a row or a column more and a new thing.
    const one = levels[0]!;
    expect(distance(one, one)).toBe(0);
    expect(distance(one, { ...one, rows: [one.rows[0]!, '..*..', ...one.rows.slice(2)] })).toBe(1);
    expect(distance(one, { ...one, rows: [...one.rows, '.....'] })).toBe(2);
    expect(distance(one, { ...one, rows: [one.rows[0]!, '..X..', ...one.rows.slice(2)] })).toBe(4);
});

it('a scene always starts the same way', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
});

it('every scene can be finished: the solver finds the shortest way, and no reachable state is a dead end, without the back button', { timeout: 60_000 }, () => {
    const shortest: number[] = [];
    let largest = 0;
    for (const l of levels) {
        const way = solve(start(l.id));
        expect(way, `scene ${l.id}`).not.toBeNull();
        let s = start(l.id);
        for (const a of way!) { const r = step(s, a)!; expect(r.fail, `scene ${l.id}`).toBeNull(); s = r.state; }
        expect(s.finished, `scene ${l.id}`).toBe(true);
        shortest.push(way!.length);
        // From every state Lumi can reach, the door can still be reached (steps only, never the back button).
        const g = explore(start(l.id));
        largest = Math.max(largest, g.nodes.size);
        expect(g.nodes.size, `scene ${l.id}`).toBeLessThanOrEqual(NODES_MAX);
        const back = new Map<string, string[]>();
        for (const [k, n] of g.nodes) for (const e of n.next) { const b = back.get(e.key); if (b) b.push(k); else back.set(e.key, [k]); }
        const alive = new Set(g.goals), queue = [...g.goals];
        for (let i = 0; i < queue.length; i++) for (const b of back.get(queue[i]!) ?? []) if (!alive.has(b)) { alive.add(b); queue.push(b); }
        expect(g.nodes.size - alive.size, `scene ${l.id}: dead ends`).toBe(0);
    }
    expect(Math.min(...shortest)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...shortest)).toBeLessThanOrEqual(50);
    expect(largest).toBeGreaterThan(1_000);
});

it('the key of a state forgets only the earth that can never matter', () => {
    // Scene 1 has nothing that falls: digging anywhere leads back to the same state once Lumi is back.
    expect(keyOf(play(1, 'g b d h'))).toBe(keyOf(play(1, 'd b g h')));
    expect(play(1, 'g b d h').grid).not.toBe(play(1, 'd b g h').grid);
});

it(`a robot playing half with the help, half at random, finishes every scene: median at most ${RANDOM_MEDIAN_MAX} steps over 200 seeds, never more than ${RANDOM_WORST_MAX}`, { timeout: 60_000 }, () => {
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, RANDOM_LIMIT));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.steps, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const n = runs.map(r => r.steps).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
});

it('every funny try exists in some scene, has its own animation, and costs nothing', () => {
    const seen = new Map<Fail, number>(), changed: string[] = [];
    for (const l of levels) {
        for (const n of explore(start(l.id)).nodes.values()) if (!n.state.finished) for (const a of moves) {
            const before: State = { ...n.state, steps: 5, tries: 2, dry: 1, idle: 7, helps: 1 }, r = step(before, a)!;
            const kind = r.fail?.kind ?? (r.bonk ? 'chapeau' : null);
            if (!kind) continue;
            seen.set(kind, (seen.get(kind) ?? 0) + 1);
            const after = r.state;
            // A step that does not happen changes nothing but the counters.
            if (r.fail && (after.grid !== before.grid || after.lumi !== before.lumi || after.basket !== before.basket || after.finished
                || after.steps !== 6 || after.tries !== 3 || after.dry !== 2 || after.idle !== 8 || after.helps !== 1)) changed.push(`scene ${l.id} ${kind}`);
            // A bonk: Lumi still makes her step, nothing she has is lost, and the rock is on her hat or beside it.
            if (r.bonk) {
                const w = width(levelOf(l.id)), [dx, dy] = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] }[a];
                if (after.lumi !== before.lumi + dx! + dy! * w || nuggetsLeft(after.grid) > nuggetsLeft(before.grid) || after.basket < before.basket || after.tries !== 3 || after.dry !== 2) changed.push(`scene ${l.id} chapeau`);
                if (at(after, r.bonk.x + r.bonk.roll, r.bonk.y) !== 'o' || r.bonk.y * w + r.bonk.x !== after.lumi - w) changed.push(`scene ${l.id} chapeau place`);
            }
        }
    }
    expect(changed).toEqual([]);
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    for (const name of Object.values(failAnimations)) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
});

it('digging, the door, a rock that falls when dug under, a bonk on the hat, pushing, too heavy', () => {
    // Scene 1: off the board is the roots; the door waits for the nugget.
    expect(step(start(1), 'haut')!.fail?.kind).toBe('racine');
    let s = play(1, 'b');
    expect(at(s, 2, 1)).toBe('_'); expect(step(start(1), 'bas')!.dug).toBe(true);
    s = play(1, 'b b b b b'); expect(s.finished).toBe(true); expect(s.steps).toBe(5);
    expect(step(play(2, 'b b b b b b d'), 'droite')!.fail?.kind).toBe('porte');
    // Scene 3: the nugget under the rock, then a step back: the rock drops into the hole; pushing it into the roots is too heavy.
    s = play(3, 'd d d d b b b g g');
    expect(lumi(s)).toEqual({ x: 2, y: 3 }); expect(at(s, 2, 2)).toBe('o'); expect(nuggetsLeft(s.grid)).toBe(0);
    const back = step(s, 'droite')!;
    expect(back.moved).toEqual([{ from: 2 * 6 + 2, to: 3 * 6 + 2, kind: 'o' }]); expect(at(back.state, 2, 3)).toBe('o');
    expect(step(back.state, 'gauche')!.fail?.kind).toBe('lourd');
    // Scene 4: under the rock, a step down: bonk, the rock stays on the hat (roots on both sides).
    s = play(4, 'b b b b b g g h h h');
    expect(lumi(s)).toEqual({ x: 2, y: 2 });
    const bonk = step(s, 'bas')!;
    expect(bonk.fail).toBeNull(); expect(bonk.bonk).toEqual({ x: 2, y: 2, roll: 0 }); expect(bonk.state.tries).toBe(1); expect(lumi(bonk.state)).toEqual({ x: 2, y: 3 });
    // Scene 6: two pushes along the gallery, then the nugget below; a rock cannot be lifted.
    s = play(6, 'b b d');
    const push = step(s, 'droite')!;
    expect(push.pushed).toEqual({ from: 2 * 5 + 2, to: 2 * 5 + 3, kind: 'o' }); expect(lumi(push.state)).toEqual({ x: 2, y: 2 });
    s = play(6, 'b b d d d b');
    expect(nuggetsLeft(s.grid)).toBe(0); expect(at(s, 4, 2)).toBe('o');
    expect(step(play(3, 'd d d d b b b g g'), 'haut')!.fail?.kind).toBe('lourd');
    expect(solve(start(6), { push: false })).toBeNull();
});

it('apples roll off rocks and are caught on the hat, water runs and splashes, worms want apples, the giant nugget takes two knocks', () => {
    // Scene 12: under the apple, a step down: it falls on the hat and Lumi catches it.
    let s = play(12, 'd d b d');
    const catchIt = step(s, 'bas')!;
    expect(catchIt.caught).toBe(true); expect(catchIt.state.basket).toBe(1); expect(at(catchIt.state, 3, 0)).toBe('_');
    // Scene 10: with the earth beside the rock dug, the apple rolls off it.
    s = play(10, 'd d b b');
    const roll = step(s, 'haut')!.state, rolled = step(roll, 'haut')!;
    expect(rolled.moved.some(m => m.kind === 'a' && m.to === m.from - 1)).toBe(true);
    // Scene 16: water is plouf; opened, the drain takes it; water coming onto the hat splashes away.
    s = play(16, 'd d d d d b b g g');
    expect(step(s, 'gauche')!.fail?.kind).toBe('plouf');
    s = play(16, 'd d d d d b b g g b b');
    expect(at(s, 3, 2)).toBe('~');
    const splash = step(s, 'haut')!;
    expect(splash.splash).toBe(true); expect(splash.state.grid.includes('~')).toBe(false);
    // Scene 19: the worm yawns without an apple, wriggles off with one.
    s = play(19, 'b b b');
    expect(step(s, 'bas')!.fail?.kind).toBe('ver');
    s = play(19, 'b b b g h');
    expect(s.basket).toBe(1);
    const fed = step(play(19, 'b b b g h b d'), 'bas')!;
    expect(fed.fed).toBe(4 * 5 + 2); expect(fed.state.basket).toBe(0); expect(at(fed.state, 2, 4)).toBe('_'); expect(lumi(fed.state)).toEqual({ x: 2, y: 3 });
    // Scene 21: knock, crack; knock, the giant nugget is Lumi's.
    s = play(21, 'b b');
    const crack = step(s, 'bas')!;
    expect(crack.crack).toBe(true); expect(at(crack.state, 2, 3)).toBe('g'); expect(lumi(crack.state)).toEqual({ x: 2, y: 2 });
    const take = step(crack.state, 'bas')!;
    expect(take.got).toBe('geante'); expect(take.state.idle).toBe(0); expect(lumi(take.state)).toEqual({ x: 2, y: 3 });
    // Scene 13: hard rock goes bzzz.
    expect(step(start(13), 'bas')!.fail?.kind).toBe('dure');
});

it('three funny tries in a row, or thirty steps without a nugget, make the right next step shine; taking it costs a star', () => {
    let s = start(1);
    const miss = (st: State): State => step(st, 'haut')!.state;
    for (let k = 0; k < TRIES_BEFORE_HELP - 1; k++) s = miss(s);
    expect(helpOn(s)).toBe(false);
    s = miss(s);
    expect(helpOn(s)).toBe(true);
    const h = hint(s)!, helped = step(s, h)!;
    expect(h).toBe(solve(s)![0]); expect(bestStep(s)).not.toBeNull();
    expect(helped.helped).toBe(true); expect(helped.state.dry).toBe(0); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    expect(solve(helped.state)!.length).toBe(solve(s)!.length - 1);
    // Back and forth without a nugget.
    let w = start(2);
    for (let k = 0; k < IDLE_BEFORE_HELP; k++) { expect(helpOn(w), `step ${k}`).toBe(false); w = step(w, k % 2 ? 'gauche' : 'droite')!.state; }
    expect(helpOn(w)).toBe(true);
    expect(stars({ ...helped.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...helped.state, helps: 2 })).toBe(1);
});

it('the back button is free and has no limit: it brings back the garden, a help stays a help', () => {
    const history: State[] = [];
    let s = start(3);
    for (const a of solve(s)!.slice(0, 10)) { history.push(s); s = step(s, a)!.state; }
    s = { ...s, helps: 1 };
    while (history.length) { const before = history.pop()!; s = undo(before, s); expect(keyOf(s)).toBe(keyOf(before)); }
    expect(s.grid).toBe(start(3).grid); expect(s.helps).toBe(1); expect(s.steps).toBe(10);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    let won = start(3);
    for (const a of solve(won)!) won = step(won, a)!.state;
    expect(won.finished).toBe(true); expect(step(won, 'haut')).toBeNull();
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
