import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { chocoField, closeColors, colors, complete, distance, DRY_HELP, features, goodSwap, helpOn, isUnlocked, levels, MIN_GAP, misses, mix, moves, parseRecords, problems, progress, runs, start, stars, swap, type Grid, type Miss, type State, type Tile } from '../src/engines/bonbons';
import { greedy, randomPlayer } from '../src/engines/bonbons/solver';
import { makeRng } from '../src/engines/rng';
import { missAnimations, PAINT } from '../src/games/bonbons/art';

/** The greedy player never needs more swaps than this on any scene (measured: 6 at most, scene 29). */
const GREEDY_MAX = 10;
/** A robot swapping at random among the swaps that do something, over 200 seeds: median at most 25 swaps on every scene
 * (measured: 20, scene 32), and no game over 250 swaps (measured: 202, scene 32). The 600 cap only stops a game that would never end. */
const RANDOM_MEDIAN_MAX = 25;
const RANDOM_WORST_MAX = 250;
const RANDOM_LIMIT = 600;
const playable = (s: Pick<State, 'grid' | 'cols' | 'rows'>): boolean => runs(s.grid, s.cols, s.rows).length === 0 && moves(s).length > 0;

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
    for (const l of levels) expect(l.colors.length, `scene ${l.id}`).toBeLessThanOrEqual(4);
    // The rule asks for at most four colours before scene 12: here it holds for every scene.
    for (const l of levels.filter(l => l.id < 12)) expect(l.colors.length).toBeLessThanOrEqual(4);
});

it('every new thing comes alone in two scenes before it is combined, and all of them come back in combinations', () => {
    const met = new Set<string>();
    for (const l of levels) {
        for (const f of l.features) if (!met.has(f)) {
            expect(l.features, `scene ${l.id} brings in ${f}`).toEqual([f]);
            const second = levels.find(o => o.id > l.id && o.features.includes(f))!;
            expect(second.features, `scene ${second.id}`).toEqual([f]);
            met.add(f);
        }
        if (l.features.length > 1) for (const f of l.features) expect(levels.filter(o => o.id < l.id && o.features.length === 1 && o.features[0] === f).length, `scene ${l.id}: ${f}`).toBe(2);
    }
    expect([...met]).toEqual([...features]);
    for (const f of features) expect(levels.filter(l => l.features.length > 1 && l.features.includes(f)).length, f).toBeGreaterThanOrEqual(3);
    expect(levels.slice(0, 4).every(l => l.features.length === 0)).toBe(true);
});

