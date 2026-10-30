import { expect, it } from 'vitest';
import { generateRound, layoutObjects, OBJECT_DIAMETER, start, answer, advance, stars, complete, isUnlocked, moveObject } from '../src/engines/compter';
const expectedLevels = [
    { id: 1, mode: 'combien', max: 3 }, { id: 2, mode: 'combien', max: 5 },
    { id: 3, mode: 'combien', max: 10 }, { id: 4, mode: 'remplir', max: 5 },
    { id: 5, mode: 'remplir', max: 10 }, { id: 6, mode: 'plus', max: 5, comparison: 'more' },
    { id: 7, mode: 'plus', max: 10, comparison: 'more' }, { id: 8, mode: 'plus', max: 10, comparison: 'less' }
];
for (const level of expectedLevels) it(`level ${level.id}: all rules over 300 seeds`, () => {
    const failures: string[] = [];
    for (let seed = 0; seed < 300; seed++) {
        const round = generateRound(level.id, seed);
        if (JSON.stringify(round) !== JSON.stringify(generateRound(level.id, seed))) failures.push('determinism');
        if (round.length !== 6) failures.push('length');
        for (const [i, q] of round.entries()) {
            if (q.mode !== level.mode || q.target < 1 || q.target > level.max) failures.push('range');
            if (i && round[i - 1]!.target === q.target) failures.push('adjacent');
            if (q.mode === 'combien') {
                if (q.choices.length !== 3 || new Set(q.choices).size !== 3) failures.push('distinct choices');
                if (q.choices.filter(n => n === q.answer).length !== 1) failures.push('answer');
                if (q.choices.some(n => n < 1 || n > level.max || Math.abs(n - q.target) > 2)) failures.push('distractor');
            }
            if (q.mode === 'remplir' && q.reserve < q.target + 2) failures.push('reserve');
            if (q.mode === 'plus') {
                if (q.left === q.right || Math.min(q.left, q.right) < 1 || Math.max(q.left, q.right) > level.max) failures.push('comparison range');
                const correct = level.comparison === 'less' ? q.left < q.right : q.left > q.right;
                if (q.answer !== (correct ? 0 : 1)) failures.push('comparison answer');
            }
        }
    }
    expect(failures).toEqual([]);
});
for (const level of [1, 2, 3]) it(`level ${level}: answer positions balanced over 600 questions`, () => {
    const counts = [0, 0, 0];
    for (let seed = 0; seed < 100; seed++) for (const q of generateRound(level, seed)) counts[q.choices.indexOf(q.answer)]!++;
    expect(counts.reduce((a, b) => a + b)).toBe(600);
    for (const n of counts) { expect(n / 600).toBeGreaterThanOrEqual(.2); expect(n / 600).toBeLessThanOrEqual(.47); }
});
it('300 layouts per quantity: bounded circles, separated centres, deterministic positions', () => {
    expect(OBJECT_DIAMETER).toBe(68);
    const failures: string[] = [];
    for (let n = 1; n <= 10; n++) for (let seed = 0; seed < 300; seed++) {
        const positions = layoutObjects(n, 288, 216, seed);
        if (positions.length !== n || JSON.stringify(positions) !== JSON.stringify(layoutObjects(n, 288, 216, seed))) failures.push('determinism');
        for (const [i, p] of positions.entries()) {
            if (p.x < 34 || p.x > 254 || p.y < 34 || p.y > 182) failures.push('bounds');
            for (const other of positions.slice(i + 1)) {
                if (Math.hypot(p.x - other.x, p.y - other.y) + .00001 < OBJECT_DIAMETER) failures.push('overlap');
                if (Math.abs(p.x - other.x) + .00001 < OBJECT_DIAMETER && Math.abs(p.y - other.y) + .00001 < OBJECT_DIAMETER) failures.push('rectangle overlap');
            }
        }
    }
    expect(failures).toEqual([]);
});
it('hints start at two errors, errors never advance, first-try credit is exact', () => {
    const initial = start(1, 8), q = initial.questions[0]!;
    const wrong = q.choices.find(n => n !== q.answer)!;
    const once = answer(initial, wrong), twice = answer(once.state, wrong), three = answer(twice.state, wrong);
    expect(once.hint).toBe(false); expect(twice.hint).toBe(true); expect(three.hint).toBe(true);
    expect(once.state.index).toBe(0); expect(initial.errors).toBe(0); expect(advance(twice.state)).toEqual(twice.state);
    const corrected = answer(twice.state, q.answer);
    expect(corrected.correct).toBe(true); expect(corrected.state.firstTry).toBe(0);
    const first = answer(initial, q.answer).state;
    expect(first.firstTry).toBe(1); expect(first.solved).toBe(true);
    expect(answer(first, q.answer).state.firstTry).toBe(1);
    expect(advance(first)).toMatchObject({ index: 1, errors: 0, solved: false, basket: 0 });
});
it('basket mutations stay bounded, are pure and stop after validation', () => {
    let s = start(4, 4); const initial = s;
    s = moveObject(s, -1); expect(s.basket).toBe(0);
    for (let i = 0; i < 30; i++) s = moveObject(s, 1);
    expect(s.basket).toBe(s.questions[0]!.reserve); expect(initial.basket).toBe(0);
    s = moveObject(s, -1); expect(s.basket).toBe(s.questions[0]!.reserve - 1);
    s = answer(s, s.questions[0]!.answer).state; expect(moveObject(s, 1)).toBe(s);
});
it('rewards always give one to three stars at the specified thresholds', () => {
    expect(Array.from({ length: 7 }, (_, n) => stars(n))).toEqual([1, 1, 1, 2, 2, 3, 3]);
});
it('finishing unlocks the next level even with errors; records never decrease', () => {
    let s = start(1, 1);
    expect(isUnlocked(1, {})).toBe(true); expect(isUnlocked(2, {})).toBe(false);
    expect(complete({}, s)).toEqual({});
    for (let i = 0; i < 6; i++) {
        const q = s.questions[s.index]!;
        s = answer(s, -1).state; s = answer(s, q.answer).state; s = advance(s);
    }
    expect(s.finished).toBe(true);
    const records = complete({}, s);
    expect(records[1]).toBe(1); expect(isUnlocked(2, records)).toBe(true);
    expect(complete({ 1: 3 }, s)[1]).toBe(3);
    expect(isUnlocked(3, records)).toBe(false);
});
it('invalid levels and impossible layouts fail explicitly', () => {
    expect(() => generateRound(0, 1)).toThrow(); expect(() => layoutObjects(10, 40, 40, 1)).toThrow();
});

for (const level of [1, 2, 3]) it(`level ${level}: random positions avoid triples and periodic rotation over 300 seeds`, () => {
    let rotations = 0;
    for (let seed = 0; seed < 300; seed++) {
        const positions = generateRound(level, seed).map(q => q.choices.indexOf(q.answer));
        for (let i = 2; i < positions.length; i++) expect(positions.slice(i - 2, i + 1).every(p => p === positions[i])).toBe(false);
        if (positions.slice(1).every((p, i) => p === (positions[i]! + 1) % 3)) rotations++;
    }
    expect(rotations / 300).toBeLessThan(.05);
});
