import { it, expect } from 'vitest';
import { newBoard, endPreview, flip, settle, stars, complete, isUnlocked, levels, motifs, type Board } from '../src/engines/paires';
import { makeRng } from '../src/engines/rng';
import { drawings, motifSvg, names } from '../src/games/paires/motifs';
import { messages } from '../src/shell/i18n';
import { fresh, readSave, writeSave } from '../src/shell/storage';
const play = (level = 3, seed = 71): Board => endPreview(newBoard(level, seed));
function pair(state: Board, index: number): number { return state.cards.findIndex((c, i) => i !== index && c.motif === state.cards[index]!.motif); }
function solve(state: Board): Board {
    for (let i = 0; i < state.cards.length; i++) if (!state.cards[i]!.found) state = flip(flip(state, i), pair(state, i));
    return state;
}
it('independent level table, deterministic boards, exact pairs and phone grid over 300 seeds per level', () => {
    expect(levels.map(l => [l.pairs, l.columns, l.rows, l.preview, l.shadows])).toEqual([
        [2, 2, 2, 2000, false], [3, 3, 2, 2000, false], [4, 4, 2, 2000, false],
        [6, 4, 3, 0, false], [8, 4, 4, 0, false], [10, 4, 5, 0, false], [6, 4, 3, 0, true]
    ]);
    for (const level of levels) for (let seed = 0; seed < 300; seed++) {
        const board = newBoard(level.id, seed);
        expect(board).toEqual(newBoard(level.id, seed));
        const counts = new Map<string, number>();
        for (const card of board.cards) counts.set(card.motif, (counts.get(card.motif) ?? 0) + 1);
        expect([...counts.values()]).toEqual(Array(level.pairs).fill(2));
        expect(counts.size).toBe(level.pairs); expect(board.cards).toHaveLength(level.pairs * 2);
        expect(board.columns * board.rows).toBe(board.cards.length);
        // 16 px shell edges, 10 px gaps. Reserve 260 px for header, guide and safe areas.
        const size = (390 - 32 - (board.columns - 1) * 10) / board.columns;
        expect(size).toBeGreaterThanOrEqual(64);
        expect(size * board.rows + (board.rows - 1) * 10 + 260).toBeLessThanOrEqual(844);
    }
    expect(newBoard(6, 1)).not.toEqual(newBoard(6, 2));
    expect(() => newBoard(0, 1)).toThrow(RangeError);
});
it('each of the eight introductory motifs occupies every position 8–17% of 2000 four-pair boards', () => {
    const counts = Array.from({ length: 8 }, () => new Map<string, number>());
    for (let seed = 0; seed < 2000; seed++) newBoard(3, seed).cards.forEach((c, i) => counts[i]!.set(c.motif, (counts[i]!.get(c.motif) ?? 0) + 1));
    for (const position of counts) for (const motif of motifs.slice(0, 8)) {
        expect((position.get(motif) ?? 0) / 2000).toBeGreaterThanOrEqual(.08);
        expect((position.get(motif) ?? 0) / 2000).toBeLessThanOrEqual(.17);
    }
});
it('preview and invalid/visible/found cards cannot be flipped, mismatch settles purely', () => {
    const preview = newBoard(1, 2); expect(flip(preview, 0)).toBe(preview);
    const initial = play(), original = structuredClone(initial);
    for (const index of [-1, 99, .5, NaN]) expect(flip(initial, index)).toBe(initial);
    const one = flip(initial, 0); expect(one.visible).toEqual([0]); expect(flip(one, 0)).toBe(one);
    const wrong = initial.cards.findIndex(c => c.motif !== initial.cards[0]!.motif);
    const two = flip(one, wrong); expect(two.mismatch).toBe(true); expect(two.moves).toBe(1);
    expect(two.visible).toEqual([0, wrong]); expect(flip(two, pair(initial, 0)).visible).toEqual([pair(initial, 0)]);
    const closed = settle(two); expect(closed.visible).toEqual([]); expect(closed.mismatch).toBe(false); expect(closed.seen[0]).toBe(true);
    expect(two.visible).toHaveLength(2); expect(initial).toEqual(original); expect(settle(closed)).toBe(closed);
    const matched = flip(flip(closed, 0), pair(closed, 0));
    expect(matched.cards[0]!.found).toBe(true); expect(matched.visible).toEqual([]); expect(flip(matched, 0)).toBe(matched);
});
it('perfect players finish every level in exactly pairs moves and preserve their best score', () => {
    for (const level of levels) {
        const finished = solve(play(level.id));
        expect(finished.finished).toBe(true); expect(finished.moves).toBe(level.pairs); expect(stars(finished)).toBe(3);
        expect(finished.cards.every(c => c.found)).toBe(true); expect(flip(finished, 0)).toBe(finished);
        expect(complete({}, play(level.id))).toEqual({});
        const records = complete({}, finished); expect(records[level.id]).toBe(3); expect(isUnlocked(level.id + 1, records)).toBe(true);
        expect(complete(records, { ...finished, moves: 999 })[level.id]).toBe(3);
    }
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(2, {})).toBe(false);
});
it('seeded random players terminate with at least one star, without a move limit in the engine', () => {
    for (const level of levels) for (let seed = 0; seed < 12; seed++) {
        const rng = makeRng(seed), initial = play(level.id, seed); let state = initial;
        for (let guard = 0; guard < 5000 && !state.finished; guard++) {
            state = settle(state);
            const available = state.cards.map((c, i) => ({ c, i })).filter(({ c, i }) => !c.found && !state.visible.includes(i));
            state = flip(state, available[Math.floor(rng() * available.length)]!.i);
        }
        expect(state.finished).toBe(true); expect(stars(state)).toBeGreaterThanOrEqual(1);
        expect(state.moves).toBeGreaterThanOrEqual(initial.cards.length / 2);
    }
});
it('reward boundaries round upwards and never yield zero', () => {
    const state = play(2);
    for (const [moves, expected] of [[3, 3], [5, 3], [6, 2], [8, 2], [9, 1], [1000, 1]]) expect(stars({ ...state, moves: moves! })).toBe(expected);
});
it('three repeated misses of a seen card hint a fully seen unresolved pair and matching clears it', () => {
    let state = play(); const a = 0, b = pair(state, a), c = state.cards.findIndex(card => card.motif !== state.cards[a]!.motif);
    state = settle(flip(flip(state, b), c));
    state = settle(flip(flip(state, a), c));
    expect(state.hint).toEqual([]);
    for (let n = 0; n < 2; n++) { state = settle(flip(flip(state, a), c)); expect(state.hint).toEqual([]); }
    state = flip(flip(state, a), c);
    expect([...state.hint].sort((x, y) => x - y)).toEqual([a, b].sort((x, y) => x - y));
    state = flip(flip(settle(state), a), b); expect(state.hint).toEqual([]); expect(state.misses[a]).toBe(0);
});
it('shadow pairs contain one coloured picture and one silhouette, matched by identity', () => {
    const state = play(7);
    for (let i = 0; i < state.cards.length; i++) {
        const partner = pair(state, i); expect(state.cards[i]!.shadow).not.toBe(state.cards[partner]!.shadow);
        const next = flip(flip(state, i), partner); expect(next.cards[i]!.found).toBe(true); expect(next.mismatch).toBe(false);
    }
});
it('sixteen valid distinct SVG shapes and colours, including silhouettes, and complete bilingual names', () => {
    expect(motifs.length).toBeGreaterThanOrEqual(16);
    expect(new Set(motifs.map(m => drawings[m].path)).size).toBe(motifs.length);
    expect(new Set(motifs.map(m => drawings[m].color)).size).toBe(motifs.length);
    for (const shadow of [false, true]) {
        const svgs = motifs.map(m => motifSvg(m, shadow)); expect(new Set(svgs).size).toBe(motifs.length);
        for (const svg of svgs) { expect(svg).toMatch(/^<svg xmlns=/); expect(svg).toMatch(/viewBox="0 0 64 64"/); expect(svg).toMatch(/<path [^>]+\/>/); expect(svg).toMatch(/<\/svg>$/); expect(svg).not.toMatch(/NaN|undefined|Infinity/); }
    }
    expect(Object.keys(names.fr).sort()).toEqual([...motifs].sort()); expect(Object.keys(names.en).sort()).toEqual([...motifs].sort());
    for (const locale of ['fr', 'en'] as const) {
        for (const motif of motifs) expect(names[locale][motif].trim()).not.toBe('');
        for (const key of ['matchCards', 'matchShadows', 'previewCards', 'hiddenCard', 'memoryHint', 'memoryEncourage', 'rewardStars'] as const) expect(messages[locale][key].trim()).not.toBe('');
    }
});
it('separate memory records round-trip, migrate old saves and reject malformed records', () => {
    let raw = JSON.stringify({ ...fresh(), pairesRecords: { 1: 3, 2: 0, 3: '2', 4: 1.5, 7: 2, 8: 3 } });
    const port = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
    const save = readSave(port); expect(save.pairesRecords).toEqual({ 1: 3, 7: 2 }); expect(save.records).toEqual({});
    writeSave(port, save); expect(readSave(port)).toEqual(save);
    raw = JSON.stringify({ version: 1, locale: 'fr', voice: false, sound: false, records: { 1: 2 } });
    expect(readSave(port)).toMatchObject({ records: { 1: 2 }, pairesRecords: {} });
    raw = JSON.stringify({ ...fresh(), pairesRecords: [] }); expect(readSave(port).pairesRecords).toEqual({});
});

