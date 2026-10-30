import { test, expect, solveRound } from './helpers';
test('installed precache reloads and completes a game without network', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    });
    await context.setOffline(true); await page.reload();
    await expect(page.locator('h1')).toHaveText('Opencadkid');
    await page.locator('[data-game="compter"]').click(); await page.locator('[data-level="1"]').click();
    await solveRound(page); await expect(page.locator('.stars')).toBeVisible(); await context.setOffline(false);
});
