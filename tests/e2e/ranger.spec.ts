import { test, expect, media, clearSpeech, passGate } from './helpers';
import { expectedInstruction } from '../ranger-oracles';
import { binFor, prepareRanger, rangerDom, rangerState, solveSorting } from './ranger-helpers';
for (let level = 1; level <= 8; level++) test(`ranger ${level}: independent rule oracle, voice, gentle error, hint, complete and reload`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await prepareRanger(page, level);
    for (let index = 0; index < 6; index++) {
        const question = (await rangerState(page)).ranger.questions[index]!;
        const prompt = expectedInstruction(question, 'fr');
        await expect(page.locator('.instruction p')).toHaveText(prompt); expect((await media(page)).speech).toContain(prompt);
        await clearSpeech(page); await page.locator('#listen').click(); expect((await media(page)).speech).toContain(prompt);
        const dom = await rangerDom(page), hook = await rangerState(page);
        expect(hook.index).toBe(index); expect(hook.ranger.questions[index]!.objects.map(o => o.id)).toEqual(dom.objects.map(o => o.id));
        if (index === 0) {
            const o = dom.objects.find(o => dom.rule !== 'intrus' || binFor(dom, o) === 'ensemble')!;
            const wrong = dom.rule === 'intrus' ? 'intrus' : dom.bins.find(b => b !== binFor(dom, o))!;
            const audio = (await media(page)).oscillators;
            for (let miss = 1; miss <= 2; miss++) {
                if (miss === 2) { await page.waitForTimeout(360); await clearSpeech(page); }
                await page.locator(`[data-object="${o.id}"]`).click();
                if (dom.rule !== 'intrus') await page.locator(`[data-bin="${wrong}"]`).click();
                const s = (await rangerState(page)).ranger;
                expect(s.errors).toBe(miss); expect(s.placed).toEqual([]); expect(s.hint).toBe(miss === 2 ? o.id : null);
                await expect(page.locator(`[data-object="${o.id}"]`)).toBeEnabled();
                expect((await media(page)).oscillators).toBe(audio);
            }
            expect((await media(page)).speech).toContain(prompt);
            await expect(page.locator('.ranger-hint')).toHaveCount(1);
            await page.waitForTimeout(360);
        }
        await solveSorting(page);
    }
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles');
    await page.reload(); await page.locator('[data-game="ranger"]').click();
    await expect(page.locator(`[data-level="${level}"]`)).toContainText('★★★');
    if (level < 8) await expect(page.locator(`[data-level="${level + 1}"]`)).toBeEnabled();
});
test('English rules and object labels, silent preferences and detached observation hook', async ({ page }) => {
    await prepareRanger(page, 7, 'en'); const prompt = await page.locator('.instruction p').innerText(); expect((await media(page)).speech).toContain(prompt);
    expect(prompt).toContain('Sort using both clues.');
    const first = page.locator('[data-object]').first(); expect(await first.locator('svg').getAttribute('aria-label')).toMatch(/red|green|yellow/);
    const before = await rangerState(page);
    await page.evaluate(() => { const s = (window as unknown as { __kid: { state: () => { ranger: { placed: string[] } } } }).__kid.state(); s.ranger.placed.push('outside'); });
    expect(await rangerState(page)).toEqual(before);
    await prepareRanger(page, 1, 'en', { voice: false, sound: false });
    // Existing preferences persist across prepare(); explicitly set the saved switches.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { voice: boolean; sound: boolean }; s.voice = false; s.sound = false; localStorage.setItem('opencadkid.v1', JSON.stringify(s)); });
    await page.reload(); await page.locator('[data-game="ranger"]').click(); await page.locator('[data-level="1"]').click();
    const log = await media(page); await solveSorting(page); expect(await media(page)).toEqual(log);
});
test('all levels at 320–1280: actual painted size, bin targets and overflow', async ({ page }) => {
    await prepareRanger(page, 8);
    for (const width of [320, 360, 390, 414, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        for (let level = 1; level <= 8; level++) {
            await page.locator('#back').click(); await page.locator('[data-game="ranger"]').click(); await page.locator(`[data-level="${level}"]`).click();
            const painted = await page.locator('.ranger-object>svg').evaluateAll(elements => elements.map(el => {
                const g = el.querySelector('g')!, b = g.getBBox(), m = g.getScreenCTM()!;
                return { width: b.width * Math.hypot(m.a, m.b), height: b.height * Math.hypot(m.c, m.d) };
            }));
            for (const r of painted) expect(Math.max(r.width, r.height)).toBeGreaterThanOrEqual(56);
            const targets = await page.locator('[data-bin], [data-object], .play-header button').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { bin: el.hasAttribute('data-bin'), object: el.hasAttribute('data-object'), x: r.x, y: r.y, width: r.width, height: r.height }; }));
            for (const t of targets) { expect(t.width).toBeGreaterThanOrEqual(t.bin ? 96 : t.object ? 72 : 48); expect(t.height).toBeGreaterThanOrEqual(t.bin ? 96 : t.object ? 72 : 48); expect(t.x).toBeGreaterThanOrEqual(0); expect(t.x + t.width).toBeLessThanOrEqual(width); }
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
        }
    }
});
for (const [level, filename] of [[1, 'ranger-couleur.png'], [4, 'ranger-categorie.png']] as const) test(`capture ${filename}`, async ({ page, isMobile }) => {
    test.skip(process.env.CAPTURES !== '1' || !isMobile, 'Optional mobile captures for orchestrator review');
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await prepareRanger(page, level);
    await page.screenshot({ path: `docs/captures/${filename}` });
});

test('each English rule is displayed and spoken with the independent language oracle', async ({ page }) => {
    for (let level = 1; level <= 8; level++) {
        await prepareRanger(page, level, 'en');
        const q = (await rangerState(page)).ranger.questions[0]!, prompt = expectedInstruction(q, 'en');
        await expect(page.locator('.instruction p')).toHaveText(prompt);
        expect((await media(page)).speech).toContain(prompt);
        await clearSpeech(page); await page.locator('#listen').click();
        expect((await media(page)).speech).toEqual([prompt]);
    }
});
test('parental erase cancels or confirms existing Ranger records and persists after reload', async ({ page }) => {
    await prepareRanger(page, 8);
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const records = () => page.evaluate(() => (JSON.parse(localStorage.getItem('opencadkid.v1')!) as { rangerRecords: Record<string, number> }).rangerRecords);
    const before = await records(); expect(Object.keys(before)).toHaveLength(7);
    await page.locator('#erase').click(); await page.locator('#no').click(); expect(await records()).toEqual(before);
    await page.locator('#erase').click(); await page.locator('#yes').click(); expect(await records()).toEqual({});
    await page.reload(); expect(await records()).toEqual({});
    await page.locator('[data-game="ranger"]').click();
    await expect(page.locator('[data-level="1"]')).toBeEnabled();
    await expect(page.locator('[data-level="2"]')).toBeDisabled();
    await expect(page.locator('.level-grid')).not.toContainText('★');
});
