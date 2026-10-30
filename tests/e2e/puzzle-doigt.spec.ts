import { test, expect, expectTouch } from './helpers';
import { pieceTarget, preparePuzzle, puzzleState } from './puzzle-helpers';
for (const level of [7, 8]) test(`mobile noisy puzzle ${level}, retry, second finger ignored and no scrolling`, async ({ page, context }, info) => {
    test.skip(info.project.name !== 'mobile', 'Real mobile touch input only.'); test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 }); await preparePuzzle(page, level);
    const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    let seed = 9387; const rng = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const noise = (size: number): number => (rng() * 2 - 1) * size;
    const cdp = await context.newCDPSession(page);
    const drag = async (id: number, correct = true): Promise<void> => {
        const r = (await page.locator(`[data-piece="${id}"]`).boundingBox())!, home = await pieceTarget(page, id), zone = (await page.locator('.puzzle-zone').boundingBox())!;
        expect(r.width).toBeGreaterThanOrEqual(level === 7 ? 56 : 64); expect(r.height).toBeGreaterThanOrEqual(level === 7 ? 56 : 64);
        const offsetX = noise(8), offsetY = noise(8), x = r.x + r.width / 2 + offsetX, y = r.y + r.height / 2 + offsetY;
        const tx = (correct ? home.x : zone.x + zone.width / 2) + offsetX, ty = (correct ? home.y : zone.y + zone.height * .76) + offsetY;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
        const steps = 12 + Math.floor(rng() * 9);
        for (let k = 1; k <= steps; k++) {
            const px = x + (tx - x) * k / steps + noise(6), py = y + (ty - y) * k / steps + noise(6);
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: px, y: py }] });
            // The captured piece follows the original grab point, including the ±8px offset.
            await expectTouch(page, `pièce ${id}, déplacement ${k}/${steps}`, async () => {
                const box = (await page.locator(`[data-piece="${id}"]`).boundingBox())!;
                return Math.abs(box.x + box.width / 2 + offsetX - px) < 1 && Math.abs(box.y + box.height / 2 + offsetY - py) < 1;
            });
            const box = (await page.locator(`[data-piece="${id}"]`).boundingBox())!;
            expect(Math.abs(box.x + box.width / 2 + offsetX - px)).toBeLessThan(1);
            expect(Math.abs(box.y + box.height / 2 + offsetY - py)).toBeLessThan(1);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect(page.locator(`[data-piece="${id}"]`)).toHaveAttribute('data-placed', String(correct));
        expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
    };
    // A second concurrent finger targets another piece. It cannot acquire ownership.
    const a = (await page.locator('[data-piece="0"]').boundingBox())!, b = (await page.locator('[data-piece="1"]').boundingBox())!;
    const p1 = { id: 1, x: a.x + a.width / 2, y: a.y + a.height / 2 }, p2 = { id: 2, x: b.x + b.width / 2, y: b.y + b.height / 2 };
    const secondBefore = (await puzzleState(page)).puzzle.pieces[1];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p1] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p1, p2] });
    const otherHome = await pieceTarget(page, 1);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p1, { id: 2, ...otherHome }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [p1] });
    expect((await puzzleState(page)).puzzle.pieces[1]).toEqual(secondBefore);
    expect(await page.locator('[data-piece="1"]').boundingBox()).toEqual(b);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await drag(0, false); await drag(0);
    for (let id = 1; id < await page.locator('[data-piece]').count(); id++) await drag(id);
    expect((await puzzleState(page)).puzzle.finished).toBe(true); await expect(page.locator('.stars')).toBeVisible();
    expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await cdp.detach();
});
