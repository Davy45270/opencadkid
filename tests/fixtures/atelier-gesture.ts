import type { Rect } from '../../src/shell/coordinates';

/** The exact 300-point screen gesture shared by the touch and geometry regressions. */
export function atelierGesture(rect: Rect): { id: number; x: number; y: number }[] {
    let seed = 29;
    const noise = (): number => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 2 ** 32 * 2 - 1;
    };
    return Array.from({ length: 300 }, (_, i) => ({
        id: 1,
        x: rect.x + 25 + i * (rect.width - 50) / 299 + noise(),
        y: rect.y + rect.height / 2 + 35 * Math.sin(i / 30) + noise()
    }));
}
