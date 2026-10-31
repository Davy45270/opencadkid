import { test, expect, state, passGate } from './helpers';
test('home, large targets, responsive widths, local requests and both languages', async ({ page }) => {
    const external: string[] = [];
    page.on('request', request => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') external.push(request.url()); });
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Opencadkid');
    await expect(page.locator('.cast > svg')).toHaveCount(5);
    await expect(page.locator('[data-game]')).toHaveCount(10);
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

test('home, level selectors and every game fit narrow widths and responsive breakpoints', async ({ page }) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => {
        const records = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3 };
        localStorage.setItem('opencadkid.v1', JSON.stringify({ version: 1, locale: 'fr', voice: false, sound: false, records, pairesRecords: records }));
    });
    await page.goto('/');
    // Include both sides of responsive breakpoints and narrow phone widths.
    // Return offending elements so a regression identifies its source.
    const checkWidths = async (): Promise<void> => {
        const failures: { width: number; elements: string[] }[] = [];
        for (const width of [320, 321, 360, 375, 390, 414, 480, 560, 640, 699, 700, 768, 939, 940, 941, 1024, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            const overflow = await page.evaluate(() => {
                if (document.documentElement.scrollWidth <= innerWidth) return null;
                return [...document.querySelectorAll('#app, #app *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map(el => `${el.tagName}.${el.getAttribute('class') ?? ''}`);
            });
            if (overflow) failures.push({ width, elements: overflow });
        }
        expect(failures).toEqual([]);
    };
    await checkWidths();
    for (const game of ['compter', 'paires']) {
        await page.locator(`[data-game="${game}"]`).click(); await checkWidths();
        for (const level of game === 'compter' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7]) {
            await page.locator(`[data-level="${level}"]`).click(); await checkWidths();
            await page.locator('#back').click(); await page.locator(`[data-game="${game}"]`).click();
        }
        await page.locator('#back').click();
    }
});

test('all five landscape guides and the sun fit the banner and window', async ({ page }) => {
    await page.goto('/');
    for (const width of [320, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        const bounds = await page.locator('.landscape').boundingBox();
        const guides = page.locator('.cast > svg');
        await expect(guides).toHaveCount(5);
        // Test both SVG viewports and actual painted geometry, so clipping cannot pass.
        const boxes = await page.locator('.cast > svg, .landscape > svg > circle').evaluateAll(elements => elements.flatMap(el => {
            const r = el.getBoundingClientRect();
            const svg = el as SVGGraphicsElement, b = svg.getBBox(), m = svg.getScreenCTM()!;
            const a = new DOMPoint(b.x, b.y).matrixTransform(m), z = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m);
            return [{ left: r.left, right: r.right, top: r.top, bottom: r.bottom }, { left: a.x, right: z.x, top: a.y, bottom: z.y }];
        }));
        for (const b of boxes) {
            expect(b.right - b.left).toBeGreaterThan(0);
            expect(b.left).toBeGreaterThanOrEqual(bounds!.x);
            expect(b.right).toBeLessThanOrEqual(bounds!.x + bounds!.width);
            expect(b.top).toBeGreaterThanOrEqual(bounds!.y);
            expect(b.bottom).toBeLessThanOrEqual(bounds!.y + bounds!.height);
            expect(b.left).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(width);
        }
    }
});
