import { expect, it } from 'vitest';
import { makeRng } from '../src/engines/rng';
it('replays seeds, stays in [0,1), and distinguishes seeds', () => {
    const a = makeRng(42), b = makeRng(42), c = makeRng(43);
    const values = Array.from({ length: 1000 }, () => a());
    expect(values).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(values.every(n => n >= 0 && n < 1)).toBe(true);
    expect(values).not.toEqual(Array.from({ length: 1000 }, () => c()));
});
