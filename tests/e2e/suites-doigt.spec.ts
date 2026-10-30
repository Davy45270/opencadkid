import type { BrowserContext, Page } from '@playwright/test';
import { test, expect, expectTouch, touchFrame } from './helpers';
import { patternAnswer, patternState, prepareSuites } from './suites-helpers';
let noiseSeed = 1;
function noise(): number { noiseSeed = Math.imul(noiseSeed, 1664525) + 1013904223 | 0; return (noiseSeed >>> 0) / 4294967296 * 20 - 10; }
async function point(page: Page, selector: string): Promise<{ x: number; y: number }> {
    const r = await page.locator(selector).boundingBox(); expect(r).not.toBeNull();
    return { x: r!.x + r!.width / 2 + noise(), y: r!.y + r!.height / 2 + noise() };
}
async function tap(page: Page, selector: string): Promise<void> { const p = await point(page, selector); await page.touchscreen.tap(p.x, p.y); }
async function drag(page: Page, context: BrowserContext, choice: number, cancel = false): Promise<void> {
    const begin = await point(page, `[data-pattern-choice="${choice}"]`), end = await point(page, '.suites-empty.suites-active');
    const cdp = await context.newCDPSession(page);
    try {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...begin }] });
        for (let step = 1; step <= 14; step++) {
            const t = step / 14;
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: begin.x + (end.x - begin.x) * t + (step === 14 ? 0 : noise()), y: begin.y + (end.y - begin.y) * t + (step === 14 ? 0 : noise()) }] });
            await touchFrame(page);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] }); await touchFrame(page);
    } finally { await cdp.detach(); }
}
for (const level of [1, 7, 9, 10]) test(`suites ${level}: noisy mobile finger, double touch, ordered drag, no scroll`, async ({ page, context, isMobile }) => {
    test.skip(!isMobile, 'Real mobile touch only'); noiseSeed = 700 + level;
    await page.setViewportSize({ width: 390, height: 844 }); await prepareSuites(page, level);
    const scroll = await page.evaluate(() => [scrollX, scrollY]);
    for (let question = 0; question < 6; question++) {
        const rects = await page.locator('[data-pattern-choice]').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, x: r.x, y: r.y }; }));
        for (const r of rects) { expect(r.width).toBeGreaterThanOrEqual(72); expect(r.height).toBeGreaterThanOrEqual(72); }
        for (const [i, a] of rects.entries()) for (const b of rects.slice(i + 1)) expect(Math.max(b.x - a.x - a.width, a.x - b.x - b.width, b.y - a.y - a.height, a.y - b.y - b.height)).toBeGreaterThanOrEqual(8);
        const choice = await patternAnswer(page);
        if (question === 0) {
            const wrong = (choice + 1) % rects.length;
            await tap(page, `[data-pattern-choice="${wrong}"]`); await page.waitForTimeout(205); await tap(page, `[data-pattern-choice="${wrong}"]`);
            expect((await patternState(page)).suites.errors).toBe(2); expect(await page.locator('.suites-base').count()).toBeGreaterThan(0);
            if (level === 9) {
                const before = await patternState(page); await drag(page, context, choice, true);
                expect(await patternState(page)).toEqual(before);
            }
            await tap(page, `[data-pattern-choice="${choice}"]`); await tap(page, `[data-pattern-choice="${choice}"]`);
            await expectTouch(page, 'Double touch must place once and cannot skip the question', async () => {
                const s = await patternState(page); return s.index === question && s.suites.placed.length === 1 && s.suites.errors === 2;
            });
        }
        while (await page.locator('.suites-empty').count()) {
            const next = await patternAnswer(page), before = (await patternState(page)).suites.placed.length;
            if (level === 9) await drag(page, context, next); else await tap(page, `[data-pattern-choice="${next}"]`);
            await expectTouch(page, 'Noisy gesture must advance exactly one slot', async () => (await patternState(page)).suites.placed.length === before + 1);
        }
        await expect(page.locator('#continue')).toBeVisible(); await tap(page, '#continue');
        expect(await page.evaluate(() => [scrollX, scrollY])).toEqual(scroll);
        expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles'); expect((await patternState(page)).suites.finished).toBe(true);
});
