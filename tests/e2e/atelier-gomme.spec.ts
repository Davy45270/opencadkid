import { test, expect } from './helpers';
import { prepareStudio, studioState } from './atelier-helpers';
import type { Page } from '@playwright/test';

/** Screen position of a point given in sheet units (320 × 300). */
const toScreen = (page: Page, x: number, y: number) => page.locator('.atelier-paper').evaluate((svg, [x, y]) => {
    const m = (svg as SVGSVGElement).getScreenCTM()!; return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}, [x, y] as const);
/** Colour actually rendered at sheet points: the live SVG is drawn to a canvas, masks included. */
const pixels = (page: Page, points: readonly (readonly [number, number])[]) => page.locator('.atelier-paper').evaluate(async (svg, pts) => {
    const html = new XMLSerializer().serializeToString(svg).replace('<svg ', '<svg width="960" height="900" ');
    const img = new Image(); img.src = URL.createObjectURL(new Blob([html], { type: 'image/svg+xml' }));
    await img.decode();
    const c = document.createElement('canvas'); c.width = 960; c.height = 900; const g = c.getContext('2d')!;
    g.fillStyle = '#fff'; g.fillRect(0, 0, 960, 900); g.drawImage(img, 0, 0);
    return pts.map(([x, y]) => [...g.getImageData(x * 3, y * 3, 1, 1).data.slice(0, 3)].map(v => v.toString(16).padStart(2, '0')).join(''));
}, points);
/** Every rendered pixel of a short vertical run, at a scale that puts the mark's edges between pixels (as on a phone). */
const column = (page: Page, x: number, y0: number, y1: number) => page.locator('.atelier-paper').evaluate(async (svg, [x, y0, y1]) => {
    const k = 3.37, w = Math.round(320 * k), h = Math.round(300 * k);
    const html = new XMLSerializer().serializeToString(svg).replace('<svg ', `<svg width="${w}" height="${h}" `);
    const img = new Image(); img.src = URL.createObjectURL(new Blob([html], { type: 'image/svg+xml' }));
    await img.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!;
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0);
    const out: string[] = [];
    for (let y = Math.round(y0 * k); y <= Math.round(y1 * k); y++) out.push([...g.getImageData(Math.round(x * k), y, 1, 1).data.slice(0, 3)].map(v => v.toString(16).padStart(2, '0')).join(''));
    return out;
}, [x, y0, y1] as const);
async function stroke(page: Page, from: readonly [number, number], to: readonly [number, number]): Promise<void> {
    const a = await toScreen(page, ...from), b = await toScreen(page, ...to);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(a.x + (b.x - a.x) * i / 20, a.y + (b.y - a.y) * i / 20);
    await page.mouse.up();
}
const near = (hex: string, target: string, tolerance = 40) => { const d = [0, 2, 4].map(i => Math.abs(parseInt(hex.slice(i, i + 2), 16) - parseInt(target.slice(i, i + 2), 16))); return Math.max(...d) <= tolerance; };

test('the eraser removes the brush marks only: the model outline and the coloured zone stay', async ({ page }) => {
    await prepareStudio(page);
    await page.locator('[data-color="#ee737a"]').click(); await page.locator('[data-zone="head"]').click();
    await page.locator('[data-tool="draw"]').click();
    await page.locator('[data-width="18"]').click();
    // A thick blue line across the left edge of the head: outline at (75,105), red head inside at (86,105).
    await page.locator('[data-color="#727ed1"]').click();
    await stroke(page, [40, 105], [140, 105]);
    let [outline, inside] = await pixels(page, [[75, 105], [86, 105]]);
    expect(near(inside!, '727ed1')).toBe(true); expect(near(outline!, '727ed1')).toBe(true);
    await page.locator('[data-tool="eraser"]').click();
    await stroke(page, [40, 105], [140, 105]);
    [outline, inside] = await pixels(page, [[75, 105], [86, 105]]);
    // Before the fix both points turned white: the eraser was a white brush covering the model.
    expect(near(outline!, '58443b')).toBe(true);
    expect(near(inside!, 'ee737a')).toBe(true);
    // No ghost of the erased mark along its edges (anti-aliasing of an eraser exactly as wide as the brush left one).
    for (const x of [84, 89]) for (const p of await column(page, x, 92, 118)) expect(near(p, 'ee737a', 12), `${x}: ${p}`).toBe(true);
    expect(await studioState(page)).toMatchObject({ strokeCount: 2, zones: { head: '#ee737a' } });
    await expect(page.locator('.atelier-paper path[stroke="#ffffff"]')).toHaveCount(0);
    // A new mark after the eraser shows again.
    await page.locator('[data-color="#58ad87"]').click();
    await stroke(page, [80, 105], [92, 105]);
    expect(near((await pixels(page, [[86, 105]]))[0]!, '58ad87')).toBe(true);
});

test('a brush mark drawn on a moving part moves with it when the picture plays', async ({ page }) => {
    await prepareStudio(page);
    await page.locator('#atelier-picture').selectOption('papillon');
    await page.locator('[data-tool="draw"]').click();
    await page.locator('[data-color="#ee737a"]').click();
    const wing = await page.locator('[data-paint="left-top"]').boundingBox();
    expect(wing).not.toBeNull();
    await stroke(page, [70, 70], [80, 75]);
    await page.locator('[data-tool="play"]').click();
    await expect(page.locator('svg.atelier-playing [data-part="0"] [data-stroke="0"]')).toHaveCount(1);
});
