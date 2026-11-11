import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cellXY, complete, DANCE, distance, explore, fails, features, featuresOf, friendsAt, goalsLeft, height, helpOn, hint, IDLE_BEFORE_HELP, isUnlocked, keyOf, levelOf, levels, MIN_GAP, moves, NEEDS, nearest, parseRecords, periodOf, problems, run, solve, stars, start, step, TRIES_BEFORE_HELP, undo, width, type Fail, type Feature, type Move, type State } from '../src/engines/dedale';
import { randomPlayer } from '../src/engines/dedale/solver';
import { failAnimations, thingAnimations } from '../src/games/dedale/art';

/** A robot child (see `randomPlayer`): half of the time the step the help would show, otherwise any of the four steps,
 * funny tries included, over 200 seeds. Measured on the 32 scenes: median at most 101 steps (scene 23), worst game 190
 * steps (scene 23). The bounds leave about 10 % and fail as soon as a scene gets clearly longer. */
const RANDOM_MEDIAN_MAX = 110;
const RANDOM_WORST_MAX = 210;
const RANDOM_LIMIT = 3000;
/** The reachable graph of every scene stays small: the help runs a breadth-first search in the browser. Measured: 7 652
 * states at most (scene 9: the dance of the sun multiplies the clock of the friends). */
const NODES_MAX = 9_000;

const KEYS: Record<string, Move> = { h: 'haut', b: 'bas', g: 'gauche', d: 'droite' };
/** Plays `steps` (`h`, `b`, `g`, `d`, separated by spaces) from the start of a scene. */
const play = (id: number, steps: string): State => { let s = start(id); for (const m of steps.split(' ').filter(Boolean)) s = step(s, KEYS[m]!)!.state; return s; };
const where = (s: State): { x: number; y: number } => cellXY(levelOf(s.level), s.boubou);
const at = (s: State, x: number, y: number): string => s.grid[y * width(levelOf(s.level)) + x]!;

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(width(l), `scene ${l.id}`).toBeLessThanOrEqual(9); expect(height(l), `scene ${l.id}`).toBeLessThanOrEqual(11);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
    }
    expect(new Set(levels.map(l => l.title.fr)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.title.en)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    for (const l of levels.filter(l => l.id < 8)) expect(l.friends.length, `scene ${l.id}: at most one friend before scene 8`).toBeLessThanOrEqual(1);
    // A friend whose round does not close, or that walks into a hedge, is refused; so is a ninth column.
    const one = levels[4]!;
    expect(problems({ ...one, friends: [{ ...one.friends[0]!, route: 'bbh' }] })).toContain('friend 0: a round comes back where it starts');
    expect(problems({ ...one, friends: [{ ...one.friends[0]!, x: 1 }] })).toContain('friend 0: walks on the paths');
    expect(problems({ ...one, rows: one.rows.map(r => `${r}..`) })).toContain('three to eight columns');
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
    // The first three scenes are a corridor, a crossroads and a dead end: nothing new but the alleys.
    for (const id of [1, 2, 3]) expect(featuresOf(levelOf(id))).toEqual([]);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    // The distance counts a changed cell, a row or a column more, a new thing and a step of a round.
    const one = levels[0]!, five = levels[4]!;
    expect(distance(one, one)).toBe(0);
    expect(distance(one, { ...one, rows: [one.rows[0]!, '@.*.*..', one.rows[2]!] })).toBe(1);
    expect(distance(one, { ...one, rows: [...one.rows, '#######'] })).toBe(2);
    expect(distance(one, { ...one, rows: [one.rows[0]!, '@.*.o.*', one.rows[2]!] })).toBe(4);
    expect(distance(five, { ...five, friends: [{ ...five.friends[0]!, route: 'bbhhbh' }] })).toBe(2);
});

it('a scene always starts the same way, and the same steps give the same garden', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    const way = solve(start(23))!;
    let a = start(23), b = start(23);
    for (const m of way) { a = step(a, m)!.state; b = step(b, m)!.state; expect(a).toEqual(b); }
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
        // From every state Boubou can reach, every seed can still be picked (steps only, never the back button).
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
    expect(largest).toBeGreaterThan(5_000);
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
            const before: State = { ...n.state, bonus: 1, steps: 5, tries: 2, dry: 1, idle: 7, helps: 1 }, r = step(before, a)!;
            if (!r.fail) continue;
            seen.set(r.fail.kind, (seen.get(r.fail.kind) ?? 0) + 1);
            const after = r.state;
            // A step that does not happen changes nothing but the counters: the friends wait too.
            if (after.grid !== before.grid || after.boubou !== before.boubou || after.t !== before.t || after.dance !== before.dance || after.bonus !== 1 || after.finished
                || after.steps !== 6 || after.tries !== 3 || after.dry !== 2 || after.idle !== 8 || after.helps !== 1 || r.path.length || r.got.length) changed.push(`scene ${l.id} ${r.fail.kind}`);
        }
    }
    expect(changed).toEqual([]);
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    for (const name of [...Object.values(failAnimations), ...Object.values(thingAnimations)]) {
        expect(css, name).toContain(`@keyframes ${name}{`);
        expect(css, name).toContain(`.${name}{animation:${name} `);
    }
});

