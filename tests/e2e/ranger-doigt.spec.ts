import type { BrowserContext, Page } from '@playwright/test';
import { test, expect, expectTouch, touchFrame } from './helpers';
import { binFor, prepareRanger, rangerDom, rangerState } from './ranger-helpers';
let seed = 89;
function noise(): number { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32 * 16 - 8; }
async function tap(page: Page, selector: string): Promise<void> {
    const r = (await page.locator(selector).boundingBox())!;
    await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
}
async function drag(page: Page, context: BrowserContext, id: string, bin: string, outcome: 'place' | 'near' | 'wrong' | 'cancel' | 'outside' = 'place'): Promise<void> {
    const selector = `[data-object="${id}"]`, a = (await page.locator(selector).boundingBox())!, b = (await page.locator(`[data-bin="${bin}"]`).boundingBox())!;
    const start = { x: a.x + a.width / 2 + noise(), y: a.y + a.height / 2 + noise() };
    const end = outcome === 'outside' ? { x: 5, y: 780 } : { x: b.x + b.width / 2, y: outcome === 'near' ? b.y + b.height + 18 : b.y + b.height / 2 };
    const cdp = await context.newCDPSession(page);
    try {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...start }] }); await touchFrame(page);
        for (let step = 1; step <= 14; step++) {
            const p = { x: start.x + (end.x - start.x) * step / 14 + (step === 14 ? 0 : noise()), y: start.y + (end.y - start.y) * step / 14 + (step === 14 ? 0 : noise()) };
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...p }] }); await touchFrame(page);
            if (Math.hypot(p.x - start.x, p.y - start.y) >= 12) {
                const painted = (await page.locator(selector).boundingBox())!;
                expect(Math.abs(painted.x - a.x - p.x + start.x)).toBeLessThan(1);
                expect(Math.abs(painted.y - a.y - p.y + start.y)).toBeLessThan(1);
            }
        }
        await cdp.send('Input.dispatchTouchEvent', { type: outcome === 'cancel' ? 'touchCancel' : 'touchEnd', touchPoints: [] }); await touchFrame(page);
    } finally { await cdp.detach(); }
}
for (const level of [1, 2, 3, 4, 5, 6, 7, 8]) test(`ranger ${level}: noisy finger session, rapid same bin, snap and no scroll`, async ({ page, context, isMobile }) => {
    test.skip(!isMobile, 'Mobile real touch only'); seed = 53 + level;
    await page.setViewportSize({ width: 390, height: 844 }); await prepareRanger(page, level);
    const scroll = await page.evaluate(() => [scrollX, scrollY]);
    for (let question = 0; question < 6; question++) {
        let dom = await rangerDom(page);
        if (question === 0 && dom.rule !== 'intrus') {
            const first = dom.objects[0]!, correct = binFor(dom, first), wrong = dom.bins.find(b => b !== correct)!;
            const before = (await rangerState(page)).ranger;
            for (const outcome of ['cancel', 'outside'] as const) { await drag(page, context, first.id, correct, outcome); expect((await rangerState(page)).ranger).toEqual(before); }
            const original = (await page.locator(`[data-object="${first.id}"]`).boundingBox())!;
            await drag(page, context, first.id, wrong, 'wrong');
            await expectTouch(page, 'Wrong drop returns and counts one error', async () => (await rangerState(page)).ranger.errors === 1);
            await page.waitForTimeout(300);
            const returned = (await page.locator(`[data-object="${first.id}"]`).boundingBox())!;
            expect(Math.abs(original.x - returned.x)).toBeLessThan(1); expect(Math.abs(original.y - returned.y)).toBeLessThan(1);
            await drag(page, context, first.id, correct, 'near');
            await expectTouch(page, 'Drop 18px below the bin snaps once', async () => (await rangerState(page)).ranger.placed.includes(first.id));
            dom = await rangerDom(page);
        }
        // Deliberately no wait between the two selections and two releases into one bin.
        if (question === 1 && dom.rule !== 'intrus') {
            const bin = dom.bins.find(b => dom.objects.filter(o => binFor(dom, o) === b).length >= 2)!;
            const pair = dom.objects.filter(o => binFor(dom, o) === bin).slice(0, 2);
            const count = (await rangerState(page)).ranger.placed.length;
            for (const o of pair) { await tap(page, `[data-object="${o.id}"]`); await tap(page, `[data-bin="${bin}"]`); }
            await expectTouch(page, 'Two distinct objects in the same bin without waiting', async () => (await rangerState(page)).ranger.placed.length === count + 2);
            dom = await rangerDom(page);
        }
        for (const o of dom.objects) {
            if (o.placed || dom.rule === 'intrus' && binFor(dom, o) !== 'intrus') continue;
            const before = (await rangerState(page)).ranger.placed.length;
            if (question % 2 === 0 && dom.rule !== 'intrus') await drag(page, context, o.id, binFor(dom, o));
            else { await tap(page, `[data-object="${o.id}"]`); if (dom.rule !== 'intrus') await tap(page, `[data-bin="${binFor(dom, o)}"]`); }
            await expectTouch(page, 'Each noisy gesture commits exactly one object', async () => (await rangerState(page)).ranger.placed.length === before + 1);
        }
        await expect(page.locator('#continue')).toBeVisible(); await tap(page, '#continue');
        expect(await page.evaluate(() => [scrollX, scrollY])).toEqual(scroll);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    }
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles'); expect((await rangerState(page)).ranger.finished).toBe(true);
});
