import { expect, it, vi } from 'vitest';
import { advance, answer, complete, drop, generateRound, isUnlocked, levels, start, type Piece, type Question } from '../src/engines/formes';
import { gameView, instruction, levelView } from '../src/games/formes/view';
import { fresh } from '../src/shell/storage';

// Literal copy of the ten original levels: records are stored by id, they must never move.
const original = [
    { id: 1, mode: 'forme', choices: 3, mixed: false }, { id: 2, mode: 'forme', choices: 4, mixed: false },
    { id: 3, mode: 'forme', choices: 6, mixed: true }, { id: 4, mode: 'couleur', choices: 3, mixed: false },
    { id: 5, mode: 'couleur', choices: 3, mixed: true }, { id: 6, mode: 'les-deux', choices: 4, mixed: true },
    { id: 7, mode: 'taille', choices: 2, mixed: false }, { id: 8, mode: 'taille', choices: 4, mixed: true },
    { id: 9, mode: 'trier', choices: 2, mixed: true }, { id: 10, mode: 'trier', choices: 3, mixed: true }
];
// FNV-1a of the 50 first seeded rounds of each original level, recorded before the new levels were added.
const originalRounds = ['9994bd8d', 'f581e68e', 'e05ec5e6', '9fa0071e', '4c0a09ba', 'b71233ee', '71f46bba', 'e91fc838', '8d39b4a6', 'da46d922'];
const fnv = (s: string): string => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); };
// Independent literal tables (not imported from the engine).
const banned = [['rouge', 'vert'], ['bleu', 'violet'], ['rose', 'orange'], ['rouge', 'marron'], ['vert', 'marron'], ['rouge', 'orange'], ['rouge', 'rose'], ['jaune', 'orange'], ['violet', 'rose']];
const lookalike: Record<string, string[]> = { rond: ['ovale'], ovale: ['rond'], carre: ['rectangle', 'losange'], rectangle: ['carre'], losange: ['carre'] };

