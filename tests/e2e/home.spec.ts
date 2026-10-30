import { test, expect, state, passGate } from './helpers';
test('home, large targets, responsive widths, local requests and both languages', async ({ page }) => {
    const external: string[] = [];
    page.on('request', request => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') external.push(request.url()); });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Opencadkid');
    await expect(page.locator('.cast > svg')).toHaveCount(5);
    await expect(page.locator('[data-game]')).toHaveCount(2);
    await expect(page.locator('#tictac')).toBeVisible();
    for (const width of [320, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        for (const rect of (await state(page)).targets) { expect(rect.width).toBeGreaterThanOrEqual(48); expect(rect.height).toBeGreaterThanOrEqual(48); }
        for (const card of await page.locator('[data-game]').all()) { const rect = await card.boundingBox(); expect(rect!.width).toBeGreaterThanOrEqual(120); expect(rect!.height).toBeGreaterThanOrEqual(120); }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.locator('#parents').click(); await passGate(page);
    await page.locator('#language').selectOption('en'); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    for (const r of (await state(page)).targets) { expect(r.width).toBeGreaterThanOrEqual(48); expect(r.height).toBeGreaterThanOrEqual(48); }
    await page.locator('#close').click(); await expect(page.locator('[data-game="compter"]')).toContainText("Boubou's baskets"); await expect(page.locator('[data-game="paires"]')).toContainText("Lumi's cards");
    await page.reload(); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.locator('#parents').click(); await passGate(page); await page.locator('#language').selectOption('fr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    expect(external).toEqual([]);
});
test('erasing progress requires an explicit second confirmation', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('opencadkid.v1', JSON.stringify({ version: 1, locale: 'fr', voice: false, sound: false, records: { 1: 3 } })));
    await page.goto('/'); await page.locator('#parents').click(); await passGate(page);
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.v1')!) as { records: object })).toMatchObject({ records: { 1: 3 } });
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.v1')!) as { records: object })).toMatchObject({ records: {} });
});
