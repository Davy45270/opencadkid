import { test, expect } from './helpers';
import { prepareShapes, shapeAnswer, shapeState } from './formes-helpers';
import { makeRng } from '../../src/engines/rng';
for (const level of [3, 5, 6, 8, 10]) test(`level ${level}: noisy touch completes without scrolling, with double tap and wrong drop`, async ({ page, context }) => {
    test.skip(!test.info().project.use.hasTouch, 'Requires the mobile touch project.');
    await prepareShapes(page, level);
    const rng = makeRng(73), noise = (): number => rng() * 20 - 10;
    const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const tap = async (selector: string): Promise<void> => {
        const r = (await page.locator(selector).boundingBox())!;
        expect(r.width).toBeGreaterThanOrEqual(64); expect(r.height).toBeGreaterThanOrEqual(64);
        await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
    };
    const cdp = await context.newCDPSession(page);
    const drag = async (piece: number, box: string): Promise<void> => {
        const a = (await page.locator(`[data-piece="${piece}"]`).boundingBox())!, b = (await page.locator(box).boundingBox())!;
        const x = a.x + a.width / 2 + noise(), y = a.y + a.height / 2 + noise(), tx = b.x + b.width / 2, ty = b.y + b.height / 2;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
        const steps = 10 + Math.floor(rng() * 7);
        for (let k = 1; k <= steps; k++) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x + (tx - x) * k / steps + noise(), y: y + (ty - y) * k / steps + noise() }] });
            await page.waitForTimeout(8);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(300);
    };
    for (let i = 0; i < 6; i++) {
        if (level === 10) {
            if (i === 0) {
                await tap('[data-piece="0"]'); await tap('[data-piece="0"]');
                expect((await shapeState(page)).shapes.placed).toEqual([]);
                const color = await page.locator('[data-piece="0"] svg').getAttribute('data-color');
                const wrong = await page.locator(`[data-box]:not([data-color="${color!}"])`).first().getAttribute('data-box');
                await drag(0, `[data-box="${wrong!}"]`); expect((await shapeState(page)).shapes.placed).toEqual([]);
            }
            for (let piece = 0; piece < 3; piece++) { const c = await page.locator(`[data-piece="${piece}"] svg`).getAttribute('data-color'); await drag(piece, `[data-box][data-color="${c!}"]`); }
        } else {
            const selector = `[data-answer="${await shapeAnswer(page)}"]`; await tap(selector);
            if (i === 0) { await tap(selector); expect((await shapeState(page)).index).toBe(0); }
        }
        expect((await shapeState(page)).shapes.placed.length).toBe(level === 10 ? 3 : 0);
        expect((await shapeState(page)).shapes.solved).toBe(true);
        expect((await shapeState(page)).shapes.finished).toBe(false);
        await expect(page.locator('#continue')).toBeVisible(); await tap('#continue');
        await expect.poll(async () => { const s = await shapeState(page); return s.shapes.finished || s.index === i + 1; }).toBe(true);
        expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
    }
    expect((await shapeState(page)).shapes.finished).toBe(true); await expect(page.locator('.stars')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});