it('hint history uses cards seen before the trial in either flip order: manual oracle', () => {
    for (const reverse of [false, true]) {
        let state = play();
        state = { ...state, cards: ['apple', 'banana', 'apple', 'banana', 'cat', 'cat', 'fish', 'fish'].map(motif => ({ motif: motif as Board['cards'][number]['motif'], shadow: false, found: false })) };
        const trials = [
            { cards: [2, 1], misses: [0, 0, 0, 0, 0, 0, 0, 0], hint: [] },
            { cards: [0, 1], misses: [0, 1, 0, 0, 0, 0, 0, 0], hint: [] },
            { cards: [0, 1], misses: [1, 2, 0, 0, 0, 0, 0, 0], hint: [] },
            { cards: [0, 1], misses: [2, 3, 0, 0, 0, 0, 0, 0], hint: [] },
            { cards: [0, 1], misses: [3, 4, 0, 0, 0, 0, 0, 0], hint: [0, 2] }
        ];
        for (const trial of trials) {
            const [a, b] = reverse ? [...trial.cards].reverse() : trial.cards;
            state = flip(flip(state, a!), b!);
            expect(state.misses).toEqual(trial.misses);
            expect(state.hint).toEqual(trial.hint);
            state = settle(state);
        }
        state = flip(flip(state, 0), 2);
        expect(state.misses[0]).toBe(0); expect(state.hint).toEqual([]);
    }
});

