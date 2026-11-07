import { itemSvg } from '../../src/games/suites/items';
import type { Item } from '../../src/engines/suites';
import { test, expect, media, clearSpeech, state } from './helpers';
import { patternAnswer, patternDom, patternState, prepareSuites, solvePattern } from './suites-helpers';
for (const [level, mode, prompt] of [
    [1, 'suivant', 'Qu’est-ce qui vient après ?'], [7, 'trou', 'Qu’est-ce qui manque ?'],
    [9, 'deux-suivants', 'À toi de continuer ! Place les deux suivants.'], [10, 'croissant', 'Qu’est-ce qui vient après ?'],
    [13, 'decroissant', 'Qu’est-ce qui vient après ?'], [19, 'trou', 'Qu’est-ce qui manque ?'], [20, 'deux-suivants', 'À toi de continuer ! Place les deux suivants.']
] as const) test(`suites ${mode}${level > 10 ? ` (level ${level})` : ""}: DOM-only oracle, voice, retry, hint, six questions and reload`, async ({ page }) => {
    await prepareSuites(page, level); await expect(page.locator('.suites-zone')).toHaveAttribute('data-mode', mode);
    expect((await media(page)).speech).toContain(prompt); await clearSpeech(page);
    await page.locator('#listen').click(); expect((await media(page)).speech).toEqual([prompt]);
    const correct = await patternAnswer(page), wrong = (correct + 1) % await page.locator('[data-pattern-choice]').count();
    await page.locator(`[data-pattern-choice="${wrong}"]`).click();
    expect((await patternState(page)).suites.errors).toBe(1); await expect(page.locator('.suites-base')).toHaveCount(0);
    expect((await media(page)).speech).toContain('Essaie encore !'); await page.waitForTimeout(205);
    await page.locator(`[data-pattern-choice="${wrong}"]`).click();
    expect((await patternState(page)).suites.errors).toBe(2);
    const dom = await patternDom(page), highlighted = await page.locator('.suites-base').count();
    expect(highlighted).toBeGreaterThanOrEqual(2);
    const phrase = dom.slots.slice(0, highlighted).map(s => s.label).join(' ; ');
    expect((await media(page)).speech).toContain(phrase); expect((await media(page)).speech).toContain(`${phrase}…`);
    // Mutating the detached observation must not alter actual progress.
    await page.evaluate(() => { (window as unknown as { __kid: { state: () => { suites: { placed: number[] } } } }).__kid.state().suites.placed.push(999); });
    expect((await patternState(page)).suites.placed).toEqual([]);
    const sound = (await media(page)).oscillators;
    for (let n = 0; n < 6; n++) { expect((await patternState(page)).index).toBe(n); await solvePattern(page); }
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles');
    expect((await patternState(page)).suites.firstTry).toBe(5); expect((await media(page)).oscillators).toBeGreaterThan(sound);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.v1')!) as { suitesRecords: Record<number, number>; records: object });
    expect(saved.suitesRecords[level]).toBe(3); expect(saved.records).toEqual({});
    await page.reload(); await page.locator('[data-game="suites"]').click(); await expect(page.locator(`[data-level="${level}"]`)).toContainText('★★★');
    if (level < 20) await expect(page.locator(`[data-level="${level + 1}"]`)).toBeEnabled();
});
test('English, keyboard continuation, one-star completion unlocks, silent replay', async ({ page }) => {
    await prepareSuites(page, 9, 'en'); expect((await media(page)).speech).toContain('Your turn to continue! Place the next two.');
    for (let n = 0; n < 6; n++) {
        const wrong = (await patternAnswer(page) + 1) % 4;
        await page.locator(`[data-pattern-choice="${wrong}"]`).focus(); await page.keyboard.press('Enter');
        while (await page.locator('.suites-empty').count()) { await page.locator(`[data-pattern-choice="${await patternAnswer(page)}"]`).focus(); await page.keyboard.press('Space'); }
        await page.locator('#continue').click();
    }
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '1 star');
    await page.locator('#next').click(); expect((await patternState(page)).level).toBe(10);
    for (let n = 0; n < 6; n++) await solvePattern(page);
    // Level 10 is no longer the last one: the final-level controls are checked at level 20 below.
    await expect(page.locator('#next')).toBeVisible();
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { sound: boolean; voice: boolean }; s.sound = false; s.voice = false; localStorage.setItem('opencadkid.v1', JSON.stringify(s)); });
    await page.reload(); await page.locator('[data-game="suites"]').click(); await page.locator('[data-level="1"]').click(); await page.locator('#listen').click();
    await solvePattern(page); expect((await media(page)).speech).toEqual([]); expect((await media(page)).oscillators).toBe(0);
});
test('all levels: real targets, painted SVG geometry, two rows on phone, no overflow 320–1280', async ({ page }) => {
    test.setTimeout(360_000);
    for (let level = 1; level <= 20; level++) {
        await prepareSuites(page, level);
        for (const width of [320, 360, 390, 480, 699, 700, 940, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            for (const r of (await state(page)).targets) { expect(r.width).toBeGreaterThanOrEqual(r.id.startsWith('pattern-choice') ? 72 : 48); expect(r.height).toBeGreaterThanOrEqual(r.id.startsWith('pattern-choice') ? 72 : 48); }
            const sizes = await page.locator('.suites-slot, .suites-choice>svg').evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; }));
            for (const r of sizes) { expect(r.width).toBeGreaterThanOrEqual(48); expect(r.height).toBeGreaterThanOrEqual(48); }
            const geometry = await page.locator('.suites-slot[data-item]>svg, .suites-choice>svg').evaluateAll(elements => elements.map(el => {
                const svg = el as SVGSVGElement, m = svg.getScreenCTM()!, b = svg.getBBox();
                // Every painted path/circle has a 2-unit round stroke. Include it,
                // rather than confusing the viewport with the actual drawing.
                const a = new DOMPoint(b.x - 1, b.y - 1).matrixTransform(m), z = new DOMPoint(b.x + b.width + 1, b.y + b.height + 1).matrixTransform(m), r = svg.getBoundingClientRect();
                return { width: z.x - a.x, height: z.y - a.y, inside: a.x >= r.left - 1 && z.x <= r.right + 1 && a.y >= r.top - 1 && z.y <= r.bottom + 1, valid: !new DOMParser().parseFromString(svg.outerHTML, 'image/svg+xml').querySelector('parsererror') };
            }));
            for (const g of geometry) { expect(g.width).toBeGreaterThanOrEqual(48); expect(g.height).toBeGreaterThanOrEqual(48); expect(g.inside).toBe(true); expect(g.valid).toBe(true); }
            if (width === 390) {
                const rows = await page.locator('[data-slot]').evaluateAll(els => [...new Set(els.map(el => Math.round(el.getBoundingClientRect().top)))]);
                expect(rows.length).toBeLessThanOrEqual(2);
            }
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight && scrollX === 0 && scrollY === 0)).toBe(true);
        }
    }
});
for (const [level, file] of [[1, 'suites-question.png'], [7, 'suites-trou.png']] as const) test(`capture ${file}`, async ({ page }, info) => {
    test.skip(process.env.CAPTURES !== '1' || info.project.name !== 'mobile', 'Optional mobile capture for orchestrator review');
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepareSuites(page, level); await page.screenshot({ path: `docs/captures/${file}` });
});