it('two scenes always differ by at least MIN_GAP', () => {
    let smallest = Infinity, pair = '';
    for (const a of levels) for (const b of levels) if (a.id < b.id) { const d = distance(a, b); if (d < smallest) { smallest = d; pair = `${a.id}~${b.id}`; } }
    expect(smallest, pair).toBeGreaterThanOrEqual(MIN_GAP);
    // The distance sees through a recolouring, counts a changed cell, a goal and a new thing.
    const one = levels[0]!;
    expect(distance(one, { ...one, colors: ['bleu', 'vert', 'violet'] })).toBe(0);
    expect(distance(one, { ...one, rows: ['..S..', ...one.rows.slice(1)] })).toBe(1);
    expect(distance(one, { ...one, goals: [...one.goals, { kind: 'ami' }] })).toBe(3);
    expect(distance(one, { ...one, features: ['arc'] })).toBe(4);
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
it('each colour has its own shape, and two close colours never share a scene', () => {
    expect(new Set(colors.map(c => PAINT[c].shape)).size).toBe(colors.length);
    const NEAR = 60, deltaE = (a: string, b: string) => { const p = lab(PAINT[a as 'rouge'].fill), q = lab(PAINT[b as 'rouge'].fill); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
    for (const a of colors) for (const b of colors) if (a < b) {
        const close = closeColors.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
        expect(deltaE(a, b) < NEAR, `${a}/${b}`).toBe(close);
    }
    for (const l of levels) for (const a of l.colors) for (const b of l.colors) if (a < b) expect(deltaE(a, b), `scene ${l.id}`).toBeGreaterThanOrEqual(NEAR);
});

it('every scene starts without a line, with a swap to make, the same way every time', () => {
    for (const l of levels) {
        const s = start(l.id);
        expect(playable(s), `scene ${l.id}`).toBe(true);
        expect(start(l.id)).toEqual(s);
        expect(progress(s).every(p => p.left > 0), `scene ${l.id}`).toBe(true);
    }
});

it('a greedy player finishes every scene', () => {
    const worst: number[] = [];
    for (const l of levels) {
        const { state, swaps } = greedy(l.id, 200);
        expect(state.finished, `scene ${l.id}`).toBe(true);
        expect(swaps, `scene ${l.id}`).toBeLessThanOrEqual(GREEDY_MAX);
        worst.push(swaps);
    }
    expect(Math.max(...worst)).toBeLessThanOrEqual(GREEDY_MAX);
});

it(`a robot swapping at random finishes every scene: median at most ${RANDOM_MEDIAN_MAX} swaps over 200 seeds, never more than ${RANDOM_WORST_MAX}`, { timeout: 180_000 }, () => {
    const medians: number[] = [];
    for (const l of levels) {
        const runsOf = Array.from({ length: 200 }, (_, k) => randomPlayer(l.id, 1000 + k, RANDOM_LIMIT));
        for (const r of runsOf) { expect(r.state.finished, `scene ${l.id}`).toBe(true); expect(r.swaps, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_WORST_MAX); }
        const n = runsOf.map(r => r.swaps).sort((a, b) => a - b), median = (n[99]! + n[100]!) / 2;
        expect(median, `scene ${l.id}`).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
        medians.push(median);
    }
    expect(Math.max(...medians)).toBeLessThanOrEqual(RANDOM_MEDIAN_MAX);
});

it('the board never gets stuck: after every swap it has no line left and a swap to make, mixing itself when needed', { timeout: 60_000 }, () => {
    let mixes = 0;
    const play = (id: number, seed: number): void => {
        const rng = makeRng(seed);
        let s = start(id);
        while (!s.finished && s.swaps < RANDOM_LIMIT) {
            const all = moves(s), r = swap(s, ...all[Math.floor(rng() * all.length)]!)!;
            s = r.state;
            if (r.shuffled) { mixes++; expect(r.shuffled).toBe(s.grid); }
            if (!s.finished) expect(playable(s), `scene ${id}`).toBe(true);
        }
        expect(s.finished, `scene ${id}`).toBe(true);
    };
    for (const l of levels) for (let k = 0; k < 15; k++) play(l.id, 1000 + k);
    // The robot hardly ever empties a board of swaps: boards with a single swap left, built from a pattern that never lines
    // up, make it happen. Whatever the swap leaves, the child gets a board with a swap to make.
    for (const { s } of deadBoards()) for (let i = 0; i < s.grid.length; i++) for (const color of levels[s.level - 1]!.colors) {
        const t = s.grid[i]; if (!t || t.kind !== 'bonbon' || t.wrapped) continue;
        const grid = s.grid.slice(); grid[i] = { ...t, color };
        const one = { ...s, grid };
        if (runs(grid, s.cols, s.rows).length || moves(one).length !== 1) continue;
        const r = swap(one, ...moves(one)[0]!)!;
        if (r.shuffled) { mixes++; expect(r.shuffled).toBe(r.state.grid); }
        if (!r.state.finished) expect(playable(r.state), `scene ${s.level}`).toBe(true);
    }
    expect(mixes).toBeGreaterThan(0);
});

/** Boards with no swap at all, built from colour patterns that never line up. */
function deadBoards(): { s: State; grid: Grid }[] {
    const patterns = [(r: number, c: number) => (r + 2 * c) % 3, (r: number, c: number) => (2 * r + c) % 3];
    const out: { s: State; grid: Grid }[] = [];
    for (const l of levels) {
        const s = start(l.id);
        for (const f of patterns) for (let shift = 0; shift < 3; shift++) {
            const grid = s.grid.map((t, i) => t && t.kind === 'bonbon' && !t.wrapped ? { ...t, color: l.colors[(f(Math.floor(i / s.cols), i % s.cols) + shift) % 3]! } : t);
            if (!runs(grid, s.cols, s.rows).length && !moves({ ...s, grid }).length) out.push({ s: { ...s, grid }, grid });
        }
    }
    return out;
}
it('a board without a swap always mixes into a playable board, keeping every sweet, friend, cube and chocolate', () => {
    const dead = deadBoards();
    expect(new Set(dead.map(d => d.s.level)).size).toBeGreaterThanOrEqual(20);
    const ids = (g: Grid) => g.filter((t): t is Tile => Boolean(t)).map(t => t.id).sort((a, b) => a - b);
    dead.forEach(({ s, grid }, k) => {
        const mixed = mix(s, grid, 1000 + k);
        expect(playable({ ...s, grid: mixed }), `scene ${s.level}`).toBe(true);
        expect(ids(mixed)).toEqual(ids(grid));
        grid.forEach((t, i) => { if (!t || t.kind === 'ami' || t.kind === 'sucre' || t.kind === 'choco') expect(mixed[i]).toBe(t); });
    });
});

/** Every non-working swap at the start of each scene and after a few good swaps: where the funny tries are found. */
function tries(): { before: State; after: State; miss: Miss; level: number; vertical: boolean }[] {
    const out: { before: State; after: State; miss: Miss; level: number; vertical: boolean }[] = [];
    for (const l of levels) {
        let s = start(l.id);
        for (let k = 0; k < 3 && !s.finished; k++) {
            for (let i = 0; i < s.grid.length; i++) for (const j of [i + 1, i + s.cols]) {
                const r = swap(s, i, j);
                if (r && !r.valid) out.push({ before: s, after: r.state, miss: r.miss!, level: l.id, vertical: j === i + s.cols });
            }
            const g = goodSwap(s)!; s = swap(s, g[0], g[1])!.state;
        }
    }
    return out;
}
it('every funny try exists, has its own animation, and changes nothing on the board', () => {
    const all = tries(), seen = new Map<Miss, number>();
    for (const { before, after, miss, level } of all) {
        seen.set(miss, (seen.get(miss) ?? 0) + 1);
        expect(after.grid, `scene ${level} ${miss}`).toEqual(before.grid);
        expect([after.pot, after.friendsOut, after.helps, after.swaps, after.finished, after.seed]).toEqual([before.pot, before.friendsOut, before.helps, before.swaps, false, before.seed]);
        expect([after.tries, after.dry]).toEqual([before.tries + 1, before.dry + 1]);
    }
    expect([...seen.keys()].sort()).toEqual([...misses].sort());
    expect(misses.length).toBeGreaterThanOrEqual(5);
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    expect(new Set(Object.values(missAnimations)).size).toBe(misses.length);
    for (const m of misses) {
        expect(css, m).toContain(`@keyframes ${missAnimations[m]}{`);
        expect(css, m).toContain(`.${missAnimations[m]}{animation:${missAnimations[m]} `);
    }
});

it('a swap that is not a swap at all is ignored: far cells, holes and sugar or chocolate that cannot move', () => {
    const s = start(13), hole = s.holes.indexOf(true);
    expect(swap(s, 8, 10)).toBeNull(); expect(swap(s, hole + 1, hole)).toBeNull(); expect(swap(s, 1, 2)?.a).toBe(1);
    expect(swap(s, s.cols - 1, s.cols)).toBeNull();
    const sugar = start(9), cube = sugar.grid.findIndex(t => t?.kind === 'sucre');
    expect(swap(sugar, cube, cube + 1)).toBeNull(); expect(swap(sugar, cube + 1, cube)!.miss).toBe('lourd');
});

it('three in a line go into the jar, the sweets above fall and new ones fill the top', () => {
    const s = start(1), [a, b] = moves(s)[0]!, r = swap(s, a, b)!;
    expect(r.valid).toBe(true); expect(r.steps.length).toBeGreaterThan(0);
    const first = r.steps[0]!;
    expect(first.cleared.length).toBeGreaterThanOrEqual(3);
    expect(Object.values(r.state.pot).reduce((x: number, y) => x + y, 0)).toBe(r.steps.reduce((n, st) => n + st.cleared.filter(c => c.tile.kind === 'bonbon').length, 0));
    expect(first.spawns.length).toBe(first.cleared.length);
    expect(r.state.grid.every(t => t)).toBe(true);
});

it('the rainbow sweet swapped with a sweet takes every sweet of its colour', () => {
    const s = start(5), arc = s.grid.findIndex(t => t?.kind === 'arc'), other = arc + 1, color = s.grid[other]!.color!;
    const count = s.grid.filter(t => t?.kind === 'bonbon' && t.color === color).length, r = swap(s, arc, other)!;
    expect(r.valid).toBe(true);
    expect(r.steps[0]!.cleared.filter(c => c.tile.kind === 'bonbon').every(c => c.tile.color === color)).toBe(true);
    expect(r.steps[0]!.cleared.length).toBe(count + 1);
});

it('a wrapped sweet in a line jumps and bursts its 3 × 3 neighbourhood', () => {
    let found = false;
    for (const id of [7, 8]) {
        const s = start(id);
        for (const [a, b] of moves(s)) {
            const r = swap(s, a, b)!, step = r.steps[0]!;
            if (!step.blasts.length) continue;
            const at = step.blasts[0]!, row = Math.floor(at / s.cols), col = at % s.cols, gone = new Set(step.cleared.map(c => c.at));
            for (let y = Math.max(0, row - 1); y <= Math.min(s.rows - 1, row + 1); y++) for (let x = Math.max(0, col - 1); x <= Math.min(s.cols - 1, col + 1); x++) expect(gone.has(y * s.cols + x)).toBe(true);
            found = true;
        }
    }
    expect(found).toBe(true);
});

it('a sugar cube melts in two times, a friend leaves at the bottom of its column', () => {
    const sugar = greedy(9).state;
    expect(sugar.grid.some(t => t?.kind === 'sucre')).toBe(false);
    let s = start(9), cracked = false;
    while (!s.finished && !cracked) { const g = goodSwap(s)!; const r = swap(s, g[0], g[1])!; cracked = r.steps.some(st => st.hits.some(h => h.layers === 1)); s = r.state; }
    expect(cracked).toBe(true);
    const friend = greedy(11).state;
    expect(friend.friendsOut).toBe(1); expect(friend.finished).toBe(true);
});

it('chocolate is eaten next to a line, and spreads by one square only after a line that left it alone, never past its field', () => {
    for (const id of levels.filter(l => l.features.includes('choco')).map(l => l.id)) {
        const field = chocoField(levels[id - 1]!, start(id).cols);
        let s = start(id), spreads = 0, eaten = 0;
        const cap = s.chocoCap;
        for (let k = 0; k < 40 && !s.finished; k++) {
            const all = moves(s), r = swap(s, ...all[(k * 31) % all.length]!)!;
            const ate = r.steps.reduce((n, st) => n + st.eaten.length, 0);
            eaten += ate;
            if (r.spread !== null) { spreads++; expect(ate).toBe(0); expect(field.has(r.spread)).toBe(true); }
            s = r.state;
            expect(s.grid.filter(t => t?.kind === 'choco').length).toBeLessThanOrEqual(cap);
        }
        expect(eaten, `scene ${id}`).toBeGreaterThan(0);
        if (id === 15) expect(spreads).toBeGreaterThan(0);
    }
});

it('three tries in a row bring the help; using it costs a star, tries alone never do', () => {
    let s = start(2);
    const miss = (st: State) => { for (let i = 0; i < st.grid.length; i++) { const r = swap(st, i, i + 1); if (r && !r.valid) return r.state; } throw new Error('no miss'); };
    for (let k = 0; k < DRY_HELP - 1; k++) s = miss(s);
    expect(helpOn(s)).toBe(false);
    s = miss(s);
    expect(helpOn(s)).toBe(true);
    const g = goodSwap(s)!, helped = swap(s, g[0], g[1])!;
    expect(helped.valid).toBe(true); expect(helped.helped).toBe(true);
    expect(helped.state.dry).toBe(0); expect(helped.state.helps).toBe(1); expect(stars(helped.state)).toBe(2);
    expect(stars({ ...helped.state, helps: 0, tries: 40 })).toBe(3); expect(stars({ ...helped.state, helps: 2 })).toBe(1);
});

it('stars and records: best kept, next unlocked, bad storage ignored', () => {
    const won = greedy(3).state;
    expect(complete({ 3: 1 }, won)[3]).toBe(stars(won)); expect(complete({ 3: 3 }, { ...won, helps: 5 })).toEqual({ 3: 3 });
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(4, { 3: 1 })).toBe(true); expect(isUnlocked(5, { 3: 1 })).toBe(false);
    expect(parseRecords('{"1":3,"2":9,"99":1,"x":2,"4":1.5}')).toEqual({ 1: 3 }); expect(parseRecords('nope')).toEqual({}); expect(parseRecords('[1]')).toEqual({});
});
