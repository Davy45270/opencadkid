import { test as base, expect, type Page } from '@playwright/test';
import type { Question } from '../../src/engines/compter';
export interface Target { id: string; x: number; y: number; width: number; height: number }
export interface State { screen: string; game: string | null; level: number | null; index: number; question: Question | null; basket: number; targets: Target[] }
export const state = (page: Page): Promise<State> => page.evaluate(() => (window as unknown as { __kid: { state: () => State } }).__kid.state());
export const test = base.extend<{ consoleGuard: boolean }>({
    consoleGuard: [async ({ page }, use) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        await use(true); expect(errors).toEqual([]);
    }, { auto: true }]
});
export { expect };
export async function prepare(page: Page, level = 1): Promise<void> {
    await page.addInitScript(({ level }) => {
        const records: Record<number, number> = {};
        for (let i = 1; i < level; i++) records[i] = 1;
        if (!localStorage.getItem('opencadkid.v1')) localStorage.setItem('opencadkid.v1', JSON.stringify({ version: 1, locale: 'fr', voice: false, sound: false, records }));
    }, { level });
    await page.goto('/');
    await page.locator('[data-game="compter"]').click();
    await page.locator(`[data-level="${level}"]`).click();
}
export async function solveQuestion(page: Page): Promise<void> {
    const current = await state(page), q = current.question!;
    if (q.mode === 'remplir') {
        for (let i = current.basket; i < q.target; i++) { await page.locator('[data-reserve]').first().click(); await page.waitForTimeout(205); }
        for (let i = current.basket; i > q.target; i--) { await page.locator('[data-basket]').first().click(); await page.waitForTimeout(205); }
        await page.locator('#check').click();
    } else await page.locator(`[data-answer="${q.answer}"]`).click();
    await expect(page.locator('#continue')).toBeVisible();
    await page.locator('#continue').click();
}
export async function solveRound(page: Page): Promise<void> {
    for (let i = (await state(page)).index; i < 6; i++) await solveQuestion(page);
    await expect(page.locator('.stars')).toBeVisible();
}
export async function passGate(page: Page): Promise<void> {
    const numbers = (await page.locator('.calculation').innerText()).match(/\d+/g)!.map(Number);
    await page.locator(`[data-parent="${numbers[0]! * numbers[1]!}"]`).click();
}
