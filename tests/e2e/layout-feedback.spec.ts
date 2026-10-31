import type { Locator, Page } from '@playwright/test';
import { test, expect, prepare } from './helpers';
import { prepareShapes, shapeState } from './formes-helpers';
import { prepareSounds, soundsState } from './sons-helpers';
import { patternAnswer, patternState, prepareSuites } from './suites-helpers';
import { binFor, prepareRanger, rangerDom, rangerState } from './ranger-helpers';
import { captureReturnOrigin, expectMotionFinished, expectReturned } from './motion-helpers';

type Box = { x: number; y: number; width: number; height: number };
async function geometry(targets: Locator): Promise<Box[]> {
    return targets.evaluateAll(elements => elements.map(element => {
        const r = element.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
    }));
}
async function expectStable(targets: Locator, before: Box[]): Promise<void> {
    const after = await geometry(targets);
    expect(after).toHaveLength(before.length);
    for (const [i, box] of after.entries()) for (const key of ['x', 'y', 'width', 'height'] as const)
        expect(Math.abs(box[key] - before[i]![key]), `target ${i}: ${key}`).toBeLessThanOrEqual(0.5);
}
async function wrongDrop(page: Page, piece: Locator, target: Locator): Promise<void> {
    const origin = await captureReturnOrigin(piece);
    const a = (await piece.boundingBox())!, b = (await target.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
    await page.mouse.up();
    await expectReturned(piece, origin);
}
async function expectTextFits(page: Page): Promise<void> {
    expect(await page.locator('.instruction p, #feedback').evaluateAll(elements => elements.every(element =>
        element.scrollHeight <= element.clientHeight + 0.5 && element.scrollWidth <= element.clientWidth + 0.5))).toBe(true);
    const feedback = page.locator('#feedback');
    expect(await feedback.evaluate(element => element.clientHeight >= 2 * parseFloat(getComputedStyle(element).lineHeight) - 0.5)).toBe(true);
}

for (const fallback of [false, true]) for (const game of ['formes', 'sons', 'suites', 'ranger', 'compter'] as const) {
    test(`${game}: targets stay still after error and hint (${fallback ? 'wide fallback font' : 'default font'})`, async ({ page }) => {
        if (game === 'formes') await prepareShapes(page, 10);
        else if (game === 'sons') await prepareSounds(page, 10);
        else if (game === 'suites') await prepareSuites(page, 9);
        else if (game === 'ranger') await prepareRanger(page, 1);
        else await prepare(page, 4);
        if (fallback) await page.addStyleTag({ content: '* { font-family: serif !important; letter-spacing: 0.08em }' });
        await page.evaluate(() => document.fonts.ready);
        const targets = page.locator(game === 'formes' ? '[data-box]' : game === 'sons' ? '[data-sound-box]' : game === 'suites' ? '[data-slot]' : game === 'ranger' ? '[data-bin]' : '#basket, #check');
        expect(await targets.count()).toBeGreaterThan(0);
        const before = await geometry(targets);
        const feedbackBefore = await geometry(page.locator('#feedback'));
        const instructionBefore = await geometry(page.locator('.instruction'));
        let mistake: () => Promise<void>;
        let errors: (() => Promise<number>) | undefined;
        let hint: Locator;
        if (game === 'formes') {
            const piece = page.locator('[data-piece="0"]');
            const color = await piece.locator('svg').getAttribute('data-color');
            mistake = () => wrongDrop(page, piece, page.locator(`[data-box]:not([data-color="${color!}"])`).first());
            errors = async () => (await shapeState(page)).shapes.errors;
            hint = page.locator('.shape-hint');
        } else if (game === 'sons') {
            const piece = page.locator('[data-sound-piece="0"]');
            const initial = await piece.locator('svg').getAttribute('data-initial');
            mistake = () => wrongDrop(page, piece, page.locator('[data-sound-box]').filter({ hasNot: page.locator(`[data-letter="${initial!}"]`) }));
            errors = async () => (await soundsState(page)).sons.errors;
            hint = page.locator('.shape-hint');
        } else if (game === 'suites') {
            const correct = await patternAnswer(page);
            const wrong = page.locator(`[data-pattern-choice]:not([data-pattern-choice="${correct}"])`).first();
            mistake = () => wrongDrop(page, wrong, page.locator('.suites-empty.suites-active'));
            errors = async () => (await patternState(page)).suites.errors;
            hint = page.locator('.suites-base');
        } else if (game === 'ranger') {
            const dom = await rangerDom(page), object = dom.objects[0]!;
            const wrong = dom.bins.find(bin => bin !== binFor(dom, object))!;
            mistake = () => wrongDrop(page, page.locator(`[data-object="${object.id}"]`), page.locator(`[data-bin="${wrong}"]`));
            errors = async () => (await rangerState(page)).ranger.errors;
            hint = page.locator('.ranger-hint');
        } else {
            // An empty basket is always wrong; checking twice exposes the counting hint.
            // Keyboard activation avoids the accidental-double-touch suppression window.
            mistake = async () => { await page.locator('#check').focus(); await page.keyboard.press('Enter'); };
            hint = page.locator('.question.hint');
        }
        for (const count of [1, 2]) {
            await mistake();
            if (errors) await expect.poll(errors, { timeout: 1000 }).toBe(count);
            await expect(page.locator('#feedback')).not.toBeEmpty();
            if (count === 2) await expect(hint.first()).toBeVisible();
            await expectMotionFinished(page.locator('.question button'));
            await expectStable(targets, before);
            await expectStable(page.locator('#feedback'), feedbackBefore);
            await expectStable(page.locator('.instruction'), instructionBefore);
            await expectTextFits(page);
        }
    });
}
