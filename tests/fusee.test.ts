import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { carrying, complete, distance, DRY_HELP, features, free, GROUND, has, helpOn, HEIGHT, idle, isUnlocked, levelOf, levels, MIN_GAP, misses, padAt, parseRecords, problems, R, start, stars, step, TOP, VDOWN, VHELP, VUP, VX_LIMIT, WIDTH, world, type Command, type Event, type Miss, type State } from '../src/engines/fusee';
import { autopilot, clumsy, pilot } from '../src/engines/fusee/solver';
import { missAnimations } from '../src/games/fusee/art';

/** The pilot lands on every scene without a single funny try, in 772 steps at most (scene 31, 26 s on screen). */
const PILOT_MAX = 900;
/** The clumsy robot (commands held 10 to 59 steps, one chance in two to follow the pilot), 200 seeds per scene: medians
 * measured at 4062 steps at most (scene 31), longest game 19174 steps (scene 27). The 60000 cap only stops a game that
 * would never end. */
const CLUMSY_MEDIAN_MAX = 5000;
const CLUMSY_WORST_MAX = 25000;
const CLUMSY_LIMIT = 60000;
/** A child who touches nothing: something happens (a bounce, a landing) at least this often (measured: 272 steps, scene 20, about 9 s). */
const IDLE_EVENT_MAX = 320;

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with its own title in both languages and its own strong moment', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
    }
    for (const key of [(l: typeof levels[number]) => l.title.fr, (l: typeof levels[number]) => l.title.en, (l: typeof levels[number]) => l.moment]) expect(new Set(levels.map(key)).size).toBe(levels.length);
});

it('problems() sees an unfair scene', () => {
    const one = levelOf(1);
    expect(problems({ ...one, features: ['rocher'] })).toContain('rocher where the scene says so');
    expect(problems({ ...one, rocks: [{ x: 10, y: 30, w: 20, h: 20 }], features: ['rocher'] })).toContain('the top of the sky stays free');
    expect(problems({ ...one, pads: [{ x: 26 }] }).join()).toMatch(/crater under it/);
    expect(problems({ ...one, tunnel: [{ y0: 100, y1: 120, x: 75, gap: 30 }], features: ['tunnel'] })).toContain('a tunnel wide enough');
});

it('every new thing comes alone before it is combined, and comes back in at least two combinations', () => {
    const met = new Set<string>();
    for (const l of levels) {
        for (const f of l.features) if (!met.has(f)) { expect(l.features, `scene ${l.id} brings in ${f}`).toEqual([f]); met.add(f); }
        if (l.features.length > 1) for (const f of l.features) expect(levels.some(o => o.id < l.id && o.features.length === 1 && o.features[0] === f), `scene ${l.id}: ${f}`).toBe(true);
    }
    expect([...met]).toEqual([...features]);
    for (const f of features) expect(levels.filter(l => l.features.length > 1 && l.features.includes(f)).length, f).toBeGreaterThanOrEqual(2);
    expect(levels.slice(0, 3).every(l => l.features.length === 0)).toBe(true);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    const one = levelOf(1);
    expect(distance(one, { ...one })).toBe(0);
    expect(distance(one, { ...one, aliens: [130] })).toBe(1);
    expect(distance(one, { ...one, features: ['rocher'] })).toBe(4);
});

it('a scene always starts the same way, and the same commands always give the same path', () => {
    for (const l of levels) expect(start(l.id), `scene ${l.id}`).toEqual(start(l.id));
    expect(clumsy(32, 7).state).toEqual(clumsy(32, 7).state);
    expect(autopilot(22).state).toEqual(autopilot(22).state);
});

it(`the pilot lands on every scene without a funny try, within ${PILOT_MAX} steps`, () => {
    for (const l of levels) {
        const events: Event[] = [];
        const { state, steps } = autopilot(l.id, 20000, (_, e) => { if (e) events.push(e); });
        expect(state.finished, `scene ${l.id}`).toBe(true);
        expect(state.tries, `scene ${l.id}`).toBe(0);
        expect(stars(state), `scene ${l.id}`).toBe(3);
        expect(steps, `scene ${l.id}`).toBeLessThanOrEqual(PILOT_MAX);
        expect(events.flatMap(e => e.kind === 'land' ? [e.pad] : []), `scene ${l.id}`).toEqual(l.pads.map((_, i) => i));
        expect(events.filter(e => e.kind === 'star').length, `scene ${l.id}`).toBeLessThanOrEqual(l.stars.length);
    }
});