it('walking, hedges and edges, puddles, the gate and its key flower, the tunnel, the bridge, the leaves', () => {
    // Scene 1: a step on, then the edge and the hedge are boing; the last seed ends the scene.
    expect(step(start(1), 'gauche')!.fail?.kind).toBe('haie');
    expect(step(start(1), 'haut')!.fail?.kind).toBe('haie');
    let s = play(1, 'd d');
    expect(where(s)).toEqual({ x: 2, y: 1 }); expect(goalsLeft(s.grid)).toBe(2); expect(s.idle).toBe(0);
    s = play(1, 'd d d d d d'); expect(s.finished).toBe(true); expect(step(s, 'gauche')).toBeNull();
    // Scene 7: a puddle is splash.
    expect(step(play(7, 'd'), 'droite')!.fail?.kind).toBe('flaque');
    // Scene 11: the gate waits for the key flower, which opens it.
    expect(step(play(11, 'b b b b b d d d'), 'haut')!.fail?.kind).toBe('porte');
    const key = step(play(11, 'd d d d'), 'droite')!;
    expect(key.opened).toBe(true); expect(key.got).toEqual([{ cell: 5, kind: 'cle' }]); expect(key.state.grid.includes('D')).toBe(false);
    // Scene 13: out of the left mouth, in at the right one; the edge elsewhere is still a hedge.
    const through = step(play(13, 'g g g'), 'gauche')!;
    expect(through.tunnel).toBe(true); expect(where(through.state)).toEqual({ x: 6, y: 0 });
    expect(step(start(13), 'haut')!.fail?.kind).toBe('haie');
    // Scene 14: the stream is plouf, the bridge is crossed up-down only.
    expect(step(play(14, 'b'), 'bas')!.fail?.kind).toBe('ruisseau');
    s = play(14, 'd d b b');
    expect(where(s)).toEqual({ x: 2, y: 2 }); expect(step(s, 'gauche')!.fail?.kind).toBe('ruisseau');
    expect(where(step(s, 'bas')!.state)).toEqual({ x: 2, y: 3 });
    // Scene 15: on the leaves, Boubou slides on to the first cell that is not leaves.
    const slide = step(play(15, 'd'), 'droite')!;
    expect(slide.slid).toBe(true); expect(slide.path.length).toBe(5); expect(where(slide.state)).toEqual({ x: 6, y: 0 });
    const down = step(slide.state, 'bas')!;
    expect(where(down.state)).toEqual({ x: 6, y: 2 });
    const across = step(down.state, 'gauche')!;
    expect(where(across.state)).toEqual({ x: 0, y: 2 }); expect(across.got).toEqual([{ cell: 16, kind: 'graine' }]);
});

