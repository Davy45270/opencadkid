import { expect, it } from 'vitest';
import { centre, complete, extend, fromPoint, hint, interpolate, isUnlocked, medal, newMaze, segmentCells, stars, type Maze } from '../src/engines/chemin';
import { messages } from '../src/shell/i18n';
import { fresh, readSave, writeSave } from '../src/shell/storage';
import { boardSvg, gameView } from '../src/games/chemin/view';

// Independent dimensions, lengths in CELLS (including both endpoints), and bonus counts.
const oracle = [[3, 3, 3, 3, 0], [4, 3, 4, 4, 0], [5, 4, 7, 20, 0], [6, 4, 9, 24, 2], [7, 5, 11, 35, 2], [7, 6, 11, 42, 3], [8, 6, 12, 48, 3], [9, 7, 14, 63, 3]] as const;
function neighbours(s: Maze, cell: number): number[] {
    return s.grid[cell]!.map(d => {
        const x = cell % s.columns, y = Math.floor(cell / s.columns);
        const nx = x + (d === 'E' ? 1 : d === 'W' ? -1 : 0), ny = y + (d === 'S' ? 1 : d === 'N' ? -1 : 0);
        if (nx < 0 || nx >= s.columns || ny < 0 || ny >= s.rows) throw new Error('Passage outside grid');
        return ny * s.columns + nx;
    });
}
function solve(s: Maze, start = s.start, goal = s.goal): number[] {
    const queue = [start], parents = new Map<number, number>([[start, -1]]);
    for (let i = 0; i < queue.length; i++) for (const n of neighbours(s, queue[i]!)) if (!parents.has(n)) { parents.set(n, queue[i]!); queue.push(n); }
    expect(parents.size).toBe(s.columns * s.rows);
    const path = [goal]; while (path[0] !== start) path.unshift(parents.get(path[0]!)!);
    return path;
}
for (const [i, [columns, rows, min, max, bonuses]] of oracle.entries()) it(`level ${i + 1}: 300 deterministic connected perfect trees, reciprocal edges, unique route and opposite borders`, () => {
    for (let seed = 0; seed < 300; seed++) {
        const s = newMaze(i + 1, seed); expect(s).toEqual(newMaze(i + 1, seed));
        expect([s.columns, s.rows]).toEqual([columns, rows]);
        expect(s.start % columns).toBe(0); expect(s.goal % columns).toBe(columns - 1);
        expect(s.grid.reduce((sum, e) => sum + e.length, 0)).toBe(2 * (columns * rows - 1));
        for (let c = 0; c < s.grid.length; c++) {
            expect(new Set(s.grid[c]).size).toBe(s.grid[c]!.length);
            for (const n of neighbours(s, c)) expect(neighbours(s, n)).toContain(c);
        }
        if (i >= 3) expect(min).toBeGreaterThanOrEqual(1.5 * columns);
        const solution = solve(s); expect(solution.length).toBeGreaterThanOrEqual(min); expect(solution.length).toBeLessThanOrEqual(max);
        expect(s.solution).toEqual(solution);
        // Independent simple-path enumeration, without reading the stored solution.
        let paths = 0;
        const walk = (cell: number, visited: Set<number>): void => {
            if (cell === s.goal) { paths++; return; }
            for (const n of neighbours(s, cell)) if (!visited.has(n)) walk(n, new Set([...visited, n]));
        };
        walk(s.start, new Set([s.start])); expect(paths).toBe(1);
        expect(s.bonuses.length).toBe(bonuses); expect(new Set(s.bonuses).size).toBe(bonuses);
        for (const b of s.bonuses) {
            expect([s.start, s.goal]).not.toContain(b);
            expect(solve(s, s.start, b)).not.toContain(s.goal);
            if (!solution.includes(b)) {
                expect(s.grid[b]).toHaveLength(1);
                expect(solve(s, b).findIndex(c => solution.includes(c))).toBeLessThanOrEqual(2);
            }
        }
    }
});
it('different seeds give different mazes and invalid levels throw', () => {
    expect(newMaze(8, 1).grid).not.toEqual(newMaze(8, 2).grid);
    for (const level of [0, 9, NaN, 1.5]) expect(() => newMaze(level, 0)).toThrow(RangeError);
});
it('pure advance, previous-cell erasure, wall/nonadjacent/invalid rejection, and finished lock', () => {
    const s = newMaze(4, 18), path = solve(s), next = extend(s, path[1]!);
    expect(s.trace).toEqual([s.start]); expect(next.trace).toEqual(path.slice(0, 2));
    expect(extend(next, s.start).trace).toEqual([s.start]);
    for (const c of [-1, NaN, .5, s.start, path.at(-1)!]) expect(extend(s, c)).toBe(s);
    const blocked = Array.from({ length: s.grid.length }, (_, c) => c).find(c => Math.abs(c % s.columns - s.start % s.columns) + Math.abs(Math.floor(c / s.columns) - Math.floor(s.start / s.columns)) === 1 && !neighbours(s, s.start).includes(c));
    expect(blocked).toBeDefined(); expect(extend(s, blocked!)).toBe(s);
    let done = s; for (const c of path.slice(1)) done = extend(done, c);
    expect(done.finished).toBe(true); expect(extend(done, path.at(-2)!)).toBe(done);
});
// Hand-authored 3x3 tree; fast diagonal crosses five cells in X-before-Y order.
function fixture(): Maze {
    return { level: 1, columns: 3, rows: 3, grid: [['E', 'S'], ['W', 'S'], ['S'], ['N', 'S'], ['N', 'E'], ['W', 'N', 'S'], ['N', 'E'], ['W'], ['N']], start: 0, goal: 8, trace: [0], solution: [0, 1, 4, 5, 8], bonuses: [4], collected: [], finished: false };
}
it('exact five-cell diagonal interpolation, stopping at first wall and no wall cutting', () => {
    const s = fixture(), a = { x: .5, y: .5 }, b = { x: 2.5, y: 2.5 };
    expect(segmentCells(s, a, b)).toEqual([0, 1, 4, 5, 8]);
    const done = interpolate(s, a, b); expect(done.trace).toEqual([0, 1, 4, 5, 8]); expect(done.finished).toBe(true);
    const walled = { ...s, grid: s.grid.map((v, i) => i === 4 ? ['N' as const] : v) };
    expect(interpolate(walled, a, b).trace).toEqual([0, 1, 4]);
    expect(interpolate(s, a, { x: 2.5, y: .5 }).trace).toEqual([0, 1]);
    expect(interpolate(s, centre(s, 4), b)).toBe(s);
});
it('point conversion includes exactly a quarter cell tolerance, all edges and nonfinite values', () => {
    const s = fixture();
    for (const [x, y, cell] of [[-.25, -.25, 0], [3.25, 3.25, 8], [1.99, 1, 4], [3, 0, 2], [0, 3, 6]]) expect(fromPoint(s, x!, y!)).toBe(cell);
    for (const [x, y] of [[-.251, 0], [3.251, 0], [0, -.251], [0, 3.251], [NaN, 0], [0, Infinity]]) expect(fromPoint(s, x!, y!)).toBeNull();
});
it('bonuses survive backtracking, are optional, and give a medal only on completion with all collected', () => {
    let s = fixture(); s = extend(extend(s, 1), 4); expect(s.collected).toEqual([4]);
    s = extend(s, 1); expect(s.collected).toEqual([4]); s = extend(s, 4); expect(s.collected).toEqual([4]);
    expect(medal(s)).toBe(false); s = extend(extend(s, 5), 8); expect(medal(s)).toBe(true);
    expect(medal({ ...s, bonuses: [2] })).toBe(false); expect(medal({ ...s, bonuses: [] })).toBe(false);
    expect(stars()).toBe(3); expect(complete({}, s)).toEqual({ 1: 3 });
    expect(complete({ 1: 3 }, { ...s, collected: [] })).toEqual({ 1: 3 });
    expect(complete({}, fixture())).toEqual({}); expect(isUnlocked(2, complete({}, s))).toBe(true);
});
it('help always gives the next three cells, including a retreat from a dead end, without changing state or reward', () => {
    const s = fixture(); expect(hint(s)).toEqual([1, 4, 5]);
    const branch = extend(extend(s, 3), 6); expect(hint(branch)).toEqual([3, 0, 1]);
    expect(branch.trace).toEqual([0, 3, 6]); expect(hint({ ...s, finished: true })).toEqual([]);
    expect(hint(extend(extend(extend(s, 1), 4), 5))).toEqual([8]);
});
it('complete bilingual UI, explicit DOM oracle, finite SVG, destination per level and constant reward', () => {
    expect(Object.keys(messages.fr).sort()).toEqual(Object.keys(messages.en).sort());
    for (const locale of ['fr', 'en'] as const) {
        for (const key of ['pathInstruction', 'pathHelp', 'pathMedal'] as const) expect(messages[locale][key].trim()).not.toBe('');
        const s = fixture(), html = gameView(s, locale, true);
        expect(html).toContain(messages[locale].pathInstruction); expect(html).toContain(messages[locale].pathHelp);
        expect(html).toContain('data-hint="1,4,5"');
        const finished = gameView({ ...s, finished: true, collected: [4] }, locale, false);
        expect(finished).toContain('★★★'); expect(finished).toContain('data-medal');
    }
    for (let level = 1; level <= 8; level++) {
        const s = newMaze(level, 17), svg = boardSvg(s, false);
        expect(svg).not.toMatch(/NaN|Infinity|undefined/); expect(svg.match(/data-cell=/g)).toHaveLength(s.columns * s.rows);
        expect(svg).toContain(`data-open="${s.grid[0]!.join('')}"`); expect(svg).toContain('data-destination');
        expect((svg.match(/<g\b/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length);
    }
});
it('separate records/medals migrate safely, filter, roundtrip, and erase without losing older games', () => {
    let raw = JSON.stringify({ ...fresh(), records: { 1: 2 }, cheminRecords: { 1: 3, 4: 3, 8: 1, 9: 3, 2: 0, 3: '3', 5: 1.5 }, cheminMedals: { 1: true, 4: true, 5: true, 8: 'true', 9: true } });
    const port = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
    const saved = readSave(port); expect(saved.cheminRecords).toEqual({ 1: 3, 4: 3, 8: 1 }); expect(saved.cheminMedals).toEqual({ 4: true }); expect(saved.records).toEqual({ 1: 2 });
    writeSave(port, saved); expect(readSave(port)).toEqual(saved);
    raw = JSON.stringify({ version: 1, locale: 'fr', voice: true, sound: true, records: { 1: 2 } });
    expect(readSave(port).cheminRecords).toEqual({}); expect(readSave(port).cheminMedals).toEqual({});
    writeSave(port, fresh()); expect(readSave(port).cheminRecords).toEqual({}); expect(readSave(port).cheminMedals).toEqual({});
});

function attribute(svg: string, marker: string, name: string): string {
    const tag = svg.match(new RegExp(`<[^>]*\\b${marker}(?:[\\s=>])[^>]*>`))?.[0];
    expect(tag, marker).toBeDefined();
    const value = tag!.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
    expect(value, `${marker}.${name}`).toBeDefined();
    return value!;
}
it('painted walls match every closed grid edge and leave every passage open', () => {
    for (let level = 1; level <= 8; level++) {
        const s = newMaze(level, 17), svg = boardSvg(s, false);
        const d = attribute(svg, 'data-walls', 'd');
        const segments = [...d.matchAll(/M(\d+) (\d+)([hv])1/g)].map(m => `${m[1]},${m[2]},${m[3]}`);
        expect(d).toBe(segments.map(v => { const [x, y, axis] = v.split(','); return `M${x} ${y}${axis}1`; }).join(''));
        const expected: string[] = [];
        for (let y = 0; y <= s.rows; y++) for (let x = 0; x < s.columns; x++) {
            if (y === 0 || y === s.rows || !neighbours(s, (y - 1) * s.columns + x).includes(y * s.columns + x)) expected.push(`${x},${y},h`);
        }
        for (let x = 0; x <= s.columns; x++) for (let y = 0; y < s.rows; y++) {
            if (x === 0 || x === s.columns || !neighbours(s, y * s.columns + x - 1).includes(y * s.columns + x)) expected.push(`${x},${y},v`);
        }
        expect(segments.sort()).toEqual(expected.sort());
    }
});
it('painted trace and character follow advance and retreat', () => {
    const s = fixture(), advanced = extend(extend(s, 1), 4);
    for (const [state, points, translation] of [
        [s, '0.5,0.5', [.15, .15]],
        [advanced, '0.5,0.5 1.5,0.5 1.5,1.5', [1.15, 1.15]],
        [extend(advanced, 1), '0.5,0.5 1.5,0.5', [1.15, .15]]
    ] as const) {
        const svg = boardSvg(state, false);
        expect(attribute(svg, 'data-trace', 'points')).toBe(points);
        const transform = attribute(svg, 'data-guide', 'transform');
        const xy = transform.match(/translate\(([^ ]+) ([^)]+)\)/)!;
        expect(Number(xy[1])).toBeCloseTo(translation[0]); expect(Number(xy[2])).toBeCloseTo(translation[1]);
        expect(transform).toContain('scale(');
    }
});
it('painted help shows three upcoming cells with visible dashed ink', () => {
    for (const [state, points] of [
        [fixture(), '0.5,0.5 1.5,0.5 1.5,1.5 2.5,1.5'],
        [extend(extend(fixture(), 3), 6), '0.5,2.5 0.5,1.5 0.5,0.5 1.5,0.5']
    ] as const) {
        const svg = boardSvg(state, true);
        expect(attribute(svg, 'data-hint', 'points')).toBe(points);
        expect(attribute(svg, 'data-hint', 'stroke-dasharray')).toBe('.12 .13');
        expect(attribute(svg, 'data-hint', 'stroke')).toBe('#6d52a1');
        expect(Number(attribute(svg, 'data-hint', 'stroke-width'))).toBeGreaterThan(0);
        expect(boardSvg(state, false)).not.toContain('data-hint');
        expect(boardSvg({ ...state, finished: true }, true)).not.toContain('data-hint');
    }
});
it('destinations paint nest bamboo and rainbow in their respective levels', () => {
    const drawings: string[] = [];
    for (let level = 1; level <= 8; level++) {
        const drawing = boardSvg(newMaze(level, 17), false).match(/<g data-destination[^>]*>(.*?)<\/g>/)![1]!;
        if (level % 3 === 1) { expect(drawing).toContain('<ellipse'); expect(drawing).toContain('fill="#f5e5b7"'); }
        if (level % 3 === 2) { expect(drawing).toContain('d="M.35 .85V.15M.65 .85V.15M.2 .35H.5M.5 .6H.8"'); expect(drawing).toContain('fill="#72a552"'); }
        if (level % 3 === 0) { expect(drawing).toContain('A.38 .38'); expect(drawing).toContain('A.22 .22'); }
        drawings.push(drawing);
        if (level > 3) expect(drawing).toBe(drawings[level - 4]);
    }
    expect(new Set(drawings).size).toBe(3);
});
it('fast exits retain crossed cells to the border or first wall without changing slope', () => {
    const s = newMaze(1, 0), a = centre(s, s.start);
    expect(segmentCells(s, a, { x: 30, y: a.y })).toEqual([s.start, s.start + 1, s.start + 2]);
    expect(interpolate(s, a, { x: 30, y: a.y }).finished).toBe(true);
    const f = fixture();
    expect(segmentCells(f, { x: .5, y: .5 }, { x: 9.5, y: 9.5 })).toEqual([0, 1, 4, 5, 8]);
    expect(interpolate(f, { x: .5, y: .5 }, { x: 30, y: .5 }).trace).toEqual([0, 1]);
    expect(segmentCells(f, { x: .5, y: .5 }, { x: 8.5, y: 4.5 })).toEqual([0, 1, 4, 5]);
    expect(interpolate(f, { x: .5, y: .5 }, { x: 8.5, y: 4.5 }).trace).toEqual([0, 1, 4, 5]);
    for (const [a, b, cells] of [
        [{ x: 2.5, y: 1.5 }, { x: -20, y: 1.5 }, [5, 4, 3]],
        [{ x: 1.5, y: 2.5 }, { x: 1.5, y: -20 }, [7, 4, 1]],
        [{ x: 1.5, y: .5 }, { x: 1.5, y: 20 }, [1, 4, 7]]
    ] as const) expect(segmentCells(f, a, b)).toEqual(cells);
    for (const b of [{ x: NaN, y: 0 }, { x: 0, y: Infinity }]) expect(interpolate(f, { x: .5, y: .5 }, b)).toBe(f);
});

// Fallback for the DOM-only earlier-trace wall search in the pointer E2E.
it('level 4 seed 18 has an interior wall before the last two solution cells', () => {
    const s = newMaze(4, 18), path = solve(s);
    const cell = path.slice(0, -2).find(cell => {
        const x = cell % s.columns, y = Math.floor(cell / s.columns);
        return neighbours(s, cell).length < Number(x > 0) + Number(x + 1 < s.columns) + Number(y > 0) + Number(y + 1 < s.rows);
    });
    expect(cell).toBeDefined();
    const blocked = Array.from({ length: s.grid.length }, (_, n) => n).find(n =>
        Math.abs(n % s.columns - cell! % s.columns) + Math.abs(Math.floor(n / s.columns) - Math.floor(cell! / s.columns)) === 1 && !neighbours(s, cell!).includes(n));
    expect(blocked).toBeDefined();
    const trace = path.slice(0, Math.max(3, path.indexOf(cell!) + 2));
    expect(trace.indexOf(cell!)).toBeLessThan(trace.length - 1);
    expect(trace.length).toBeLessThan(path.length);
    let drawn = s;
    for (const step of path.slice(1, path.indexOf(cell!) + 1)) drawn = extend(drawn, step);
    expect(extend(drawn, blocked!)).toBe(drawn);
});
