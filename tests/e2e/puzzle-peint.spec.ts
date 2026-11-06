import type { Page, Route } from '@playwright/test';
import { test, expect } from './helpers';
import { preparePuzzle, solvePuzzle } from './puzzle-helpers';
import { newPuzzle, paintedSceneIds, type Scene } from '../../src/engines/puzzle';
/** Written independently of scenes.ts, which Playwright cannot load (it imports the WebP files). */
const names: Record<string, string> = { zen: 'Boubou au jardin zen', ardennes: 'CaliRoux dans la forêt des Ardennes', volcano: 'Pestouille au volcan ardent', islands: 'Tutu sur les îles tropicales', galaxy: 'Lumi dans la galaxie étoilée', valley: 'La vallée au printemps' };
/** The first seed whose draw is `scene`; the app's single crypto seed is replaced by it. */
const seedFor = (scene: Scene): number => { for (let seed = 0; ; seed++) if (newPuzzle(1, seed).scene === scene) return seed; };
async function forceSeed(page: Page, seed: number): Promise<void> {
    await page.addInitScript(value => {
        const original = crypto.getRandomValues.bind(crypto);
        const forced = <T extends ArrayBufferView<ArrayBuffer>>(array: T): T => { if (array instanceof Uint32Array && array.length === 1) { array[0] = value; return array; } return original(array); };
        Object.defineProperty(crypto, 'getRandomValues', { configurable: true, value: forced });
    }, seed);
}
const boardShot = async (page: Page): Promise<Buffer> => page.locator('[data-puzzle-board]').screenshot({ animations: 'disabled' });
for (const scene of paintedSceneIds) test(`painted scene ${scene}: its WebP is fetched by the puzzle, painted in every piece and the puzzle finishes`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await forceSeed(page, seedFor(scene));
    const webp: string[] = [];
    page.on('response', response => { if (/\.webp$/.test(new URL(response.url()).pathname)) webp.push(`${response.status()} ${new URL(response.url()).pathname.split('/').pop()}`); });
    await preparePuzzle(page, 4);
    await expect(page.locator('.puzzle-zone')).toHaveAttribute('aria-label', names[scene]!);
    const href = await page.locator('.puzzle-piece image').first().getAttribute('href');
    expect(href).toMatch(new RegExp(`(^|/)${scene}-[\\w-]+\\.webp$`));
    expect(await page.locator(`.puzzle-piece image[href="${href}"]`).count()).toBe(6);
    // Loaded and decodable at its 5:4 size, from the same origin.
    const size = await page.evaluate(async url => { const image = new Image(); image.src = url; await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight, origin: new URL(image.src).origin === location.origin }; }, href!);
    expect(size.origin).toBe(true); expect(size.width * 4).toBe(size.height * 5); expect(size.width).toBeGreaterThanOrEqual(450);
    await expect.poll(() => webp.filter(line => line.startsWith('200 ') && line.includes(`${scene}-`)).length).toBeGreaterThanOrEqual(1);
    expect(webp.every(line => line.includes(`${scene}-`))).toBe(true);
    await solvePuzzle(page);
    await expect(page.locator('[data-puzzle-board] image')).toHaveAttribute('href', href!);
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles');
});
test('the vector fallback is playable before the WebP arrives, then the painting covers it', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await forceSeed(page, seedFor('volcano'));
    let release: () => void = () => {}; const held = new Promise<void>(resolve => { release = resolve; });
    let requested = 0;
    // Context routing also sees fetches made by the service worker once it controls the page.
    await context.route(/\/assets\/[\w-]+\.webp$/, async (route: Route) => { requested++; await held; await route.continue(); });
    await preparePuzzle(page, 1);
    await expect.poll(() => requested).toBeGreaterThanOrEqual(1);
    await solvePuzzle(page);
    const fallback = await boardShot(page);
    release();
    const href = (await page.locator('[data-puzzle-board] image').getAttribute('href'))!;
    await page.evaluate(async url => { const image = new Image(); image.src = url; await image.decode(); }, href);
    await expect.poll(async () => Buffer.compare(fallback, await boardShot(page)) !== 0).toBe(true);
});
test('a painted scene shown once stays available offline', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await forceSeed(page, seedFor('islands'));
    await page.goto('/');
    await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    });
    await preparePuzzle(page, 1);
    const href = (await page.locator('[data-puzzle-board] image').getAttribute('href'))!;
    const cached = (): Promise<boolean> => page.evaluate(async url => Boolean(await (await caches.open('opencadkid-scenes')).match(new URL(url, location.href).href)), href);
    await expect.poll(cached).toBe(true);
    await context.setOffline(true); await page.reload();
    await page.locator('[data-game="puzzle"]').click(); await page.locator('[data-level="1"]').click();
    expect(await page.locator('[data-puzzle-board] image').getAttribute('href')).toBe(href);
    expect(await page.evaluate(async url => { const image = new Image(); image.src = url; await image.decode(); return image.naturalWidth; }, href)).toBeGreaterThanOrEqual(450);
    await solvePuzzle(page); await context.setOffline(false);
});
test('home and level list never fetch a painted scene', async ({ page }) => {
    let fetched = 0;
    page.on('request', request => { if (/\.webp$/.test(new URL(request.url()).pathname)) fetched++; });
    await page.goto('/'); await page.locator('[data-game="puzzle"]').click(); await expect(page.locator('[data-level="1"]')).toBeVisible();
    await page.waitForLoadState('networkidle'); expect(fetched).toBe(0);
});
