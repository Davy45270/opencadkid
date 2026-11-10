import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { advance, aims, closeColors, colors, complete, distance, DRY_HELP, features, fire, goodAim, has, helpOn, isUnlocked, levels, limitOf, MIN_GAP, misses, origin, palette, parseRecords, problems, rainbowAt, start, stars, SWAY, trace, type Cell, type ColorId, type Miss, type State } from '../src/engines/bulles';
import { greedy, randomPlayer } from '../src/engines/bulles/solver';
import { missAnimations, PAINT } from '../src/games/bulles/art';

const sorted = (cells: readonly Cell[]): string[] => cells.map(c => JSON.stringify(c)).sort();
/** The greedy player never needs more throws than this on any scene (measured: 7 at most). */
const GREEDY_MAX = 10;
/** Median throws of a robot aiming anywhere, over 200 seeds: measured at 24 at most (scene 21), bound at 30. Its longest
 * game, 207 throws, is bound at 250; the 600 cap only stops a game that would never end. */
const RANDOM_MEDIAN_MAX = 30;
const RANDOM_WORST_MAX = 250;
const RANDOM_LIMIT = 600;

it('at least 30 scenes, numbered in order, each fair to a five-year-old, each with a title in both languages', () => {
    expect(levels.length).toBeGreaterThanOrEqual(30);
    expect(levels.map(l => l.id)).toEqual(levels.map((_, i) => i + 1));
    for (const l of levels) {
        expect(problems(l), `scene ${l.id}`).toEqual([]);
        expect(l.title.fr.length && l.title.en.length && l.moment.length, `scene ${l.id}`).toBeTruthy();
    }
    expect(new Set(levels.map(l => l.title.fr)).size).toBe(levels.length);
});

it('every new thing comes alone in two scenes before it is combined, and all of them come back in combinations', () => {
    const met = new Set<string>();
    for (const l of levels) {
        for (const f of l.features) if (!met.has(f)) {
            // First appearance: alone, and the next scene that has it is alone too.
            expect(l.features, `scene ${l.id} brings in ${f}`).toEqual([f]);
            const second = levels.find(o => o.id > l.id && o.features.includes(f))!;
            expect(second.features, `scene ${second.id}`).toEqual([f]);
            met.add(f);
        }
        if (l.features.length > 1) for (const f of l.features) expect(levels.filter(o => o.id < l.id && o.features.length === 1 && o.features[0] === f).length, `scene ${l.id}: ${f}`).toBe(2);
    }
    expect([...met]).toEqual([...features]);
    for (const f of features) expect(levels.filter(l => l.features.length > 1 && l.features.includes(f)).length, f).toBeGreaterThanOrEqual(3);
    expect(levels.slice(0, 6).every(l => l.features.length === 0)).toBe(true);
    // Two colours to start with, never more than three before scene 12, never more than four.
    expect(palette(levels[0]!)).toHaveLength(2);
    for (const l of levels) expect(palette(l).length, `scene ${l.id}`).toBeLessThanOrEqual(l.id < 12 ? 3 : 4);
});

it('two scenes always differ by at least MIN_GAP places', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    // The distance sees through a recolouring, and counts a change of place.
    const one = levels[0]!;
    expect(distance(one, { ...one, rows: ['bb...rr'] })).toBe(0);
    expect(distance(one, { ...one, rows: ['rr..bb.'] })).toBe(2);
});

