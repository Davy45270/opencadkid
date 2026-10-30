/** Mulberry32: portable, deterministic, values in [0, 1). */
export function makeRng(seed: number): () => number {
    let value = seed >>> 0;
    return () => {
        value = (value + 1831565813) | 0;
        let n = Math.imul(value ^ value >>> 15, 1 | value);
        n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
        return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
}
export function shuffle<T>(values: readonly T[], rng: () => number): T[] {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
}
