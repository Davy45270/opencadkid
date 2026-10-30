import { test, expect, media, clearSpeech } from './helpers';
import { dragPuzzle, pieceTarget, preparePuzzle, puzzleState, solvePuzzle } from './puzzle-helpers';
for (const level of [1, 4, 8]) test(`puzzle ${level}: independent drag oracle, speech, sound, stars and reload`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await preparePuzzle(page, level);
    expect((await media(page)).speech).toContain('Glisse les pièces pour refaire l’image.');
    await clearSpeech(page); await page.locator('#listen').click(); expect((await media(page)).speech).toContain('Glisse les pièces pour refaire l’image.');
    const initial = await puzzleState(page), zone = (await page.locator('.puzzle-zone').boundingBox())!;
    expect(initial.puzzle.boardScreen.width).toBeGreaterThanOrEqual(299.9);
    expect(initial.puzzle.zone).toEqual(zone);
    const oscillators = (await media(page)).oscillators;
    await dragPuzzle(page, 0, { x: zone.x + zone.width / 2, y: zone.y + zone.height * .75 });
    await expect(page.locator('[data-piece="0"]')).toHaveAttribute('data-placed', 'false');
    const moved = (await page.locator('[data-piece="0"]').boundingBox())!;
    expect(moved.x + moved.width / 2).toBeCloseTo(zone.x + zone.width / 2, 0);
    expect(moved.y + moved.height / 2).toBeCloseTo(zone.y + zone.height * .75, 0);
    expect((await media(page)).oscillators).toBe(oscillators);
    // Release outside the stage: the full illustrated piece remains bounded.
    await dragPuzzle(page, 0, { x: zone.x - 60, y: zone.y + zone.height + 60 });
    const bounded = (await page.locator('[data-piece="0"]').boundingBox())!;
    expect(bounded.x).toBeGreaterThanOrEqual(zone.x - 4 * zone.width / 320 - .1);
    expect(bounded.y + bounded.height).toBeLessThanOrEqual(zone.y + zone.height + 4 * zone.width / 320 + .1);
    await solvePuzzle(page); expect((await media(page)).oscillators).toBeGreaterThan(oscillators);
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles');
    expect((await puzzleState(page)).puzzle.pieces.every(p => p.placed && p.x === p.homeX && p.y === p.homeY)).toBe(true);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.v1')!) as { puzzleRecords: Record<number, number>; records: object });
    expect(saved.puzzleRecords[level]).toBe(3); expect(saved.records).toEqual({});
    await page.reload(); await page.locator('[data-game="puzzle"]').click(); await expect(page.locator(`[data-level="${level}"]`)).toContainText('★★★');
    if (level < 8) await expect(page.locator(`[data-level="${level + 1}"]`)).toBeEnabled();
});
test('idle hint at 25 seconds, no reset on a missed drop, and two-star assistance', async ({ page }) => {
    await page.clock.install(); await preparePuzzle(page, 4);
    await page.clock.runFor(24_000); await expect(page.locator('[data-puzzle-hint]')).toHaveCount(0);
    const zone = (await page.locator('.puzzle-zone').boundingBox())!;
    await dragPuzzle(page, 0, { x: zone.x + zone.width / 2, y: zone.y + zone.height * .75 });
    await page.clock.runFor(1001); await expect(page.locator('[data-puzzle-hint]')).toHaveCount(1);
    expect((await puzzleState(page)).puzzle.aids).toBe(1); expect((await media(page)).speech).toContain('Cette pièce va ici !');
    await solvePuzzle(page); await expect(page.locator('.stars')).toHaveAttribute('aria-label', '2 étoiles');
});
test('model help, English speech, media disabled, keyboard 16px steps and locked pieces', async ({ page }) => {
    await preparePuzzle(page, 3, 'en'); expect((await media(page)).speech).toContain('Slide the pieces to rebuild the picture.');
    await expect(page.locator('#model')).toHaveAttribute('aria-pressed', 'false'); await page.locator('#model').click();
    expect((await puzzleState(page)).puzzle.aids).toBe(1);
    // Disable media through saved settings and reload: same shell doubles continue recording.
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { sound: boolean; voice: boolean }; s.sound = false; s.voice = false; localStorage.setItem('opencadkid.v1', JSON.stringify(s)); });
    await page.reload(); await page.locator('[data-game="puzzle"]').click(); await page.locator('[data-level="3"]').click();
    const sounds = (await media(page)).oscillators; await clearSpeech(page);
    for (let id = 0; id < await page.locator('[data-piece]').count(); id++) {
        const piece = page.locator(`[data-piece="${id}"]`), home = await pieceTarget(page, id);
        await piece.focus();
        for (const [axis, backward, forward] of [['x', 'ArrowLeft', 'ArrowRight'], ['y', 'ArrowUp', 'ArrowDown']] as const) {
            let guard = 0;
            while (guard++ < 40) {
                const r = (await piece.boundingBox())!, centre = axis === 'x' ? r.x + r.width / 2 : r.y + r.height / 2;
                if (Math.abs(centre - home[axis]) < 9) break;
                const before = (await puzzleState(page)).puzzle.pieces[id]!;
                await page.keyboard.press(centre > home[axis] ? backward : forward);
                const after = (await puzzleState(page)).puzzle.pieces[id]!;
                expect(Math.abs(after[axis] - before[axis])).toBe(16);
            }
        }
        await page.keyboard.press('Enter'); await expect(piece).toHaveAttribute('data-placed', 'true');
        const before = (await puzzleState(page)).puzzle.pieces[id]!;
        await piece.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
        expect((await puzzleState(page)).puzzle.pieces[id]).toEqual(before);
    }
    await expect(page.locator('.stars')).toBeVisible(); expect((await media(page)).oscillators).toBe(sounds); expect((await media(page)).speech).toEqual([]);
});
test('all levels: actual painted dimensions, target sizes, SVG validity and no overflow at 320–1280', async ({ page }) => {
    test.setTimeout(180_000);
    for (let level = 1; level <= 8; level++) {
        await preparePuzzle(page, level);
        // Browser XML parser complements the pure unit SVG structure oracle.
        expect(await page.locator('.puzzle-piece>svg').evaluateAll(elements => elements.every(el => !new DOMParser().parseFromString(el.outerHTML, 'image/svg+xml').querySelector('parsererror')))).toBe(true);
        for (const width of [320, 360, 390, 480, 700, 940, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            const sizes = await page.locator('.puzzle-piece>svg>path').evaluateAll(elements => elements.map(el => {
                const p = el as SVGGraphicsElement, b = p.getBBox(), m = p.getScreenCTM()!;
                const a = new DOMPoint(b.x, b.y).matrixTransform(m), z = new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(m);
                return { width: z.x - a.x, height: z.y - a.y };
            }));
            for (const r of sizes) { expect(r.width).toBeGreaterThanOrEqual(level === 7 ? 56 : 64); expect(r.height).toBeGreaterThanOrEqual(level === 7 ? 56 : 64); }
            for (const button of await page.locator('.shapes-header button').all()) { const r = (await button.boundingBox())!; expect(r.width).toBeGreaterThanOrEqual(64); expect(r.height).toBeGreaterThanOrEqual(64); }
            if (width === 390) expect((await page.locator('[data-puzzle-board]').boundingBox())!.width).toBeGreaterThanOrEqual(299.9);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
        }
    }
});
test('optional puzzle captures', async ({ page }, info) => {
    test.skip(process.env.CAPTURES !== '1' || info.project.name !== 'mobile', 'Optional mobile capture artifacts.');
    await page.setViewportSize({ width: 390, height: 844 }); await preparePuzzle(page, 8);
    await page.screenshot({ path: 'docs/captures/puzzle-debut.png' }); await solvePuzzle(page);
    await page.screenshot({ path: 'docs/captures/puzzle-fini.png' });
});

test('a successful placement restarts the full idle interval', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z')); await preparePuzzle(page, 4);
    await page.clock.runFor(24_000); await dragPuzzle(page, 0);
    await expect(page.locator('[data-piece="0"]')).toHaveAttribute('data-placed', 'true');
    await page.clock.runFor(24_999); await expect(page.locator('[data-puzzle-hint]')).toHaveCount(0);
    await page.clock.runFor(1); await expect(page.locator('[data-puzzle-hint]')).toHaveCount(1);
    expect((await puzzleState(page)).puzzle.hintPiece).toBe(1);
});

