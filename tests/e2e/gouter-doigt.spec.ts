import { test, expect, touchFrame } from './helpers';
import { openGame, probe, ropeMiddle, screen, untilTick } from './gouter-helpers';
import { solve } from '../../src/engines/gouter/solver';
import type { CDPSession } from '@playwright/test';

/** Small deterministic generator: the same noise on every run. */
function noise(seed: number): () => number { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 * 2 - 1; }; }
async function finger(cdp: CDPSession, page: import('@playwright/test').Page, points: { x: number; y: number }[]): Promise<void> {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...points[0]! }] }); await touchFrame(page);
    for (const p of points.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...p }] }); await touchFrame(page); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await touchFrame(page);
}

for (const [level, gesture] of [[1, 'tap'], [3, 'swipe'], [5, 'swipe'], [2, 'tap'], [8, 'tap'], [12, 'swipe']] as const) {
    test(`level ${level}: a noisy ${gesture} of a real finger follows the solver plan to Boubou's mouth`, async ({ page, context, isMobile }) => {
        test.skip(!isMobile, 'Mobile touch only');
        await page.addInitScript(id => localStorage.setItem('opencadkid.gouter.v1', JSON.stringify(Object.fromEntries(Array.from({ length: id - 1 }, (_, i) => [i + 1, 1])))), level);
        await openGame(page); await page.locator(`[data-gouter-level="${level}"]`).tap();
        const random = noise(level * 7919), cdp = await context.newCDPSession(page);
        const scroll = await page.evaluate(() => [scrollX, scrollY]);
        try {
            for (const action of solve(level)!.plan) {
                await untilTick(page, action.tick - 2);
                const p = await probe(page); expect(p.state!.status).toBe('play');
                const at = action.kind === 'pop' ? p.state!.treat : ropeMiddle(p.state!, action.index);
                const centre = screen(p, at.x, at.y), jitter = (): number => random() * 6;
                if (gesture === 'tap' || action.kind === 'pop') await finger(cdp, page, [{ x: centre.x + jitter(), y: centre.y + jitter() }, { x: centre.x + jitter() / 3, y: centre.y + jitter() / 3 }]);
                else {
                    // Swipe across the rope, perpendicular to it, with a trembling hand.
                    const r = p.state!.ropes[action.index]!, dx = p.state!.treat.x - r.x, dy = p.state!.treat.y - r.y, n = Math.hypot(dx, dy) || 1;
                    const nx = -dy / n, ny = dx / n, steps = 10;
                    const points = Array.from({ length: steps + 1 }, (_, i) => { const t = (i / steps - .5) * 2 * 40; return screen(p, at.x + nx * t + random() * 3, at.y + ny * t + random() * 3); });
                    await finger(cdp, page, points);
                }
                await expect.poll(async () => { const s = (await probe(page)).state!; return action.kind === 'pop' ? s.bubbles[action.index]!.state === 'popped' : s.ropes[action.index]!.cut; }).toBe(true);
            }
            await expect.poll(async () => (await probe(page)).state!.status, { timeout: 20_000 }).toBe('won');
            const s = (await probe(page)).state!;
            // One gesture, one action: no rope was cut twice and nothing else was cut by accident.
            expect(s.actions).toBe(solve(level)!.plan.length);
            expect(await page.evaluate(() => [scrollX, scrollY])).toEqual(scroll);
        } finally { await cdp.detach(); }
    });
}

test('a second finger resting on the play area cuts nothing', async ({ page, context, isMobile }) => {
    test.skip(!isMobile, 'Mobile touch only');
    await openGame(page); await page.locator('[data-gouter-level="1"]').tap();
    const p = await probe(page), m = ropeMiddle(p.state!, 0), primary = screen(p, 30, 420), second = screen(p, m.x, m.y);
    const cdp = await context.newCDPSession(page);
    try {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...primary }] }); await touchFrame(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...primary }, { id: 2, ...second }] }); await touchFrame(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ id: 2, ...second }] }); await touchFrame(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await touchFrame(page);
    } finally { await cdp.detach(); }
    const s = (await probe(page)).state!; expect(s.ropes[0]!.cut).toBe(false); expect(s.actions).toBe(0); expect(s.status).toBe('play');
});
