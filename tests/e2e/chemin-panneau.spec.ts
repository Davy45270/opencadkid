import type { Page, Route } from '@playwright/test';
import { test, expect } from './helpers';
import { mazeDom, mazeRoute, prepareChemin } from './chemin-helpers';
import { newMaze } from '../../src/engines/chemin';
type Box = { x: number; y: number; width: number; height: number };
/** The first seed whose start is in the top row (true) or the bottom row (false). */
const seedFor = (level: number, top: boolean): number => {
    for (let seed = 0; ; seed++) { const s = newMaze(level, seed); if ((Math.floor(s.start / s.columns) === 0) === top) return seed; }
};
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.width - .5 && b.x < a.x + a.width - .5 && a.y < b.y + b.height - .5 && b.y < a.y + a.height - .5;
const signShot = (page: Page): Promise<Buffer> => page.locator('.chemin-panneau').screenshot({ animations: 'disabled' });
for (let level = 1; level <= 16; level++) for (const top of [true, false]) test(`chemin ${level} (${top ? "top" : "other"} start row): the sign stands on the border next to the start, toward the real first step, over no cell and no guide`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await prepareChemin(page, level, 'fr', seedFor(level, top));
    const route = await mazeRoute(page), dom = await mazeDom(page), [a, b] = route as [number, number];
    // DOM-only oracle for the first step, independent of the engine's firstStep.
    const step = b === a + 1 ? 'E' : b === a - 1 ? 'W' : b === a + dom.columns ? 'S' : 'N';
    await expect(page.locator('.chemin-depart')).toHaveAttribute('data-depart', step);
    const sign = (await page.locator('.chemin-panneau').boundingBox())!, zone = (await page.locator('.chemin-zone').boundingBox())!;
    const start = (await page.locator('[data-start]').boundingBox())!;
    expect(sign.width).toBeGreaterThanOrEqual(40); expect(sign.height).toBe(64);
    for (const cell of await page.locator('[data-cell]').all()) expect(overlaps(sign, (await cell.boundingBox())!)).toBe(false);
    expect(overlaps(sign, (await page.locator('[data-guide]').boundingBox())!)).toBe(false);
    const guide = await page.locator('#guide').boundingBox(); if (guide) expect(overlaps(sign, guide)).toBe(false);
    // On the border of the start's column, on the side the path leaves from.
    expect(sign.x).toBeLessThan(start.x + start.width); expect(sign.x + sign.width).toBeGreaterThan(start.x);
    const side = await page.locator('.chemin-depart').getAttribute('data-side');
    if (step === 'S') expect(side).toBe('top'); if (step === 'N') expect(side).toBe('bottom');
    if (side === 'top') expect(sign.y + sign.height).toBeCloseTo(zone.y, 0); else expect(sign.y).toBeCloseTo(zone.y + zone.height, 0);
    expect(sign.x).toBeGreaterThanOrEqual(0); expect(sign.x + sign.width).toBeLessThanOrEqual(390); expect(sign.y + sign.height).toBeLessThanOrEqual(844);
    // A turned sign: the art's own transform matches the step.
    expect(await page.locator('.chemin-panneau-art').evaluate(el => el.style.transform)).toBe({ E: 'none', W: 'scaleX(-1)', S: 'rotate(90deg)', N: 'rotate(-90deg)' }[step]);
});
test('the sign WebP is fetched only when a maze opens, never by home or the level list, and is decodable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const webp: string[] = [];
    page.on('response', response => { if (/\.webp$/.test(new URL(response.url()).pathname)) webp.push(`${response.status()} ${new URL(response.url()).pathname.split('/').pop()}`); });
    await page.goto('/'); await page.locator('[data-game="chemin"]').click(); await expect(page.locator('[data-level="1"]')).toBeVisible();
    await page.waitForLoadState('networkidle'); expect(webp).toEqual([]);
    await page.locator('[data-level="1"]').click();
    await expect.poll(() => webp.filter(line => /^200 panneau-[\w-]+\.webp$/.test(line)).length).toBe(1);
    expect(webp).toHaveLength(1);
    const url = await page.locator('.chemin-panneau-peint').evaluate(el => getComputedStyle(el).backgroundImage.replace(/^url\("?|"?\)$/g, ''));
    const size = await page.evaluate(async url => { const image = new Image(); image.src = url; await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight, origin: new URL(image.src).origin === location.origin }; }, url);
    expect(size).toEqual({ width: 189, height: 300, origin: true });
});
test('the drawn sign shows while the WebP is pending, then the painting covers it', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let release: () => void = () => {}; const held = new Promise<void>(resolve => { release = resolve; });
    let requested = 0;
    await context.route(/\/assets\/panneau-[\w-]+\.webp$/, async (route: Route) => { requested++; await held; await route.continue(); });
    await prepareChemin(page, 4, 'fr', seedFor(4, true));
    await expect.poll(() => requested).toBeGreaterThanOrEqual(1);
    await expect(page.locator('[data-panneau-repli]')).toBeVisible();
    const fallback = await signShot(page);
    release();
    const url = await page.locator('.chemin-panneau-peint').evaluate(el => getComputedStyle(el).backgroundImage.replace(/^url\("?|"?\)$/g, ''));
    await page.evaluate(async url => { const image = new Image(); image.src = url; await image.decode(); }, url);
    await expect.poll(async () => Buffer.compare(fallback, await signShot(page)) !== 0).toBe(true);
});
test('the sign shown once stays available offline', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    });
    await page.locator('[data-game="chemin"]').click(); await page.locator('[data-level="1"]').click();
    const url = await page.locator('.chemin-panneau-peint').evaluate(el => getComputedStyle(el).backgroundImage.replace(/^url\("?|"?\)$/g, ''));
    await expect.poll(() => page.evaluate(async url => Boolean(await (await caches.open('opencadkid-scenes')).match(url)), url)).toBe(true);
    await context.setOffline(true); await page.reload();
    await page.locator('[data-game="chemin"]').click(); await page.locator('[data-level="1"]').click();
    expect(await page.evaluate(async url => { const image = new Image(); image.src = url; await image.decode(); return image.naturalWidth; }, url)).toBe(189);
    await context.setOffline(false);
});
