import { expect, it } from 'vitest';
import { addStroke, ERASER, MAX_POINTS, palette, RASTER_WIDTH, start, type Color, type Point, type State } from '../src/engines/atelier';
import { shows } from '../src/engines/atelier/motion';
import { sheets } from '../src/engines/atelier';
import { animatedSheet, sheet, strokeOwner, thumbnail, zoneAt } from '../src/games/atelier/view';

const red: Color = palette[0][0], blue: Color = palette[7][0];
const draw = (s: State, color: Color, points: Point[]): State => addStroke({ ...s, color, width: 18 }, points);
/** A point of the sheet that the hit test places in this zone (topmost zone wins, as on screen). */
function inZone(drawing: string, zone: string): Point {
    for (let y = 2; y < 300; y += 3) for (let x = 2; x < 320; x += 3) if (zoneAt(drawing, x - 1, y) === zone && zoneAt(drawing, x + 1, y) === zone) return { x, y };
    throw new Error(`no visible point in ${drawing}/${zone}`);
}

it('the eraser never paints over the model: no white mark, the outlines and ink stay above it', () => {
    let s: State = start('boubou', 'draw');
    const across: Point[] = [{ x: 20, y: 150 }, { x: 300, y: 150 }];
    s = draw(s, red, across);
    s = draw(s, ERASER, across);
    s = draw(s, blue, [{ x: 160, y: 20 }, { x: 160, y: 280 }]);
    for (const html of [sheet(s.art, 'fr'), thumbnail(s.art, 'fr'), animatedSheet(s.art, 'fr')]) {
        // Before the fix the eraser was a white brush stroke drawn over the zone outlines.
        expect(html).not.toMatch(/<path[^>]*stroke="#ffffff"/);
        // The red mark made before the eraser is masked by it; the blue one made after is not.
        expect(html).toMatch(/<g data-erased="1" mask="url\(#atelier-mask-\d+-1\)"><path data-stroke="0"[^>]*stroke="#ee737a"/);
        expect(html).toMatch(/<\/g><path data-stroke="2"[^>]*stroke="#727ed1"/);
        // Every zone keeps its brown outline, drawn under the marks but never covered by white.
        for (const z of sheets.find(d => d.id === 'boubou')!.zones) expect(html).toContain(`d="${z.path}"`);
    }
});

it('an eraser on a blank sheet with nothing painted erases nothing and adds no mask', () => {
    const s = draw({ ...start('feuille', 'draw') }, ERASER, [{ x: 10, y: 10 }, { x: 90, y: 90 }]);
    expect(sheet(s.art, 'fr')).not.toContain('data-erased');
});

it('a flattened eraser stroke clears the brush cells back to paper instead of painting white', () => {
    let s: State = start('boubou', 'draw');
    const line = (y: number): Point[] => Array.from({ length: 400 }, (_, i) => ({ x: 10 + (i % 2) * 300, y: y + i * 0.01 }));
    s = draw(s, red, line(100));
    s = draw(s, ERASER, line(100));
    for (let k = 0; k < Math.ceil(MAX_POINTS / 200); k++) s = draw(s, blue, line(250 + (k % 20)));
    expect(s.art.underpaint).toBeDefined();
    const row = s.art.underpaint!.slice(50 * RASTER_WIDTH, 51 * RASTER_WIDTH);
    expect(row).not.toContain('c');
    expect(row).not.toContain('0');
});

it('brush marks move with the animated part they are drawn on, like the zones', () => {
    for (const d of sheets) {
        const show = shows[d.id]!;
        show.parts.forEach((part, k) => {
            const p = inZone(d.id, part.zones[0]!);
            const pts = [{ x: p.x - 1, y: p.y }, { x: p.x + 1, y: p.y }];
            expect(strokeOwner(d.id, pts)).toBe(k);
            const s = draw(start(d.id, 'draw'), red, pts);
            const html = animatedSheet(s.art, 'fr');
            // The mark sits in that part's own animated group, not only in the whole-picture motion.
            expect(html).toMatch(new RegExp(`<g class="atelier-strokes" data-part="${k}"><path data-stroke="0"`));
        });
    }
    // A mark outside every moving part follows the whole picture only.
    const s = draw(start('boubou', 'draw'), red, [{ x: 2, y: 2 }, { x: 6, y: 6 }]);
    expect(animatedSheet(s.art, 'fr')).not.toContain('data-part=');
    expect(animatedSheet(s.art, 'fr')).toContain('data-stroke="0"');
}, 30_000);