it('the friends walk their round only when Boubou steps; walking into one is a funny try; the sun makes them dance and give a seed', () => {
    // Scene 5: the butterfly goes down and up the middle alley, one cell per step of Boubou.
    const level = levelOf(5);
    expect(periodOf(level)).toBe(6);
    expect(friendsAt(level, 0)).toEqual([3]); expect(friendsAt(level, 1)).toEqual([10]); expect(friendsAt(level, 6)).toEqual([3]);
    expect(play(5, 'd').t).toBe(1);
    // Six steps later it is back on top of the alley: walking into it is a sneeze, and nobody moves.
    const s = play(5, 'd g d g d d');
    expect(s.t).toBe(0); expect(where(s)).toEqual({ x: 2, y: 0 });
    const sneeze = step(s, 'droite')!;
    expect(sneeze.fail).toEqual({ kind: 'papillon', x: 3, y: 0 }); expect(sneeze.state.t).toBe(0);
    // Scene 8: the hedgehog stands right of Boubou: a hug.
    expect(step(start(8), 'droite')!.fail).toEqual({ kind: 'herisson', x: 4, y: 2 });
    // Both ways of meeting a friend happen: one standing on the way, one coming onto the cell where Boubou would stop.
    let standing = 0, coming = 0;
    for (const l of levels.filter(l => l.friends.length)) for (const n of explore(start(l.id)).nodes.values()) if (!n.state.finished) for (const a of moves) {
        const r = step(n.state, a)!;
        if (!r.fail || !(l.friends.map(f => f.kind) as string[]).includes(r.fail.kind)) continue;
        const cell = r.fail.y * width(l) + r.fail.x;
        if (friendsAt(l, n.state.t).includes(cell)) standing++; else coming++;
    }
    expect(standing).toBeGreaterThan(0); expect(coming).toBeGreaterThan(0);
    // Scene 9: the sun: the butterfly dances (stands still) for DANCE steps and gives one bonus seed.
    const r = step(play(9, 'g g g h'), 'haut')!;
    expect(r.got).toEqual([{ cell: 0, kind: 'soleil' }]);
    const t = r.state.t;
    let d = r.state;
    for (let k = 0; k < DANCE; k++) { const n = moves.map(m => step(d, m)!).find(x => !x.fail)!; d = n.state; expect(d.t, `dance step ${k}`).toBe(t); }
    const after = moves.map(m => step(d, m)!).find(x => !x.fail)!;
    expect(after.state.t).toBe((t + 1) % periodOf(levelOf(9)));
    expect(at(start(9), 0, 0)).toBe('S'); expect(at(r.state, 0, 0)).toBe('.');
});

it('a slide with « by himself » goes on along the alley, round its bends, and stops at a crossing or a seed', () => {
    // Scene 12, the snail: from the start, along the top and down the right side, the alley never forks until the seed.
    const s = start(12), steps = run(s, 'droite');
    expect(steps.slice(0, 6)).toEqual(['droite', 'droite', 'droite', 'droite', 'droite', 'droite']);
    expect(steps[6]).toBe('bas');
    let e = s;
    for (const m of steps) e = step(e, m)!.state;
    expect(goalsLeft(e.grid)).toBe(goalsLeft(s.grid) - 1);
    // Scene 2: from the middle of the crossroads, one step reaches the seed's alley, which goes on to its end.
    expect(run(start(2), 'droite')).toEqual(['droite', 'droite', 'droite']);
    // A funny try first: just that one step.
    expect(run(start(1), 'haut')).toEqual(['haut']);
});

it('three funny tries in a row, or twenty-five steps without a seed, make the way to the nearest seed pulse; taking it costs a star', () => {
    let s = start(1);
    const miss = (st: State): State => step(st, 'haut')!.state;
    for (let k = 0; k < TRIES_BEFORE_HELP - 1; k++) s = miss(s);
    expect(helpOn(s)).toBe(false);
    s = miss(s);
    expect(helpOn(s)).toBe(true);
    const h = hint(s)!, helped = step(s, h)!;
    expect(h).toBe(nearest(s)![0]);
    expect(helped.helped).toBe(true); expect(helped.state.dry).toBe(0); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    // The help points to the nearest seed, not to the end of the whole scene: on the crossroads, any one arm.
    const cross = start(2);
    expect(nearest(cross)!.length).toBe(3);
    // Back and forth without a seed.
    let w = start(3);
    for (let k = 0; k < IDLE_BEFORE_HELP; k++) { expect(helpOn(w), `step ${k}`).toBe(false); w = step(w, k % 2 ? 'gauche' : 'droite')!.state; }
    expect(helpOn(w)).toBe(true);
    // Following the help alone always picks the next seed, in every scene, from the start.
    for (const l of levels) {
        let f = start(l.id);
        const goal = goalsLeft(f.grid) - 1;
        for (let k = 0; k < 60 && goalsLeft(f.grid) > goal; k++) f = step(f, hint(f)!)!.state;
        expect(goalsLeft(f.grid), `scene ${l.id}`).toBe(goal);
    }
    expect(stars({ ...helped.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...helped.state, helps: 2 })).toBe(1);
});

it('the back button is free and has no limit: it brings back the garden and the friends, a help stays a help', () => {
    const history: State[] = [];
    let s = start(19);
    for (const a of solve(s)!.slice(0, 12)) { history.push(s); s = step(s, a)!.state; }
    s = { ...s, helps: 1 };
    while (history.length) { const before = history.pop()!; s = undo(before, s); expect(keyOf(s)).toBe(keyOf(before)); }
    expect(s.grid).toBe(start(19).grid); expect(s.t).toBe(0); expect(s.helps).toBe(1); expect(s.steps).toBe(12);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    let won = start(3);
    for (const a of solve(won)!) won = step(won, a)!.state;
    expect(won.finished).toBe(true);
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
