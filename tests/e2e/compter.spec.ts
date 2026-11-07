import { test, expect, prepare, state, solveRound, solveQuestion, visibleAnswer } from './helpers';
for (const [mode, level] of [['combien', 1], ['remplir', 4], ['plus', 6], ['moins', 8]] as const) test(`${mode}: a complete series, stored stars and next level`, async ({ page }) => {
    await prepare(page, level); expect((await state(page)).question!.mode).toBe(mode === 'moins' ? 'plus' : mode);
    for (const r of (await state(page)).targets) { const min = r.id.startsWith('answer-') || r.id === 'check' ? 72 : 48; expect(r.width).toBeGreaterThanOrEqual(min); expect(r.height).toBeGreaterThanOrEqual(min); }
    await solveRound(page); await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles');
    await page.locator('#back').click(); await page.reload();
    await page.locator('[data-game="compter"]').click();
    await expect(page.locator(`[data-level="${level}"]`)).toContainText('★★★');
    if (level < 16) await expect(page.locator(`[data-level="${level + 1}"]`)).toBeEnabled();
});
test('two mistakes encourage, retain the same question, and count a visual hint', async ({ page }) => {
    await prepare(page); const initial = await state(page), q = initial.question!;
    const correct = await visibleAnswer(page);
    const wrong = q.choices.find(n => n !== correct)!;
    await page.locator(`[data-answer="${wrong}"]`).click();
    await expect(page.locator('#feedback')).toHaveText('Essaie encore !');
    expect((await state(page)).index).toBe(0); await expect(page.locator('.hint')).toHaveCount(0);
    await page.locator(`[data-answer="${wrong}"]`).click();
    await expect(page.locator('.hint')).toBeVisible(); await expect(page.locator('[data-object].counting').first()).toBeVisible();
    expect((await state(page)).question).toEqual(q);
    await solveRound(page); await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles');
});
test('a completed low-score series still unlocks the next level', async ({ page }) => {
    await prepare(page);
    for (let i = 0; i < 6; i++) {
        const q = (await state(page)).question!;
        const correct = await visibleAnswer(page);
        await page.locator(`[data-answer="${q.choices.find(n => n !== correct)!}"]`).click();
        await solveQuestion(page);
    }
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '1 étoile');
    await page.locator('#next').click(); expect((await state(page)).level).toBe(2);
});
test('basket objects can be removed before checking', async ({ page }) => {
    await prepare(page, 4);
    await page.locator('[data-reserve]').first().click(); await page.waitForTimeout(205);
    expect((await state(page)).basket).toBe(1);
    await page.locator('[data-basket]').first().click(); expect((await state(page)).basket).toBe(0);
});
test('sixteen level buttons fit the phone width and the last level plays to the end', async ({ page }) => {
    await prepare(page, 16, { voice: false, sound: false });
    await page.locator('#back').click(); await page.locator('[data-game="compter"]').click();
    await expect(page.locator('[data-level]')).toHaveCount(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const r of await page.locator('[data-level]').evaluateAll(els => els.map(el => el.getBoundingClientRect()))) { expect(r.width).toBeGreaterThanOrEqual(48); expect(r.right).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth)); }
    await page.locator('[data-level="16"]').click(); expect((await state(page)).level).toBe(16);
    await solveRound(page); await expect(page.locator('#next')).toHaveCount(0);
});
test('decoy level: the two-error hint counts only the requested kind', async ({ page }) => {
    await prepare(page, 15, { voice: false, sound: false });
    const q = (await state(page)).question!;
    expect(q.decoy).toBeDefined();
    await expect(page.locator('.instruction-pic svg')).toHaveCount(2);
    const wrong = q.choices.find(n => n !== q.answer)!;
    for (let i = 0; i < 2; i++) await page.locator(`[data-answer="${wrong}"]`).click();
    const counted = new Set<string>();
    for (let step = 0; step < q.target; step++) {
        await expect.poll(async () => { const k = await page.locator('.objects [data-object].counting').getAttribute('data-kind').catch(() => null); if (k) counted.add(`${k}:${await page.locator('.objects [data-object].counting').getAttribute('data-object')}`); return counted.size; }, { timeout: 4000 }).toBeGreaterThan(step);
    }
    expect([...counted].every(entry => entry.startsWith(`${q.object}:`))).toBe(true);
    expect(counted.size).toBe(q.target);
});
