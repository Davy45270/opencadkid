import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { actions, cellAt, complete, cratesOf, distance, doorOpen, explore, fails, features, featuresOf, height, helpOn, hint, IDLE_BEFORE_HELP, isUnlocked, keyOf, levels, MIN_GAP, parseRecords, placed, problems, slotsOf, solve, stars, start, step, TRIES_BEFORE_HELP, undo, width, type Action, type Fail, type State } from '../src/engines/caisses';
import { bestStep, randomPlayer } from '../src/engines/caisses/solver';
import { crateAnimations, failAnimations } from '../src/games/caisses/art';

/** A robot child (see `randomPlayer`): half of the time the step the help would show, otherwise any of the eight steps,
 * funny tries included, over 200 seeds. Measured on the 32 scenes: median at most 65.5 steps (scene 21), worst game 104
 * steps (scene 21). The bounds leave a little room and fail as soon as a scene gets clearly longer. */
const RANDOM_MEDIAN_MAX = 70;
const RANDOM_WORST_MAX = 130;
const RANDOM_LIMIT = 3000;
/** The reachable graph of every scene stays small: the help runs a breadth-first search in the browser. Measured: 32 874
 * states at most (scene 24). */
const NODES_MAX = 40_000;

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
    for (const l of levels.filter(l => l.id < 12)) expect(cratesOf(l).length, `scene ${l.id}: at most two crates before scene 12`).toBeLessThanOrEqual(2);
    expect(levels.some(l => cratesOf(l).length === 3)).toBe(true);
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
    // The distance counts a changed cell, a row or a column more and a new thing.
    const one = levels[0]!;
    expect(distance(one, one)).toBe(0);
    expect(distance(one, { ...one, rows: [one.rows[0]!, '.@..+.', ...one.rows.slice(2)] })).toBe(2);
    expect(distance(one, { ...one, rows: [...one.rows, '......'] })).toBe(2);
    expect(distance(one, { ...one, rows: one.rows.map(r => `${r}.`) })).toBe(2);
});

it('a scene always starts the same way', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
});

it('every scene can be finished: the solver finds the shortest way, and no reachable state is a dead end thanks to pulling', { timeout: 120_000 }, () => {
    const shortest: number[] = [];
    let largest = 0;
    for (const l of levels) {
        const way = solve(start(l.id));
        expect(way, `scene ${l.id}`).not.toBeNull();
        let s = start(l.id);
        for (const a of way!) { const r = step(s, a)!; expect(r.fail, `scene ${l.id}`).toBeNull(); s = r.state; }
        expect(s.finished, `scene ${l.id}`).toBe(true);
        shortest.push(way!.length);
        // From every state Boubou can reach, the end can still be reached.
        const g = explore(start(l.id));
        largest = Math.max(largest, g.nodes.size);
        expect(g.nodes.size, `scene ${l.id}`).toBeLessThanOrEqual(NODES_MAX);
        const back = new Map<string, string[]>();
        for (const [k, n] of g.nodes) for (const e of n.next) { const b = back.get(e.key); if (b) b.push(k); else back.set(e.key, [k]); }
        const alive = new Set(g.goals), queue = [...g.goals];
        for (let i = 0; i < queue.length; i++) for (const b of back.get(queue[i]!) ?? []) if (!alive.has(b)) { alive.add(b); queue.push(b); }
        expect(g.nodes.size - alive.size, `scene ${l.id}: dead ends`).toBe(0);
    }
    expect(Math.min(...shortest)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...shortest)).toBeLessThanOrEqual(30);
    expect(largest).toBeGreaterThan(1000);
});

it(`a robot playing at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} steps over 200 seeds, never more than ${RANDOM_WORST_MAX}`, { timeout: 300_000 }, () => {
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, RANDOM_LIMIT));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.steps, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const n = runs.map(r => r.steps).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
    }
});

it('every funny try exists in some scene, has its own animation, and changes nothing on the board', { timeout: 120_000 }, () => {
    const seen = new Map<Fail, number>(), changed: string[] = [];
    for (const l of levels) {
        for (const n of explore(start(l.id)).nodes.values()) if (!n.state.finished) for (const a of actions) {
            const before: State = { ...n.state, steps: 5, tries: 2, dry: 1, idle: 7, helps: 1 }, r = step(before, a)!;
            if (!r.fail) continue;
            seen.set(r.fail.kind, (seen.get(r.fail.kind) ?? 0) + 1);
            // The very same crates, Boubou where he was, only the counters move on.
            const after = r.state;
            if (after.crates !== before.crates || after.x !== before.x || after.y !== before.y || after.finished || after.best !== before.best
                || after.steps !== 6 || after.tries !== 3 || after.dry !== 2 || after.idle !== 8 || after.helps !== 1) changed.push(`scene ${l.id} ${r.fail.kind}`);
        }
    }
    expect(changed).toEqual([]);
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    for (const name of [...Object.values(failAnimations), ...Object.values(crateAnimations)]) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
});

