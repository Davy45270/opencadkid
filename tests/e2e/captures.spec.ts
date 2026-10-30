import { solveMemory } from './paires-helpers';
import { test, passGate, solveRound } from './helpers';
test.skip(process.env.CAPTURES !== '1', 'Set CAPTURES=1 to refresh the README screenshots.');
test('mobile screenshots in both languages and counting modes', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('opencadkid.v1', JSON.stringify({ version: 1, locale: 'fr', voice: false, sound: false, records: { 1: 3, 2: 3, 3: 3 } })));
    await page.goto('/'); await page.screenshot({ path: 'docs/captures/accueil-fr.png' });
    await page.locator('#parents').click(); await passGate(page); await page.locator('#language').selectOption('en'); await page.locator('#close').click();
    await page.screenshot({ path: 'docs/captures/accueil-en.png' });
    await page.locator('#parents').click(); await passGate(page); await page.locator('#language').selectOption('fr'); await page.locator('#close').click();
    await page.locator('[data-game="compter"]').click(); await page.locator('[data-level="1"]').click();
    await page.screenshot({ path: 'docs/captures/compter-combien.png' });
    await solveRound(page); await page.screenshot({ path: 'docs/captures/compter-etoiles.png' });
    await page.locator('#back').click(); await page.locator('[data-game="compter"]').click(); await page.locator('[data-level="4"]').click();
    await page.screenshot({ path: 'docs/captures/compter-remplir.png' });
    await page.locator('#back').click(); await page.locator('[data-game="paires"]').click(); await page.locator('[data-level="1"]').click();
    await page.waitForTimeout(2100); await page.screenshot({ path: 'docs/captures/paires-plateau.png' });
    await solveMemory(page); await page.screenshot({ path: 'docs/captures/paires-fin.png' });
});
