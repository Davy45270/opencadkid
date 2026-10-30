import { test, expect, media, clearSpeech } from './helpers';
import { dragSound, prepareSounds, soundAnswer, sounds, soundsState, solveSoundQuestion } from './sons-helpers';
for (const locale of ['fr', 'en']) for (const level of [1, 5, 7, 9]) test(`${locale} level ${level}: native audio, independent full round, retry/hint and persisted unlock`, async ({ page }) => {
    await prepareSounds(page, level, locale);
    const records = await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.v1')!) as { records: object; pairesRecords?: object; formesRecords?: object });
    for (let i = 0; i < 6; i++) {
        await clearSpeech(page); await page.locator('#listen').click();
        const log = (await media(page)).speech, cue = page.locator('.sons-prompt');
        const initial = (await cue.getAttribute('data-initial'))!;
        if (level === 7) { expect(log[0]).toBe(sounds[locale]![initial]); expect(await page.locator('[data-word]').count()).toBe(0); }
        const pictures = await page.locator('.sons-prompt svg[data-word], .sons-grid svg[data-word]').evaluateAll(elements => elements.map(el => ({ word: el.getAttribute('data-word')!, initial: el.getAttribute('data-initial')! })));
        for (const picture of pictures) {
            const position = log.indexOf(picture.word);
            expect(position).toBeGreaterThanOrEqual(0); expect(log[position + 1]).toBe(sounds[locale]![picture.initial]);
        }
        // Check actual text nodes, independently of accessible labels and data attributes.
        const printed = await page.locator('#app').innerText();
        for (const picture of pictures) expect(printed.toLowerCase()).not.toMatch(new RegExp(`\\b${picture.word}\\b`, 'i'));
        if (i === 0) {
            if (level === 9) {
                await dragSound(page, 0, false); expect((await soundsState(page)).sons.placed).toEqual([]);
                expect((await soundsState(page)).sons.errors).toBe(1); await expect(page.locator('.shape-hint')).toHaveCount(0);
                await clearSpeech(page); await dragSound(page, 0, false);
                await expect(page.locator('[data-sound-box].shape-hint')).toHaveCount(1);
                const picture = pictures[0]!;
                expect((await media(page)).speech).toContain(`${sounds[locale]![picture.initial]!}… ${sounds[locale]![picture.initial]!}… ${picture.word}`);
            } else {
                const right = await soundAnswer(page), count = await page.locator('[data-answer]').count(), wrong = (right + 1) % count;
                await page.locator(`[data-answer="${wrong}"]`).click();
                expect((await soundsState(page)).sons.errors).toBe(1); await expect(page.locator('[data-answer].shape-hint')).toHaveCount(0);
                await clearSpeech(page); await page.locator(`[data-answer="${wrong}"]`).click();
                await expect(page.locator(`[data-answer="${right}"].shape-hint`)).toBeVisible();
                const hintLog = (await media(page)).speech;
                expect(hintLog.some(part => part.startsWith(`${sounds[locale]![initial]!}… ${sounds[locale]![initial]!}… `))).toBe(true);
            }
        }
        await solveSoundQuestion(page);
    }
    expect((await media(page)).oscillators).toBeGreaterThan(0);
    await expect(page.locator('.stars')).toHaveText('★★★'); expect((await soundsState(page)).sons.firstTry).toBe(5);
    await page.reload(); await page.locator('[data-game="sons"]').click(); await expect(page.locator(`[data-level="${level + 1}"]`)).toBeEnabled();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.v1')!) as { sonsRecords: Record<number, number>; records: object; pairesRecords?: object; formesRecords?: object });
    expect(saved.sonsRecords[level]).toBe(3); expect(saved.records).toEqual(records.records); expect(saved.pairesRecords ?? {}).toEqual(records.pairesRecords ?? {}); expect(saved.formesRecords ?? {}).toEqual(records.formesRecords ?? {});
});
test('all levels: 72px targets and images, 56px letters, AA contrast, detached hook and no overflow at 320–1280', async ({ page }) => {
    test.setTimeout(180_000); await prepareSounds(page, 10);
    for (let level = 1; level <= 10; level++) {
        await page.locator('#back').click(); await page.locator('[data-game="sons"]').click(); await page.locator(`[data-level="${level}"]`).click();
        for (const width of [320, 321, 360, 390, 480, 699, 700, 768, 939, 940, 1024, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            for (const r of (await soundsState(page)).targets) { expect(r.width).toBeGreaterThanOrEqual(48); expect(r.height).toBeGreaterThanOrEqual(48); }
            const cards = await page.locator('.sound-choice, [data-sound-box], svg[data-word]').evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
            for (const r of cards) { expect(r.width).toBeGreaterThanOrEqual(72); expect(r.height).toBeGreaterThanOrEqual(72); }
            const letters = await page.locator('[data-letter]').evaluateAll(elements => elements.map(el => ({ size: parseFloat(getComputedStyle(el).fontSize), color: getComputedStyle(el).color, height: el.getBoundingClientRect().height, text: el.textContent, initial: el.getAttribute('data-letter') })));
            for (const l of letters) { expect(l.size).toBeGreaterThanOrEqual(56); expect(l.height).toBeGreaterThanOrEqual(56); expect(l.color).toBe('rgb(36, 61, 48)'); expect(l.text).toBe([4, 6, 8, 10].includes(level) ? l.initial!.toLowerCase() : l.initial); }
            // Independent sRGB contrast for the letter ink against both card and box fills.
            const luminance = (rgb: number[]): number => rgb.map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i]!, 0);
            for (const fill of [[255, 253, 246], [237, 241, 220]]) expect((luminance(fill) + .05) / (luminance([36, 61, 48]) + .05)).toBeGreaterThanOrEqual(4.5);
            const rectangles = await page.locator('.sound-choice').evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }));
            for (const [i, a] of rectangles.entries()) for (const b of rectangles.slice(i + 1)) expect(a.right + 8 <= b.left || b.right + 8 <= a.left || a.bottom + 8 <= b.top || b.bottom + 8 <= a.top).toBe(true);
        }
        await page.evaluate(() => { const s = (window as unknown as { __kid: { state: () => { sons: { errors: number } } } }).__kid.state(); s.sons.errors = 999; }); expect((await soundsState(page)).sons.errors).toBe(0);
    }
});
