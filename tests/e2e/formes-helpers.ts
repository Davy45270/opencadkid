import { captureReturnOrigin, expectMotionFinished, expectReturned } from './motion-helpers';
import type { Locator, Page } from '@playwright/test';
import { expect, prepare } from './helpers';
export interface ShapeProbe { game: string; selection: number | null; index: number; shapes: { errors: number; solved: boolean; finished: boolean; firstTry: number; placed: number[] }; question: { answer: number } }
export const shapeState = (page: Page): Promise<ShapeProbe> => page.evaluate(() => (window as unknown as { __kid: { state: () => ShapeProbe } }).__kid.state());
export async function prepareShapes(page: Page, level = 1, locale = 'fr'): Promise<void> {
    // Install the exact shared speech/AudioContext doubles before entering this game.
    await prepare(page, 1);
    await page.evaluate(({ level, locale }) => {
        const save = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { locale: string; formesRecords: Record<number, number> };
        save.locale = locale; save.formesRecords = {};
        for (let i = 1; i < level; i++) save.formesRecords[i] = 1;
        localStorage.setItem('opencadkid.v1', JSON.stringify(save));
    }, { level, locale });
    await page.reload(); await page.locator('[data-game="formes"]').click(); await page.locator(`[data-level="${level}"]`).click();
}
/** The rendered prompt and SVG attributes determine the answer; never the engine. */
export async function shapeAnswer(page: Page): Promise<number> {
    const prompt = await page.locator('.instruction-pic').evaluate(el => { const d = (el as HTMLElement).dataset; return { mode: d.mode, targetShape: d.targetShape, targetColor: d.targetColor, targetSize: d.targetSize }; });
    const candidates = await page.locator('[data-answer]').evaluateAll(elements => elements.map(el => { const d = el.querySelector('svg')!.dataset; return { index: Number((el as HTMLElement).dataset.answer), shape: d.shape, color: d.color, size: d.size }; }));
    const matching = candidates.filter(p => prompt.mode === 'forme' ? p.shape === prompt.targetShape : prompt.mode === 'couleur' ? p.color === prompt.targetColor : prompt.mode === 'taille' ? p.shape === prompt.targetShape && p.size === prompt.targetSize
        // Odd one out: the prompt names no shape; the only piece whose shape appears once is the answer.
        : prompt.mode === 'intrus' ? candidates.filter(o => o.shape === p.shape).length === 1
        : prompt.mode === 'les-trois' ? p.shape === prompt.targetShape && p.color === prompt.targetColor && p.size === prompt.targetSize
        : p.shape === prompt.targetShape && p.color === prompt.targetColor);
    expect(matching).toHaveLength(1);
    const result = matching[0]!.index;
    expect((await shapeState(page)).question.answer).toBe(result);
    return result;
}
export async function dragShape(page: Page, from: Locator, to: Locator, outside = false): Promise<void> {
    const returnOrigin = await captureReturnOrigin(from);
    const a = (await from.boundingBox())!, b = (await to.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, outside ? b.y + b.height + 20 : b.y + b.height / 2, { steps: 12 }); await page.mouse.up();
    await expectMotionFinished(from);
    if (!await from.isDisabled()) await expectReturned(from, returnOrigin);
}
export async function solveShapes(page: Page): Promise<void> {
    for (let i = (await shapeState(page)).index; i < 6; i++) {
        if (await page.locator('[data-piece]').count()) {
            const pieces = await page.locator('[data-piece]').count();
            for (let j = 0; j < pieces; j++) {
                const piece = page.locator(`[data-piece="${j}"]`);
                if (await piece.isDisabled()) continue;
                const c = await piece.locator('svg').getAttribute('data-color');
                await dragShape(page, piece, page.locator(`[data-box][data-color="${c!}"]`));
            }
        } else await page.locator(`[data-answer="${await shapeAnswer(page)}"]`).click();
        await expect(page.locator('#continue')).toBeVisible(); await page.locator('#continue').click();
    }
    await expect(page.locator('.stars')).toBeVisible();
}