it('exact star boundaries for every level: manual threshold table', () => {
    for (const [level, perfect, threeMax, twoMax] of [
        [1, 2, 3, 5], [2, 3, 5, 8], [3, 4, 6, 10], [4, 6, 9, 15],
        [5, 8, 12, 20], [6, 10, 15, 25], [7, 6, 9, 15]
    ] as const) {
        const state = play(level);
        for (const [moves, expected] of [[perfect, 3], [threeMax, 3], [threeMax + 1, 2], [twoMax, 2], [twoMax + 1, 1]] as const)
            expect(stars({ ...state, moves }), `level ${level}, moves ${moves}`).toBe(expected);
    }
});

it('each named silhouette has its fixed geometric signature and accessible identity', () => {
    const signatures = {
        apple: ['M31 18', 'MCQCLLZ'], banana: ['M10 10', 'MQQQZ'], cherry: ['M16 29', 'MALLALLLZ'],
        carrot: ['M9 59', 'MLLLLLLLLZ'], fish: ['M5 32', 'MQLLLQZ'], cat: ['M12 51', 'MQLLLLLQQZ'],
        butterfly: ['M30 26', 'MCCCCLLZ'], snail: ['M6 54', 'MLLLLLALQZ'], car: ['M5 27', 'MLLLLLLLALALZ'],
        boat: ['M5 40', 'MLLLLLLLLZ'], rocket: ['M22 39', 'MLLLQQLLLLLLLLZ'], house: ['M3 29', 'MLLLLLLLLLLZ'],
        star: ['M32 3', 'MLLLLLLLLLZ'], heart: ['M32 58', 'MCCZ'], moon: ['M45 4', 'MAAZ'], umbrella: ['M4 32', 'MQLLLQLLLLQLQLLLZ']
    };
    for (const motif of motifs) for (const shadow of [false, true]) {
        const rendered = motifSvg(motif, shadow);
        expect(rendered).toContain(`data-motif="${motif}"`);
        expect(rendered).toContain(`role="img" aria-label="${names.fr[motif]}"`);
        expect([...rendered.matchAll(/<path /g)]).toHaveLength(1);
        const path = / d="([^"]+)"/.exec(rendered)![1]!;
        expect(path.startsWith(signatures[motif][0]!)).toBe(true);
        expect(path.match(/[A-Za-z]/g)!.join('')).toBe(signatures[motif][1]);
        if (shadow) expect(rendered).toContain('fill="#354e41"');
        else expect(rendered).not.toContain('fill="#354e41"');
    }
});


it('touching a mismatch closes it and opens only a hidden target: handwritten transition oracle', () => {
    const base: Board = {
        level: 3, columns: 4, rows: 2, preview: false,
        cards: ['apple', 'banana', 'apple', 'banana', 'cat', 'cat', 'fish', 'fish'].map(motif => ({ motif: motif as Board['cards'][number]['motif'], shadow: false, found: false })),
        visible: [], seen: Array.from({ length: 8 }, () => false), misses: Array.from({ length: 8 }, () => 0), moves: 0, mismatch: false, hint: [], finished: false
    };
    const mismatch = flip(flip(base, 0), 1), original = structuredClone(mismatch);
    for (const [target, visible] of [[0, []], [1, []], [2, [2]], [4, [4]]] as const) {
        const next = flip(mismatch, target);
        expect(next).toEqual({ ...original, visible: [...visible], mismatch: false });
        expect(settle(next)).toBe(next); // A stale settlement cannot close a new selection.
    }
    for (const target of [-1, 8, .5, NaN]) expect(flip(mismatch, target)).toBe(mismatch);
    const withFound = { ...mismatch, cards: mismatch.cards.map((c, i) => ({ ...c, found: i >= 6 })) };
    expect(flip(withFound, 6)).toBe(withFound);
    const nextPair = flip(flip(mismatch, 2), 0);
    expect(nextPair.visible).toEqual([]); expect(nextPair.moves).toBe(2);
    expect(nextPair.cards.map(c => c.found)).toEqual([true, false, true, false, false, false, false, false]);
    expect(nextPair.seen).toEqual([true, true, true, false, false, false, false, false]);
    expect(mismatch).toEqual(original);
});
