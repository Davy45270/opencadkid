import { expect, it } from 'vitest';
import { newPuzzle, drop, hint, stars, complete, isUnlocked, levels, edgePoints, sceneIds, type Piece } from '../src/engines/puzzle';
import { sceneSvg, sceneNames } from '../src/games/puzzle/scenes';
import { messages } from '../src/shell/i18n';
import { fresh, readSave, writeSave } from '../src/shell/storage';
function validSvg(svg: string): boolean {
    const stack: string[] = [];
    for (const token of svg.match(/<[^>]+>/g) ?? []) {
        const tag = /^<\/?([A-Za-z][\w-]*)/.exec(token)?.[1]; if (!tag) return false;
        if (token.startsWith('</')) { if (stack.pop() !== tag) return false; }
        else {
            const attributes = token.replace(/^<[\w-]+/, '').replace(/\/?[>]$/, '');
            if (attributes.replace(/\s+[\w:-]+="[^"]*"/g, '').trim()) return false;
            if (!token.endsWith('/>')) stack.push(tag);
        }
    }
    return stack.length === 0;
}
const table = [[2, 1, true, false], [3, 1, true, false], [2, 2, false, false], [3, 2, false, false], [3, 2, false, false], [3, 3, false, false], [4, 3, false, false], [3, 3, false, true]] as const;
const intersects = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1e-8 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1e-8;
const base = (p: Piece): { x: number; y: number; width: number; height: number } => ({ x: p.homeX - p.width / 2, y: p.homeY - p.height / 2, width: p.width, height: p.height });
it('eight independent level definitions, invalid level rejection', () => {
    expect(levels.map(l => [l.columns, l.rows, l.model, l.wavy])).toEqual(table);
    expect(() => newPuzzle(0, 0)).toThrow(); expect(() => newPuzzle(9, 0)).toThrow();
});
for (const [index, [columns, rows, , wavy]] of table.entries()) it(`level ${index + 1}: exact tiling, reserve and complementary curves across 300 seeds`, () => {
    for (let seed = 0; seed < 300; seed++) {
        const s = newPuzzle(index + 1, seed), before = structuredClone(s);
        expect(s).toEqual(newPuzzle(index + 1, seed)); expect(s.pieces).toHaveLength(columns * rows);
        expect(s.snap).toBeGreaterThanOrEqual(28); expect(s.finished).toBe(false);
        expect(s.pieces.reduce((sum, p) => sum + p.width * p.height, 0)).toBe(300 * 240);
        for (const p of s.pieces) {
            const r = base(p); expect(r.x).toBeGreaterThanOrEqual(10); expect(r.y).toBeGreaterThanOrEqual(8);
            expect(r.x + r.width).toBeLessThanOrEqual(310); expect(r.y + r.height).toBeLessThanOrEqual(248);
            expect(p.placed).toBe(false); expect(Math.hypot(p.x - p.homeX, p.y - p.homeY)).toBeGreaterThan(s.snap);
            const margin = wavy ? 3 : 0;
            const reserve = { x: p.x - p.width / 2 - margin, y: p.y - p.height / 2 - margin, width: p.width + margin * 2, height: p.height + margin * 2 };
            expect(reserve.x).toBeGreaterThanOrEqual(0); expect(reserve.x + reserve.width).toBeLessThanOrEqual(320);
            expect(reserve.y).toBeGreaterThanOrEqual(280); expect(reserve.y + reserve.height).toBeLessThanOrEqual(550);
            for (const other of s.pieces.slice(p.id + 1)) {
                expect(intersects(r, base(other))).toBe(false);
                expect(intersects(reserve, { x: other.x - other.width / 2 - margin, y: other.y - other.height / 2 - margin, width: other.width + margin * 2, height: other.height + margin * 2 })).toBe(false);
            }
            for (const [side, boundary] of [p.row === 0, p.column === columns - 1, p.row === rows - 1, p.column === 0].entries()) {
                const e = p.edges[side]!; expect(e.straight).toBe(boundary || !wavy);
                expect(e.points).toHaveLength(e.straight ? 2 : 10);
                if (!e.straight) expect(e.points.some(v => side % 2 === 0 ? v[1] !== e.points[0]![1] : v[0] !== e.points[0]![0])).toBe(true);
            }
            if (p.column < columns - 1) expect(edgePoints(p.edges[1]!)).toEqual([...edgePoints(s.pieces[p.id + 1]!.edges[3]!)].reverse());
            if (p.row < rows - 1) expect(edgePoints(p.edges[2]!)).toEqual([...edgePoints(s.pieces[p.id + columns]!.edges[0]!)].reverse());
            expect(p.path).not.toMatch(/NaN|undefined|Infinity/); expect(p.path).toMatch(/^M.*Z$/);
        }
        expect(s).toEqual(before);
    }
});
it('drop uses a strict radial snap, clamps both axes, is pure and locks placed pieces', () => {
    for (let level = 1; level <= 8; level++) {
        const s = newPuzzle(level, 3), p = s.pieces[0]!, before = structuredClone(s);
        const near = drop(s, 0, p.homeX + s.snap - 1, p.homeY);
        expect(near.pieces[0]).toMatchObject({ x: p.homeX, y: p.homeY, placed: true });
        expect(drop(near, 0, 0, 550)).toBe(near);
        for (const distance of [s.snap, s.snap + 1]) expect(drop(s, 0, p.homeX + distance, p.homeY).pieces[0]!.placed).toBe(false);
        const far = drop(s, 0, p.homeX + 26, p.homeY + 26); expect(far.pieces[0]!.placed).toBe(false);
        const moved = drop(s, 0, 170, 400); expect(moved.pieces[0]).toMatchObject({ x: 170, y: 400, placed: false });
        const margin = level === 8 ? 3 : 0;
        expect(drop(s, 0, -1000, -1000).pieces[0]).toMatchObject({ x: p.width / 2 + margin, y: p.height / 2 + margin });
        expect(drop(s, 0, 1000, 1000).pieces[0]).toMatchObject({ x: 320 - p.width / 2 - margin, y: 550 - p.height / 2 - margin });
        expect(drop(s, -1, 0, 0)).toBe(s); expect(drop(s, 0, NaN, 0)).toBe(s); expect(s).toEqual(before);
    }
});
it('hint at exactly 25 seconds, cleared by placement; assistance and completion rewards never zero', () => {
    let s = newPuzzle(1, 7); expect(hint(s, 24_999)).toBe(s);
    s = hint(s, 25_000); expect(s.hintPiece).toBe(0); expect(s.aids).toBe(1); expect(hint(s, 90_000)).toBe(s);
    const p = s.pieces[0]!; s = drop(s, 0, p.homeX, p.homeY); expect(s.hintPiece).toBeNull();
    expect(hint(s, 24_999)).toBe(s); s = hint(s, 25_000); expect(s.hintPiece).toBe(1); expect(s.aids).toBe(2);
    expect([0, 1, 2, 20].map(aids => stars({ aids }))).toEqual([3, 2, 1, 1]);
    for (let level = 1; level <= 8; level++) for (const aids of [0, 1, 2]) {
        let state = { ...newPuzzle(level, 10), aids }; expect(complete({}, state)).toEqual({});
        for (const piece of state.pieces) state = drop(state, piece.id, piece.homeX, piece.homeY);
        expect(state.finished).toBe(true); expect(hint(state, 25_000)).toBe(state);
        const records = complete({}, state); expect(records[level]).toBe([3, 2, 1][aids]);
        expect(complete({ [level]: 3 }, state)[level]).toBe(3); expect(isUnlocked(level + 1, records)).toBe(true);
    }
});
it('six finite distinct procedural SVG scenes and complete native language labels', () => {
    expect(sceneIds).toHaveLength(6); expect(new Set(sceneIds.map(sceneSvg)).size).toBe(6);
    for (const scene of sceneIds) {
        const svg = sceneSvg(scene); expect(validSvg(svg)).toBe(true); expect(svg).toMatch(/^<svg xmlns=/); expect(svg).toMatch(/<\/svg>$/); expect(svg).not.toMatch(/NaN|undefined|Infinity|<image|href=/);
        expect((svg.match(/<svg\b/g) ?? []).length).toBe((svg.match(/<\/svg>/g) ?? []).length);
        expect((svg.match(/<g\b/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length);
        for (const locale of ['fr', 'en'] as const) expect(sceneNames[locale][scene].trim()).not.toBe('');
    }
    expect(Object.keys(messages.fr).sort()).toEqual(Object.keys(messages.en).sort());
    for (const locale of ['fr', 'en'] as const) for (const key of ['puzzleInstruction', 'puzzleModel', 'puzzlePiece', 'puzzleHint'] as const) expect(messages[locale][key].trim()).not.toBe('');
});
it('separate puzzle records migrate, filter, round-trip, preserve other games and clear', () => {
    let raw = JSON.stringify({ ...fresh(), records: { 1: 2 }, puzzleRecords: { 1: 3, 8: 2, 9: 1, 2: 0, 3: '2', 4: 1.5 } });
    const port = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
    const save = readSave(port); expect(save.puzzleRecords).toEqual({ 1: 3, 8: 2 }); expect(save.records).toEqual({ 1: 2 });
    writeSave(port, save); expect(readSave(port)).toEqual(save);
    raw = JSON.stringify({ version: 1, locale: 'en', voice: true, sound: true, records: { 1: 3 } }); expect(readSave(port).puzzleRecords).toEqual({});
    raw = JSON.stringify({ ...fresh(), puzzleRecords: [] }); expect(readSave(port).puzzleRecords).toEqual({}); expect(fresh().puzzleRecords).toEqual({});
});
