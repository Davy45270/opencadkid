import { test, expect, expectTouch } from './helpers';
import { memoryState, prepareMemory, solveMemory } from './paires-helpers';
import { makeRng } from '../../src/engines/rng';
test('twenty cards, noisy fingers, double touch and rapid mismatch touches finish without scrolling', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await prepareMemory(page, 6);
    if (page.viewportSize()!.width >= 390 && page.viewportSize()!.height >= 800)
        expect((await page.locator('#guide').boundingBox())!.height).toBeGreaterThanOrEqual(96);
    const rng = makeRng(73), noise = (): number => (rng() * 2 - 1) * 10;
    const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    const tap = async (index: number, expected: 'activate' | 'ignored' = 'activate'): Promise<void> => {
        const before = (await memoryState(page)).board;
        const r = before.cards[index]!.rect!;
        expect(r.width).toBeGreaterThanOrEqual(64); expect(r.height).toBeGreaterThanOrEqual(64);
        expect(r.y).toBeGreaterThanOrEqual(0); expect(r.y + r.height).toBeLessThanOrEqual(844);
        await page.touchscreen.tap(r.x + r.width / 2 + noise(), r.y + r.height / 2 + noise());
        await expectTouch(page, `carte ${index}, coup ${before.moves}`, async () => {
            const after = (await memoryState(page)).board;
            if (expected === 'ignored') return after.moves === before.moves && JSON.stringify(after.visible) === JSON.stringify(before.visible);
            if (before.mismatch) return !after.mismatch && JSON.stringify(after.visible) === JSON.stringify(before.visible.includes(index) ? [] : [index]);
            return after.cards[index]!.found || after.visible.includes(index) || after.finished;
        });
        expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
    };
    const initial = (await memoryState(page)).board;
    for (const [i, c] of initial.cards.entries()) for (const other of initial.cards.slice(i + 1)) {
        const a = c.rect!, b = other.rect!;
        expect(Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width) >= 8 || Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height) >= 8).toBe(true);
    }
    await tap(0); await tap(0); expect((await memoryState(page)).board.visible).toEqual([0]); expect((await memoryState(page)).board.moves).toBe(0);
    const wrong = initial.cards.findIndex(c => c.motif !== initial.cards[0]!.motif);
    await tap(wrong); expect((await memoryState(page)).board.mismatch).toBe(true);
    await tap(0); // A visible mismatch card only closes the pair.
    expect((await memoryState(page)).board.visible).toEqual([]);
    await page.clock.runFor(350);
    await tap(0); await tap(wrong);
    const third = initial.cards.findIndex((_, i) => i !== 0 && i !== wrong);
    await tap(third); await tap(third, 'ignored');
    const after = (await memoryState(page)).board;
    expect(after.moves).toBe(2); expect(after.mismatch).toBe(false); expect(after.visible).toEqual([third]);
    // A cancelled mismatch timer must not close the newly opened card.
    await page.clock.runFor(900);
    await expect.poll(async () => (await memoryState(page)).board.visible).toEqual([third]);
    await solveMemory(page, async index => {
        // Rapid/double touches above deliberately share the same logical turn.
        // Advance the controlled clock past their debounce before intentional play.
        await page.clock.runFor(350);
        await expect.poll(async () => (await memoryState(page)).board.mismatch).toBe(false);
        await tap(index);
    }); expect((await memoryState(page)).board.finished).toBe(true);
    expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});
