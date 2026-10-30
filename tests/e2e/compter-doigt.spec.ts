import { test, expect, prepare, state, visibleAnswer, expectTouch, touchFrame, type Target } from './helpers';
import { makeRng } from '../../src/engines/rng';
for (const level of [1, 4, 6]) test(`noisy finger series at level ${level}, including drag and accidental double tap`, async ({ page, context }) => {
    await prepare(page, level);
    const rng = makeRng(73), scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const noise = (): number => (rng() * 2 - 1) * 10;
    const target = async (id: string): Promise<Target> => { const found = (await state(page)).targets.find(t => t.id === id); expect(found).toBeDefined(); return found!; };
    const tap = async (id: string): Promise<void> => {
        const before = await state(page), r = await target(id);
        await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
        await expectTouch(page, id, async () => {
            const after = await state(page);
            if (id.startsWith('reserve-')) return after.basket === before.basket + 1;
            if (id === 'check') return after.targets.some(t => t.id === 'continue');
            return before.index === 5 ? after.targets.some(t => t.id === 'again') : after.index === before.index + 1;
        });
    };
    const cdp = await context.newCDPSession(page);
    let dragged = false, doubled = false;
    for (let i = 0; i < 6; i++) {
        expect((await state(page)).index).toBe(i);
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
                        await touchFrame(page);
                    }
                    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                    await expectTouch(page, `objet glissé`, async () => (await state(page)).basket === n + 1); dragged = true;
                } else if (!doubled) {
                    const r = await target('reserve-0'), before = (await state(page)).basket;
                    await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
                    await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
                    await expectTouch(page, `double toucher`, async () => (await state(page)).basket === before + 1); expect((await state(page)).basket).toBe(before + 1); doubled = true;
                } else {
                    // Use another token immediately; keep the double-tap check on reserve-0.
                    await tap((await state(page)).targets.filter(t => t.id.startsWith('reserve-')).at(-1)!.id);
                }
                await expectTouch(page, `question ${i}, objet ${n + 1}`, async () => (await state(page)).basket === n + 1);
            }
            await tap('check');
        } else {
            const r = await target(`answer-${await visibleAnswer(page)}`);
            await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
            if (!doubled) { await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); doubled = true; }
        }
        await expectTouch(page, `réponse question ${i}`, async () => (await state(page)).targets.some(t => t.id === 'continue'));
        await expect(page.locator('#continue')).toBeVisible(); await tap('continue');
        await expectTouch(page, `Continuer question ${i}`, async () => i === 5 ? await page.locator('.stars').isVisible() : (await state(page)).index === i + 1);
        expect((await state(page)).level).toBe(level);
        expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
    }
    await expect(page.locator('.stars')).toBeVisible(); expect(doubled).toBe(true);
    if (level === 4) expect(dragged).toBe(true);
});
