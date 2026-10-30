import { test, expect, media, clearSpeech } from './helpers';
import { dragSound, prepareSounds, soundAnswer, sounds, soundsState, solveSoundQuestion } from './sons-helpers';
for (const locale of ['fr', 'en']) for (const level of [1, 5, 7, 9]) test(`${locale} level ${level}: native audio, independent full round, retry/hint and persisted unlock`, async ({ page }) => {
    await prepareSounds(page, level, locale);
    const entry = (await media(page)).speech;
    const entryInitial = (await page.locator('.sons-prompt').getAttribute('data-initial'))!;
    expect(entry.length).toBeGreaterThan(0);
    if (level === 7) expect(entry[0]).toBe(sounds[locale]![entryInitial]);
    else if (level === 1) expect(entry[0]).toBe(await page.locator('.sons-prompt [data-word]').getAttribute('data-word'));
    else expect(entry).toContain(await page.locator('.instruction p').innerText());
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
                expect((await media(page)).rates.slice(-3)).toEqual([0.6, 0.6, 0.6]);
                const picture = pictures[0]!;
                expect((await media(page)).speech).toContain(`${sounds[locale]![picture.initial]!}… ${picture.word}`);
            } else {
                const right = await soundAnswer(page), count = await page.locator('[data-answer]').count(), wrong = (right + 1) % count;
                await page.locator(`[data-answer="${wrong}"]`).click();
                expect((await soundsState(page)).sons.errors).toBe(1); await expect(page.locator('[data-answer].shape-hint')).toHaveCount(0);
                await clearSpeech(page); await page.locator(`[data-answer="${wrong}"]`).click();
                await expect(page.locator(`[data-answer="${right}"].shape-hint`)).toBeVisible();
                expect((await media(page)).rates.slice(-3)).toEqual([0.6, 0.6, 0.6]);
                const hintLog = (await media(page)).speech;
                expect(hintLog.some(part => part.startsWith(`${sounds[locale]![initial]!}… `))).toBe(true);
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
            // Resolve the actual composited background through transparent ancestors.
            const contrasts = await page.locator('[data-letter]').evaluateAll(elements => elements.map(el => {
                const ink = getComputedStyle(el).color;
                let node: Element | null = el, background = '';
                while (node) {
                    const color = getComputedStyle(node).backgroundColor;
                    if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') { background = color; break; }
                    node = node.parentElement;
                }
                return { ink, background };
            }));
            const luminance = (rgb: number[]): number => rgb.map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i]!, 0);
            for (const { ink, background } of contrasts) {
                expect(background).not.toBe('');
                const values = [ink, background].map(color => luminance(color.match(/\d+(?:\.\d+)?/g)!.slice(0, 3).map(Number)));
                expect((Math.max(...values) + .05) / (Math.min(...values) + .05)).toBeGreaterThanOrEqual(4.5);
            }
            const rectangles = await page.locator('.sound-choice').evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }));
            for (const [i, a] of rectangles.entries()) for (const b of rectangles.slice(i + 1)) expect(a.right + 8 <= b.left || b.right + 8 <= a.left || a.bottom + 8 <= b.top || b.bottom + 8 <= a.top).toBe(true);
        }
        await page.evaluate(() => { const s = (window as unknown as { __kid: { state: () => { sons: { errors: number } } } }).__kid.state(); s.sons.errors = 999; }); expect((await soundsState(page)).sons.errors).toBe(0);
    }
});
for (const level of [1, 5, 9]) test(`level ${level}: hint really pulses and respects reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await prepareSounds(page, level);
    if (level === 9) { await dragSound(page, 0, false); await dragSound(page, 0, false); }
    else {
        const right = await soundAnswer(page), count = await page.locator('[data-answer]').count();
        await page.locator(`[data-answer="${(right + 1) % count}"]`).click();
        await page.locator(`[data-answer="${(right + 1) % count}"]`).click();
    }
    const hints = page.locator('.shape-hint');
    expect(await hints.count()).toBeGreaterThan(0);
    for (const hint of await hints.all()) {
        const animation = await hint.evaluate(el => {
            const style = getComputedStyle(el);
            return { name: style.animationName, duration: style.animationDuration, iterations: style.animationIterationCount, state: style.animationPlayState, frames: el.getAnimations().map(a => a.effect instanceof KeyframeEffect ? a.effect.getKeyframes() : []) };
        });
        expect(animation.name).toBe('shape-pulse'); expect(animation.duration).toBe('1s');
        expect(animation.iterations).toBe('infinite'); expect(animation.state).toBe('running');
        expect(animation.frames.length).toBeGreaterThan(0);
        expect(animation.frames.flat().some(frame => typeof frame.filter === 'string' && frame.filter.includes('drop-shadow'))).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const hint of await hints.all()) expect(await hint.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});
for (const method of ['tap', 'keyboard'] as const) test(`sorting by image selection then box with ${method}`, async ({ page }) => {
    await prepareSounds(page, 9);
    for (let piece = 0; piece < 3; piece++) {
        const image = page.locator(`[data-sound-piece="${piece}"]`);
        const initial = (await image.locator('svg').getAttribute('data-initial'))!;
        const box = page.locator('[data-sound-box]').filter({ has: page.locator(`[data-letter="${initial}"]`) });
        if (method === 'keyboard') {
            await image.focus(); await page.keyboard.press('Enter');
            await box.focus(); await page.keyboard.press('Space');
        } else if (test.info().project.use.hasTouch) { await image.tap(); await expect.poll(async () => (await soundsState(page)).selection).toBe(piece); await box.tap(); }
        else { await image.click(); await box.click(); }
        await expect.poll(async () => (await soundsState(page)).sons.placed).toEqual(Array.from({ length: piece + 1 }, (_, i) => i));
        expect((await soundsState(page)).sons.errors).toBe(0);
    }
    await expect(page.locator('#continue')).toBeVisible();
});
test('sorting captures an exterior drop within 24px, rejects one beyond it', async ({ page }) => {
    await prepareSounds(page, 9);
    const image = page.locator('[data-sound-piece="0"]');
    const initial = (await image.locator('svg').getAttribute('data-initial'))!;
    const box = page.locator('[data-sound-box]').filter({ has: page.locator(`[data-letter="${initial}"]`) });
    const dropOutside = async (distance: number): Promise<void> => {
        const a = (await image.boundingBox())!, b = (await box.boundingBox())!;
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height + distance, { steps: 12 }); await page.mouse.up();
    };
    await dropOutside(26); expect((await soundsState(page)).sons.placed).toEqual([]);
    expect((await soundsState(page)).sons.errors).toBe(0);
    await dropOutside(18); expect((await soundsState(page)).sons.placed).toEqual([0]);
    expect((await soundsState(page)).sons.errors).toBe(0);
});

for (const rapid of [false, true]) test(`sorting two images into the same box with ${rapid ? 'uninterrupted' : 'observed'} touches`, async ({ page }) => {
    test.skip(!test.info().project.use.hasTouch, 'Requires the mobile touch project.');
    await prepareSounds(page, 9);
    const images = await page.locator('[data-sound-piece]').evaluateAll(elements => elements.map(el => ({
        piece: Number(el.getAttribute('data-sound-piece')),
        label: el.querySelector('svg')!.getAttribute('data-initial')!,
        x: el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2,
        y: el.getBoundingClientRect().y + el.getBoundingClientRect().height / 2
    })));
    const second = images.find((image, i) => images.slice(0, i).some(other => other.label === image.label))!;
    const first = images.find(image => image.label === second.label)!;
    const box = page.locator('[data-sound-box]').filter({ has: page.locator('[data-letter="' + first.label + '"]') });
    const r = (await box.boundingBox())!, x = r.x + r.width / 2, y = r.y + r.height / 2;
    if (rapid) {
        // Protocol calls only: no polling, locator actionability or delay between touches.
        await page.touchscreen.tap(first.x, first.y);
        await page.touchscreen.tap(x, y);
        await page.touchscreen.tap(second.x, second.y);
        await page.touchscreen.tap(x, y);
    } else {
        await page.touchscreen.tap(first.x, first.y);
        await expect.poll(async () => (await soundsState(page)).selection).toBe(first.piece);
        await page.touchscreen.tap(x, y);
        await expect.poll(async () => (await soundsState(page)).sons.placed).toEqual([first.piece]);
        await page.touchscreen.tap(second.x, second.y);
        await expect.poll(async () => (await soundsState(page)).selection).toBe(second.piece);
        await page.touchscreen.tap(x, y);
    }
    await expect.poll(async () => (await soundsState(page)).sons.placed).toEqual([first.piece, second.piece]);
    expect((await soundsState(page)).sons.errors).toBe(0);
});
