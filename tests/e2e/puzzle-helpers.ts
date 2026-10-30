import type { Page } from '@playwright/test';
import { expect, prepare } from './helpers';
export interface PuzzleProbe { game: string; level: number; puzzle: { snap: number; aids: number; hintPiece: number | null; finished: boolean; pieces: { id: number; x: number; y: number; homeX: number; homeY: number; placed: boolean }[]; zone: { x: number; y: number; width: number; height: number }; boardScreen: { x: number; y: number; width: number; height: number } } }
export const puzzleState = (page: Page): Promise<PuzzleProbe> => page.evaluate(() => (window as unknown as { __kid: { state: () => PuzzleProbe } }).__kid.state());
export async function preparePuzzle(page: Page, level = 1, locale = 'fr'): Promise<void> {
    await prepare(page);
    await page.evaluate(({ level, locale }) => {
        const save = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { locale: string; puzzleRecords: Record<number, number> };
        save.locale = locale; save.puzzleRecords = {};
        for (let i = 1; i < level; i++) save.puzzleRecords[i] = 1;
        localStorage.setItem('opencadkid.v1', JSON.stringify(save));
    }, { level, locale });
    await page.reload(); await page.locator('[data-game="puzzle"]').click(); await page.locator(`[data-level="${level}"]`).click();
}
/** Home attributes and DOM stage geometry are the oracle; never read engine positions to solve. */
export async function pieceTarget(page: Page, id: number): Promise<{ x: number; y: number }> {
    const piece = page.locator(`[data-piece="${id}"]`), zone = (await page.locator('.puzzle-zone').boundingBox())!;
    return { x: zone.x + Number(await piece.getAttribute('data-home-x')) * zone.width / 320, y: zone.y + Number(await piece.getAttribute('data-home-y')) * zone.height / 550 };
}
export async function dragPuzzle(page: Page, id: number, target?: { x: number; y: number }): Promise<void> {
    const piece = page.locator(`[data-piece="${id}"]`), r = (await piece.boundingBox())!, to = target ?? await pieceTarget(page, id);
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 16 }); await page.mouse.up();
}
export async function solvePuzzle(page: Page): Promise<void> {
    const count = await page.locator('[data-piece]').count();
    for (let id = 0; id < count; id++) {
        const piece = page.locator(`[data-piece="${id}"]`);
        if (await piece.getAttribute('data-placed') === 'true') continue;
        await dragPuzzle(page, id); await expect(piece).toHaveAttribute('data-placed', 'true');
    }
    await expect(page.locator('.stars')).toBeVisible(); expect((await puzzleState(page)).puzzle.finished).toBe(true);
}
