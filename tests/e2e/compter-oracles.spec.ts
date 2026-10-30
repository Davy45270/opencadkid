import { test, expect, prepare, media, clearSpeech, visibleAnswer, solveQuestion, solveRound } from './helpers';
import type { Page } from '@playwright/test';

async function freezeClock(page: Page): Promise<void> {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const elapsed = await page.evaluate(() => performance.now());
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    // Keep the transfer debounce past any gesture made before installing the clock.
    await page.clock.runFor(elapsed + 1000);
}
async function instructionIsSpoken(page: Page): Promise<void> {
    const instruction = await page.locator('.instruction p').innerText();
    expect((await media(page)).speech).toContain(instruction);
}
async function seekMultiple(page: Page, mode: 'combien' | 'remplir'): Promise<number> {
    const quantity = async (): Promise<number> => mode === 'combien'
        ? page.locator('.objects [data-object]').count()
        : Number(await page.locator('.instruction-pic b').innerText());
    if (await quantity() === 1) await solveQuestion(page);
    const n = await quantity();
    expect(n).toBeGreaterThan(1);
    return n;
}

for (const [mode, level] of [['combien', 3], ['remplir', 5]] as const) {
    test(`${mode}: voice unlock, every question instruction and listen replay`, async ({ page }) => {
        await prepare(page, level);
        for (let i = 0; i < 6; i++) {
            await instructionIsSpoken(page);
            const instruction = await page.locator('.instruction p').innerText();
            await clearSpeech(page);
            await page.locator('#listen').click();
            expect((await media(page)).speech).toEqual([instruction]);
            await clearSpeech(page);
            await solveQuestion(page);
        }
    });
    test(`${mode}: hint speaks and highlights the complete count`, async ({ page }) => {
        await prepare(page, level);
        const n = await seekMultiple(page, mode);
        await freezeClock(page);
        if (mode === 'remplir') {
            await page.locator('[data-reserve]').first().click();
            await page.clock.runFor(205);
        }
        const wrong = mode === 'combien'
            ? page.locator(`[data-answer]:not([data-answer="${await visibleAnswer(page)}"])`).first()
            : page.locator('#check');
        await clearSpeech(page);
        await wrong.click();
        expect((await media(page)).speech).toEqual(['Essaie encore !']);
        await clearSpeech(page);
        await wrong.click();
        expect((await media(page)).speech).toEqual(['Essaie encore !']);
        await clearSpeech(page);
        for (let i = 0; i < n; i++) {
            await page.clock.runFor(i === 0 ? 1100 : 850);
            expect((await media(page)).speech).toEqual(Array.from({ length: i + 1 }, (_, k) => String(k + 1)));
            const highlighted = mode === 'combien'
                ? page.locator(`[data-object="${i}"].counting`)
                : i === 0 ? page.locator('#basket [data-basket="0"].counting') : page.locator(`#reserve [data-reserve="${i - 1}"].counting`);
            await expect(highlighted).toHaveCount(1);
            await expect(page.locator(mode === 'combien' ? '[data-object].counting' : '.token.counting')).toHaveCount(1);
        }
    });
}

test('remplir: moving during a hint restarts with the new basket, then marks excess', async ({ page }) => {
    await prepare(page, 5);
    const target = await seekMultiple(page, 'remplir');
    await freezeClock(page);
    await page.locator('[data-reserve]').first().click();
    await page.clock.runFor(205);
    await page.locator('#check').click();
    await page.locator('#check').click();
    await page.clock.runFor(1100);
    await expect(page.locator('#basket [data-basket="0"].counting')).toHaveCount(1);
    await page.locator('[data-reserve]').first().click();
    await clearSpeech(page);
    for (let i = 0; i < target; i++) {
        await page.clock.runFor(i === 0 ? 1100 : 850);
        expect((await media(page)).speech).toEqual(Array.from({ length: i + 1 }, (_, k) => String(k + 1)));
        await expect(page.locator(i < 2 ? `#basket [data-basket="${i}"].counting` : `#reserve [data-reserve="${i - 2}"].counting`)).toHaveCount(1);
    }
    // Transfers keep the hint active and restart it, even when the basket exceeds the target.
    for (let n = 2; n < target + 1; n++) {
        await page.locator('[data-reserve]').first().click();
        await page.clock.runFor(205);
    }
    await clearSpeech(page);
    // The last transfer's 205 ms have already elapsed.
    await page.clock.runFor(895);
    for (let i = 1; i < target + 1; i++) await page.clock.runFor(850);
    expect((await media(page)).speech).toEqual(Array.from({ length: target + 1 }, (_, k) => String(k + 1)));
    await expect(page.locator('#reserve .counting')).toHaveCount(0);
    await page.clock.runFor(850);
    expect((await media(page)).speech.at(-1)).toBe('1 en trop');
    await expect(page.locator(`#basket [data-basket="${target}"].counting`)).toHaveCount(1);
    await expect(page.locator('#basket .counting')).toHaveCount(1);
});

