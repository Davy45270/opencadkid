import { test, expect, prepare, state, type Target } from './helpers';
import { makeRng } from '../../src/engines/rng';
for (const level of [1, 4, 6]) test(`noisy finger series at level ${level}, including drag and accidental double tap`, async ({ page, context }) => {
    await prepare(page, level);
    const rng = makeRng(73), scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const noise = (): number => (rng() * 2 - 1) * 10;
    const target = async (id: string): Promise<Target> => { const found = (await state(page)).targets.find(t => t.id === id); expect(found).toBeDefined(); return found!; };
    const tap = async (id: string): Promise<void> => { const r = await target(id); await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise()); await page.waitForTimeout(205); };
    const cdp = await context.newCDPSession(page);
    let dragged = false, doubled = false;
    for (let i = 0; i < 6; i++) {
        const q = (await state(page)).question!;
        if (q.mode === 'remplir') {
            for (let n = 0; n < q.target; n++) {
                if (!dragged) {
                    const from = await target('reserve-0'); const basket = await page.locator('#basket').boundingBox();
                    const x = from.x + from.width / 2 + noise(), y = from.y + from.height / 2 + noise();
                    const tx = basket!.x + basket!.width / 2, ty = basket!.y + basket!.height / 2;
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
                    const steps = 10 + Math.floor(rng() * 7);
                    for (let k = 1; k <= steps; k++) {
                        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x + (tx - x) * k / steps + noise(), y: y + (ty - y) * k / steps + noise() }] });
                        await page.waitForTimeout(8);
                    }
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                    await page.waitForTimeout(205); dragged = true;
                } else if (!doubled) {
                    const r = await target('reserve-0'), before = (await state(page)).basket;
                    await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
                    await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
                    expect((await state(page)).basket).toBe(before + 1); await page.waitForTimeout(205); doubled = true;
                } else await tap('reserve-0');
                expect((await state(page)).basket).toBe(n + 1);
            }
            await tap('check');
        } else {
            const r = await target(`answer-${q.answer}`);
            await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
            if (!doubled) { await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); doubled = true; }
        }
        await expect(page.locator('#continue')).toBeVisible(); await tap('continue');
        expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
    }
    await expect(page.locator('.stars')).toBeVisible(); expect(doubled).toBe(true);
    if (level === 4) expect(dragged).toBe(true);
});
