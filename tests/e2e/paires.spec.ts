import { names } from '../../src/games/paires/motifs';
import { test, expect, prepare, media, clearSpeech } from './helpers';
import { memoryState, prepareMemory, solveMemory } from './paires-helpers';
test('guided click game, intentional mismatch, read-only hook and progress after reload', async ({ page }) => {
    await prepareMemory(page);
    const initial = (await memoryState(page)).board;
    expect(initial.cards).toHaveLength(4);
    for (const r of await page.locator('button').evaluateAll(buttons => buttons.map(button => { const r = button.getBoundingClientRect(); return { width: r.width, height: r.height }; }))) { expect(r.width).toBeGreaterThanOrEqual(64); expect(r.height).toBeGreaterThanOrEqual(64); }
    const wrong = initial.cards.findIndex(c => c.motif !== initial.cards[0]!.motif);
    await page.locator('[data-card="0"]').click(); await page.locator(`[data-card="${wrong}"]`).click();
    expect((await memoryState(page)).board.mismatch).toBe(true);
    expect((await memoryState(page)).board.moves).toBe(1);
    await expect(page.locator('.memory-card.face-up')).toHaveCount(2);
    await expect.poll(async () => (await memoryState(page)).board.mismatch).toBe(false);
    await expect(page.locator('.memory-card.face-up')).toHaveCount(0);
    await page.evaluate(() => { const probe = (window as unknown as { __kid: { state: () => { board: { moves: number } } } }).__kid.state(); probe.board.moves = 999; });
    expect((await memoryState(page)).board.moves).toBe(1);
    await solveMemory(page); await expect(page.locator('.stars')).toHaveText('★★★');
    await page.locator('#back').click(); await page.reload(); await page.locator('[data-game="paires"]').click();
    await expect(page.locator('[data-level="1"]')).toContainText('★★★'); await expect(page.locator('[data-level="2"]')).toBeEnabled();
    await page.locator('#back').click(); await page.locator('[data-game="compter"]').click();
    await expect(page.locator('[data-level="2"]')).toBeDisabled();
});
test('preview closes after two seconds; English shadow level completes', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('opencadkid.v1', JSON.stringify({ version: 1, locale: 'en', voice: false, sound: false, records: {}, pairesRecords: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 } })));
    await page.goto('/'); await page.locator('[data-game="paires"]').click(); await page.locator('[data-level="1"]').click();
    await expect(page.locator('.memory-card.face-up')).toHaveCount(4);
    await expect(page.locator('[data-card="0"]')).toBeDisabled();
    await expect.poll(async () => (await memoryState(page)).board.preview).toBe(false);
    await expect(page.locator('.memory-card.face-up')).toHaveCount(0);
    await page.locator('#back').click(); await page.locator('[data-game="paires"]').click(); await page.locator('[data-level="7"]').click();
    const cards = (await memoryState(page)).board.cards;
    expect(cards.filter(c => c.shadow)).toHaveLength(6);
    await expect(page.locator('.instruction p').first()).toHaveText('Find each picture and its shadow.');
    await solveMemory(page); await expect(page.locator('#next')).toHaveCount(0);
});

for (const enabled of [true, false]) test(`spoken card names, instruction replay and gentle sound with media=${enabled}`, async ({ page }) => {
    // Reuse the shell media doubles: they also assert silence before the first gesture.
    await prepare(page, 1, { voice: enabled, sound: enabled });
    await page.locator('#back').click(); await page.locator('[data-game="paires"]').click(); await page.locator('[data-level="1"]').click();
    await expect.poll(async () => (await memoryState(page)).board.preview).toBe(false);
    await clearSpeech(page); await page.locator('#listen').click();
    expect((await media(page)).speech).toEqual(enabled ? ['Trouve les deux mêmes images.'] : []);
    const cards = (await memoryState(page)).board.cards;
    const wrong = cards.findIndex(c => c.motif !== cards[0]!.motif), partner = cards.findIndex((c, i) => i !== 0 && c.motif === cards[0]!.motif);
    const before = (await media(page)).oscillators;
    await clearSpeech(page); await page.locator('[data-card="0"]').click();
    expect((await media(page)).speech).toEqual(enabled ? [names.fr[cards[0]!.motif]] : []);
    await clearSpeech(page); await page.locator(`[data-card="${wrong}"]`).click();
    expect((await media(page)).speech).toEqual(enabled ? [names.fr[cards[wrong]!.motif]] : []);
    expect((await media(page)).oscillators).toBe(before);
    await expect.poll(async () => (await memoryState(page)).board.mismatch).toBe(false);
    await page.locator('[data-card="0"]').click(); await page.locator(`[data-card="${partner}"]`).click();
    expect((await memoryState(page)).board.cards[0]!.visible).toBe(true);
    if (enabled) expect((await media(page)).oscillators).toBeGreaterThan(before);
    else expect((await media(page)).oscillators).toBe(before);
});

test('reduced motion removes card transitions and spark animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await prepareMemory(page);
    const cards = (await memoryState(page)).board.cards;
    const partner = cards.findIndex((c, i) => i !== 0 && c.motif === cards[0]!.motif);
    await page.locator('[data-card="0"]').click(); await page.locator(`[data-card="${partner}"]`).click();
    const styles = await page.locator('[data-card="0"] .memory-card-face, [data-card="0"] .memory-spark').evaluateAll(elements => elements.map(el => { const s = getComputedStyle(el); return { animation: s.animationName, transition: s.transitionDuration }; }));
    expect(styles).toHaveLength(2); for (const style of styles) { expect(style.animation).toBe('none'); expect(style.transition).toBe('0s'); }
});
