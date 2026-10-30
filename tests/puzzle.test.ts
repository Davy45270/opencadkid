import { expect, it, vi } from 'vitest';
import { newPuzzle, drop, hint, stars, complete, isUnlocked, levels, edgePoints, sceneIds, type Piece } from '../src/engines/puzzle';
import { gameView } from '../src/games/puzzle/view';
import { characterSvg } from '../src/characters/svg';
import { sceneSvg, sceneNames } from '../src/games/puzzle/scenes';
import { messages } from '../src/shell/i18n';
import { fresh, readSave, writeSave } from '../src/shell/storage';
import { canonicalPaintIds } from './svg-oracles';
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
// Parse the rendered SVG, independently of engine edge data and frame calculations.
function pathPoints(path: string): number[][] {
    const tokens = path.match(/[MLCZ]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!;
    let at = [0, 0]; const points: number[][] = [];
    for (let i = 0; i < tokens.length;) {
        const op = tokens[i++]!;
        if (op === 'Z') break;
        if (op === 'M' || op === 'L') { at = [Number(tokens[i++]), Number(tokens[i++])]; points.push(at); }
        else if (op === 'C') {
            const a = [Number(tokens[i++]), Number(tokens[i++])], b = [Number(tokens[i++]), Number(tokens[i++])], end = [Number(tokens[i++]), Number(tokens[i++])];
            const start = at;
            for (let k = 1; k <= 64; k++) {
                const t = k / 64, u = 1 - t;
                points.push([0, 1].map(axis => u ** 3 * start[axis]! + 3 * u * u * t * a[axis]! + 3 * u * t * t * b[axis]! + t ** 3 * end[axis]!));
            }
            at = end;
        } else throw new Error(`Unexpected SVG command ${op}`);
    }
    return points;
}
function painted(p: Piece): { x: number; y: number; width: number; height: number } {
    const points = pathPoints(p.path), left = Math.min(...points.map(v => v[0]!)), top = Math.min(...points.map(v => v[1]!));
    return { x: p.x - p.homeX + 10 + left - .75, y: p.y - p.homeY + 8 + top - .75, width: Math.max(...points.map(v => v[0]!)) - left + 1.5, height: Math.max(...points.map(v => v[1]!)) - top + 1.5 };
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
        const reserveRects = s.pieces.map(painted);
        for (const p of s.pieces) {
            const r = base(p); expect(r.x).toBeGreaterThanOrEqual(10); expect(r.y).toBeGreaterThanOrEqual(8);
            expect(r.x + r.width).toBeLessThanOrEqual(310); expect(r.y + r.height).toBeLessThanOrEqual(248);
            expect(p.placed).toBe(false); expect(Math.hypot(p.x - p.homeX, p.y - p.homeY)).toBeGreaterThan(s.snap);
            const reserve = reserveRects[p.id]!;
            expect(reserve.x).toBeGreaterThanOrEqual(-1e-8); expect(reserve.x + reserve.width).toBeLessThanOrEqual(320 + 1e-8);
            expect(reserve.y).toBeGreaterThanOrEqual(280 - 1e-8); expect(reserve.y + reserve.height).toBeLessThanOrEqual(550 + 1e-8);
            for (const other of s.pieces.slice(p.id + 1)) {
                expect(intersects(r, base(other))).toBe(false);
                expect(intersects(reserve, reserveRects[other.id]!)).toBe(false);
            }
            for (const [side, boundary] of [p.row === 0, p.column === columns - 1, p.row === rows - 1, p.column === 0].entries()) {
                const e = p.edges[side]!; expect(e.straight).toBe(boundary || !wavy);
                expect(e.points).toHaveLength(e.straight ? 2 : 16);
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
        const low = painted(drop(s, 0, -1000, -1000).pieces[0]!), high = painted(drop(s, 0, 1000, 1000).pieces[0]!);
        expect(low.x).toBeCloseTo(0, 8); expect(low.y).toBeCloseTo(0, 8);
        expect(high.x + high.width).toBeCloseTo(320, 8); expect(high.y + high.height).toBeCloseTo(550, 8);
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

it('rendered classic paths have visible heads, narrow necks and complementary curved commands', () => {
    for (let seed = 0; seed < 30; seed++) {
        const s = newPuzzle(8, seed);
        for (const p of s.pieces) {
            const inner = p.edges.filter(e => !e.straight);
            expect((p.path.match(/C/g) ?? []).length).toBe(inner.length * 5);
            const commands = p.path.match(/[MLCZ][^MLCZ]*/g)!;
            let command = 1;
            for (const edge of p.edges) {
                const count = edge.straight ? 1 : 5, segment = commands.slice(command, command + count).join(''); command += count;
                if (edge.straight) continue;
                const oriented = edgePoints(edge);
                const [a, b] = [oriented[0]!, oriented.at(-1)!];
                const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
                const rendered = pathPoints(`M${a.join(' ')}${segment}Z`);
                const local = rendered.map(v => ({ along: ((v[0]! - a[0]) * dx + (v[1]! - a[1]) * dy) / length, depth: Math.abs(((v[1]! - a[1]) * dx - (v[0]! - a[0]) * dy) / length) }));
                expect(Math.max(...local.map(v => v.depth))).toBeGreaterThanOrEqual(5.9);
                const neck = local.filter(v => v.depth > .4 && v.depth < 1), head = local.filter(v => v.depth > 3 && v.depth < 4);
                const span = (points: typeof local): number => Math.max(...points.map(v => v.along)) - Math.min(...points.map(v => v.along));
                expect(span(head)).toBeGreaterThan(span(neck) * 1.5);
            }
        }
    }
});
it('each scene contains the requested characters, including both picnic friends', () => {
    const subjects = { castle: ['dragon'], bamboo: ['panda'], rainbow: ['licorne'], jungle: ['singe'], autumn: ['pandaroux'], picnic: ['panda', 'dragon'] } as const;
    for (const scene of sceneIds) for (const subject of subjects[scene]) {
        expect(canonicalPaintIds(sceneSvg(scene))).toContain(canonicalPaintIds(characterSvg(subject, 'joie', 'repos', 'reduce').replace('<svg ', '<svg style="width:240px;height:240px" ')));
    }
});
it('completion renders the celebration expression and pose in both motion preferences', () => {
    for (const reduce of [false, true]) {
        vi.stubGlobal('matchMedia', () => ({ matches: reduce }));
        try {
            let s = newPuzzle(1, 17);
            const idle = gameView(s, 'fr', false);
            for (const p of s.pieces) s = drop(s, p.id, p.homeX, p.homeY);
            const finished = gameView(s, 'fr', false);
            expect(canonicalPaintIds(finished)).toContain(canonicalPaintIds(characterSvg('dragon', 'celebration', 'celebration', reduce ? 'reduce' : 'full')));
            expect(idle).not.toContain('puzzle-finished'); expect(finished).toContain('puzzle-finished');
        } finally { vi.unstubAllGlobals(); }
    }
});
