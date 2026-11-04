import { test, expect } from './helpers';
import type { Page } from '@playwright/test';
// The home screen must stay still in the light scheme: no card fades out and back in,
// neither on the first visit nor each time a child comes back from a game.
const cardStyles = (page: Page, action: 'none' | 'back') => page.evaluate(action => {
    if (action === 'back') document.querySelector<HTMLElement>('#back')!.click();
    return [...document.querySelectorAll<HTMLElement>('.game-card')].map(card => {
        const style = getComputedStyle(card);
        return { opacity: Number(style.opacity), animation: style.animationName, moving: card.querySelectorAll('animate, animateTransform').length };
    });
}, action);
for (const scheme of ['light', 'dark'] as const) test(`home cards never blink (${scheme} scheme)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    await expect(page.locator('.game-card').first()).toBeVisible();
    const first = await cardStyles(page, 'none');
    expect(first.length).toBeGreaterThan(1);
    for (const card of first) expect(card).toEqual({ opacity: 1, animation: 'none', moving: 0 });
    await page.locator('[data-game]').first().click();
    await expect(page.locator('#back')).toBeVisible();
    // Read in the same task as the click: the first painted frame after the return.
    const back = await cardStyles(page, 'back');
    expect(back.length).toBe(first.length);
    for (const card of back) expect(card).toEqual({ opacity: 1, animation: 'none', moving: 0 });
    // The landscape cast keeps its gentle motion.
    expect(await page.locator('.cast animateTransform').count()).toBeGreaterThan(0);
});
