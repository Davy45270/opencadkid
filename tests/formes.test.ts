import { expect, it } from 'vitest';
import { expectedFills, hue, luminance, rgb } from './formes-oracles';
import { advance, answer, complete, drop, forbiddenPairs, generateRound, isUnlocked, levels, start, stars, type Piece, type Question } from '../src/engines/formes';
import { colorNames, name, paths, shapeNames, shapeSvg } from '../src/games/formes/shapes';
import { gameView, instruction } from '../src/games/formes/view';
import { fresh, readSave, writeSave } from '../src/shell/storage';
const table = [
    ['forme', 3, false], ['forme', 4, false], ['forme', 6, true], ['couleur', 3, false], ['couleur', 3, true],
    ['les-deux', 4, true], ['taille', 2, false], ['taille', 4, true], ['trier', 2, true], ['trier', 3, true]
] as const;
const banned = [['rouge', 'vert'], ['bleu', 'violet'], ['rose', 'orange'], ['rouge', 'marron'], ['vert', 'marron'], ['rouge', 'orange'], ['rouge', 'rose'], ['jaune', 'orange'], ['violet', 'rose']];
function oracle(q: Question, p: Piece): boolean {
    if (q.mode === 'forme') return p.shape === q.target.shape;
    if (q.mode === 'couleur') return p.color === q.target.color;
    if (q.mode === 'taille') return p.shape === q.target.shape && p.size === q.target.size;
    return p.shape === q.target.shape && p.color === q.target.color;
}
it('hard-coded level and exclusion tables', () => {
    // Levels 11–20 are covered by tests/formes-niveaux.test.ts.
    expect(levels.slice(0, 10).map(l => [l.mode, l.choices, l.mixed])).toEqual(table);
    expect(forbiddenPairs).toEqual(banned);
    expect(() => generateRound(0, 1)).toThrow(); expect(() => generateRound(1, 1, 0)).toThrow();
});
for (const [index, [mode, count, mixed]] of table.entries()) it(`level ${index + 1}: independent rules and random positions over 300 seeds`, () => {
    const failures: string[] = [], positions = Array<number>(count).fill(0);
    let rotations = 0;
    for (let seed = 0; seed < 300; seed++) {
        const round = generateRound(index + 1, seed);
        if (JSON.stringify(round) !== JSON.stringify(generateRound(index + 1, seed))) failures.push('determinism');
        expect(round).toHaveLength(6);
        if (round.slice(1).every((q, i) => q.answer === (round[i]!.answer + 1) % count)) rotations++;
        for (const [i, q] of round.entries()) {
            positions[q.answer]!++;
            if (q.mode !== mode) failures.push('mode');
            if (i && mode === 'couleur' && q.target.color === round[i - 1]!.target.color) failures.push('adjacent colour');
            if (i && q.target.shape === round[i - 1]!.target.shape) failures.push('adjacent');
            if (i > 1 && q.answer === round[i - 1]!.answer && q.answer === round[i - 2]!.answer) failures.push('triple');
            const palette = new Set([q.target.color, ...q.choices.map(p => p.color), ...q.boxes]);
            for (const [a, b] of banned) if (palette.has(a as Piece['color']) && palette.has(b as Piece['color'])) failures.push('forbidden pair');
            if (mode === 'trier') {
                if (q.boxes.length !== count || new Set(q.boxes).size !== count || q.boxes[q.answer] !== q.target.color) failures.push('boxes');
                for (const p of q.choices) if (q.boxes.filter(c => c === p.color).length !== 1) failures.push('sort answer');
            } else {
                if (q.choices.length !== count || q.choices.filter(p => oracle(q, p)).length !== 1 || !oracle(q, q.choices[q.answer]!)) failures.push('unique answer');
                if (mode === 'forme' && new Set(q.choices.map(p => p.shape)).size !== count) failures.push('distinct shapes');
                if (mode === 'forme' && !mixed && new Set(q.choices.map(p => p.color)).size !== 1) failures.push('same colour');
                if (mode === 'couleur' && mixed && new Set(q.choices.map(p => p.shape)).size !== count) failures.push('varied shapes');
                if (mode === 'couleur' && (!mixed && q.choices.some(p => p.shape !== q.target.shape))) failures.push('same shape');
                if (mode === 'les-deux' && (!q.choices.some(p => p.shape === q.target.shape && p.color !== q.target.color) || !q.choices.some(p => p.color === q.target.color && p.shape !== q.target.shape))) failures.push('distractors');
                if (mode === 'taille' && !q.choices.some(p => p.shape === q.target.shape && p.size !== q.target.size)) failures.push('size');
            }
        }
    }
    expect(failures).toEqual([]);
    for (const n of positions) { expect(n / 1800).toBeGreaterThan(.65 / count); expect(n / 1800).toBeLessThan(1.35 / count); }
    // Two positions necessarily alternate fairly often; cycles of 3+ must remain rare.
    if (count >= 3) expect(rotations / 300).toBeLessThan(.05);
    expect(generateRound(index + 1, 1)).not.toEqual(generateRound(index + 1, 2));
});
it('answer is pure, hint begins at two errors, success locks credit and only advance changes questions', () => {
    const initial = start(1, 8), before = structuredClone(initial), q = initial.questions[0]!;
    const once = answer(initial, (q.answer + 1) % 3), twice = answer(once.state, -1);
    expect(initial).toEqual(before); expect(once.hint).toBe(false); expect(twice.hint).toBe(true);
    expect(answer(twice.state, -1).hint).toBe(true); expect(advance(twice.state)).toBe(twice.state);
    const solved = answer(twice.state, q.answer).state;
    expect(solved.firstTry).toBe(0); expect(solved.solved).toBe(true); expect(answer(solved, q.answer).state).toBe(solved);
    expect(answer(initial, q.answer).state.firstTry).toBe(1);
    expect(advance(solved)).toMatchObject({ index: 1, errors: 0, solved: false, placed: [] });
});
it('sort: wrong box returns the piece, correct boxes fill once, hints and first-try accounting', () => {
    const initial = start(10, 7), q = initial.questions[0]!, box = q.boxes.indexOf(q.choices[0]!.color);
    const wrong = drop(initial, 0, (box + 1) % 3);
    expect(wrong.returned).toBe(true); expect(wrong.state.placed).toEqual([]); expect(initial.errors).toBe(0);
    expect(drop(wrong.state, 0, (box + 1) % 3).hint).toBe(true);
    let s = wrong.state;
    for (const [i, p] of q.choices.entries()) { s = drop(s, i, q.boxes.indexOf(p.color)).state; expect(drop(s, i, box).state).toBe(s); }
    expect(s.solved).toBe(true); expect(s.firstTry).toBe(0); expect(s.placed).toHaveLength(3);
    expect(drop(initial, 99, 0).state).toBe(initial); expect(answer(initial, box).state).toBe(initial);
});
it('exact shared reward table; every level finishes, unlocks and preserves its best score', () => {
    expect(Array.from({ length: 7 }, (_, i) => stars(i))).toEqual([1, 1, 1, 2, 2, 3, 3]);
    for (let level = 1; level <= 10; level++) {
        let s = start(level, 3); expect(complete({}, s)).toEqual({});
        for (let i = 0; i < 6; i++) {
            const q = s.questions[s.index]!;
            if (q.mode === 'trier') {
                s = drop(s, 0, -1).state;
                for (const [piece, p] of q.choices.entries()) s = drop(s, piece, q.boxes.indexOf(p.color)).state;
            } else { s = answer(s, -1).state; s = answer(s, q.answer).state; }
            s = advance(s);
        }
        expect(s.finished).toBe(true); expect(s.firstTry).toBe(0);
        expect(complete({}, s)[level]).toBe(1); expect(complete({ [level]: 3 }, s)[level]).toBe(3);
        expect(isUnlocked(level + 1, complete({}, s))).toBe(true);
    }
});
it('eight finite SVG paths have hard-coded geometric signatures and bilingual accessible names', () => {
    const signatures = { rond: 'MAAZ', carre: 'MHVHZ', triangle: 'MLLZ', rectangle: 'MHVHZ', etoile: 'MLLLLLLLLLZ', coeur: 'MCCZ', losange: 'MLLLZ', ovale: 'MAAZ' };
    // Full starts distinguish circles/ovals and squares/rectangles with equal commands.
    const starts = { rond: 'M32 4A28 28', carre: 'M5 5H59', triangle: 'M32 4L60', rectangle: 'M4 8H60', etoile: 'M32 4L40', coeur: 'M32 59C', losange: 'M32 3L60', ovale: 'M32 8A29 24' };
    expect(new Set(Object.values(paths)).size).toBe(8);
    for (const shape of Object.keys(signatures) as Piece['shape'][]) {
        expect(paths[shape].match(/[A-Za-z]/g)!.join('')).toBe(signatures[shape]); expect(paths[shape].startsWith(starts[shape])).toBe(true);
        for (const locale of ['fr', 'en'] as const) for (const color of Object.keys(colorNames.fr) as Piece['color'][]) {
            expect(shapeNames[locale][shape]).not.toBe(''); expect(colorNames[locale][color].every(Boolean)).toBe(true);
            for (const outline of [true, false]) {
                const svg = shapeSvg({ shape, color, size: 'grand' }, locale, outline);
                expect(svg).toMatch(/^<svg xmlns=/); expect(svg).toMatch(/<path [^>]+\/><\/svg>$/); expect(svg).not.toMatch(/NaN|undefined|Infinity/);
                expect(svg).toContain(`data-shape="${shape}"`); expect(svg).toContain(`data-color="${color}"`); expect(svg).toContain('data-size="grand"');
                expect(svg).toContain('stroke-width="3"'); expect(svg).toContain('aria-label=');
            }
        }
    }
});
it('French gender and English adjective order: literal language oracle', () => {
    const p: Piece = { shape: 'carre', color: 'jaune', size: 'grand' };
    expect(name(p, 'en')).toBe('the yellow square'); expect(name(p, 'fr')).toBe('le carré jaune');
    expect(name({ ...p, shape: 'rond', color: 'rouge' }, 'fr')).toBe('le rond rouge');
    expect(name({ ...p, color: 'rouge' }, 'fr', true)).toBe('la forme rouge');
    const feminine = ['rouge', 'bleue', 'jaune', 'verte', 'orange', 'violette', 'rose', 'marron'];
    for (const [i, color] of (['rouge', 'bleu', 'jaune', 'vert', 'orange', 'violet', 'rose', 'marron'] as const).entries()) expect(name({ ...p, color }, 'fr', true)).toBe(`la forme ${feminine[i]!}`);
    const q = { ...generateRound(6, 1)[0]!, target: p };
    expect(instruction(q, 'fr')).toBe('Touche le carré jaune.'); expect(instruction(q, 'en')).toBe('Touch the yellow square.');
    expect(instruction({ ...q, mode: 'taille', target: { ...p, shape: 'etoile', color: 'bleu', size: 'petit' } }, 'fr')).toBe('Touche la petite étoile bleue.');
});
it('shape records migrate independently, filter bad entries, persist and clear', () => {
    let raw = JSON.stringify({ ...fresh(), records: { 1: 3 }, pairesRecords: { 2: 2 }, formesRecords: { 1: 1, 10: 3, 20: 2, 21: 2, 2: 0, 3: 1.5, 4: '3' } });
    const port = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
    const s = readSave(port); expect(s.formesRecords).toEqual({ 1: 1, 10: 3, 20: 2 }); expect(s.records).toEqual({ 1: 3 }); expect(s.pairesRecords).toEqual({ 2: 2 });
    writeSave(port, s); expect(readSave(port)).toEqual(s);
    raw = JSON.stringify({ version: 1, locale: 'fr', voice: true, sound: true, records: { 1: 2 } }); expect(readSave(port).formesRecords).toEqual({});
    expect(fresh().formesRecords).toEqual({});
});

