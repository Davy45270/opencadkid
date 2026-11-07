import { captureReturnOrigin, expectReturned } from './motion-helpers';
import { test, expect, expectTouch, state, touchFrame } from './helpers';
import { prepareSounds, soundAnswer, soundsState } from './sons-helpers';
import { makeRng } from '../../src/engines/rng';
for (const level of [4, 6, 8, 10, 18]) test(`level ${level}: mobile noisy finger, double touch and sorting without scrolling`, async ({ page, context }) => {
    test.skip(!test.info().project.use.hasTouch, 'Requires the mobile touch project.');
    await prepareSounds(page, level);
    const rng = makeRng(91), noise = (): number => rng() * 20 - 10;
    const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const tap = async (selector: string): Promise<void> => {
        const before = await soundsState(page);
        const r = (await page.locator(selector).boundingBox())!;
        expect(r.width).toBeGreaterThanOrEqual(72); expect(r.height).toBeGreaterThanOrEqual(72);
        await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
        await expectTouch(page, `${selector}, question ${before.index}`, async () => {
            const after = await soundsState(page);
            if (selector === '#continue') return before.index === 5 ? after.sons.finished : after.index === before.index + 1;
            if (selector.includes('data-answer')) return after.index === before.index && after.sons.solved;
            return after.index === before.index && after.selection === Number(selector.match(/\d+/)![0]);
        });
    };
    const cdp = await context.newCDPSession(page);
    const drag = async (piece: number, correct = true): Promise<void> => {
        const before = (await soundsState(page)).sons;
        const from = page.locator(`[data-sound-piece="${piece}"]`), initial = (await from.locator('svg').getAttribute('data-initial'))!;
        const box = page.locator('[data-sound-box]').filter(correct ? { has: page.locator(`[data-letter="${initial}"]`) } : { hasNot: page.locator(`[data-letter="${initial}"]`) }).first();
        const returnOrigin = await captureReturnOrigin(from);
        const a = (await from.boundingBox())!, b = (await box.boundingBox())!;
        const x = a.x + a.width / 2 + noise(), y = a.y + a.height / 2 + noise(), tx = b.x + b.width / 2, ty = b.y + b.height / 2;
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x, y }] });
        const steps = 10 + Math.floor(rng() * 7);
        for (let k = 1; k <= steps; k++) {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: x + (tx - x) * k / steps + noise(), y: y + (ty - y) * k / steps + noise() }] });
            await touchFrame(page);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await expect.poll(async () => { const after = (await soundsState(page)).sons; return correct ? after.placed.includes(piece) : after.errors === before.errors + 1; }).toBe(true);
        if (!(await soundsState(page)).sons.placed.includes(piece)) await expectReturned(page.locator(`[data-sound-piece="${piece}"]`), returnOrigin);
    };
    for (let i = 0; i < 6; i++) {
        const sorting = level === 10 || level === 18, pieces = await page.locator('[data-sound-piece]').count();
        if (sorting) {
            if (i === 0) {
                await tap('[data-sound-piece="0"]'); await tap('[data-sound-piece="0"]'); expect((await soundsState(page)).sons.placed).toEqual([]);
                await drag(0, false); expect((await soundsState(page)).sons.placed).toEqual([]);
                // Interrupted primary pointer must not leave a ghost drag or transfer a piece.
                const a = (await page.locator('[data-sound-piece="0"]').boundingBox())!;
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: a.x + a.width / 2, y: a.y + a.height / 2 }] });
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); expect((await soundsState(page)).sons.placed).toEqual([]);
            }
            for (let piece = 0; piece < pieces; piece++) await drag(piece);
        } else {
            const selector = `[data-answer="${await soundAnswer(page)}"]`; await tap(selector); await expectTouch(page, `réponse question ${i}`, async () => (await soundsState(page)).sons.solved);
            if (i === 0) { await tap(selector); expect((await soundsState(page)).index).toBe(0); expect((await soundsState(page)).sons.firstTry).toBe(1); }
        }
        expect((await soundsState(page)).sons.placed.length).toBe(sorting ? pieces : 0);
        expect((await soundsState(page)).sons.solved).toBe(true);
        expect((await soundsState(page)).sons.finished).toBe(false);
        await expect(page.locator('#continue')).toBeVisible(); await tap('#continue');
        await expectTouch(page, `Continuer question ${i}`, async () => { const s = await soundsState(page); return i === 5 ? s.sons.finished : s.index === i + 1; });
        expect((await state(page)).level).toBe(level);
        expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
    }
    expect((await soundsState(page)).sons.finished).toBe(true); await expect(page.locator('.stars')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await cdp.detach();
});