it('pushing and pulling: a pull undoes a push, a pull with nothing behind is a funny try, a stuck crate comes out', () => {
    // Scene 1: push right, then pull left brings back the very same board.
    const s0 = start(1), pushed = step(s0, 'droite')!;
    expect(pushed.crate).toMatchObject({ index: 0 }); expect(pushed.state.crates[0]).toMatchObject({ x: 3, y: 2 });
    const back = step(pushed.state, 'tire-gauche')!;
    expect(back.fail).toBeNull(); expect(keyOf(back.state)).toBe(keyOf(s0));
    expect(step(s0, 'tire-haut')!.fail?.kind).toBe('vide');
    // Scene 4: the crate in the corner cannot be pushed, only pulled.
    expect(solve(start(4), false)).toBeNull();
    expect(step(start(4), 'tire-droite')!.state.crates[0]).toMatchObject({ x: 1, y: 0 });
    expect(step(start(4), 'gauche')!.fail?.kind).toBe('bonk');
});

it('ice slides a crate to the wall, a belt carries it one cell, a crate fills a hole and comes back out, a button opens the gate', () => {
    // Scene 10: one push and the crate crosses the ice onto its spot.
    let s = start(10);
    s = step(s, 'haut')!.state;
    const slid = step(s, 'droite')!;
    expect(slid.crate!.slide.path.map(p => p.by)).toEqual(['glace', 'glace', 'glace']);
    expect(slid.state.finished).toBe(true);
    // Scene 8: the belt carries the crate down by one cell, not more.
    const belt = step(start(8), 'droite')!;
    expect(belt.crate!.slide.path).toEqual([{ x: 3, y: 2, by: 'tapis' }]);
    expect(cellAt(levels[7]!, 3, 2).ground).toBe('tapis');
    // Scene 11: the hole swallows the crate, Boubou walks over it, and a pull takes it back out.
    s = start(11);
    for (const a of ['gauche', 'haut', 'haut', 'droite', 'droite'] as Action[]) s = step(s, a)!.state;
    expect(s.crates[0]).toMatchObject({ x: 3, y: 1, sunk: true });
    s = step(s, 'droite')!.state; expect([s.x, s.y]).toEqual([3, 1]);
    s = step(s, 'droite')!.state;
    const out = step(s, 'tire-droite')!;
    expect(out.fail).toBeNull(); expect(out.state.crates[0]).toMatchObject({ x: 4, y: 1, sunk: false });
    expect(step(start(11), 'droite')!.state.x).toBe(2);
    // Scene 9: the gate opens while a crate sits on the button.
    const l9 = levels[8]!;
    expect(doorOpen(l9, start(9))).toBe(false);
    let g = start(9);
    for (const a of ['gauche', 'haut', 'haut', 'droite'] as Action[]) g = step(g, a)!.state;
    expect(doorOpen(l9, g)).toBe(true);
});

it('the spot of a toy takes only that toy: the crate refuses to go on another drawing', () => {
    const l = levels[5]!, s = start(6);
    expect(slotsOf(l).map(p => p.motif)).toEqual(['ours', 'ballon']);
    // Push the balloon along the top row: it stops in front of the teddy's drawing.
    let t = s;
    for (const a of ['gauche', 'gauche', 'haut', 'haut', 'haut', 'droite', 'droite'] as Action[]) t = step(t, a)!.state;
    const r = step(t, 'droite')!;
    expect(r.fail?.kind).toBe('motif');
    expect(placed(l, r.state.crates)).toBe(0);
});

it('three funny tries in a row, or forty steps without a new crate put away, make the right next step shine; taking it costs a star', () => {
    let s = start(2);
    const miss = (st: State): State => step(st, 'tire-haut')!.state;
    for (let k = 0; k < TRIES_BEFORE_HELP - 1; k++) s = miss(s);
    expect(helpOn(s)).toBe(false);
    s = miss(s);
    expect(helpOn(s)).toBe(true);
    const h = hint(s)!, helped = step(s, h)!;
    expect(h).toBe(solve(s)![0]); expect(bestStep(s)).not.toBeNull();
    expect(helped.helped).toBe(true); expect(helped.state.dry).toBe(0); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    expect(solve(helped.state)!.length).toBe(solve(s)!.length - 1);
    // Walking back and forth without tidying anything.
    let w = start(1);
    for (let k = 0; k < IDLE_BEFORE_HELP; k++) { expect(helpOn(w), `step ${k}`).toBe(false); w = step(w, k % 2 ? 'bas' : 'haut')!.state; }
    expect(helpOn(w)).toBe(true);
    expect(stars({ ...helped.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...helped.state, helps: 2 })).toBe(1);
});

it('the back button is free and has no limit: it brings back the board, a help stays a help', () => {
    const history: State[] = [];
    let s = start(6);
    for (const a of solve(s)!.slice(0, 6)) { history.push(s); s = step(s, a)!.state; }
    s = { ...s, helps: 1 };
    while (history.length) { const before = history.pop()!; s = undo(before, s); expect(keyOf(s)).toBe(keyOf(before)); }
    expect(keyOf(s)).toBe(keyOf(start(6))); expect(s.helps).toBe(1); expect(s.steps).toBe(6);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    let won = start(3);
    for (const a of solve(won)!) won = step(won, a)!.state;
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
