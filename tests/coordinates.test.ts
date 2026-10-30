import { expect, it } from 'vitest';
import { distanceToZone, dragPosition, screenToZone } from '../src/shell/coordinates';
it('all drop zones use viewport coordinates, independent of page offset, scale and hit-test overlays', () => {
    for (const scale of [.5, 1, 1.75]) {
        const zone = { x: 73, y: 127, width: 320 * scale, height: 550 * scale };
        expect(screenToZone({ x: 73 + 100 * scale, y: 127 + 400 * scale }, zone, { width: 320, height: 550 })).toEqual({ x: 100, y: 400 });
        expect(distanceToZone({ x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 }, zone)).toBe(0);
        expect(distanceToZone({ x: zone.x - 24, y: zone.y }, zone)).toBe(24);
        expect(distanceToZone({ x: zone.x - 3, y: zone.y - 4 }, zone)).toBe(5);
        const moved = dragPosition({ x: 173 + 16 * scale, y: 227 - 32 * scale }, { x: 173, y: 227 }, { x: 120, y: 300 }, zone, { width: 320, height: 550 });
        expect(moved.x).toBeCloseTo(136, 8); expect(moved.y).toBeCloseTo(268, 8);
    }
});