it('twenty levels, contiguous ids, the ten originals unchanged in configuration and in generated rounds', () => {
    expect(levels).toHaveLength(20);
    expect(levels.map(l => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(levels.slice(0, 10)).toEqual(original);
    expect(original.map(l => { let all = ''; for (let seed = 0; seed < 50; seed++) all += JSON.stringify(generateRound(l.id, seed)); return fnv(all); })).toEqual(originalRounds);
});

/** Oracle written from the instruction a child hears, independent of the engine's `matches`. */
function fits(q: Question, p: Piece): boolean {
    switch (q.mode) {
        case 'forme': return p.shape === q.target.shape;
        case 'couleur': return p.color === q.target.color;
        case 'taille': return p.shape === q.target.shape && p.size === q.target.size;
        case 'les-deux': return p.shape === q.target.shape && p.color === q.target.color;
        case 'les-trois': return p.shape === q.target.shape && p.color === q.target.color && p.size === q.target.size;
        // The piece whose shape no other piece shares.
        case 'intrus': return q.choices.filter(o => o.shape === p.shape).length === 1;
        default: return false;
    }
}
/** What a child faces: the task, the screen size and how each distractor relates to the target (same shape/colour/size). */
function fingerprint(level: number): string {
    const kinds = new Set<string>();
    for (let seed = 0; seed < 50; seed++) for (const q of generateRound(level, seed)) {
        const relations = q.choices.filter((_, i) => q.mode === 'trier' || i !== q.answer).map(p => `${+(p.shape === q.target.shape)}${+(p.color === q.target.color)}${+(p.size === q.target.size)}`).sort().join(',');
        const crowd = q.mode === 'intrus' ? (lookalike[q.target.shape] ?? []).includes(q.choices.find(p => p.shape !== q.target.shape)!.shape) : '';
        kinds.add(`${q.mode}:${q.choices.length}:${q.boxes.length}:${relations}:${crowd}`);
    }
    return [...kinds].sort().join('|');
}
it('no two levels share a configuration or play alike', () => {
    const configs = levels.map(l => JSON.stringify(Object.entries(l).filter(([key]) => key !== 'id').sort()));
    expect(new Set(configs).size).toBe(levels.length);
    const prints = levels.map(l => fingerprint(l.id));
    for (let a = 0; a < levels.length; a++) for (let b = a + 1; b < levels.length; b++) expect(prints[a], `levels ${a + 1} and ${b + 1}`).not.toBe(prints[b]);
});

for (const level of levels) it(`level ${level.id}: every question over 200 seeds is solvable and fits the phone grid`, () => {
    const failures = new Set<string>();
    const reviewed = level.review?.map(id => levels[id - 1]!) ?? [level];
    for (let seed = 0; seed < 200; seed++) {
        const round = generateRound(level.id, seed);
        if (round.length !== 6) failures.add('length');
        if (level.mode === 'melange' && new Set(round.map(q => q.mode)).size !== reviewed.length) failures.add('review covers every level');
        for (const [i, q] of round.entries()) {
            const rule = level.mode === 'melange' ? reviewed.find(r => r.mode === q.mode)! : level;
            if (q.mode !== rule.mode) failures.add('mode');
            if (i && q.target.shape === round[i - 1]!.target.shape) failures.add('adjacent shapes');
            if (new Set(q.choices.map(p => JSON.stringify(p))).size !== q.choices.length) failures.add('distinct pieces');
            const colours = new Set([q.target.color, ...q.choices.map(p => p.color), ...q.boxes]);
            for (const [a, b] of banned) if (colours.has(a as Piece['color']) && colours.has(b as Piece['color'])) failures.add('forbidden pair');
            if (q.mode === 'trier') {
                if (q.boxes.length !== rule.choices || new Set(q.boxes).size !== rule.choices || q.boxes[q.answer] !== q.target.color) failures.add('boxes');
                if (q.choices.length !== (rule.pieces ?? 3)) failures.add('pieces');
                for (const p of q.choices) if (q.boxes.filter(c => c === p.color).length !== 1) failures.add('one box per piece');
                if (q.boxes.some(c => !q.choices.some(p => p.color === c))) failures.add('every box used');
                if (q.boxes.length > 4 || q.choices.length > 4) failures.add('sorting layout');
                continue;
            }
            if (q.choices.length !== rule.choices || q.choices.length > 6) failures.add('choices');
            const right = q.choices.filter(p => fits(q, p));
            if (right.length !== 1 || !fits(q, q.choices[q.answer]!)) failures.add('one right answer');
            const others = q.choices.filter((_, k) => k !== q.answer);
            if (q.mode === 'couleur' && new Set(q.choices.map(p => p.color)).size !== q.choices.length) failures.add('distinct colours');
            if (q.mode === 'les-deux' && rule.choices >= 6 && (others.filter(p => p.shape === q.target.shape).length < 2 || others.filter(p => p.color === q.target.color).length < 2)) failures.add('two of each near miss');
            if (q.mode === 'taille' && rule.sizes && !others.some(p => p.shape !== q.target.shape && p.size === q.target.size)) failures.add('size alone');
            if (q.mode === 'les-trois') for (const [shape, color, size] of [[1, 1, 0], [1, 0, 1], [0, 1, 1]]) {
                if (!others.some(p => +(p.shape === q.target.shape) === shape && +(p.color === q.target.color) === color && +(p.size === q.target.size) === size)) failures.add('three near misses');
            }
            if (q.mode === 'intrus') {
                const crowd = others.map(p => p.shape);
                if (new Set(crowd).size !== 1 || crowd[0] === q.target.shape) failures.add('one crowd shape');
                // Neither colour nor size can reveal the odd piece.
                if (!others.some(p => p.color === q.target.color) || !others.some(p => p.size === q.target.size)) failures.add('shape only');
                if (rule.lookalike !== undefined && !(lookalike[q.target.shape] ?? []).includes(crowd[0]!)) failures.add('look-alike crowd');
            }
        }
    }
    expect([...failures]).toEqual([]);
});

/** Things to look at on one screen: pieces plus boxes. */
function items(level: number): number { let most = 0; for (let seed = 0; seed < 50; seed++) for (const q of generateRound(level, seed)) most = Math.max(most, q.choices.length + q.boxes.length); return most; }
it('difficulty never decreases across the new levels', () => {
    const added = levels.slice(10).map(l => items(l.id));
    expect(added).toEqual([4, 4, 4, 6, 6, 6, 6, 7, 8, 8]);
    for (let i = 1; i < added.length; i++) expect(added[i]!).toBeGreaterThanOrEqual(added[i - 1]!);
    // Within an equal screen size, the later level asks for more attributes: colour (1) < odd one out by
    // comparison (1, no prompt picture) < shape+colour+size (3); then 6 items: two near misses of each (2) <
    // varied sizes (2) < look-alike odd one out < shape+colour+size (3). Level 20 reviews the hardest of each kind.
});

it('new modes: literal prompts in both languages, no give-away picture for the odd one out, every level finishes', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const intrus = generateRound(12, 4)[0]!;
    expect(instruction(intrus, 'fr')).toBe('Touche la forme qui n’est pas comme les autres.');
    expect(instruction(intrus, 'en')).toBe('Touch the shape that is not like the others.');
    const pictogram = gameView(start(12, 4), 'fr', false).split('class="instruction-pic"')[1]!.split('</div>')[0]!;
    expect(pictogram).not.toContain('data-shape='); expect(pictogram).not.toContain('data-swatch=');
    const trois = { ...generateRound(13, 1)[0]!, target: { shape: 'etoile', color: 'bleu', size: 'petit' } as Piece };
    expect(instruction(trois, 'fr')).toBe('Touche la petite étoile bleue.'); expect(instruction(trois, 'en')).toBe('Touch the small blue star.');
    const sizeCue = gameView({ ...start(13, 1), questions: [trois] }, 'fr', false);
    expect(sizeCue).toContain('class="size-cue petit"'); expect(sizeCue).toContain('data-swatch="bleu"');
    for (const l of levels.slice(10)) {
        let s = start(l.id, 3);
        for (let i = 0; i < 6; i++) {
            const q = s.questions[s.index]!;
            if (q.mode === 'trier') for (const [piece, p] of q.choices.entries()) s = drop(s, piece, q.boxes.indexOf(p.color)).state;
            else s = answer(s, q.answer).state;
            s = advance(s);
        }
        expect(s.finished).toBe(true);
        const records = complete({}, s);
        expect(records[l.id]).toBe(3); expect(isUnlocked(l.id + 1, records)).toBe(true);
        expect(gameView(s, 'fr', false).includes('id="next"')).toBe(l.id < 20);
    }
    const grid = levelView({ ...fresh(), formesRecords: Object.fromEntries(levels.map(l => [l.id, 3])) });
    expect([...grid.matchAll(/data-level="(\d+)"/g)].map(m => Number(m[1]))).toEqual(levels.map(l => l.id));
    vi.unstubAllGlobals();
});