for (const interruption of ['pointercancel', 'lostpointercapture', 'hidden'] as const) test(`puzzle ${interruption} preserves the last visible position and frees the gesture`, async ({ page }) => {
    await preparePuzzle(page, 8);
    const before = (await puzzleState(page)).puzzle.pieces[0]!, piece = page.locator('[data-piece="0"]');
    const r = (await piece.boundingBox())!, zone = (await page.locator('.puzzle-zone').boundingBox())!;
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2 - 35, { steps: 5 });
    const visible = (await piece.boundingBox())!;
    await page.evaluate(interruption => {
        const app = document.querySelector('#app')!;
        if (interruption === 'hidden') {
            Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            document.dispatchEvent(new Event('visibilitychange'));
            Object.defineProperty(document, 'hidden', { configurable: true, value: false });
            document.dispatchEvent(new Event('visibilitychange'));
            Reflect.deleteProperty(document, 'hidden');
        } else app.dispatchEvent(new PointerEvent(interruption, { pointerId: 1 }));
    }, interruption);
    await page.mouse.up();
    const after = (await puzzleState(page)).puzzle.pieces[0]!;
    expect(after.placed).toBe(false); expect(after.y).toBeCloseTo(before.y - 35 * 550 / zone.height, 5);
    const restored = (await piece.boundingBox())!;
    expect(restored.x).toBeCloseTo(visible.x, 5); expect(restored.y).toBeCloseTo(visible.y, 5);
    await dragPuzzle(page, 0); await expect(piece).toHaveAttribute('data-placed', 'true');
});