test('empty active slot breathes normally and stops with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await prepareSuites(page, 1);
    const slot = page.locator('.suites-empty.suites-active');
    await expect(slot).toHaveCSS('animation-name', 'suites-breathe');
    await expect(slot).toHaveCSS('animation-duration', '1.8s');
    await expect(slot).toHaveCSS('animation-iteration-count', 'infinite');
    expect(await slot.evaluate(el => el.getAnimations().some(a => a.playState === 'running'))).toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(slot).toHaveCSS('animation-name', 'none');
    expect(await slot.evaluate(el => el.getAnimations().length)).toBe(0);
});
test('two-error base highlight persists through a partial double continuation', async ({ page }) => {
    await prepareSuites(page, 9);
    const correct = await patternAnswer(page), wrong = (correct + 1) % 4;
    await page.locator(`[data-pattern-choice="${wrong}"]`).click(); await page.waitForTimeout(205);
    await page.locator(`[data-pattern-choice="${wrong}"]`).click();
    const highlighted = await page.locator('.suites-base').evaluateAll(els => els.map(el => el.getAttribute('data-slot')));
    expect(highlighted).toEqual(['0', '1', '2']);
    await page.locator(`[data-pattern-choice="${correct}"]`).click();
    expect((await patternState(page)).suites.placed).toHaveLength(1);
    expect(await page.locator('.suites-base').evaluateAll(els => els.map(el => el.getAttribute('data-slot')))).toEqual(highlighted);
    await expect(page.locator('.suites-empty')).toHaveCount(1);
});

test('every silhouette and one to eight dots paint at least 48 px including stroke', async ({ page }) => {
    await prepareSuites(page, 1);
    const samples: Item[] = (['perle', 'triangle', 'carre', 'fleur', 'etoile', 'lune'] as const).map(shape => ({ shape, color: 'bleu', dots: 0 }));
    for (let dots = 1; dots <= 8; dots++) samples.push({ shape: 'points', color: 'bleu', dots });
    const slot = page.locator('.suites-slot[data-item]').first();
    for (const item of samples) {
        await slot.evaluate((el, markup) => { el.innerHTML = markup; }, itemSvg(item));
        const painted = await slot.locator('svg').evaluate(el => {
            const svg = el as SVGSVGElement, b = svg.getBBox(), m = svg.getScreenCTM()!, r = svg.getBoundingClientRect();
            const a = new DOMPoint(b.x - 1, b.y - 1).matrixTransform(m);
            const z = new DOMPoint(b.x + b.width + 1, b.y + b.height + 1).matrixTransform(m);
            return { width: z.x - a.x, height: z.y - a.y, inside: a.x >= r.left && a.y >= r.top && z.x <= r.right && z.y <= r.bottom };
        });
        expect(painted.width, `${item.shape}:${item.dots}`).toBeGreaterThanOrEqual(48);
        expect(painted.height, `${item.shape}:${item.dots}`).toBeGreaterThanOrEqual(48);
        expect(painted.inside, `${item.shape}:${item.dots}`).toBe(true);
    }
});
test('twenty levels: the list fits a 390×844 phone without horizontal overflow and the last level starts', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await prepareSuites(page, 20);
    await page.locator('#back').click(); await page.locator('[data-game="suites"]').click();
    await expect(page.locator('[data-level]')).toHaveCount(20);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const right = await page.locator('[data-level]').evaluateAll(els => Math.max(...els.map(el => el.getBoundingClientRect().right)));
    expect(right).toBeLessThanOrEqual(390);
    await page.locator('[data-level="20"]').click();
    expect((await patternState(page)).level).toBe(20);
    await expect(page.locator('[data-pattern-choice]')).toHaveCount(5);
    for (let n = 0; n < 6; n++) await solvePattern(page);
    await expect(page.locator('.stars')).toBeVisible(); await expect(page.locator('#next')).toHaveCount(0);
});
