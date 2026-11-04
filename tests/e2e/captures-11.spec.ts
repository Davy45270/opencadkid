import { test, expect } from './helpers';
import { openGame, probe } from './gouter-helpers';
import { prepareStudio } from './atelier-helpers';
test.skip(process.env.CAPTURES !== '1', 'Set CAPTURES=1 to refresh the README screenshots.');
test('mobile screenshots of the snack game and the studio novelties', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Phone screenshots only');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem('opencadkid.gouter.v1', JSON.stringify({ 1: 3, 2: 3, 3: 2, 4: 3, 5: 1, 6: 2, 7: 3, 8: 1, 9: 2, 10: 3, 11: 1, 12: 2, 13: 3, 14: 1, 15: 2 })));
    await openGame(page);
    await page.screenshot({ path: 'docs/captures/gouter-niveaux.png' });
    for (const [level, name] of [[1, 'gouter-premier'], [9, 'gouter-crochet'], [16, 'gouter-final']] as const) {
        await page.locator(`[data-gouter-level="${level}"]`).click();
        await expect.poll(async () => (await probe(page)).state?.tick ?? 0).toBeGreaterThan(10);
        await page.screenshot({ path: `docs/captures/${name}.png` });
        await page.locator('#back').click();
    }
    await page.locator('[data-gouter-level="1"]').click();
    const p = await probe(page), r = p.state!.ropes[0]!, z = p.zone!;
    await page.mouse.click(z.x + (r.x + p.state!.treat.x) / 2 * z.width / 320, z.y + (r.y + p.state!.treat.y) / 2 * z.height / 440);
    await expect.poll(async () => (await probe(page)).state!.status, { timeout: 15_000 }).toBe('won');
    await page.screenshot({ path: 'docs/captures/gouter-miam.png' });
    await prepareStudio(page);
    await page.locator('#atelier-picture').selectOption('poisson');
    const colours = ['#f4a269', '#f6d76d', '#72b8ed', '#ed9fc7', '#58ad87', '#ab83cc'];
    for (const [i, zone] of ['body', 'tail', 'top-fin', 'bottom-fin', 'side-fin', 'gill'].entries()) { await page.locator(`[data-color="${colours[i]!}"]`).click(); await page.locator(`[data-zone="${zone}"]`).dispatchEvent('click'); }
    await page.locator('[data-color="#62c9c5"]').click(); const s = (await page.locator('.atelier-sheet').boundingBox())!; await page.mouse.click(s.x + 6, s.y + s.height / 2);
    await page.locator('.atelier-tabs [data-tool="draw"]').click(); await page.locator('[data-color="#f6d76d"]').click(); await page.locator('[data-width="18"]').click();
    for (const [x0, y0] of [[60, 230], [250, 60]] as const) { await page.mouse.move(s.x + x0, s.y + y0); await page.mouse.down(); for (let i = 0; i < 12; i++) await page.mouse.move(s.x + x0 + 4 * Math.sin(i), s.y + y0 - i * 3); await page.mouse.up(); }
    await page.screenshot({ path: 'docs/captures/atelier-fond-pinceau.png' });
    await page.locator('[data-tool="play"]').click();
    await page.locator('svg.atelier-playing').evaluate(svg => { (svg as SVGSVGElement).pauseAnimations(); (svg as SVGSVGElement).setCurrentTime(0.6); });
    await page.screenshot({ path: 'docs/captures/atelier-anime.png' });
});