const inside = (s: State): boolean => s.x >= R && s.x <= WIDTH - R && s.y >= TOP + R && s.y + R <= GROUND;
const bounded = (s: State): boolean => Math.abs(s.vx) <= VX_LIMIT + 1e-9 && s.vy >= -VUP - 1e-9 && s.vy <= VDOWN + 1e-9;
it(`a clumsy robot finishes every scene on 200 seeds, at most ${CLUMSY_MEDIAN_MAX} steps at the median; speed always bounded, never off the board`, { timeout: 60_000 }, () => {
    const medians: number[] = [], worst: number[] = [];
    for (const l of levels) {
        let wrong = 0;
        const runs = Array.from({ length: 200 }, (_, k) => clumsy(l.id, 1000 + k, CLUMSY_LIMIT, s => { if (!bounded(s) || !inside(s)) wrong++; }));
        expect(wrong, `scene ${l.id}`).toBe(0);
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.steps, `scene ${l.id}`).toBeLessThanOrEqual(CLUMSY_WORST_MAX); }
        const steps = runs.map(r => r.steps).sort((a, b) => a - b), median = (steps[99]! + steps[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(CLUMSY_MEDIAN_MAX);
        medians.push(median); worst.push(steps[199]!);
    }
    expect(Math.max(...medians)).toBeLessThanOrEqual(CLUMSY_MEDIAN_MAX);
    expect(Math.max(...worst)).toBeLessThanOrEqual(CLUMSY_WORST_MAX);
});

it('a child who touches nothing is never stuck: never off the board, never inside a rock, a bounce or a landing at least every few seconds', () => {
    let longest = 0;
    for (const l of levels) {
        const w = world(l);
        let s = start(l.id), since = 0;
        for (let k = 0; k < 6000 && !s.finished; k++) {
            const r = step(s, idle); s = r.state;
            since = r.event && r.event.kind !== 'star' ? 0 : since + 1;
            longest = Math.max(longest, since);
            expect(inside(s) && bounded(s), `scene ${l.id} step ${s.t}`).toBe(true);
            if (!s.finished) expect(free({ ...w, level: { ...l, pads: [] } }, s.t, s.x, s.y, -0.01), `scene ${l.id} step ${s.t} at ${s.x.toFixed(1)},${s.y.toFixed(1)}`).toBe(true);
        }
        expect(longest, `scene ${l.id}`).toBeLessThanOrEqual(IDLE_EVENT_MAX);
    }
    // With the runway right below, a child who touches nothing bounces three times, then the help slows the rocket and it lands.
    let s = start(1); const seen: Event[] = [];
    while (!s.finished && s.t < 5000) { const r = step(s, idle); s = r.state; if (r.event) seen.push(r.event); }
    expect(seen.map(e => e.kind === 'miss' ? e.miss : e.kind)).toEqual(['boing', 'boing', 'boing', 'land']);
    expect(stars(s)).toBe(2);
});

it('every funny try is met in some scene, has its own animation, and changes nothing but the rocket', () => {
    const seen = new Map<Miss, Set<number>>();
    for (const l of levels) for (const seed of [1, 2, 3]) {
        let before = start(l.id);
        clumsy(l.id, seed, CLUMSY_LIMIT, (s, e) => {
            if (e?.kind === 'miss') {
                if (!seen.has(e.miss)) seen.set(e.miss, new Set());
                seen.get(e.miss)!.add(l.id);
                expect([s.visited, s.caught.length >= before.caught.length, s.finished, s.dry, s.tries, s.vx, s.vy], `scene ${l.id} ${e.miss}`).toEqual([before.visited, true, false, before.dry + 1, before.tries + 1, 0, 0]);
                expect(e.to.y, `scene ${l.id} ${e.miss}`).not.toBe(e.at.y);
            }
            before = s;
        });
    }
    expect([...seen.keys()].sort()).toEqual([...misses].sort());
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(missAnimations)).size).toBe(misses.length);
    for (const m of misses) {
        expect(css, m).toContain(`@keyframes ${missAnimations[m]}{`);
        expect(css, m).toContain(`.${missAnimations[m]}{animation:${missAnimations[m]} `);
    }
});

/** Steps with one command until something happens. */
function until(s: State, cmd: Command | ((s: State) => Command), limit = 3000): { state: State; event: Event | null } {
    for (let k = 0; k < limit; k++) { const r = step(s, typeof cmd === 'function' ? cmd(s) : cmd); if (r.event && r.event.kind !== 'star') return r; s = r.state; }
    return { state: s, event: null };
}
it('puffing rises, letting go comes down slowly, sliding moves to the side, the wind pushes', () => {
    let s = start(1);
    for (let k = 0; k < 60; k++) s = step(s, idle).state;
    const falling = s.y;
    expect(s.vy).toBeGreaterThan(0);
    for (let k = 0; k < 60; k++) s = step(s, { puff: true, side: 0 }).state;
    expect(s.vy).toBeLessThan(0); expect(s.y).toBeLessThan(falling + 10);
    const x0 = s.x;
    for (let k = 0; k < 30; k++) s = step(s, { puff: true, side: 1 }).state;
    expect(s.x).toBeGreaterThan(x0 + 5);
    // Scene 12: the wind pushes right in its band.
    let windy: State = { ...start(12), y: 120 };
    for (let k = 0; k < 30; k++) windy = step(windy, { puff: true, side: 0 }).state;
    expect(windy.x).toBeGreaterThan(75);
});

