import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { cell, clockOf, complete, dangers, distance, explore, fails, features, featuresOf, height, helpOn, hint, isUnlocked, laneAt, levels, MIN_GAP, parseRecords, periods, possible, problems, RED_TICKS, solve, stars, start, step, TRIES_BEFORE_HELP, width, type Fail, type State } from '../src/engines/traverse';
import { randomPlayer } from '../src/engines/traverse/solver';
import { failAnimations } from '../src/games/traverse/art';

/** A robot child stepping at random, 60 % of the time towards its target, over 200 seeds: median at most 40 steps on every
 * scene (measured: 39, scene 32), and no game over 400 steps (measured: 302, scene 15). Funny tries and touches on the light
 * count as steps. The 2000 cap only stops a game that would never end. */
const RANDOM_MEDIAN_MAX = 40;
const RANDOM_WORST_MAX = 400;
const RANDOM_LIMIT = 2000;
/** The reachable graph of every scene stays small: the help runs a search in the browser. */
const NODES_MAX = 25_000;

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with its own title and strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
        expect(l.title.fr.length, `scene ${l.id}`).toBeLessThanOrEqual(32);
    }
    expect(new Set(levels.map(l => l.title.fr)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.title.en)).size).toBe(levels.length);
    expect(new Set(levels.map(l => l.moment)).size).toBe(levels.length);
    for (const l of levels.filter(l => l.id < 10)) expect(dangers(l), `scene ${l.id}: at most three lanes before scene 10`).toBeLessThanOrEqual(3);
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
    // The distance counts a changed lane, a lane more, a column more and a new thing.
    const one = levels[0]!;
    expect(distance(one, one)).toBe(0);
    expect(distance(one, { ...one, lanes: [one.lanes[0]!, { ...one.lanes[1]!, dir: -1 }, one.lanes[2]!] })).toBe(1);
    expect(distance(one, { ...one, lanes: [one.lanes[0]!, ...one.lanes] })).toBe(2);
    expect(distance(one, { ...one, lanes: [one.lanes[0]!, one.lanes[2]!, one.lanes[1]!, one.lanes[2]!] })).toBe(2 + 1);
    expect(distance(one, { ...one, wait: true })).toBe(3);
});

it('the world is deterministic and periodic: a scene always starts the same way and comes back to it', () => {
    for (const l of levels) {
        expect(start(l.id)).toEqual(start(l.id));
        const p = periods(l), all = p.world * p.roads, at = (t: number) => l.lanes.map((_, y) => Array.from({ length: width(l) }, (_, x) => cell(laneAt(l, y), x, { t, held: 0, red: 0 })).join('')).join('|');
        expect(at(all), `scene ${l.id}`).toBe(at(0));
        expect(at(all + 3), `scene ${l.id}`).toBe(at(3));
    }
});

it('every scene can be finished: the solver finds the shortest way, and no reachable state is a dead end', () => {
    const shortest: number[] = [];
    for (const l of levels) {
        const way = solve(start(l.id));
        expect(way, `scene ${l.id}`).not.toBeNull();
        let s = start(l.id);
        for (const a of way!) { const r = step(s, a)!; expect(r.landing === null || r.landing.ok, `scene ${l.id}`).toBe(true); s = r.state; }
        expect(s.finished, `scene ${l.id}`).toBe(true);
        shortest.push(way!.length);
        // From every state the little one can reach, the end can still be reached.
        const g = explore(start(l.id));
        expect(g.nodes.size, `scene ${l.id}`).toBeLessThanOrEqual(NODES_MAX);
        const back = new Map<string, string[]>();
        for (const [k, n] of g.nodes) for (const e of n.next) back.set(e.key, [...(back.get(e.key) ?? []), k]);
        const alive = new Set(g.goals), queue = [...g.goals];
        for (let i = 0; i < queue.length; i++) for (const b of back.get(queue[i]!) ?? []) if (!alive.has(b)) { alive.add(b); queue.push(b); }
        expect(g.nodes.size - alive.size, `scene ${l.id}: dead ends`).toBe(0);
    }
    expect(Math.min(...shortest)).toBeGreaterThanOrEqual(2);
});

it(`a robot stepping at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} steps over 200 seeds, never more than ${RANDOM_WORST_MAX}`, { timeout: 300_000 }, () => {
    const medians: number[] = [];
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, RANDOM_LIMIT));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.steps, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const n = runs.map(r => r.steps).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
        medians.push(median);
    }
    expect(Math.max(...medians)).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
});

