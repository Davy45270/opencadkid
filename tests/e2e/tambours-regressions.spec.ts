import { test, expect, media } from './helpers';
import { clearLights, demonstration, drumsState, playBeats, prepareDrums, type Beat } from './tambours-helpers';

test('adapted markers shrink after growth and the hint follows the next beat', async ({ page }) => {
    await prepareDrums(page, 2);
    await playBeats(page, await demonstration(page));
    await page.locator('#continue').click(); await clearLights(page);
    let demo = await demonstration(page);
    await expect(page.locator('[data-beat]')).toHaveCount(3);
    const wrong = (demo[0]!.drum + 1) % 4;
    for (let i = 0; i < 2; i++) {
        await page.locator(`[data-drum="${wrong}"]`).click(); await clearLights(page);
        demo = await demonstration(page);
    }
    expect(demo).toHaveLength(2);
    await expect(page.locator('[data-beat]')).toHaveCount(2);
    await playBeats(page, demo);
    await expect(page.locator('[data-beat][data-played="false"]')).toHaveCount(0);
    await expect(page.locator('#continue')).toBeVisible();

    // Three beats cannot all use the same drum; observe where the hint must move.
    await prepareDrums(page, 4);
    demo = await demonstration(page);
    for (let i = 0; i < 2; i++) {
        await page.locator(`[data-drum="${(demo[0]!.drum + 1) % 6}"]`).click();
        await clearLights(page); demo = await demonstration(page);
    }
    const next = demo.findIndex(b => b.drum !== demo[0]!.drum);
    expect(next).toBeGreaterThan(0);
    await expect(page.locator('[data-hint="true"]')).toHaveAttribute('data-drum', String(demo[0]!.drum));
    await playBeats(page, demo.slice(0, next));
    await expect(page.locator('[data-hint="true"]')).toHaveCount(1);
    await expect(page.locator('[data-hint="true"]')).toHaveAttribute('data-drum', String(demo[next]!.drum));
});

test('free playback preserves varied spacing and clamps both interval bounds', async ({ page }) => {
    await prepareDrums(page, 8);
    const pattern = [0, 0, 2, 3, 4, 5, 1, 0];
    const gaps = [50, 150, 375, 900, 2400, 100, 2000];
    for (let i = 0; i < pattern.length; i++) {
        if (i) await page.clock.runFor(gaps[i - 1]!);
        await page.locator(`[data-drum="${pattern[i]}"]`).click();
    }
    await clearLights(page); await page.clock.runFor(12_000);
    const replay = await page.evaluate(() => (window as unknown as { __drumLights: Beat[] }).__drumLights);
    expect(replay.map(b => b.drum)).toEqual(pattern);
    expect(replay.slice(1).map((b, i) => b.t - replay[i]!.t)).toEqual([100, 150, 375, 900, 2000, 100, 2000]);
    await expect(page.locator('#continue')).toBeVisible();
});

for (const reducedMotion of ['reduce', 'no-preference'] as const) test(`repeated strikes change the painted light with motion ${reducedMotion}`, async ({ page }) => {
    await prepareDrums(page, 8, { sound: false }); await page.emulateMedia({ reducedMotion });
    const drum = page.locator('[data-drum="0"]');
    const paint = (): Promise<string> => drum.evaluate(el => getComputedStyle(el).filter);
    const dark = await paint();
    await drum.click(); const first = await paint();
    expect(first).not.toBe(dark);
    await page.clock.runFor(150); await drum.click();
    const second = await paint();
    expect(second).not.toBe(first); expect(second).not.toBe(dark);
    await page.clock.runFor(229); await expect(drum).toHaveAttribute('data-lit', 'true');
    await page.clock.runFor(1); expect(await paint()).toBe(dark);
    expect((await drumsState(page)).cursor).toBe(2);
});

test('Listen discards the partial rhythmic anchor before replay', async ({ page }) => {
    await prepareDrums(page, 5);
    const demo = await demonstration(page);
    await page.locator(`[data-drum="${demo[0]!.drum}"]`).click();
    expect((await drumsState(page)).last).not.toBeNull();
    await page.locator('#listen').click();
    expect((await drumsState(page)).last).toBeNull(); expect((await drumsState(page)).cursor).toBe(0);
    await clearLights(page); const replay = await demonstration(page);
    expect(replay.map(b => b.drum)).toEqual(demo.map(b => b.drum));
    await playBeats(page, replay, true);
    expect((await drumsState(page)).errors).toBe(0);
    await expect(page.locator('#continue')).toBeVisible();
});

test('navigation cancels light extinction on the detached instrument and pending playback', async ({ page }) => {
    await prepareDrums(page);
    await page.clock.runFor(500);
    const drum = await page.locator('[data-lit="true"]').elementHandle();
    expect(drum).not.toBeNull();
    const before = (await media(page)).oscillators;
    await page.locator('#back').click(); await page.clock.runFor(20_000);
    expect(await drum.getAttribute('data-lit')).toBe('true');
    expect((await media(page)).oscillators).toBe(before);
    await drum.dispose();
});

test('hiding interrupts playback and returning clears partial rhythm before a full demonstration', async ({ page }) => {
    await prepareDrums(page, 5);
    const demo = await demonstration(page);
    await page.locator(`[data-drum="${demo[0]!.drum}"]`).click();
    await page.locator('#listen').click(); await page.clock.runFor(500);
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    const before = (await media(page)).oscillators;
    await clearLights(page); await page.clock.runFor(20_000);
    expect((await media(page)).oscillators).toBe(before);
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    expect((await drumsState(page)).last).toBeNull(); expect((await drumsState(page)).cursor).toBe(0);
    const replay = await demonstration(page);
    expect(replay.map(b => b.drum)).toEqual(demo.map(b => b.drum));
    await playBeats(page, replay, true); expect((await drumsState(page)).errors).toBe(0);
});

test('each real mobile drum touch sends its own frequency to AudioContext', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Real touchscreen input');
    await prepareDrums(page, 8);
    const before = await media(page);
    for (let d = 0; d < 6; d++) {
        await page.locator(`[data-drum="${d}"]`).tap();
        expect((await drumsState(page)).cursor).toBe(d + 1);
    }
    const after = await media(page);
    expect(after.frequencies.slice(before.frequencies.length)).toEqual([261.63, 293.66, 329.63, 392, 440, 523.25]);
    expect(after.stops.slice(before.stops.length)).toEqual(Array(6).fill(.26));
});

test('returning from a hidden partial rhythm resets the cursor and timing anchor', async ({ page }) => {
    await prepareDrums(page, 5);
    const demo = await demonstration(page);
    await page.locator(`[data-drum="${demo[0]!.drum}"]`).click();
    expect((await drumsState(page)).cursor).toBe(1);
    expect((await drumsState(page)).last).not.toBeNull();
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.clock.runFor(5000);
    await clearLights(page);
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
    });
    expect((await drumsState(page)).cursor).toBe(0);
    expect((await drumsState(page)).last).toBeNull();
    const replay = await demonstration(page);
    expect(replay.map(b => b.drum)).toEqual(demo.map(b => b.drum));
    await playBeats(page, replay, true);
    expect((await drumsState(page)).errors).toBe(0);
});