/** CIE L*a*b* of a hex colour (D65). */
function lab(hex: string): [number, number, number] {
    const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const [r, g, b] = [1, 3, 5].map(i => lin(parseInt(hex.slice(i, i + 2), 16))) as [number, number, number];
    const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883];
    const f = (t: number) => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
    const [fx, fy, fz] = xyz.map(f) as [number, number, number];
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
const deltaE = (a: ColorId, b: ColorId): number => { const p = lab(PAINT[a].fill), q = lab(PAINT[b].fill); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
it('colours stay apart: each has its own shape, and two close colours never share a scene', () => {
    expect(new Set(colors.map(c => PAINT[c].shape)).size).toBe(colors.length);
    const NEAR = 60;
    for (const a of colors) for (const b of colors) if (a < b) {
        const close = closeColors.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
        expect(deltaE(a, b) < NEAR, `${a}/${b}: ΔE ${deltaE(a, b).toFixed(1)}`).toBe(close);
    }
    for (const l of levels) for (const a of palette(l)) for (const b of palette(l)) if (a < b) expect(deltaE(a, b), `scene ${l.id}: ${a}/${b}`).toBeGreaterThanOrEqual(NEAR);
});

it('a greedy player finishes every scene, quickly', () => {
    const worst: number[] = [];
    for (const l of levels) {
        const { state, shots } = greedy(l.id, 60);
        expect(state.finished, `scene ${l.id}`).toBe(true);
        expect(shots, `scene ${l.id}`).toBeLessThanOrEqual(GREEDY_MAX);
        worst.push(shots);
    }
    expect(Math.max(...worst)).toBeLessThanOrEqual(GREEDY_MAX);
});

it(`a robot aiming anywhere finishes every scene, in at most ${RANDOM_MEDIAN_MAX} throws at the median over 200 seeds`, { timeout: 120_000 }, () => {
    const medians: number[] = [];
    for (const l of levels) {
        const runs = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, RANDOM_LIMIT));
        for (const r of runs) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.shots, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const shots = runs.map(r => r.shots).sort((a, b) => a - b), median = (shots[99]! + shots[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
        medians.push(median);
    }
    expect(Math.max(...medians)).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
});

/** Every throw from the start of each scene and after a few greedy throws: where the funny tries are found. */
function throws(): { before: State; after: State; miss: Miss | null; level: number }[] {
    const out: { before: State; after: State; miss: Miss | null; level: number }[] = [];
    for (const l of levels) {
        let s = start(l.id);
        for (let k = 0; k < 3 && !s.finished; k++) {
            for (const a of aims) { const { state, shot } = fire(s, a); out.push({ before: s, after: state, miss: shot!.miss, level: l.id }); }
            s = fire(s, goodAim(s) ?? 0).state;
        }
    }
    return out;
}
it('every funny try exists, has its own animation, and changes nothing but the stuck bubble', () => {
    const all = throws(), seen = new Map<Miss, number>();
    for (const { before, after, miss, level } of all) {
        if (!miss) continue;
        seen.set(miss, (seen.get(miss) ?? 0) + 1);
        const added = after.cells.filter(c => !before.cells.some(b => b.row === c.row && b.col === c.col));
        expect(added, `scene ${level} ${miss}`).toHaveLength(1);
        expect(sorted(after.cells.filter(c => c !== added[0])), `scene ${level} ${miss}`).toEqual(sorted(before.cells));
        expect([after.top, after.butterflies, after.flowers, after.finished, after.dry]).toEqual([before.top, before.butterflies, before.flowers, false, before.dry + 1]);
    }
    expect([...seen.keys()].sort()).toEqual([...misses].sort());
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(missAnimations)).size).toBe(misses.length);
    for (const m of misses) {
        expect(css, m).toContain(`@keyframes ${missAnimations[m]}{`);
        expect(css, m).toContain(`.${missAnimations[m]}{animation:${missAnimations[m]} `);
    }
});

it('a throw into the void goes boing, and the ceiling bubble is the only change', () => {
    const s = start(1), { shot, state } = aims.map(a => fire(s, a)).find(r => r.shot!.miss === 'boing')!;
    expect(shot!.miss).toBe('boing'); expect(shot!.at.row).toBe(0);
    expect(state.cells).toHaveLength(s.cells.length + 1);
});

it('nothing is ever lost: a cluster hanging too low goes up one row, and the bubbles above fly away', () => {
    const base = start(1), chain: Cell[] = Array.from({ length: limitOf(levels[0]!) }, (_, row) => ({ row, col: 3, kind: 'bulle', color: row % 2 ? 'bleu' : 'rouge', ice: 0 }));
    const s: State = { ...base, cells: chain, queue: ['jaune', 'jaune'] };
    const { state, shot } = fire(s, 0);
    expect(shot!.at.row).toBe(limitOf(levels[0]!));
    expect(state.top).toBe(1); expect(shot!.lifted).toHaveLength(1); expect(shot!.miss).toBe(null);
    expect(Math.max(...state.cells.map(c => c.row)) - state.top).toBeLessThan(limitOf(levels[0]!));
    expect(state.finished).toBe(false);
});

