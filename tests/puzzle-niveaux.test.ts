import { afterEach, expect, it, vi } from 'vitest';
import { drop, edgePoints, hasEye, levels, newPuzzle, type Piece } from '../src/engines/puzzle';
import { gameView, levelView } from '../src/games/puzzle/view';
import { messages } from '../src/shell/i18n';
import { fresh } from '../src/shell/storage';

// Literal copy of the eight levels shipped before the doubling: children's records are keyed by these ids.
const before = [
    { id: 1, columns: 2, rows: 1, model: true, wavy: false },
    { id: 2, columns: 3, rows: 1, model: true, wavy: false },
    { id: 3, columns: 2, rows: 2, model: false, wavy: false },
    { id: 4, columns: 3, rows: 2, model: false, wavy: false },
    { id: 5, columns: 3, rows: 2, model: false, wavy: false },
    { id: 6, columns: 3, rows: 3, model: false, wavy: false },
    { id: 7, columns: 4, rows: 3, model: false, wavy: false },
    { id: 8, columns: 3, rows: 3, model: false, wavy: true }
];
// Levels 4 and 5 were already identical before the doubling (GAME_SPEC calls 5 a consolidation level).
// Their ids hold records, so they stay; this is the only tolerated pair, and no new level may join it.
afterEach(() => vi.unstubAllGlobals());
const LEGACY_TWINS = '4-5';
const SEEDS = 200;
const config = (l: typeof levels[number]): string => JSON.stringify([l.columns, l.rows, l.model, l.wavy, hasEye(l.id)]);
type Rect = { x: number; y: number; width: number; height: number };
// Painted extent parsed from the rendered path (cubics sampled), plus the 1.5-unit outline: independent of pieceFrame.
function painted(p: Piece): Rect {
    const tokens = p.path.match(/[MLCZ]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!, points: number[][] = [];
    let at = [0, 0];
    for (let i = 0; i < tokens.length;) {
        const op = tokens[i++]!;
        if (op === 'Z') break;
        if (op === 'M' || op === 'L') { at = [Number(tokens[i++]), Number(tokens[i++])]; points.push(at); continue; }
        const c = [0, 1, 2].map(() => [Number(tokens[i++]), Number(tokens[i++])]), start = at;
        for (let k = 1; k <= 64; k++) { const t = k / 64, u = 1 - t; points.push([0, 1].map(a => u ** 3 * start[a]! + 3 * u * u * t * c[0]![a]! + 3 * u * t * t * c[1]![a]! + t ** 3 * c[2]![a]!)); }
        at = c[2]!;
    }
    const xs = points.map(v => v[0]!), ys = points.map(v => v[1]!), left = Math.min(...xs), top = Math.min(...ys);
    return { x: p.x - p.homeX + 10 + left - .75, y: p.y - p.homeY + 8 + top - .75, width: Math.max(...xs) - left + 1.5, height: Math.max(...ys) - top + 1.5 };
}
const overlap = (a: Rect, b: Rect): boolean => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1e-8 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1e-8;

it('doubled: sixteen levels, contiguous ids, the first eight unchanged', () => {
    expect(levels).toHaveLength(16);
    expect(levels.map(l => l.id)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(levels.slice(0, 8)).toEqual(before);
    expect(() => newPuzzle(17, 0)).toThrow(RangeError);
});

it('unique: no two levels share a configuration or a play fingerprint (except the legacy 4-5 twins)', () => {
    const configs = levels.map(config), prints = levels.map(l => {
        // Fingerprint over 50 seeds: piece count and sizes, edge kinds, the reserve layout, and the aids offered.
        const layouts = new Set<string>();
        for (let seed = 0; seed < 50; seed++) {
            const s = newPuzzle(l.id, seed);
            layouts.add(JSON.stringify(s.pieces.map(p => [Math.round(p.x), Math.round(p.y), p.edges.map(e => e.straight ? 0 : 1).join('')])));
        }
        return JSON.stringify([l.columns * l.rows, l.columns, l.rows, l.wavy, l.model, hasEye(l.id), [...layouts].sort()]);
    });
    for (let a = 0; a < levels.length; a++) for (let b = a + 1; b < levels.length; b++) {
        const pair = `${a + 1}-${b + 1}`;
        if (pair === LEGACY_TWINS) { expect(configs[a]).toBe(configs[b]); continue; }
        expect(configs[a], `configuration of levels ${pair}`).not.toBe(configs[b]);
        expect(prints[a], `fingerprint of levels ${pair}`).not.toBe(prints[b]);
    }
});

for (const l of levels.slice(8)) it(`level ${l.id}: ${SEEDS} seeds tile the board, fit the reserve without overlap, and rebuild`, () => {
    for (let seed = 0; seed < SEEDS; seed++) {
        const s = newPuzzle(l.id, seed);
        expect(s).toEqual(newPuzzle(l.id, seed));
        expect(s.pieces).toHaveLength(l.columns * l.rows);
        expect(s.pieces.reduce((n, p) => n + p.width * p.height, 0)).toBeCloseTo(300 * 240, 6);
        const reserve = s.pieces.map(painted);
        for (const p of s.pieces) {
            const home = { x: p.homeX - p.width / 2, y: p.homeY - p.height / 2, width: p.width, height: p.height };
            expect(home.x).toBeGreaterThanOrEqual(10 - 1e-8); expect(home.x + home.width).toBeLessThanOrEqual(310 + 1e-8);
            expect(home.y).toBeGreaterThanOrEqual(8 - 1e-8); expect(home.y + home.height).toBeLessThanOrEqual(248 + 1e-8);
            // A child's finger: at a 1:1 stage (390 px phone, and 320 px too) every piece paints at least 44 px each way.
            expect(Math.min(p.width, p.height)).toBeGreaterThanOrEqual(44);
            const r = reserve[p.id]!;
            expect(r.x).toBeGreaterThanOrEqual(-1e-8); expect(r.x + r.width).toBeLessThanOrEqual(320 + 1e-8);
            expect(r.y).toBeGreaterThanOrEqual(280 - 1e-8); expect(r.y + r.height).toBeLessThanOrEqual(550 + 1e-8);
            expect(Math.hypot(p.x - p.homeX, p.y - p.homeY)).toBeGreaterThan(s.snap);
            for (const other of s.pieces.slice(p.id + 1)) {
                expect(overlap(home, { x: other.homeX - other.width / 2, y: other.homeY - other.height / 2, width: other.width, height: other.height })).toBe(false);
                expect(overlap(r, reserve[other.id]!)).toBe(false);
            }
            if (p.column < l.columns - 1) expect(edgePoints(p.edges[1]!)).toEqual([...edgePoints(s.pieces[p.id + 1]!.edges[3]!)].reverse());
            if (p.row < l.rows - 1) expect(edgePoints(p.edges[2]!)).toEqual([...edgePoints(s.pieces[p.id + l.columns]!.edges[0]!)].reverse());
        }
        // Rebuilt in a seeded order, each piece dropped on its home snaps and the last one finishes.
        let play = s;
        for (const p of [...s.pieces].sort((a, b) => Math.sin(a.id * 7 + seed) - Math.sin(b.id * 7 + seed))) {
            expect(play.finished).toBe(false); play = drop(play, p.id, p.homeX + 3, p.homeY - 3);
            expect(play.pieces[p.id]!.placed).toBe(true);
        }
        expect(play.finished).toBe(true);
    }
});

it('progression: from level 8 on, never fewer pieces; at equal size the eye goes away, never comes back', () => {
    for (let id = 9; id <= 16; id++) {
        const a = levels[id - 2]!, b = levels[id - 1]!;
        expect(b.columns * b.rows, `pieces ${id}`).toBeGreaterThanOrEqual(a.columns * a.rows);
        if (b.columns * b.rows === a.columns * a.rows) expect(Number(hasEye(b.id)), `eye ${id}`).toBeLessThan(Number(hasEye(a.id)));
        expect(b.model).toBe(false);
    }
    expect(levels.at(-1)!.columns * levels.at(-1)!.rows).toBe(24);
});

it('view: no eye button and a written note on eyeless levels, both languages; sixteen level buttons', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    for (const locale of ['fr', 'en'] as const) {
        expect(messages[locale].puzzleNoModel.trim()).not.toBe('');
        for (const l of levels) {
            const html = gameView(newPuzzle(l.id, 5), locale, false);
            expect(html.includes('id="model"'), `level ${l.id}`).toBe(hasEye(l.id));
            expect(html.includes(messages[locale].puzzleNoModel), `level ${l.id}`).toBe(!hasEye(l.id));
        }
    }
    expect(levelView(fresh()).match(/data-level="/g)).toHaveLength(16);
});
