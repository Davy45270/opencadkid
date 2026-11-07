import { expect, it, vi } from 'vitest';
import { complete, endPreview, flip, isUnlocked, levels, newBoard, stars, type Board, type Level } from '../src/engines/paires';
import { motifSvg } from '../src/games/paires/motifs';
import { gameView, instruction, levelView } from '../src/games/paires/view';
import { fresh } from '../src/shell/storage';

// Literal copy of the seven original levels: records are stored by id, they must never move.
const original = [
    { id: 1, pairs: 2, columns: 2, rows: 2, preview: 2000, shadows: false },
    { id: 2, pairs: 3, columns: 3, rows: 2, preview: 2000, shadows: false },
    { id: 3, pairs: 4, columns: 4, rows: 2, preview: 2000, shadows: false },
    { id: 4, pairs: 6, columns: 4, rows: 3, preview: 0, shadows: false },
    { id: 5, pairs: 8, columns: 4, rows: 4, preview: 0, shadows: false },
    { id: 6, pairs: 10, columns: 4, rows: 5, preview: 0, shadows: false },
    { id: 7, pairs: 6, columns: 4, rows: 3, preview: 0, shadows: true }
];
// FNV-1a of the 50 first seeded boards of each original level, recorded before the new levels were added.
const originalBoards = ['bfc022df', 'b84a5f03', 'd38dea8f', '40b1113b', '6a2c7f9f', 'f6e31141', '51102b21'];
const fnv = (s: string): string => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
const DARK = 'fill="#354e41"';

it('fourteen levels, contiguous ids, the seven originals unchanged in configuration and in generated boards', () => {
    expect(levels).toHaveLength(14);
    expect(levels.map(l => l.id)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    expect(levels.slice(0, 7)).toEqual(original);
    expect(original.map(l => { let all = ''; for (let seed = 0; seed < 50; seed++) all += JSON.stringify(newBoard(l.id, seed)); return fnv(all); })).toEqual(originalBoards);
});

/** What the child faces: board size, preview, and how the two cards of a pair look (picture/silhouette). */
function fingerprint(level: number): string {
    const looks = new Set<string>();
    let size = '';
    for (let seed = 0; seed < 50; seed++) {
        const board = newBoard(level, seed);
        size = `${board.cards.length}:${board.columns}x${board.rows}:${board.preview}`;
        for (const motif of new Set(board.cards.map(c => c.motif))) looks.add(board.cards.filter(c => c.motif === motif).map(c => c.shadow ? 'S' : 'P').sort().join(''));
    }
    return `${size}:${[...looks].sort().join('/')}`;
}
it('no two levels share a configuration or play alike', () => {
    const configs = levels.map(l => JSON.stringify(Object.entries(l).filter(([key]) => key !== 'id').sort()));
    expect(new Set(configs).size).toBe(levels.length);
    const prints = levels.map(l => fingerprint(l.id));
    for (let a = 0; a < levels.length; a++) for (let b = a + 1; b < levels.length; b++) expect(prints[a], `levels ${a + 1} and ${b + 1}`).not.toBe(prints[b]);
});

function partner(state: Board, index: number): number { return state.cards.findIndex((c, i) => i !== index && c.motif === state.cards[index]!.motif); }
for (const level of levels) it(`level ${level.id}: every board over 200 seeds is solvable and fits a phone`, () => {
    const failures = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
        const board = newBoard(level.id, seed);
        if (board.cards.length !== level.pairs * 2 || board.columns * board.rows !== board.cards.length) failures.add('size');
        const motifs = new Set(board.cards.map(c => c.motif));
        if (motifs.size !== level.pairs) failures.add('distinct pairs');
        for (const motif of motifs) {
            const pair = board.cards.filter(c => c.motif === motif);
            const dark = pair.filter(c => c.shadow).length;
            if (pair.length !== 2) failures.add('exactly two cards');
            if (dark !== (level.silhouettes ? 2 : level.shadows ? 1 : 0)) failures.add('pair looks');
        }
        // Silhouette-only pairs are told apart by outline alone: every dark drawing on the board must be unique.
        const darkFaces = [...motifs].map(m => motifSvg(m, true));
        if (new Set(darkFaces).size !== motifs.size || darkFaces.some(face => !face.includes(DARK))) failures.add('distinct silhouettes');
        // A perfect player who knows the identities finishes in exactly `pairs` moves.
        let state = endPreview(board);
        for (let i = 0; i < state.cards.length; i++) if (!state.cards[i]!.found) state = flip(flip(state, i), partner(state, i));
        if (!state.finished || state.moves !== level.pairs || stars(state) !== 3) failures.add('solver');
        // 16 px shell edges, 10 px gaps, 260 px reserved for header and guide (same model as tests/paires.test.ts).
        for (const width of [320, 390]) {
            const card = (width - 32 - (board.columns - 1) * 10) / board.columns;
            if (card < 64) failures.add(`card width at ${width}`);
        }
        const card = (390 - 32 - (board.columns - 1) * 10) / board.columns;
        if (card * board.rows + (board.rows - 1) * 10 + 260 > 844) failures.add('phone height');
    }
    expect([...failures]).toEqual([]);
});