it('three of a colour fly away, what no longer hangs falls into flowers', () => {
    const s = start(4), j = { ...s, queue: ['jaune', 'jaune'] as State['queue'] };
    const best = aims.map(a => fire(j, a)).find(r => r.shot!.popped.length >= 3)!;
    expect(best.shot!.popped.every(c => c.color === 'jaune')).toBe(true);
    expect(best.shot!.fell.length).toBe(s.cells.length - 2);
    expect(best.state.finished).toBe(true); expect(best.state.flowers).toBe(s.cells.length - 2);
});

it('the rainbow goes with any colour, first in the scene that brings it in, every fourth throw elsewhere', () => {
    const seven = levels[6]!, eleven = levels[10]!;
    expect(start(7).queue[0]).toBe('arc');
    expect([0, 1, 2, 3, 4].map(i => rainbowAt(seven, i))).toEqual([true, false, false, false, true]);
    expect([0, 1, 2, 3, 7].map(i => rainbowAt(eleven, i))).toEqual([false, false, false, true, true]);
    const pops = aims.map(a => fire(start(7), a).shot!).filter(s => s.popped.length);
    expect(new Set(pops.map(s => s.color))).toEqual(new Set(['rouge', 'jaune', 'bleu']));
});

it('a cloud and a friend float away when a bubble next to them pops; the friend ends the scene', () => {
    const cloud = aims.map(a => fire({ ...start(9), queue: ['rouge', 'rouge'] }, a)).find(r => r.shot!.freed.length)!;
    expect(cloud.shot!.freed.map(c => c.kind)).toEqual(['nuage']);
    const friend = aims.map(a => fire({ ...start(12), queue: ['jaune', 'jaune'] }, a)).find(r => r.shot!.freed.some(c => c.kind === 'ami'))!;
    expect(friend.state.finished).toBe(true); expect(friend.state.cells.length).toBeGreaterThan(0);
});

it('an ice cube melts in two hits, then plays like any bubble', () => {
    let s: State = { ...start(16), queue: ['vert', 'vert'] };
    const hit = (st: State) => aims.map(a => fire(st, a)).find(r => r.shot!.melted.some(c => c.row === 0 && c.col === 3))!;
    const first = hit(s); expect(first.shot!.melted.find(c => c.col === 3)!.ice).toBe(1);
    s = { ...first.state, queue: ['vert', 'vert'] };
    const second = hit(s), cube = second.state.cells.find(c => c.row === 0 && c.col === 3)!;
    expect(cube.kind).toBe('bulle'); expect(cube.color).toBe('bleu');
});

it('the swing moves only the swinging scenes, and the aim line follows it', () => {
    const swing = start(18), still = start(1);
    expect(advance(still, 40)).toBe(still);
    expect(origin(levels[17]!, 0)).toBe(SWAY); expect(origin(levels[17]!, 37.5)).toBeCloseTo(2 * SWAY);
    const a = trace(swing, 0.1), b = trace(advance(swing, 37), 0.1);
    expect(a.end).not.toEqual(b.end);
});

it('planks make the bubble bounce: straight up into the middle plank is a rebound', () => {
    const plankScene = levels.find(l => has(l, 'murs') && l.planks!.length === 1)!;
    const flight = trace(start(plankScene.id), 0);
    expect(flight.bounces).toBeGreaterThanOrEqual(1);
    for (const l of levels) for (const a of aims) expect(trace(start(l.id), a).bounces, `scene ${l.id}`).toBeLessThan(12);
});

it('after a few throws that change nothing, the help shows a good throw, and using it costs a star', () => {
    let s: State = start(2);
    while (s.dry < DRY_HELP) { const miss = aims.map(a => fire(s, a)).find(r => r.shot!.miss); s = miss!.state; }
    expect(helpOn(s)).toBe(true);
    const g = goodAim(s)!; expect(g).not.toBeNull();
    const helped = fire(s, g);
    expect(helped.shot!.helped).toBe(true); expect(helped.shot!.popped.length + helped.shot!.fell.length + helped.shot!.freed.length).toBeGreaterThan(0);
    expect(helped.state.dry).toBe(0); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    expect(stars({ ...helped.state, helps: 0 })).toBe(3); expect(stars({ ...helped.state, helps: 3 })).toBe(1);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedy(3).state;
    expect(complete({ 3: 1 }, won)[3]).toBe(stars(won)); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