test('held puzzle piece paints above another piece while crossing it', async ({ page }) => {
    await preparePuzzle(page, 8);
    const held = page.locator('[data-piece="0"]'), other = page.locator('[data-piece="1"]');
    const a = (await held.boundingBox())!, b = (await other.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('[data-piece]')?.getAttribute('data-piece'), { x: b.x + b.width / 2, y: b.y + b.height / 2 })).toBe('0');
    await page.mouse.up();
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) test(`puzzle completion animation respects ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion }); await preparePuzzle(page);
    // Capture and pause at creation, before protocol latency can finish the CSS animation.
    await page.evaluate(() => {
        const probe = window as unknown as { puzzleAnimation: { name: string; duration: number; state: string }[] };
        const observer = new MutationObserver(() => {
            const zone = document.querySelector('.puzzle-finished'); if (!zone) return;
            const style = getComputedStyle(zone);
            const animations = zone.getAnimations();
            probe.puzzleAnimation = animations.map(a => ({ name: style.animationName, duration: Number(a.effect!.getTiming().duration), state: a.playState }));
            animations.forEach(a => a.pause()); observer.disconnect();
        });
        observer.observe(document.querySelector('#app')!, { childList: true, subtree: true });
    });
    await solvePuzzle(page);
    const animations = await page.evaluate(() => (window as unknown as { puzzleAnimation: { name: string; duration: number; state: string }[] }).puzzleAnimation);
    if (reducedMotion === 'reduce') expect(animations).toEqual([]);
    else expect(animations).toContainEqual({ name: 'happy', duration: 700, state: 'running' });
});
