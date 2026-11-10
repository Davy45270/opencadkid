import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { actions, cellXY, complete, distance, explore, fails, features, featuresOf, height, helpOn, hint, IDLE_BEFORE_HELP, isUnlocked, keyOf, leavesOf, levelOf, levels, MIN_GAP, moves, parseRecords, problems, solve, stars, start, step, TRIES_BEFORE_HELP, undo, width, type Action, type Fail, type Feature, type State } from '../src/engines/chenille';
import { bestStep, randomPlayer } from '../src/engines/chenille/solver';
import { failAnimations } from '../src/games/chenille/art';

/** A robot child (see `randomPlayer`): half of the time the step the help would show, otherwise any of the five steps,
 * funny tries included, over 200 seeds. Measured on the 32 scenes: median at most 74 steps (scene 32), worst game 138
 * steps (scene 26). The bounds leave a little room and fail as soon as a scene gets clearly longer. */
const RANDOM_MEDIAN_MAX = 80;
const RANDOM_WORST_MAX = 160;
const RANDOM_LIMIT = 3000;
/** The reachable graph of every scene stays small: the help runs a breadth-first search in the browser. Measured: 38 804
 * states at most (scene 26). */
const NODES_MAX = 45_000;

const at = (id: number, a: Action[]): State => { let s = start(id); for (const m of a) s = step(s, m)!.state; return s; };
const head = (s: State): { x: number; y: number } => cellXY(levelOf(s.level), s.body[0]!);

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
    for (const l of levels.filter(l => l.id < 10)) expect(leavesOf(l), `scene ${l.id}: at most four leaves before scene 10`).toBeLessThanOrEqual(4);
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

it('in the scene that brings it in, each new thing matters: without it the scene is longer, or cannot be finished', () => {
    const intro = (f: Feature): number => levels.find(l => featuresOf(l).includes(f))!.id;
    const shortest = (id: number, rules = {}): number => solve(start(id), rules)?.length ?? Infinity;
    expect(solve(start(intro('retourne')), { turning: false })).toBeNull();
    expect(solve(start(intro('tunnel')), { tunnel: false })).toBeNull();
    expect(shortest(intro('pomme'), { apples: false })).toBeGreaterThan(shortest(intro('pomme')));
    expect(shortest(intro('pont'), { bridge: false })).toBeGreaterThan(shortest(intro('pont')));
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    // The distance counts a changed cell, a ring lying another way, a row or a column more and a new thing.
    const one = levels[0]!;
    expect(distance(one, one)).toBe(0);
    expect(distance(one, { ...one, rows: [one.rows[0]!, '..l..', ...one.rows.slice(2)] })).toBe(1);
    expect(distance(one, { ...one, tail: 'g' })).toBe(1);
    expect(distance(one, { ...one, rows: [...one.rows, '.....'] })).toBe(2);
    expect(distance(one, { ...one, rows: [one.rows[0]!, '..o..', ...one.rows.slice(2)] })).toBe(4);
});

it('a scene always starts the same way', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
});

it('every scene can be finished: the solver finds the shortest way, and no reachable state is a dead end, without the back button', { timeout: 120_000 }, () => {
    const shortest: number[] = [];
    let largest = 0;
    for (const l of levels) {
        const way = solve(start(l.id));
        expect(way, `scene ${l.id}`).not.toBeNull();
        let s = start(l.id);
        for (const a of way!) { const r = step(s, a)!; expect(r.fail, `scene ${l.id}`).toBeNull(); s = r.state; }
        expect(s.finished, `scene ${l.id}`).toBe(true);
        shortest.push(way!.length);
        // From every state the caterpillar can reach, the cocoon can still be reached (moves and turning round only).
        const g = explore(start(l.id));
        largest = Math.max(largest, g.nodes.size);
        expect(g.nodes.size, `scene ${l.id}`).toBeLessThanOrEqual(NODES_MAX);
        const back = new Map<string, string[]>();
        for (const [k, n] of g.nodes) for (const e of n.next) { const b = back.get(e.key); if (b) b.push(k); else back.set(e.key, [k]); }
        const alive = new Set(g.goals), queue = [...g.goals];
        for (let i = 0; i < queue.length; i++) for (const b of back.get(queue[i]!) ?? []) if (!alive.has(b)) { alive.add(b); queue.push(b); }
        expect(g.nodes.size - alive.size, `scene ${l.id}: dead ends`).toBe(0);
    }
    expect(Math.min(...shortest)).toBeGreaterThanOrEqual(3);
    expect(Math.max(...shortest)).toBeLessThanOrEqual(35);
    expect(largest).toBeGreaterThan(10_000);
});

