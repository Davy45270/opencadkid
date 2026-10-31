import { test, expect, media } from './helpers';
import { clearLights, demonstration, drumsState, playBeats, prepareDrums } from './tambours-helpers';
for (const level of [1, 4, 5, 6, 7]) for (const sound of [true, false]) test(`drums ${level}, sound ${sound}: visible oracle, slow retry, voice and saved progress`, async ({ page }) => {
    await prepareDrums(page, level, { sound, locale: sound ? 'fr' : 'en' });
    let demo = await demonstration(page);
    expect((await media(page)).speech).toContain(sound ? 'À toi ! Rejoue les frappes.' : 'Your turn! Play the beats again.');
    const before = await drumsState(page), wrong = (demo[0]!.drum + 1) % await page.locator('[data-drum]').count();
    await clearLights(page); await page.locator(`[data-drum="${wrong}"]`).click();
    expect((await drumsState(page)).errors).toBe(1);
    // Exclude the child's immediate wrong hit from the light-only demonstration oracle.
    await clearLights(page); const slower = await demonstration(page);
    expect(slower.map(b => b.drum)).toEqual(demo.map(b => b.drum));
    expect(slower[1]!.t - slower[0]!.t).toBeCloseTo((demo[1]!.t - demo[0]!.t) * 1.3, 0);
    expect((await drumsState(page)).tempo).toBeCloseTo(before.tempo * 1.3);
    await page.locator(`[data-drum="${wrong}"]`).click(); await clearLights(page);
    demo = await demonstration(page);
    await expect(page.locator(`[data-drum="${demo[0]!.drum}"]`)).toHaveAttribute('data-hint', 'true');
    for (let q = 0; q < 5; q++) {
        await playBeats(page, demo, level >= 5);
        await expect(page.locator('#continue')).toBeVisible();
        expect((await drumsState(page)).solved).toBe(true);
        await clearLights(page); await page.locator('#continue').click();
        if (q < 4) demo = await demonstration(page);
    }
    await expect(page.locator('.stars')).toHaveText('★★');
    expect((await media(page)).oscillators > 0).toBe(sound);
    await page.reload(); await page.locator('[data-game="tambours"]').click();
    await expect(page.locator(`[data-level="${level + 1}"]`)).toBeEnabled();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.v1')!) as { tamboursRecords: Record<number, number> });
    expect(saved.tamboursRecords[level]).toBe(2);
});
test('free composition: eight beats, exact illuminated replay, three stars and no next level', async ({ page }) => {
    await prepareDrums(page, 8);
    for (let q = 0; q < 5; q++) {
        const pattern = [0, 0, 2, 3, 4, 5, 1, 0];
        for (const d of pattern) { await page.locator(`[data-drum="${d}"]`).click(); await page.clock.runFor(150); }
        await clearLights(page); await page.clock.runFor(5000);
        const lights = await page.evaluate(() => (window as unknown as { __drumLights: { drum: number }[] }).__drumLights.map(b => b.drum));
        // First playback beat can occur during the final 150 ms only after its 500 ms lead-in.
        expect(lights).toEqual(pattern); expect((await drumsState(page)).errors).toBe(0);
        await page.locator('#continue').click(); await clearLights(page);
    }
    await expect(page.locator('.stars')).toHaveText('★★★'); await expect(page.locator('#next')).toHaveCount(0);
});
for (const level of [1, 3, 4, 8]) test(`drum count at level ${level}: actual painted sizes, target bounds, reduced motion and no overflow 320–1280`, async ({ page }) => {
    await prepareDrums(page, level, { sound: false, voice: false });
    const first = level === 8 ? 0 : (await demonstration(page))[0]!.drum;
    for (const width of [320, 321, 360, 390, 480, 600, 699, 700, 768, 940, 1024, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        const sizes = await page.locator('[data-drum]').evaluateAll(elements => elements.map(el => {
            const r = el.getBoundingClientRect(), svg = el.querySelector('svg')!, box = svg.getBBox(), m = svg.getScreenCTM()!;
            const a = new DOMPoint(box.x, box.y).matrixTransform(m), b = new DOMPoint(box.x + box.width, box.y + box.height).matrixTransform(m);
            return { width: r.width, height: r.height, paintedWidth: b.x - a.x, paintedHeight: b.y - a.y, inside: a.x >= r.left - 1 && b.x <= r.right + 1 && a.y >= r.top - 1 && b.y <= r.bottom + 1 };
        }));
        for (const r of sizes) { expect(r.width).toBeGreaterThanOrEqual(88); expect(r.height).toBeGreaterThanOrEqual(88); expect(r.paintedWidth).toBeGreaterThanOrEqual(88); expect(r.paintedHeight).toBeGreaterThanOrEqual(88); expect(r.inside).toBe(true); }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator(`[data-drum="${first}"]`).click();
    await expect(page.locator(`[data-drum="${first}"]`)).toHaveAttribute('data-lit', 'true');
    expect(await page.locator(`[data-drum="${first}"]`).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    await page.evaluate(() => { (window as unknown as { __kid: { state(): { tambours: { errors: number } } } }).__kid.state().tambours.errors = 999; });
    expect((await drumsState(page)).errors).toBe(0);
});
test('optional mobile listening and your-turn captures', async ({ page, isMobile }) => {
    test.skip(process.env.CAPTURES !== '1' || !isMobile, 'Optional mobile review artifacts');
    await prepareDrums(page); await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.runFor(500); await page.screenshot({ path: 'docs/captures/tambours-ecoute.png' });
    await page.clock.runFor(10_000); await page.screenshot({ path: 'docs/captures/tambours-a-toi.png' });
});

test('an unavailable audio device still permits a light-observed round', async ({ page }) => {
    await prepareDrums(page, 1, { unavailable: true });
    for (let q = 0; q < 5; q++) {
        const demo = await demonstration(page); await playBeats(page, demo);
        await clearLights(page); await page.locator('#continue').click();
    }
    await expect(page.locator('.stars')).toHaveText('★★★');
    expect((await media(page)).oscillators).toBe(0);
});