it('every funny try exists in some scene, has its own animation, and costs nothing but the step back', () => {
    const seen = new Map<Fail, number>();
    for (const l of levels) {
        for (const n of explore(start(l.id)).nodes.values()) if (!n.state.finished) for (const a of possible(n.state)) {
            const before: State = { ...n.state, steps: 5, tries: 2, dry: 1, helps: 1 }, r = step(before, a)!;
            if (!r.landing || r.landing.ok) continue;
            seen.set(r.landing.fail, (seen.get(r.landing.fail) ?? 0) + 1);
            // Back where it was, the world has waited, nothing else changed.
            expect({ ...r.state, steps: 0, tries: 0, dry: 0 }, `scene ${l.id} ${r.landing.fail}`).toEqual({ ...before, steps: 0, tries: 0, dry: 0 });
            expect([r.state.steps, r.state.tries, r.state.dry, r.state.helps]).toEqual([6, 3, 2, 1]);
        }
    }
    expect([...seen.keys()].sort()).toEqual([...fails].sort());
    expect(fails.length).toBeGreaterThanOrEqual(6);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(failAnimations)).size).toBe(fails.length);
    for (const f of fails) {
        expect(css, f).toContain(`@keyframes ${failAnimations[f]}{`);
        expect(css, f).toContain(`.${failAnimations[f]}{animation:${failAnimations[f]} `);
    }
});

it('one step of the little one is one tick of the world; a log carries it, a car never moves while the light is red', () => {
    // Scene 8: the log under the little one moves it one cell to the right.
    let s = start(8);
    const way = solve(s)!;
    for (const a of way) {
        const r = step(s, a)!;
        expect(r.state.t).toBe(s.t + 1);
        if (laneAt(levels[7]!, r.state.y).kind === 'riviere') expect(r.landing).toMatchObject({ ok: true, carried: 1 });
        s = r.state;
    }
    // Scene 15: the light holds every car for RED_TICKS steps; it cannot be touched again while it is red.
    const l = levels[14]!, red = step(start(15), 'feu')!.state;
    expect(red.red).toBe(RED_TICKS); expect(red.t).toBe(0); expect(step(red, 'feu')).toBeNull();
    const roads = (st: State) => [1, 2].map(y => Array.from({ length: width(l) }, (_, x) => cell(laneAt(l, y), x, clockOf(st))).join('')).join('|');
    let w = red;
    for (let k = 0; k < RED_TICKS; k++) { const r = step(w, possible(w).find(a => step(w, a)?.landing?.ok)!)!; expect(roads(r.state)).toBe(roads(red)); w = r.state; }
    expect(w.red).toBe(0);
    // Off the board, into a bush or onto the light is no step at all.
    expect(step(start(1), 'bas')).toBeNull(); expect(step(start(16), 'gauche')?.landing?.ok).toBe(true);
    expect(step(start(1), 'attendre')).toBeNull(); expect(step(start(16), 'attendre')?.state.t).toBe(1);
    expect(height(levels[0]!)).toBe(3);
});

it('a friend is picked up on the way and must come home; snacks too', () => {
    for (const id of levels.filter(l => featuresOf(l).includes('ami') || featuresOf(l).includes('gouter')).map(l => l.id)) {
        let s = start(id);
        for (const a of solve(s)!) s = step(s, a)!.state;
        expect(s.finished).toBe(true);
        if (featuresOf(levels[id - 1]!).includes('ami')) expect(s.friend, `scene ${id}`).toBe(true);
        expect(s.picked.every(Boolean), `scene ${id}`).toBe(true);
    }
});

it('three funny tries in a row make the right next step shine; taking it costs a star, tries alone never do', () => {
    let s = start(2);
    const miss = (st: State): State => { const a = possible(st).find(x => step(st, x)?.landing?.ok === false); if (!a) throw new Error('no miss'); return step(st, a)!.state; };
    // Scene 2: walk to the road first, then try under the cars.
    for (const a of solve(s)!) { const r = step(s, a)!; if (possible(r.state).some(x => step(r.state, x)?.landing?.ok === false)) { s = r.state; break; } s = r.state; }
    for (let k = 0; k < TRIES_BEFORE_HELP - 1; k++) s = miss(s);
    expect(helpOn(s)).toBe(false);
    s = miss(s);
    expect(helpOn(s)).toBe(true);
    const h = hint(s)!, helped = step(s, h)!;
    expect(helped.helped).toBe(true); expect(helped.state.dry).toBe(0); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    expect(solve(helped.state)!.length).toBe(solve(s)!.length - 1);
    expect(stars({ ...helped.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...helped.state, helps: 2 })).toBe(1);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    let won = start(3);
    for (const a of solve(won)!) won = step(won, a)!.state;
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(complete({}, start(3))).toEqual({});
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
