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

async function stopClock(page: import('@playwright/test').Page): Promise<void> {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
}

test('preview lasts 1700–2300 ms and mismatch lasts 700–1300 ms on the simulated clock', async ({ page }) => {
    await stopClock(page);
    await page.addInitScript(() => localStorage.setItem('opencadkid.v1', JSON.stringify({ version: 1, locale: 'fr', voice: false, sound: false, records: {}, pairesRecords: { 1: 1, 2: 1 } })));
    await page.goto('/');
    for (const level of [1, 2, 3]) {
        await page.locator('[data-game="paires"]').click(); await page.locator(`[data-level="${level}"]`).click();
        expect((await memoryState(page)).board.preview).toBe(true);
        await page.clock.runFor(1699);
        expect((await memoryState(page)).board.preview).toBe(true);
        expect(await page.locator('.memory-card.face-up').count()).toBe([4, 6, 8][level - 1]);
        await page.clock.runFor(601);
        expect((await memoryState(page)).board.preview).toBe(false);
        expect(await page.locator('.memory-card.face-up').count()).toBe(0);
        const cards = (await memoryState(page)).board.cards;
        const wrong = cards.findIndex(c => c.motif !== cards[0]!.motif);
        await page.locator('[data-card="0"]').click(); await page.locator(`[data-card="${wrong}"]`).click();
        await page.clock.runFor(699);
        expect((await memoryState(page)).board.mismatch).toBe(true);
        expect(await page.locator('.memory-card.face-up').count()).toBe(2);
        await page.clock.runFor(601);
        expect((await memoryState(page)).board.mismatch).toBe(false);
        expect(await page.locator('.memory-card.face-up').count()).toBe(0);
        await page.locator('#back').click();
    }
});

test('three failures after discovery make exactly the known pair glow', async ({ page }) => {
    await stopClock(page); await prepareMemory(page, 4);
    const cards = (await memoryState(page)).board.cards;
    const a = 0, b = cards.findIndex((c, i) => i !== a && c.motif === cards[a]!.motif);
    const c = cards.findIndex(card => card.motif !== cards[a]!.motif);
    for (const [trial, [first, second]] of [[b, c], [a, c], [a, c], [a, c], [a, c]].entries()) {
        await page.locator(`[data-card="${first}"]`).click(); await page.locator(`[data-card="${second}"]`).click();
        if (trial < 4) expect(await page.locator('.memory-hint').count()).toBe(0);
        await page.clock.runFor(900);
    }
    const glowing = await page.locator('.memory-hint').evaluateAll(elements => elements.map(el => ({ index: Number((el as HTMLElement).dataset.card), outline: getComputedStyle(el).outlineStyle, filter: getComputedStyle(el).filter })));
    expect(glowing.map(card => card.index).sort((x, y) => x - y)).toEqual([a, b].sort((x, y) => x - y));
    for (const card of glowing) { expect(card.outline).toBe('solid'); expect(card.filter).not.toBe('none'); }
    await page.locator(`[data-card="${a}"]`).click(); await page.locator(`[data-card="${b}"]`).click();
    expect(await page.locator('.memory-hint').count()).toBe(0);
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) test(`closing keeps the same faces and respects motion=${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion }); await stopClock(page); await prepareMemory(page, 4);
    // Force CSS creation and pause in the mutation turn, before the next paint.
    await page.evaluate(() => {
        const pauseNew = (): void => {
            for (const animation of document.getAnimations()) {
                if (animation.playState === 'running') { animation.pause(); animation.currentTime = 0; }
            }
        };
        new MutationObserver(pauseNew).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    });
    const cards = (await memoryState(page)).board.cards;
    const wrong = cards.findIndex(c => c.motif !== cards[0]!.motif);
    await page.locator('[data-card="0"]').click(); await page.locator(`[data-card="${wrong}"]`).click();
    const face = await page.locator('[data-card="0"] .memory-card-face').elementHandle();
    // CSS has its own timeline: finish opening explicitly before testing closing.
    const openTransform = await face.evaluate(el => {
        for (const animation of document.getAnimations()) animation.finish();
        // Establish the open computed style before the closing class mutation.
        return getComputedStyle(el).transform;
    });
    expect(openTransform).not.toContain('-1');
    await page.clock.runFor(899);
    expect(await face.evaluate(el => el.isConnected && el.parentElement!.classList.contains('face-up'))).toBe(true);
    // Observe closing in its own rendering turn, before a slow protocol round trip
    // can consume the entire 240 ms CSS transition (CSS ignores page.clock).
    await face.evaluate(el => {
        const probe = window as unknown as { closingStyle: unknown };
        const observer = new MutationObserver(() => {
            if (el.parentElement!.classList.contains('face-up')) return;
            const s = getComputedStyle(el), animations = document.getAnimations().filter(animation => (animation.effect as KeyframeEffect).target === el);
            for (const animation of animations) { animation.pause(); animation.currentTime = 0; }
            probe.closingStyle = { transition: s.transitionDuration, transform: s.transform, animations: animations.map(animation => ({ duration: animation.effect!.getTiming().duration, playState: animation.playState })) };
            observer.disconnect();
        });
        observer.observe(el.parentElement!, { attributes: true, attributeFilter: ['class'] });
    });
    await page.clock.runFor(1);
    expect(await face.evaluate(el => el === document.querySelector('[data-card="0"] .memory-card-face'))).toBe(true);
    expect(await page.locator('[data-card="0"]').getAttribute('class')).not.toContain('face-up');
    const style = await page.evaluate(() => (window as unknown as { closingStyle: { transition: string; transform: string; animations: { duration: number; playState: string }[] } }).closingStyle);
    if (reducedMotion === 'reduce') {
        expect(style.transition).toBe('0s'); expect(style.animations).toEqual([]);
        expect(style.transform).toContain('-1');
    } else {
        expect(style.transition).toBe('0.24s');
        expect(style.animations.some(animation => animation.duration === 240 && animation.playState === 'paused')).toBe(true);
        const middle = await face.evaluate(el => {
            for (const animation of el.getAnimations()) animation.currentTime = 120;
            return getComputedStyle(el).transform;
        });
        expect(middle).not.toBe(style.transform);
        const finalTransform = await face.evaluate(el => {
            for (const animation of el.getAnimations()) animation.finish();
            return getComputedStyle(el).transform;
        });
        expect(finalTransform).toContain('-1');
        expect(middle).not.toBe(finalTransform);
    }
});

test('English voice says the English motif name', async ({ page }) => {
    await prepare(page, 1, { voice: true, sound: false });
    await page.evaluate(() => {
        const save = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { locale: string; pairesRecords: Record<number, number> };
        save.locale = 'en'; save.pairesRecords = { 1: 1, 2: 1, 3: 1 };
        localStorage.setItem('opencadkid.v1', JSON.stringify(save));
    });
    await page.reload(); await page.locator('[data-game="paires"]').click(); await page.locator('[data-level="4"]').click();
    const english = { apple: 'an apple', banana: 'a banana', cherry: 'cherries', carrot: 'a carrot', fish: 'a fish', cat: 'a cat', butterfly: 'a butterfly', snail: 'a snail', car: 'a car', boat: 'a boat', rocket: 'a rocket', house: 'a house', star: 'a star', heart: 'a heart', moon: 'a moon', umbrella: 'an umbrella' };
    const motif = (await memoryState(page)).board.cards[0]!.motif;
    await clearSpeech(page); await page.locator('[data-card="0"]').click();
    expect((await media(page)).speech).toEqual([english[motif]]);
    await expect(page.locator('[data-card="0"]')).toHaveAccessibleName(`${english[motif]} 1`);
});
