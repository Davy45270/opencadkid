import { test, expect, passGate } from './helpers';
test('TicTac requires the correct written answer before any external navigation', async ({ page, context }) => {
    const requests: string[] = [];
    await context.route('https://davy45270.github.io/tictac/**', async route => { requests.push(route.request().url()); await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Intercepted</title><link rel="icon" href="data:,">' }); });
    await page.goto('/'); await page.locator('#tictac').click();
    expect(requests).toEqual([]); expect(context.pages()).toHaveLength(1);
    expect(await page.locator('a[href]').count()).toBe(0);
    const numbers = (await page.locator('.calculation').innerText()).match(/\d+/g)!.map(Number);
    const answer = numbers[0]! * numbers[1]!;
    await page.locator(`[data-parent]:not([data-parent="${answer}"])`).first().click();
    await expect(page.locator('h1')).toHaveText('Opencadkid'); expect(requests).toEqual([]);
    await page.locator('#tictac').click();
    await page.evaluate(() => {
        const probe: string[] = [];
        Object.defineProperty(window, '__links', { value: probe });
        document.addEventListener('click', event => { if (event.target instanceof HTMLAnchorElement) probe.push(event.target.rel); }, true);
    });
    await passGate(page);
    await expect.poll(() => requests).toEqual(['https://davy45270.github.io/tictac/']);
    expect(await page.evaluate(() => (window as unknown as { __links: string[] }).__links)).toEqual(['noopener noreferrer']);
});
test('the parents panel shows the released version', async ({ page }) => {
    const { version } = JSON.parse((await import('node:fs')).readFileSync('package.json', 'utf8')) as { version: string };
    await page.goto('/'); await page.locator('#parents').click(); await passGate(page);
    await expect(page.locator('.app-version')).toHaveText(`Opencadkid ${version}`);
});
