/** Deduction in « Les taupes de Tutu »: what the open flowers prove about the clods still covered. The player's carrots are
 * never a proof. Two techniques, the cheaper first:
 *  - `simple`: one flower alone (all its covered neighbours are moles, or all are free), or the count of moles left alone;
 *  - `croise`: every way of hiding the moles that agrees with every flower and the count at once (exact, the boards are
 *    small: at most 36 cells).
 * A clod is proved free (or a mole) when every agreeing way says so. */
export interface Board { w: number; h: number; moles: number; rock: readonly boolean[] }
export type Technique = 'simple' | 'croise';
export const neighbours = (w: number, h: number, i: number): number[] => {
    const x = i % w, y = Math.floor(i / w), out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) out.push(ny * w + nx);
    }
    return out;
};
/** What is proved: free clods, mole clods, and the technique it took (null: nothing new). `counts[i]` is the number shown on
 * an open cell. */
export interface Proof { free: number[]; mole: number[]; technique: Technique | null }
export function deduce(b: Board, open: ReadonlySet<number>, counts: readonly number[]): Proof {
    const n = b.w * b.h, unknown = (i: number): boolean => !b.rock[i] && !open.has(i);
    const knownMole = new Set<number>(), knownFree = new Set<number>();
    // Simple: repeat single-flower and global-count rules until nothing moves.
    let moved = true;
    while (moved) {
        moved = false;
        for (const i of open) {
            const hidden = neighbours(b.w, b.h, i).filter(j => unknown(j) && !knownFree.has(j));
            const sure = hidden.filter(j => knownMole.has(j)).length, rest = hidden.filter(j => !knownMole.has(j));
            if (!rest.length) continue;
            if (counts[i]! - sure === rest.length) { rest.forEach(j => knownMole.add(j)); moved = true; }
            else if (counts[i]! === sure) { rest.forEach(j => knownFree.add(j)); moved = true; }
        }
        const left = Array.from({ length: n }, (_, i) => i).filter(i => unknown(i) && !knownMole.has(i) && !knownFree.has(i));
        if (left.length) {
            if (knownMole.size === b.moles) { left.forEach(j => knownFree.add(j)); moved = true; }
            else if (b.moles - knownMole.size === left.length) { left.forEach(j => knownMole.add(j)); moved = true; }
        }
    }
    if (knownFree.size) return { free: [...knownFree].sort((a, c) => a - c), mole: [...knownMole].sort((a, c) => a - c), technique: 'simple' };
    // Crossing: enumerate the frontier (clods next to a flower), the others only counted.
    const frontier = Array.from({ length: n }, (_, i) => i).filter(i => unknown(i) && neighbours(b.w, b.h, i).some(j => open.has(j)));
    const inner = Array.from({ length: n }, (_, i) => i).filter(i => unknown(i) && !frontier.includes(i));
    const clues = [...open].map(i => ({ need: counts[i]!, cells: neighbours(b.w, b.h, i).filter(j => frontier.includes(j)) })).filter(c => c.cells.length || c.need);
    const canMole = new Set<number>(), canFree = new Set<number>(), assign = new Map<number, boolean>();
    const seen = { mole: false, free: false };
    const ok = (): boolean => clues.every(c => {
        let m = 0, u = 0;
        for (const j of c.cells) { const v = assign.get(j); if (v === undefined) u++; else if (v) m++; }
        return m <= c.need && m + u >= c.need;
    });
    const walk = (k: number, moles: number): void => {
        if (moles > b.moles || !ok()) return;
        if (k === frontier.length) {
            const rest = b.moles - moles;
            if (rest > inner.length) return;
            for (const [j, v] of assign) (v ? canMole : canFree).add(j);
            if (rest > 0) seen.mole = true;
            if (rest < inner.length) seen.free = true;
            return;
        }
        const j = frontier[k]!;
        for (const v of [false, true]) { assign.set(j, v); walk(k + 1, moles + (v ? 1 : 0)); }
        assign.delete(j);
    };
    walk(0, 0);
    const free = [...frontier.filter(j => !canMole.has(j) && canFree.has(j)), ...(seen.mole ? [] : inner)].sort((a, c) => a - c);
    const mole = [...frontier.filter(j => canMole.has(j) && !canFree.has(j)), ...(seen.free ? [] : inner)].sort((a, c) => a - c);
    return { free, mole, technique: free.length ? 'croise' : null };
}