it('rendered fills match every colour and outlines stay empty and dark', () => {
    for (const [color, fill] of Object.entries(expectedFills)) {
        const piece: Piece = { shape: 'carre', color: color as Piece['color'], size: 'grand' };
        expect(shapeSvg(piece)).toContain(`fill="${fill}"`);
        const outline = shapeSvg(piece, 'fr', true);
        expect(outline).toContain('fill="none"');
        const stroke = outline.match(/stroke="(#[a-f\d]{6})"/)![1]!;
        expect(luminance(rgb(stroke))).toBeLessThanOrEqual(.2);
    }
    // Every pair must differ by >=25 degrees of hue OR >=0.08 relative luminance.
    // This is a palette separation guard, not a guarantee for every colour vision.
    const palette = Object.values(expectedFills).map(rgb);
    for (const [i, a] of palette.entries()) for (const b of palette.slice(i + 1)) {
        const angle = Math.abs(hue(a) - hue(b));
        expect(Math.min(angle, 360 - angle) >= 25 || Math.abs(luminance(a) - luminance(b)) >= .08).toBe(true);
    }
});
it('square encloses a full two-dimensional area', () => {
    const coordinates = paths.carre.match(/^M([\d.]+) ([\d.]+)H([\d.]+)V([\d.]+)H([\d.]+)Z$/)!;
    expect(coordinates).not.toBeNull();
    const [, left, top, right, bottom, close] = coordinates.map(Number);
    expect(close).toBe(left);
    expect(right! - left!).toBe(54); expect(bottom! - top!).toBe(54);
    expect((right! - left!) * (bottom! - top!)).toBe(2916);
});
it('instruction pictograms contain the requested outline and colour swatch', () => {
    for (const level of [1, 4, 6, 8, 9]) {
        const state = start(level, 21), q = state.questions[0]!;
        const view = gameView(state, 'fr', false);
        const pictogram = view.split('class="instruction-pic"')[1]!.split('</div>')[0]!;
        if (q.mode !== 'couleur' && q.mode !== 'trier') {
            expect(pictogram).toContain(`<path d="${paths[q.target.shape]}" fill="none"`);
            expect(pictogram).toContain(`data-shape="${q.target.shape}"`);
        }
        if (q.mode !== 'forme' && q.mode !== 'taille') {
            expect(pictogram).toContain(`data-swatch="${q.target.color}"`);
            expect(pictogram).toContain(`<circle cx="32" cy="32" r="27" fill="${expectedFills[q.target.color]}"`);
        }
    }
});
