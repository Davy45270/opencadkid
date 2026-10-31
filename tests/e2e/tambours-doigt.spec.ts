import { test, expect, expectTouch } from './helpers';
import { clearLights, demonstration, drumsState, prepareDrums } from './tambours-helpers';
test('noisy finger completes a session using only the observed demonstration', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile touch only');
    await prepareDrums(page);
    const scroll = await page.evaluate(() => [scrollX, scrollY]);
    let seed = 71;
    const noise = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32 * 20 - 10; };
    for (let q = 0; q < 5; q++) {
        const beats = await demonstration(page);
        for (const [i, beat] of beats.entries()) {
            const r = (await page.locator(`[data-drum="${beat.drum}"]`).boundingBox())!;
            await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
            await expectTouch(page, 'A noisy pointerdown is exactly one beat', async () => (await drumsState(page)).cursor === i + 1);
        }
        await clearLights(page); await page.locator('#continue').tap();
        expect(await page.evaluate(() => [scrollX, scrollY])).toEqual(scroll);
    }
    await expect(page.locator('.stars')).toHaveText('★★★');
});
test('two rapid taps and simultaneous fingers each count, with compatibility clicks suppressed', async ({ page, context, isMobile }) => {
    test.skip(!isMobile, 'Mobile touch only');
    await prepareDrums(page, 8);
    const center = async (d: number): Promise<{ x: number; y: number }> => { const r = (await page.locator(`[data-drum="${d}"]`).boundingBox())!; return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
    const a = await center(0), b = await center(1);
    await page.touchscreen.tap(a.x, a.y); await page.touchscreen.tap(a.x, a.y);
    await expectTouch(page, 'Two immediate taps count twice', async () => (await drumsState(page)).composed.length === 2);
    const cdp = await context.newCDPSession(page);
    try {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...a }, { id: 2, ...b }] });
        await expectTouch(page, 'Both fingers count on pointerdown before release', async () => (await drumsState(page)).composed.length === 4);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        expect((await drumsState(page)).composed.map(b => b.drum)).toEqual([0, 0, 0, 1]);
        expect((await drumsState(page)).errors).toBe(0);
    } finally { await cdp.detach(); }
});