it('too fast on the runway is a boing, gently is a landing; the next friend first, the other waves', () => {
    expect(until(start(1), idle).event).toMatchObject({ kind: 'miss', miss: 'boing' });
    const two = levelOf(16), w = world(two), p1 = padAt(w, 1, 0);
    const gentle = (s: State): Command => ({ puff: s.vy > 0.3, side: 0 });
    const wrong = until({ ...start(16), x: p1.x, y: p1.top - R - 20, vy: 0.2 }, gentle);
    expect(wrong.event).toMatchObject({ kind: 'miss', miss: 'coucou' });
    const p0 = padAt(w, 0, 0);
    const r = until({ ...start(16), x: p0.x, y: p0.top - R - 20, vy: 0.2 }, gentle);
    expect(r.event).toMatchObject({ kind: 'land', pad: 0 });
    expect(r.state.visited).toBe(1); expect(r.state.finished).toBe(false); expect(r.state.y).toBeLessThan(p0.top - R - 20);
});

it('a rock says toc, a crater goes pouf, an alien laughs, the ground too fast makes Boubou dizzy', () => {
    expect(until({ ...start(6), vy: 0.5 }, idle).event).toMatchObject({ kind: 'miss', miss: 'toc' });
    expect(until({ ...start(2), x: 116 }, idle).event).toMatchObject({ kind: 'miss', miss: 'cratere' });
    expect(until({ ...start(3), x: 134 }, idle).event).toMatchObject({ kind: 'miss', miss: 'rigole' });
    expect(until({ ...start(4) }, idle).event).toMatchObject({ kind: 'miss', miss: 'tournis' });
    const slow = until({ ...start(4), y: 212 }, idle).event;
    expect(slow).toMatchObject({ kind: 'miss', miss: 'pouf' });
    // A bounce goes up a little, to a free place, never through a rock.
    if (slow?.kind === 'miss') { expect(slow.to.y).toBeLessThan(slow.at.y); expect(slow.at.y - slow.to.y).toBeLessThan(120); }
});

it('a sliding runway moves slowly, the pilot follows it; stars are caught on the way, never required', () => {
    const w = world(levelOf(14)), xs = Array.from({ length: 400 }, (_, t) => padAt(w, 0, t).x);
    expect(Math.min(...xs)).toBeCloseTo(45, 0); expect(Math.max(...xs)).toBeCloseTo(105, 0);
    for (let t = 1; t < xs.length; t++) expect(Math.abs(xs[t]! - xs[t - 1]!)).toBeLessThan(0.4);
    const got = autopilot(9).state;
    expect(got.finished).toBe(true);
    const none = until({ ...start(8), x: 30 }, idle);
    expect(none.state.caught).toEqual([]);
    let s = start(8), caught = false;
    for (let k = 0; k < 2000 && !s.finished; k++) { const r = step(s, pilot(s)); s = r.state; if (r.event?.kind === 'star') caught = true; }
    expect(caught).toBe(true); expect(s.caught).toEqual([0]);
});

it('the passenger rides from the start with one runway, after the first runway with two', () => {
    expect(carrying(start(18))).toBe(true); expect(carrying(start(1))).toBe(false);
    expect(carrying(start(25))).toBe(false); expect(carrying({ ...start(25), visited: 1 })).toBe(true);
    expect(carrying(autopilot(18).state)).toBe(false);
});

it(`after ${DRY_HELP} funny tries the help comes on and the rocket comes down more slowly; landing with it costs a star`, () => {
    let s = start(4);
    while (s.dry < DRY_HELP) s = until(s, idle).state;
    expect(helpOn(s)).toBe(true);
    for (let k = 0; k < 200; k++) s = step(s, idle).state;
    expect(s.vy).toBeLessThanOrEqual(VHELP);
    let r = { state: s, event: null as Event | null };
    while (!r.state.finished && r.state.t < 20000) r = step(r.state, pilot(r.state));
    expect(r.state.helps).toBe(1); expect(r.state.dry).toBe(0); expect(stars(r.state)).toBe(2);
    expect(stars({ ...r.state, helps: 0 })).toBe(3); expect(stars({ ...r.state, helps: 3 })).toBe(1);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = autopilot(3).state;
    expect(complete({ 3: 1 }, won)[3]).toBe(3); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
    expect(has(levelOf(32), 'tunnel')).toBe(true); expect(HEIGHT).toBe(250);
});
