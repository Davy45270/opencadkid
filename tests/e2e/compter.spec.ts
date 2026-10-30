import { test, expect, prepare, state, solveRound, solveQuestion } from './helpers';
for (const [mode, level] of [['combien', 1], ['remplir', 4], ['plus', 6]] as const) test(`${mode}: a complete series, stored stars and next level`, async ({ page }) => {
    await prepare(page, level); expect((await state(page)).question!.mode).toBe(mode);
    for (const r of (await state(page)).targets) { expect(r.width).toBeGreaterThanOrEqual(48); expect(r.height).toBeGreaterThanOrEqual(48); }
    await solveRound(page); await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles');
    await page.locator('#back').click(); await page.reload();
    await page.locator('[data-game]').click();
    await expect(page.locator(`[data-level="${level}"]`)).toContainText('★★★');
    await expect(page.locator(`[data-level="${level + 1}"]`)).toBeEnabled();
});
test('two mistakes encourage, retain the same question, and count a visual hint', async ({ page }) => {
    await prepare(page); const initial = await state(page), q = initial.question!;
    const wrong = q.choices.find(n => n !== q.answer)!;
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
        await page.locator(`[data-answer="${q.choices.find(n => n !== q.answer)!}"]`).click();
        await solveQuestion(page);
    }
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '1 étoiles');
    await page.locator('#next').click(); expect((await state(page)).level).toBe(2);
});
test('basket objects can be removed before checking', async ({ page }) => {
    await prepare(page, 4);
    await page.locator('[data-reserve]').first().click(); await page.waitForTimeout(205);
    expect((await state(page)).basket).toBe(1);
    await page.locator('[data-basket]').first().click(); expect((await state(page)).basket).toBe(0);
});