it(`a robot playing half with the help, half at random, finishes every scene: median at most ${RANDOM_MEDIAN_MAX} steps over 200 seeds, never more than ${RANDOM_WORST_MAX}`, { timeout: 300_000 }, () => {
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
            const after = r.state;
            if (after.body !== before.body || after.eaten !== before.eaten || after.grow !== before.grow || after.finished
                || after.steps !== 6 || after.tries !== 3 || after.dry !== 2 || after.idle !== 8 || after.helps !== 1) changed.push(`scene ${l.id} ${r.fail.kind}`);
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

it('a leaf adds a ring, a sweet leaf two, an apple takes one away; the caterpillar never gets shorter than two', () => {
    // Scene 1: up, up eats the leaf: three rings.
    let s = at(1, ['haut']); expect(s.body.length).toBe(2);
    const ate = step(s, 'haut')!; expect(ate.ate?.kind).toBe('feuille'); expect(ate.state.body.length).toBe(3);
    // Scene 11: the sweet leaf at (1, 1), two rings, the second one on the next step.
    s = start(11);
    const way = solve(s)!;
    let sweet: State | null = null, before = 0;
    for (const a of way) { const r = step(s, a)!; if (r.ate?.kind === 'sucree') { sweet = r.state; before = s.body.length; } s = r.state; if (sweet) break; }
    expect(sweet!.grow).toBe(1); expect(sweet!.body.length).toBe(before + 1);
    const next = moves.map(m => step(sweet!, m)!).find(r => !r.fail && r.state.body[0] !== sweet!.body[sweet!.body.length - 1])!.state;
    expect(next.body.length).toBe(before + 2); expect(next.grow).toBe(0);
    // Scene 13: the apple takes a ring away.
    s = start(13); expect(s.body.length).toBe(4);
    s = at(13, ['haut']); const apple = step(s, 'gauche')!;
    expect(apple.ate?.kind).toBe('pomme'); expect(apple.state.body.length).toBe(3);
});

it('turning round makes the tail the head; the tunnel takes the head out of the other hole; the bridge carries a second ring', () => {
    const s = start(3), r = step(s, 'retourne')!;
    expect(r.fail).toBeNull(); expect(r.state.body).toEqual([...s.body].reverse());
    expect(keyOf(step(r.state, 'retourne')!.state)).toBe(keyOf(s));
    // Scene 15: up into the hole under the hedge, out above it, one row higher.
    const t = step(at(15, ['haut']), 'haut')!;
    expect(t.tunnel).toBe(true); expect(head(t.state)).toEqual({ x: 2, y: 0 });
    // Scene 18: round the loop, the head goes onto the bridge where its body already lies.
    let b = start(18);
    for (const a of solve(b)!) { b = step(b, a)!.state; const l = levelOf(18), cells = b.body.map(c => cellXY(l, c)); if (cells.filter(p => p.x === 2 && p.y === 4).length === 2) break; }
    expect(b.body.filter(c => c === 4 * 5 + 2).length).toBe(2);
});

it('the rainbow leaves go in order; the cocoon waits for every leaf', () => {
    // Scene 21: the orange leaf before the red one is a funny try that leaves it where it is.
    const early = step(at(21, ['haut', 'gauche']), 'haut')!;
    expect(early.fail?.kind).toBe('couleur'); expect(early.state.eaten).toBe(0);
    const ranks: number[] = [];
    let st = start(21);
    for (const a of solve(st)!) { const r = step(st, a)!; if (r.ate) ranks.push(r.ate.rank); st = r.state; }
    expect(ranks).toEqual([1, 2, 3]);
    // Scene 11: the cocoon is next to the head, closed while a leaf is left.
    expect(step(start(11), 'gauche')!.fail).toBeNull();
    expect(step(at(11, ['gauche']), 'gauche')!.fail?.kind).toBe('cocon');
});

it('three funny tries in a row, or thirty steps without a leaf, make the right next step shine; taking it costs a star', () => {
    let s = start(1);
    const miss = (st: State): State => step(st, 'bas')!.state;
    for (let k = 0; k < TRIES_BEFORE_HELP - 1; k++) s = miss(s);
    expect(helpOn(s)).toBe(false);
    s = miss(s);
    expect(helpOn(s)).toBe(true);
    const h = hint(s)!, helped = step(s, h)!;
    expect(h).toBe(solve(s)![0]); expect(bestStep(s)).not.toBeNull();
    expect(helped.helped).toBe(true); expect(helped.state.dry).toBe(0); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    expect(solve(helped.state)!.length).toBe(solve(s)!.length - 1);
    // Turning round again and again without eating anything.
    let w = start(2);
    for (let k = 0; k < IDLE_BEFORE_HELP; k++) { expect(helpOn(w), `step ${k}`).toBe(false); w = step(w, 'retourne')!.state; }
    expect(helpOn(w)).toBe(true);
    expect(stars({ ...helped.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...helped.state, helps: 2 })).toBe(1);
});

it('the back button is free and has no limit: it brings back the caterpillar, a help stays a help', () => {
    const history: State[] = [];
    let s = start(14);
    for (const a of solve(s)!.slice(0, 8)) { history.push(s); s = step(s, a)!.state; }
    s = { ...s, helps: 1 };
    while (history.length) { const before = history.pop()!; s = undo(before, s); expect(keyOf(s)).toBe(keyOf(before)); }
    expect(keyOf(s)).toBe(keyOf(start(14))); expect(s.helps).toBe(1); expect(s.steps).toBe(8);
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
