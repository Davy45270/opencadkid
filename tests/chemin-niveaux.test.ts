import { expect, it } from 'vitest';
import { extend, hasHelp, levels, newMaze, type Maze } from '../src/engines/chemin';
import { gameView, levelView } from '../src/games/chemin/view';
import { messages } from '../src/shell/i18n';
import { fresh } from '../src/shell/storage';

// Literal copy of the eight levels shipped before the doubling: children's records are keyed by these ids.
const before = [
    { id: 1, columns: 3, rows: 3, min: 3, max: 3, bonuses: 0 },
    { id: 2, columns: 4, rows: 3, min: 4, max: 4, bonuses: 0 },
    { id: 3, columns: 5, rows: 4, min: 7, max: 20, bonuses: 0 },
    { id: 4, columns: 6, rows: 4, min: 9, max: 24, bonuses: 2 },
    { id: 5, columns: 7, rows: 5, min: 11, max: 35, bonuses: 2 },
    { id: 6, columns: 7, rows: 6, min: 11, max: 42, bonuses: 3 },
    { id: 7, columns: 8, rows: 6, min: 12, max: 48, bonuses: 3 },
    { id: 8, columns: 9, rows: 7, min: 14, max: 63, bonuses: 3 }
];
const SEEDS = 200;
const config = (l: typeof levels[number]): string => JSON.stringify({ ...l, id: undefined, sweeps: l.sweeps ?? 0, reach: l.reach ?? 2, help: l.help ?? true });

// Independent of the engine's helpers: openings decoded here, breadth-first search from scratch.
function neighbours(s: Maze, cell: number): number[] {
    return s.grid[cell]!.map(d => {
        const x = cell % s.columns + (d === 'E' ? 1 : d === 'W' ? -1 : 0), y = Math.floor(cell / s.columns) + (d === 'S' ? 1 : d === 'N' ? -1 : 0);
        if (x < 0 || x >= s.columns || y < 0 || y >= s.rows) throw new Error('Passage outside grid');
        return y * s.columns + x;
    });
}
function bfs(s: Maze, from: number): Map<number, number> {
    const parents = new Map<number, number>([[from, -1]]), queue = [from];
    for (let i = 0; i < queue.length; i++) for (const n of neighbours(s, queue[i]!)) if (!parents.has(n)) { parents.set(n, queue[i]!); queue.push(n); }
    return parents;
}
function path(s: Maze, from: number, to: number): number[] {
    const parents = bfs(s, from), result = [to];
    while (result[0] !== from) result.unshift(parents.get(result[0]!)!);
    return result;
}