test('plus: hint counts every object in the correct basket', async ({ page }) => {
    await prepare(page, 6);
    const counts = await page.locator('.comparison').evaluateAll(cards => cards.map(card => card.querySelectorAll('[data-object]').length));
    const correct = await visibleAnswer(page), n = Math.max(...counts);
    await freezeClock(page);
    await page.locator(`[data-answer="${1 - correct}"]`).click();
    await page.locator(`[data-answer="${1 - correct}"]`).click();
    await clearSpeech(page);
    for (let i = 0; i < n; i++) {
        await page.clock.runFor(i === 0 ? 1100 : 850);
        await expect(page.locator(`[data-answer="${correct}"] [data-object="${i}"].counting`)).toHaveCount(1);
    }
    expect((await media(page)).speech).toEqual(Array.from({ length: n }, (_, k) => String(k + 1)));
});

test('level 8: displayed and spoken instruction says le moins throughout play', async ({ page }) => {
    await prepare(page, 8);
    for (let i = 0; i < 6; i++) {
        await expect(page.locator('.instruction p')).toHaveText('Où y en a-t-il le moins ?');
        expect((await media(page)).speech).toContain('Où y en a-t-il le moins ?');
        await clearSpeech(page);
        await solveQuestion(page);
    }
    await expect(page.locator('#next')).toHaveCount(0);
});

for (const sound of [true, false]) test(`correct answer produces oscillators only when sound=${sound}`, async ({ page }) => {
    await prepare(page, 1, { sound });
    expect((await media(page)).oscillators).toBe(0);
    await page.locator(`[data-answer="${await visibleAnswer(page)}"]`).click();
    if (sound) expect((await media(page)).oscillators).toBeGreaterThan(0);
    else expect((await media(page)).oscillators).toBe(0);
});

for (const width of [390, 1280]) for (const level of [1, 2, 3, 6, 7, 8]) test(`width ${width}, level ${level}: rendered objects have real size, stay inside and never overlap`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await prepare(page, level, { voice: false, sound: false });
    for (let question = 0; question < 6; question++) {
        await visibleAnswer(page);
        const scenes = await page.locator('.objects').evaluateAll(elements => elements.map(scene => {
            const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
            return { bounds: rect(scene), objects: [...scene.querySelectorAll('[data-object]>svg')].map(rect) };
        }));
        for (const scene of scenes) {
            expect(scene.objects.length).toBeGreaterThan(0);
            for (const [i, object] of scene.objects.entries()) {
                expect(object.width).toBeGreaterThanOrEqual(40);
                expect(object.height).toBeGreaterThanOrEqual(40);
                expect(object.width).toBeLessThanOrEqual(64);
                expect(object.height).toBeLessThanOrEqual(64);
                expect(object.x).toBeGreaterThanOrEqual(scene.bounds.x - 2);
                expect(object.y).toBeGreaterThanOrEqual(scene.bounds.y - 2);
                expect(object.right).toBeLessThanOrEqual(scene.bounds.right + 2);
                expect(object.bottom).toBeLessThanOrEqual(scene.bounds.bottom + 2);
                for (const other of scene.objects.slice(i + 1)) {
                    const overlapX = Math.min(object.right, other.right) - Math.max(object.x, other.x);
                    const overlapY = Math.min(object.bottom, other.bottom) - Math.max(object.y, other.y);
                    expect(overlapX <= 2 || overlapY <= 2).toBe(true);
                }
            }
        }
        await solveQuestion(page);
    }
});

test('counting scene and all answer constellations agree throughout a round', async ({ page }) => {
    await prepare(page, 3);
    await solveRound(page);
});

for (const level of [4, 5]) test(`level ${level}: reserve and basket objects fit without overlap and validation is at least 72 px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepare(page, level, { voice: false, sound: false });
    for (let i = 0; i < 2; i++) {
        await page.locator('[data-reserve]').first().click();
        await page.waitForTimeout(205);
    }
    await expect(page.locator('#basket .token')).toHaveCount(2);
    const objects = await page.locator('.token svg').evaluateAll(elements => elements.map(el => {
        const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
        return { ...rect(el), bounds: rect(el.closest('.token-grid')!) };
    }));
    expect(objects.length).toBeGreaterThanOrEqual(3);
    for (const [i, object] of objects.entries()) {
        expect(object.width).toBeGreaterThanOrEqual(40);
        expect(object.height).toBeGreaterThanOrEqual(40);
        expect(object.width).toBeLessThanOrEqual(64);
        expect(object.height).toBeLessThanOrEqual(64);
        expect(object.x).toBeGreaterThanOrEqual(object.bounds.x - 2);
        expect(object.y).toBeGreaterThanOrEqual(object.bounds.y - 2);
        expect(object.right).toBeLessThanOrEqual(object.bounds.right + 2);
        expect(object.bottom).toBeLessThanOrEqual(object.bounds.bottom + 2);
        for (const other of objects.slice(i + 1)) {
            expect(Math.min(object.right, other.right) - Math.max(object.x, other.x) <= 2
                || Math.min(object.bottom, other.bottom) - Math.max(object.y, other.y) <= 2).toBe(true);
        }
    }
    const check = await page.locator('#check').boundingBox();
    expect(check!.width).toBeGreaterThanOrEqual(72);
    expect(check!.height).toBeGreaterThanOrEqual(72);
    for (const target of await page.locator('button').evaluateAll(buttons => buttons.map(button => {
        const r = button.getBoundingClientRect(); return { width: r.width, height: r.height };
    }))) {
        expect(target.width).toBeGreaterThanOrEqual(48);
        expect(target.height).toBeGreaterThanOrEqual(48);
    }
});
