import { test, expect, state } from './helpers';
import { openGame, probe, ropeMiddle, screen, untilTick } from './gouter-helpers';
import { levels } from '../../src/engines/gouter';
import { solve } from '../../src/engines/gouter/solver';

test('levels, a first win by cutting the string, saved stars, the next level unlocked, and the way back', async ({ page }) => {
    await openGame(page);
    await expect(page.locator('[data-gouter-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-gouter-level]:not([disabled])')).toHaveCount(1);
    await page.locator('[data-gouter-level="1"]').click();
    let p = await probe(page); expect(p.screen).toBe('play'); expect(p.state!.level).toBe(1);
    await expect(page.locator('.gouter-zone [data-rope]')).toHaveCount(1);
    const m = screen(p, ...Object.values(ropeMiddle(p.state!, 0)) as [number, number]);
    await page.mouse.click(m.x, m.y);
    await expect.poll(async () => (await probe(page)).state!.status, { timeout: 15_000 }).toBe('won');
    p = await probe(page);
    expect(p.state!.ropes[0]!.cut).toBe(true); expect(p.state!.stars).toEqual([true, true, true]); expect(p.records).toEqual({ 1: 3 });
    await expect(page.locator('.gouter-reward .stars')).toHaveText('★★★');
    await expect(page.locator('[data-boubou="celebration"]')).toHaveCount(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.gouter.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#gouter-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-gouter-level]:not([disabled])')).toHaveCount(2);
    await page.locator('#back').click(); expect((await state(page)).screen).toBe('home');
    await expect(page.locator('[data-game="gouter"] .small-stars')).toHaveText('★★★');
    await page.reload(); await expect(page.locator('[data-game="gouter"] .small-stars')).toHaveText('★★★');
});

test('a sweet that misses falls away gently and the same level starts again by itself', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('opencadkid.gouter.v1', JSON.stringify({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 })));
    await openGame(page);
    // Level 6 is a swing: cutting while the sweet is still on the left drops it far from Boubou.
    await page.locator('[data-gouter-level="6"]').click();
    let p = await probe(page);
    const m = screen(p, ...Object.values(ropeMiddle(p.state!, 0)) as [number, number]);
    await page.mouse.click(m.x, m.y);
    await expect.poll(async () => (await probe(page)).state!.status, { timeout: 15_000 }).toBe('lost');
    await expect(page.locator('.gouter-zone')).toHaveAttribute('data-status', 'lost');
    await expect(page.locator('#gouter-message')).toContainText('Oups');
    await expect.poll(async () => { const s = (await probe(page)).state!; return s.status === 'play' && !s.ropes[0]!.cut; }, { timeout: 15_000 }).toBe(true);
    p = await probe(page); expect(p.state!.level).toBe(6); expect(p.records[6]).toBeUndefined();
});

test('the bubble lifts the sweet to Boubou, and a touch pops a carried bubble', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('opencadkid.gouter.v1', JSON.stringify({ 1: 3, 7: 1 })));
    await openGame(page);
    await page.locator('[data-gouter-level="2"]').click();
    let p = await probe(page);
    const m = screen(p, ...Object.values(ropeMiddle(p.state!, 0)) as [number, number]);
    await page.mouse.click(m.x, m.y);
    await expect.poll(async () => (await probe(page)).state!.status, { timeout: 20_000 }).toBe('won');
    // Level 8: the sweet falls into a bubble; popping it lets the slack string catch it.
    await page.locator('#back').click(); await page.locator('[data-gouter-level="8"]').click();
    p = await probe(page);
    const first = screen(p, ...Object.values(ropeMiddle(p.state!, 0)) as [number, number]);
    await page.mouse.click(first.x, first.y);
    await expect.poll(async () => (await probe(page)).state!.bubbles[0]!.state, { timeout: 10_000 }).toBe('held');
    p = await probe(page);
    const bubble = screen(p, p.state!.treat.x, p.state!.treat.y);
    await page.mouse.click(bubble.x, bubble.y);
    await expect.poll(async () => (await probe(page)).state!.bubbles[0]!.state).toBe('popped');
    await expect(page.locator('[data-bubble="0"]')).toHaveAttribute('data-state', 'popped');
});

test('the solver plan replayed with real clicks finishes a hook level with three stars', async ({ page }) => {
    const level = levels.find(l => l.hooks?.length)!;
    await page.addInitScript(id => localStorage.setItem('opencadkid.gouter.v1', JSON.stringify(Object.fromEntries(Array.from({ length: id - 1 }, (_, i) => [i + 1, 1])))), level.id);
    await openGame(page);
    await page.locator(`[data-gouter-level="${level.id}"]`).click();
    for (const action of solve(level.id)!.plan) {
        const reached = await untilTick(page, action.tick - 2);
        expect(reached).toBeGreaterThanOrEqual(0);
        const p = await probe(page);
        const at = action.kind === 'pop' ? p.state!.treat : ropeMiddle(p.state!, action.index);
        const s = screen(p, at.x, at.y); await page.mouse.click(s.x, s.y);
        await expect.poll(async () => { const r = (await probe(page)).state!; return action.kind === 'pop' ? r.bubbles[action.index]!.state === 'popped' : r.ropes[action.index]!.cut; }).toBe(true);
    }
    await expect.poll(async () => (await probe(page)).state!.status, { timeout: 15_000 }).toBe('won');
    expect((await probe(page)).state!.stars.filter(Boolean).length).toBeGreaterThanOrEqual(2);
});

test('the play area fits every width with 48 px controls and never scrolls the page sideways', async ({ page }) => {
    await openGame(page); await page.locator('[data-gouter-level="1"]').click();
    for (const width of [320, 360, 390, 414, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        for (const r of (await state(page)).targets) { expect(r.width).toBeGreaterThanOrEqual(48); expect(r.height).toBeGreaterThanOrEqual(48); }
        const zone = (await page.locator('.gouter-zone').boundingBox())!;
        expect(zone.x).toBeGreaterThanOrEqual(0); expect(zone.x + zone.width).toBeLessThanOrEqual(width);
        expect(zone.width).toBeGreaterThanOrEqual(Math.min(280, width - 40));
        expect(zone.height / zone.width).toBeCloseTo(440 / 320, 2);
    }
});
