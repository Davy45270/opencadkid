import { test, expect, passGate, prepare, clearSpeech, media } from './helpers';
for (const [id, url] of [['tictac', 'https://davy45270.github.io/tictac/'], ['petit-astronome', 'https://davy45270.github.io/petit-astronome/']] as const) {
    test(`the ${id} card opens its game straight away, in the same tab, without the adult question`, async ({ page, context }) => {
        const requests: string[] = [];
        await context.route(`${url}**`, async route => { requests.push(route.request().url()); await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Intercepted</title><link rel="icon" href="data:,">' }); });
        await page.goto('/');
        const card = page.locator(`#${id}`);
        await expect(card).toBeVisible(); await expect(card.locator('svg')).toHaveCount(0);
        await card.click();
        // Only a navigation without any question screen reaches the game: the gate would stop the page here.
        await expect(page).toHaveURL(url); await expect(page).toHaveTitle('Intercepted');
        expect(requests).toEqual([url]); expect(context.pages()).toHaveLength(1);
    });
}
test('the parents button still asks the adult question, and a wrong answer goes back home', async ({ page }) => {
    await page.goto('/'); await page.locator('#parents').click();
    await expect(page.locator('.calculation')).toBeVisible(); await expect(page.locator('#language')).toHaveCount(0);
    const numbers = (await page.locator('.calculation').innerText()).match(/\d+/g)!.map(Number);
    await page.locator(`[data-parent]:not([data-parent="${numbers[0]! * numbers[1]!}"])`).first().click();
    await expect(page.locator('h1')).toHaveText('Opencadkid'); await expect(page.locator('#language')).toHaveCount(0);
    await page.locator('#parents').click(); await passGate(page);
    await expect(page.locator('#language')).toBeVisible();
});
test('the parents panel shows the released version', async ({ page }) => {
    const { version } = JSON.parse((await import('node:fs')).readFileSync('package.json', 'utf8')) as { version: string };
    await page.goto('/'); await page.locator('#parents').click(); await passGate(page);
    await expect(page.locator('.app-version')).toHaveText(`Opencadkid ${version}`);
});
test('the adult question is never read aloud', async ({ page }) => {
    await prepare(page); await page.locator('#back').click();
    await clearSpeech(page);
    await page.locator('#parents').click();
    await expect(page.locator('.calculation')).toBeVisible();
    await page.waitForTimeout(1000);
    expect((await media(page)).speech).toEqual([]);
});
test('unticking sounds in the parents panel silences the sounds at once, ticking them again wakes them up', async ({ page }) => {
    await prepare(page); await page.locator('#back').click();
    await page.locator('#parents').click(); await passGate(page);
    const before = await media(page);
    await page.locator('#sound').uncheck();
    await expect.poll(async () => (await media(page)).suspends).toBe(before.suspends + 1);
    const muted = await media(page);
    await page.locator('#sound').check();
    await expect.poll(async () => (await media(page)).resumes).toBeGreaterThan(muted.resumes);
    expect((await media(page)).suspends).toBe(muted.suspends);
});
test('hiding the page during a game suspends the audio context', async ({ page }) => {
    await prepare(page);
    const before = await media(page);
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect.poll(async () => (await media(page)).suspends).toBe(before.suspends + 1);
});
test('sounds unticked in the parents panel stay unticked after a reload', async ({ page }) => {
    await prepare(page); await page.locator('#back').click();
    await page.locator('#parents').click(); await passGate(page);
    await page.locator('#sound').uncheck();
    await page.reload();
    await page.locator('#parents').click(); await passGate(page);
    await expect(page.locator('#sound')).not.toBeChecked();
    await expect(page.locator('#voice')).toBeChecked();
});
