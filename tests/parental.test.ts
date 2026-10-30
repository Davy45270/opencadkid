import { it, expect } from 'vitest';
import { parentalQuestion, checkParental } from '../src/shell/parental';
it('200 deterministic adult challenges have three distinct options and varied correct positions', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
        const q = parentalQuestion(seed);
        expect(q).toEqual(parentalQuestion(seed));
        expect(q.a).toBeGreaterThanOrEqual(3); expect(q.a).toBeLessThanOrEqual(9);
        expect(q.b).toBeGreaterThanOrEqual(3); expect(q.b).toBeLessThanOrEqual(9);
        expect(q.choices).toHaveLength(3); expect(new Set(q.choices).size).toBe(3);
        expect(q.choices.filter(n => checkParental(q, n))).toEqual([q.a * q.b]);
        positions.add(q.choices.indexOf(q.answer));
    }
    expect([...positions].sort()).toEqual([0, 1, 2]);
});