it('doubled: sixteen levels, contiguous ids, the first eight unchanged', () => {
    expect(levels).toHaveLength(16);
    expect(levels.map(l => l.id)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(levels.slice(0, 8)).toEqual(before);
    expect(() => newMaze(17, 0)).toThrow(RangeError);
});

it('unique: no two levels share a configuration, and their played mazes tell every level apart', () => {
    const configs = levels.map(config);
    expect(new Set(configs).size).toBe(levels.length);
    // Play fingerprint over 50 seeds: board size, the set of route lengths met, the number of stars,
    // how far from the route a star may hide, and whether the bulb exists.
    const prints = levels.map(l => {
        const lengths = new Set<number>(); let far = 0;
        for (let seed = 0; seed < 50; seed++) {
            const s = newMaze(l.id, seed);
            lengths.add(s.solution.length);
            for (const b of s.bonuses) far = Math.max(far, path(s, b, s.goal).findIndex(c => s.solution.includes(c)));
        }
        return JSON.stringify([l.columns, l.rows, [...lengths].sort((a, b) => a - b), l.bonuses, far, hasHelp(l.id)]);
    });
    for (let a = 0; a < prints.length; a++) for (let b = a + 1; b < prints.length; b++) expect(prints[a], `levels ${a + 1} and ${b + 1}`).not.toBe(prints[b]);
});

for (const l of levels.slice(8)) it(`level ${l.id}: ${SEEDS} seeds, perfect connected maze, route within bounds, stars reachable, playable to the end`, () => {
    // Layout budget measured in the browser (tests/e2e/chemin.spec.ts): nine columns keep 40 px cells at 390 px,
    // and at most eight rows for nine columns keep the page without scrolling at 844 px high.
    expect(l.columns).toBeLessThanOrEqual(9); expect(l.rows / l.columns).toBeLessThanOrEqual(8 / 9);
    // Failures are collected as text and asserted once per seed: thousands of expect() calls would dominate the run time.
    for (let seed = 0; seed < SEEDS; seed++) {
        const s = newMaze(l.id, seed), bad: string[] = [];
        expect(s).toEqual(newMaze(l.id, seed));
        expect([s.columns, s.rows]).toEqual([l.columns, l.rows]);
        if (s.start % s.columns !== 0 || s.goal % s.columns !== s.columns - 1) bad.push('start or goal off its border');
        if (s.grid.reduce((n, e) => n + e.length, 0) !== 2 * (s.columns * s.rows - 1)) bad.push('not a tree');
        for (let c = 0; c < s.grid.length; c++) for (const n of neighbours(s, c)) if (!neighbours(s, n).includes(c)) bad.push(`one-way ${c}/${n}`);
        if (bfs(s, s.start).size !== s.columns * s.rows) bad.push('disconnected');
        const route = path(s, s.start, s.goal), onRoute = new Set(route);
        if (JSON.stringify(s.solution) !== JSON.stringify(route)) bad.push('stored solution differs');
        if (route.length < l.min || route.length > l.max) bad.push(`route of ${route.length}`);
        if (new Set(s.bonuses).size !== l.bonuses) bad.push('star count');
        for (const b of s.bonuses) {
            if (b === s.start || b === s.goal) bad.push(`star ${b} on an end`);
            if (path(s, s.start, b).includes(s.goal)) bad.push(`star ${b} beyond the goal`);
            if (path(s, b, s.goal).findIndex(c => onRoute.has(c)) > (l.reach ?? 2)) bad.push(`star ${b} too far`);
        }
        // Played through the engine itself: every star collected on the way, then the goal.
        let play = s;
        const visit = (to: number): void => { for (const c of path(s, play.trace.at(-1)!, to).slice(1)) { const next = extend(play, c); if (next === play) bad.push(`step ${c} refused`); play = next; } };
        for (const b of s.bonuses) { visit(b); visit(path(s, b, s.goal).find(c => onRoute.has(c))!); }
        visit(s.goal);
        if (!play.finished || [...play.collected].sort().join() !== [...s.bonuses].sort().join()) bad.push('not finished with every star');
        expect(bad, `seed ${seed}`).toEqual([]);
    }
});

it('progression: from level 8 on, routes lengthen, stars multiply and hide farther, the bulb goes away for good', () => {
    let longest8 = 0;
    for (let seed = 0; seed < SEEDS; seed++) longest8 = Math.max(longest8, newMaze(8, seed).solution.length);
    expect(levels[8]!.min).toBeGreaterThan(longest8);
    for (let id = 10; id <= 16; id++) {
        const a = levels[id - 2]!, b = levels[id - 1]!;
        expect(b.min, `route ${id}`).toBeGreaterThan(a.min);
        expect(b.bonuses, `stars ${id}`).toBeGreaterThanOrEqual(a.bonuses);
        expect(b.reach ?? 2, `reach ${id}`).toBeGreaterThanOrEqual(a.reach ?? 2);
        expect(Number(hasHelp(b.id)), `help ${id}`).toBeLessThanOrEqual(Number(hasHelp(a.id)));
    }
    expect(levels.slice(0, 12).every(l => hasHelp(l.id))).toBe(true);
    expect(levels.slice(12).some(l => hasHelp(l.id))).toBe(false);
});

it('view: the bulb is offered up to level 12 and absent from 13, said in both languages; the level list shows sixteen', () => {
    for (const locale of ['fr', 'en'] as const) {
        expect(messages[locale].pathAlone.trim()).not.toBe('');
        for (const l of levels) {
            const html = gameView(newMaze(l.id, 3), locale, true);
            expect(html.includes('id="help"'), `level ${l.id}`).toBe(hasHelp(l.id));
            expect(html.includes('data-hint='), `level ${l.id}`).toBe(hasHelp(l.id));
            expect(html.includes(messages[locale].pathAlone), `level ${l.id}`).toBe(!hasHelp(l.id));
        }
    }
    expect(levelView(fresh()).match(/data-level="/g)).toHaveLength(16);
});