/** Pairs to find, plus two per lost cue: one picture becomes a shadow (+2), both become shadows (+4). */
function hardness(l: Level): number { return l.pairs + 2 * (l.silhouettes ? 2 : l.shadows ? 1 : 0); }
it('difficulty never decreases across the new levels', () => {
    const added = levels.slice(7);
    expect(added.map(hardness)).toEqual([10, 12, 12, 12, 14, 14, 16]);
    expect(hardness(added[0]!)).toBeGreaterThan(hardness(levels[6]!));
    for (let i = 1; i < added.length; i++) expect(hardness(added[i]!)).toBeGreaterThanOrEqual(hardness(added[i - 1]!));
    // No new level brings back the introductory preview.
    for (const l of added) expect(l.preview).toBe(0);
});

it('silhouette levels: instruction, pictogram and every face are dark; the last level has no next button', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    for (const l of levels.slice(7)) {
        const state = endPreview(newBoard(l.id, 9));
        expect(instruction(state, 'fr')).toBe(l.silhouettes ? 'Trouve les deux mêmes ombres.' : l.shadows ? 'Trouve chaque image et son ombre.' : 'Trouve les deux mêmes images.');
        expect(instruction(state, 'en')).toBe(l.silhouettes ? 'Find the two matching shadows.' : l.shadows ? 'Find each picture and its shadow.' : 'Find the two matching pictures.');
        const html = gameView(state, 'fr');
        const faces = [...html.matchAll(/class="memory-card-face"[^>]*>(.*?)<\/span>/g)].map(m => m[1]!);
        expect(faces).toHaveLength(l.pairs * 2);
        expect(faces.filter(face => face.includes(DARK))).toHaveLength(l.silhouettes ? l.pairs * 2 : l.shadows ? l.pairs : 0);
        const pictogram = html.split('class="instruction-pic"')[1]!.split('</div>')[0]!;
        expect([...pictogram.matchAll(new RegExp(DARK, 'g'))]).toHaveLength(l.silhouettes ? 2 : l.shadows ? 1 : 0);
        let solved = state;
        for (let i = 0; i < solved.cards.length; i++) if (!solved.cards[i]!.found) solved = flip(flip(solved, i), partner(solved, i));
        const records = complete({}, solved);
        expect(records[l.id]).toBe(3); expect(isUnlocked(l.id + 1, records)).toBe(true);
        expect(gameView(solved, 'fr').includes('id="next"')).toBe(l.id < 14);
    }
    const grid = levelView({ ...fresh(), pairesRecords: Object.fromEntries(levels.map(l => [l.id, 3])) });
    expect([...grid.matchAll(/data-level="(\d+)"/g)].map(m => Number(m[1]))).toEqual(levels.map(l => l.id));
    vi.unstubAllGlobals();
});
