import { shapeSvg } from '../../src/games/formes/shapes';
import type { Piece } from '../../src/engines/formes';
import { expectedFills, luminance } from '../formes-oracles';
import { test, expect, media, clearSpeech } from './helpers';
import { dragShape, prepareShapes, shapeAnswer, shapeState, solveShapes } from './formes-helpers';
for (const [mode, level] of [['forme', 3], ['couleur', 5], ['les-deux', 6], ['taille', 8], ['trier', 10]] as const) test(`${mode}: complete round, gentle error, two-error hint, saved progress`, async ({ page }) => {
    await prepareShapes(page, level);
    const soundBefore = (await media(page)).oscillators;
    if (mode === 'trier') {
        const color = await page.locator('[data-piece="0"] svg').getAttribute('data-color');
        const wrong = page.locator(`[data-box]:not([data-color="${color!}"])`).first();
        await dragShape(page, page.locator('[data-piece="0"]'), wrong);
        expect((await shapeState(page)).shapes.placed).toEqual([]);
        await dragShape(page, page.locator('[data-piece="0"]'), wrong);
        await expect(page.locator('[data-piece="0"].shape-hint')).toBeVisible();
        // A release 20 px below the correct box exercises the 24 px snap tolerance.
        await dragShape(page, page.locator('[data-piece="0"]'), page.locator(`[data-box][data-color="${color!}"]`), true);
        expect((await shapeState(page)).shapes.placed).toEqual([0]);
    } else {
        const answer = await shapeAnswer(page), wrong = page.locator(`[data-answer]:not([data-answer="${answer}"])`).first();
        await wrong.click(); expect((await shapeState(page)).index).toBe(0); await expect(page.locator('.shape-hint')).toHaveCount(0);
        await wrong.click(); await expect(page.locator(`[data-answer="${answer}"].shape-hint`)).toBeVisible();
        expect((await media(page)).oscillators).toBe(soundBefore);
    }
    await solveShapes(page); await expect(page.locator('.stars')).toHaveText('★★★');
    expect((await shapeState(page)).shapes.finished).toBe(true);
    expect((await media(page)).oscillators).toBeGreaterThan(soundBefore);
    await page.locator('#back').click(); await page.reload(); await page.locator('[data-game="formes"]').click();
    await expect(page.locator(`[data-level="${level}"]`)).toContainText('★★★');
    if (level < 10) await expect(page.locator(`[data-level="${level + 1}"]`)).toBeEnabled();
});
const frShapes: Record<string, string> = { rond: 'rond', carre: 'carré', triangle: 'triangle', rectangle: 'rectangle', etoile: 'étoile', coeur: 'cœur', losange: 'losange', ovale: 'ovale' };
const enShapes: Record<string, string> = { rond: 'circle', carre: 'square', triangle: 'triangle', rectangle: 'rectangle', etoile: 'star', coeur: 'heart', losange: 'diamond', ovale: 'oval' };
const frColors: Record<string, string[]> = { rouge: ['rouge', 'rouge'], bleu: ['bleu', 'bleue'], jaune: ['jaune', 'jaune'], vert: ['vert', 'verte'], orange: ['orange', 'orange'], violet: ['violet', 'violette'], rose: ['rose', 'rose'], marron: ['marron', 'marron'] };
const enColors: Record<string, string> = { rouge: 'red', bleu: 'blue', jaune: 'yellow', vert: 'green', orange: 'orange', violet: 'purple', rose: 'pink', marron: 'brown' };
for (const locale of ['fr', 'en']) for (const level of [1, 4, 6, 8, 9]) test(`${locale}, level ${level}: literal spoken grammar and ear throughout a series`, async ({ page }) => {
    await prepareShapes(page, level, locale);
    for (let i = 0; i < 6; i++) {
        const p = await page.locator('.instruction-pic').evaluate(el => { const d = (el as HTMLElement).dataset; return { mode: d.mode, targetShape: d.targetShape, targetColor: d.targetColor, targetSize: d.targetSize }; });
        const s = p.targetShape!, c = p.targetColor!, small = p.targetSize === 'petit', feminine = s === 'etoile';
        let expected: string;
        if (p.mode === 'trier') expected = locale === 'fr' ? 'Glisse chaque forme dans la boîte de sa couleur.' : 'Slide each shape into the box of its colour.';
        else if (p.mode === 'forme') expected = locale === 'fr' ? `Touche ${s === 'etoile' || s === 'ovale' ? 'l’' : 'le '}${frShapes[s]!}.` : `Touch the ${enShapes[s]!}.`;
        else if (p.mode === 'couleur') expected = locale === 'fr' ? `Touche le ${frColors[c]![0]!}.` : `Touch the ${enColors[c]!} shape.`;
        else {
            const size = p.mode === 'taille' ? locale === 'fr' ? small ? feminine ? 'petite ' : 'petit ' : feminine ? 'grande ' : 'grand ' : small ? 'small ' : 'large ' : '';
            const article = !size && (s === 'etoile' || s === 'ovale') ? 'l’' : feminine ? 'la ' : 'le ';
            expected = locale === 'fr' ? `Touche ${article}${size}${frShapes[s]!} ${frColors[c]![feminine ? 1 : 0]!}.` : `Touch the ${size}${enColors[c]!} ${enShapes[s]!}.`;
        }
        await expect(page.locator('.instruction p')).toHaveText(expected); expect((await media(page)).speech).toContain(expected);
        await clearSpeech(page); await page.locator('#listen').click(); expect((await media(page)).speech).toEqual([expected]);
        if (i === 0) {
            if (p.mode === 'trier') {
                const piece = page.locator('[data-piece="0"]');
                const shape = (await piece.locator('svg').getAttribute('data-shape'))!;
                const color = (await piece.locator('svg').getAttribute('data-color'))!;
                const wrong = page.locator(`[data-box]:not([data-color="${color}"])`).first();
                await dragShape(page, piece, wrong); await clearSpeech(page);
                await dragShape(page, piece, wrong);
                const article = shape === 'etoile' || shape === 'ovale' ? 'l’' : 'le ';
                const spoken = locale === 'fr' ? `${article}${frShapes[shape]!} ${frColors[color]![shape === 'etoile' ? 1 : 0]!}` : `the ${enColors[color]!} ${enShapes[shape]!}`;
                expect((await media(page)).speech).toEqual([locale === 'fr' ? 'Essaie encore !' : 'Try again!', spoken]);
            } else {
                const wrong = page.locator(`[data-answer]:not([data-answer="${await shapeAnswer(page)}"])`).first();
                await wrong.click(); await clearSpeech(page); await wrong.click();
                expect((await media(page)).speech).toEqual([locale === 'fr' ? 'Essaie encore !' : 'Try again!', expected]);
            }
        }
        if (p.mode === 'trier') {
            for (let j = 0; j < 3; j++) { const piece = page.locator(`[data-piece="${j}"]`), color = await piece.locator('svg').getAttribute('data-color'); await dragShape(page, piece, page.locator(`[data-box][data-color="${color!}"]`)); }
        } else await page.locator(`[data-answer="${await shapeAnswer(page)}"]`).click();
        await page.locator('#continue').click();
    }
    await expect(page.locator('.stars')).toBeVisible();
});
test('all levels: real SVG sizes, separated targets, detached observation and no overflow from 320 to 1280', async ({ page }) => {
    test.setTimeout(180_000);
    await prepareShapes(page, 10);
    for (let level = 1; level <= 10; level++) {
        await page.locator('#back').click(); await page.locator('[data-game="formes"]').click(); await page.locator(`[data-level="${level}"]`).click();
        for (const width of [320, 321, 360, 390, 480, 699, 700, 768, 939, 940, 1024, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            const sizes = await page.locator('.shape-choice>svg').evaluateAll(elements => elements.map(el => {
                const path = el.querySelector('path')!, box = path.getBBox(), matrix = path.getScreenCTM()!;
                const stroke = Number.parseFloat(getComputedStyle(path).strokeWidth);
                return { shape: (el as SVGElement).dataset.shape, size: (el as SVGElement).dataset.size, width: (box.width + stroke) * matrix.a, height: (box.height + stroke) * matrix.d };
            }));
            for (const s of sizes) { expect(s.width).toBeGreaterThanOrEqual(s.size === 'petit' ? 48 : 64); expect(s.height).toBeGreaterThanOrEqual(s.size === 'petit' ? 48 : 64); }
            const little = sizes.find(s => s.size === 'petit'), large = sizes.find(s => s.size === 'grand');
            if (little && large) {
                const matching = sizes.find(s => s.size === 'grand' && s.shape === little.shape)!;
                expect(matching.width / little.width).toBeGreaterThanOrEqual(1.6);
                expect(matching.height / little.height).toBeGreaterThanOrEqual(1.6);
            }
        }
        await page.evaluate(() => { const s = (window as unknown as { __kid: { state: () => { shapes: { errors: number } } } }).__kid.state(); s.shapes.errors = 999; });
        expect((await shapeState(page)).shapes.errors).toBe(0);
    }
});

test('every drawn shape: actual bounds including stroke, size ratio, rendered palette and contrast', async ({ page }) => {
    await prepareShapes(page, 1);
    // Exhaustive rendering fixture inside the real game layout: no seed can omit a shape/size/colour.
    const shapes: Piece['shape'][] = ['rond', 'carre', 'triangle', 'rectangle', 'etoile', 'coeur', 'losange', 'ovale'];
    const markup = shapes.flatMap(shape => (['petit', 'grand'] as const).flatMap(size =>
        (Object.keys(expectedFills) as Piece['color'][]).map(color => `<button class="shape-choice">${shapeSvg({ shape, size, color })}</button>`))).join('');
    await page.locator('.shapes-grid').evaluate((el, html) => { el.innerHTML = html; }, markup);
    for (const width of [320, 390, 700, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        const drawings = await page.locator('.shape-choice>svg').evaluateAll(elements => elements.map(el => {
            const path = el.querySelector('path')!, box = path.getBBox(), matrix = path.getScreenCTM()!;
            const css = getComputedStyle(path), strokeWidth = Number.parseFloat(css.strokeWidth);
            let parent: Element | null = el, background = '';
            while (parent) {
                background = getComputedStyle(parent).backgroundColor;
                if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') break;
                parent = parent.parentElement;
            }
            const channels = (color: string): number[] => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(c => c / 255);
            return { shape: el.getAttribute('data-shape'), size: el.getAttribute('data-size'), color: el.getAttribute('data-color')!,
                width: (box.width + strokeWidth) * matrix.a, height: (box.height + strokeWidth) * matrix.d,
                fill: css.fill, stroke: channels(css.stroke), background: channels(background), strokeWidth };
        }));
        expect(drawings).toHaveLength(128);
        for (const d of drawings) {
            expect(d.width).toBeGreaterThanOrEqual(d.size === 'petit' ? 48 : 64);
            expect(d.height).toBeGreaterThanOrEqual(d.size === 'petit' ? 48 : 64);
            const hex = expectedFills[d.color as Piece['color']];
            const channels = hex.slice(1).match(/../g)!.map(c => parseInt(c, 16));
            expect(d.fill).toBe(`rgb(${channels.join(', ')})`);
            const dark = luminance(d.stroke), light = luminance(d.background);
            expect(d.strokeWidth).toBeGreaterThanOrEqual(3);
            expect(dark).toBeLessThanOrEqual(.2);
            expect((Math.max(dark, light) + .05) / (Math.min(dark, light) + .05)).toBeGreaterThanOrEqual(3);
            if (d.size === 'petit') {
                const large = drawings.find(other => other.shape === d.shape && other.color === d.color && other.size === 'grand')!;
                expect(large.width / d.width).toBeGreaterThanOrEqual(1.6);
                expect(large.height / d.height).toBeGreaterThanOrEqual(1.6);
            }
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
});

test('wrong box animates a gradual return to the original position', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await prepareShapes(page, 10);
    const piece = page.locator('[data-piece="0"]'), origin = (await piece.boundingBox())!;
    const color = await piece.locator('svg').getAttribute('data-color');
    const box = (await page.locator(`[data-box]:not([data-color="${color!}"])`).first().boundingBox())!;
    await page.evaluate(() => {
        document.addEventListener('pointerup', () => {
            const element = document.querySelector('[data-piece="0"]')!;
            // Capture the real browser animation before it can finish, including on slow machines.
            const animation = element.getAnimations().find(a => a.effect instanceof KeyframeEffect &&
                a.effect.getTiming().easing === 'ease-out' &&
                a.effect.getKeyframes().some(frame => typeof frame.transform === 'string' && frame.transform.includes('translate')));
            if (!animation || !(animation.effect instanceof KeyframeEffect)) return;
            element.classList.remove('wiggle');
            animation.pause();
            const timing = animation.effect.getTiming(), frames = animation.effect.getKeyframes();
            const positions = [0, .5, 1].map(fraction => {
                animation.currentTime = Number(timing.duration) * fraction;
                const rect = element.getBoundingClientRect(); return { x: rect.x, y: rect.y };
            });
            element.setAttribute('data-return', JSON.stringify({ duration: timing.duration, easing: timing.easing, frames, positions }));
            animation.finish();
        }, { once: true });
    });
    await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 }); await page.mouse.up();
    await expect(piece).toHaveAttribute('data-return');
    const observed = JSON.parse((await piece.getAttribute('data-return'))!) as {
        duration: number; easing: string; frames: { transform: string }[]; positions: { x: number; y: number }[];
    };
    expect(observed.duration).toBeGreaterThanOrEqual(200); expect(observed.duration).toBeLessThanOrEqual(500);
    expect(observed.easing).toBe('ease-out');
    expect(observed.frames.at(-1)!.transform).toMatch(/^translate\(0(?:px)?, 0(?:px)?\)$/);
    const distances = observed.positions.map(p => Math.hypot(p.x - origin.x, p.y - origin.y));
    expect(distances[0]!).toBeGreaterThan(24);
    expect(distances[1]!).toBeGreaterThan(1); expect(distances[1]!).toBeLessThan(distances[0]!);
    expect(distances[2]!).toBeLessThan(1);
    expect((await shapeState(page)).shapes.placed).toEqual([]);
    await expect(piece).toBeEnabled();
});
