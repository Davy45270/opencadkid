import type { Page } from '@playwright/test';
import { expect } from './helpers';
import type { Board } from '../../src/engines/paires';
export interface MemoryState { game: string | null; board: Omit<Board, 'cards'> & { cards: (Board['cards'][number] & { visible: boolean; rect: { x: number; y: number; width: number; height: number } | null })[] } }
export const memoryState = (page: Page): Promise<MemoryState> => page.evaluate(() => (window as unknown as { __kid: { state: () => MemoryState } }).__kid.state());
export async function prepareMemory(page: Page, level = 1): Promise<void> {
    await page.addInitScript(({ level }) => {
        if (localStorage.getItem('opencadkid.v1')) return;
        const pairesRecords: Record<number, number> = {};
        for (let i = 1; i < level; i++) pairesRecords[i] = 1;
        localStorage.setItem('opencadkid.v1', JSON.stringify({ version: 1, locale: 'fr', voice: false, sound: false, records: {}, pairesRecords }));
    }, { level });
    await page.goto('/'); await page.locator('[data-game="paires"]').click(); await page.locator(`[data-level="${level}"]`).click();
    await expect.poll(async () => (await memoryState(page)).board.preview).toBe(false);
}
export async function solveMemory(page: Page, tap: (index: number) => Promise<void> = async index => { await page.locator(`[data-card="${index}"]`).click(); }): Promise<void> {
    let state = (await memoryState(page)).board;
    if (state.mismatch) { await expect.poll(async () => (await memoryState(page)).board.mismatch).toBe(false); state = (await memoryState(page)).board; }
    for (let i = 0; i < state.cards.length; i++) {
        state = (await memoryState(page)).board;
        if (state.cards[i]!.found) continue;
        // If an accidental double touch left a card open, finish that pair first.
        const first = state.visible[0] ?? i;
        const partner = state.cards.findIndex((card, j) => j !== first && card.motif === state.cards[first]!.motif);
        if (!state.visible.length) await tap(first);
        await tap(partner);
    }
    await expect(page.locator('.stars')).toBeVisible();
}
