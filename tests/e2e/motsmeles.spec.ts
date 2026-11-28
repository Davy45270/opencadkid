import type { CDPSession, Page } from '@playwright/test';
import type { Grid, Placement, State } from '../../src/engines/motsmeles';
import { test, expect, touchFrame } from './helpers';

const card = (page: Page) => page.locator('[data-game="motsmeles"]');
const levelButton = (page: Page, level: number) => page.locator(`[data-motsmeles-level="${level}"]`);
const cells = (page: Page) => page.locator('[data-motsmeles-cell]');
const marked = (page: Page, attribute: 'found' | 'selected') => page.locator(`[data-motsmeles-cell][data-${attribute}]`);
const round = (page: Page): Promise<{ state: State; grid: Grid }> =>
    page.evaluate(() => (window as unknown as { __kid: { state: () => { motsmeles: { state: State; grid: Grid } } } }).__kid.state().motsmeles);

async function openLevel(page: Page, level = 1): Promise<void> {
    await page.addInitScript(() => {
        localStorage.setItem('opencadkid.v1', JSON.stringify({ version: 1, locale: 'fr', voice: false, sound: false }));
        localStorage.setItem('opencadkid-son-2026-11-17', '1');
    });
    await page.goto('/');
    await card(page).click();
    await levelButton(page, level).click();
    await expect(cells(page).first()).toBeVisible();
}

function wordCells(grid: Grid, word: Placement): number[] {
    const from = word.row * grid.size + word.col;
    const step = word.dir === 'E' ? 1 : grid.size;
    return Array.from(word.word, (_, i) => from + i * step);
}

async function point(page: Page, index: number): Promise<{ x: number; y: number }> {
    const box = (await cells(page).nth(index).boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function touch(cdp: CDPSession, page: Page, type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', index?: number): Promise<void> {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: index === undefined ? [] : [await point(page, index)] });
    await touchFrame(page);
}
async function expectFound(page: Page, word: Placement, path: number[]): Promise<void> {
    await expect(marked(page, 'found')).toHaveCount(path.length);
    for (const index of path) await expect(cells(page).nth(index)).toHaveAttribute('data-found', '');
    const found = page.locator(`[data-motsmeles-word="${word.word}"][data-found]`);
    await expect(found.getByText('✓')).toBeVisible();
}

test('Word mystery opens a four by four grid with its owl', async ({ page }) => {
    await page.goto('/');
    await expect(card(page).getByText('Mystère des mots', { exact: true })).toBeVisible();
    await card(page).click();
    await levelButton(page, 1).click();
    await expect(cells(page)).toHaveCount(16);
    await expect(page.getByRole('heading', { name: 'Découverte' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'La chouette' })).toBeVisible();
    expect(await page.getByRole('img', { name: 'La chouette' }).evaluate((img: HTMLImageElement) => img.decode().then(() => img.naturalWidth))).toBeGreaterThan(0);
});

test('a finger drag finds the word and checks its card', async ({ page, context }, info) => {
    test.skip(info.project.name !== 'mobile', 'Real mobile touch input only.');
    await openLevel(page);
    const { grid } = await round(page);
    const word = grid.placements[0]!, path = wordCells(grid, word);
    const cdp = await context.newCDPSession(page);
    await touch(cdp, page, 'touchStart', path[0]);
    for (const cell of path.slice(1)) await touch(cdp, page, 'touchMove', cell);
    await expect(marked(page, 'selected')).toHaveCount(path.length);
    await touch(cdp, page, 'touchEnd');
    await expectFound(page, word, path);
    await cdp.detach();
});

test('an L-shaped finger drag finds no word', async ({ page, context }, info) => {
    test.skip(info.project.name !== 'mobile', 'Real mobile touch input only.');
    await openLevel(page);
    const { grid } = await round(page);
    const word = grid.placements[0]!, path = wordCells(grid, word);
    const start = path[0]!, end = path.at(-1)!, offset = word.row === 0 ? grid.size : -grid.size;
    const cdp = await context.newCDPSession(page);
    await touch(cdp, page, 'touchStart', start);
    await touch(cdp, page, 'touchMove', start + offset);
    await touch(cdp, page, 'touchMove', end + offset);
    await touch(cdp, page, 'touchEnd');
    await expect(marked(page, 'found')).toHaveCount(0);
    // Returning to the real last letter still cannot make a bent trace valid.
    await touch(cdp, page, 'touchStart', start);
    await touch(cdp, page, 'touchMove', start + offset);
    await touch(cdp, page, 'touchMove', end + offset);
    await touch(cdp, page, 'touchMove', end);
    await touch(cdp, page, 'touchEnd');
    expect((await round(page)).state.found).toEqual([]);
    await expect(marked(page, 'found')).toHaveCount(0);
    await expect(marked(page, 'selected')).toHaveCount(0);
    await cdp.detach();
});

test('touch cancellation clears the active selection', async ({ page, context }, info) => {
    test.skip(info.project.name !== 'mobile', 'Real mobile touch input only.');
    await openLevel(page);
    const { grid } = await round(page);
    const path = wordCells(grid, grid.placements[0]!);
    const cdp = await context.newCDPSession(page);
    await touch(cdp, page, 'touchStart', path[0]);
    await touch(cdp, page, 'touchMove', path[1]);
    await expect(marked(page, 'selected')).toHaveCount(2);
    await touch(cdp, page, 'touchCancel');
    await expect(marked(page, 'selected')).toHaveCount(0);
    await expect(marked(page, 'found')).toHaveCount(0);
    expect((await round(page)).state.found).toEqual([]);
    await cdp.detach();
});

test('two taps select the first and last letters', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'Real mobile touch input only.');
    await openLevel(page);
    const { grid } = await round(page);
    const word = grid.placements[0]!, path = wordCells(grid, word);
    await cells(page).nth(path[0]!).tap();
    await expect(marked(page, 'selected')).toHaveCount(1);
    await cells(page).nth(path.at(-1)!).tap();
    await expectFound(page, word, path);
});

test('completing the grid keeps the level record after reload', async ({ page }) => {
    await openLevel(page);
    const { grid } = await round(page);
    for (const word of grid.placements) {
        const path = wordCells(grid, word);
        await cells(page).nth(path[0]!).focus();
        await page.keyboard.press('Enter');
        for (const _ of path.slice(1)) await page.keyboard.press('ArrowRight');
        await expect(cells(page).nth(path.at(-1)!)).toBeFocused();
        await page.keyboard.press('Space');
    }
    await expect(page.getByRole('status')).toHaveText('Bravo !');
    await expect(page.getByRole('button', { name: 'Rejouer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Niveau suivant' })).toBeVisible();
    await page.reload();
    await card(page).click();
    await expect(levelButton(page, 1).getByLabel('Terminé')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('opencadkid.motsmeles.v1'))).toBe('{"1":1}');
});

test('portrait level one fills the phone with a large owl and compact word cards', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'Use the mobile viewport project.');
    await page.setViewportSize({ width: 390, height: 844 });
    await openLevel(page);
    const owl = page.getByRole('img', { name: 'La chouette' });
    const owlHeight = await owl.evaluate(async (img: HTMLImageElement) => {
        await img.decode();
        const { width, height } = img.getBoundingClientRect();
        return Math.min(height, width * img.naturalHeight / img.naturalWidth);
    });
    expect(owlHeight).toBeGreaterThanOrEqual(120);

    const cards = await page.locator('.motsmeles-word').evaluateAll(words => words.map(word => ({
        height: word.getBoundingClientRect().height,
        fontSize: parseFloat(getComputedStyle(word.querySelector('strong')!).fontSize),
    })));
    expect(cards.length).toBeGreaterThan(0);
    for (const { height, fontSize } of cards) {
        expect(height).toBeLessThanOrEqual(64);
        expect(fontSize).toBeGreaterThanOrEqual(24);
    }

    const gaps = await page.locator('.motsmeles-play').evaluate(play => {
        const selectors = ['.motsmeles-header', '.motsmeles-guide', '.motsmeles-board', '.motsmeles-words'];
        const blocks = selectors.map(selector => play.querySelector(selector)!.getBoundingClientRect());
        return blocks.map((block, i) => (blocks[i + 1]?.top ?? innerHeight) - block.bottom);
    });
    for (const gap of gaps) expect(gap).toBeLessThanOrEqual(16);
});

for (const level of [1, 3]) {
    test(`portrait level ${level} gives the instruction bubble enough room`, async ({ page }, info) => {
        test.skip(info.project.name !== 'mobile', 'Use the mobile viewport project.');
        await page.setViewportSize({ width: 390, height: 844 });
        await openLevel(page, level);

        const layout = await page.locator('.motsmeles-guide').evaluate(guide => {
            const bubble = guide.querySelector('.motsmeles-bubble')!;
            const message = guide.querySelector('#motsmeles-message')!;
            const lineHeight = parseFloat(getComputedStyle(message).lineHeight);
            return {
                widthRatio: bubble.getBoundingClientRect().width / guide.getBoundingClientRect().width,
                lines: Math.round(message.getBoundingClientRect().height / lineHeight),
            };
        });
        expect(layout.widthRatio).toBeGreaterThanOrEqual(.55);
        expect(layout.lines).toBeLessThanOrEqual(4);
    });
}

for (const [width, height] of [[390, 844], [360, 740], [405, 720], [1280, 800]] as const) {
    test(`all word search levels fit at ${width} × ${height}`, async ({ page }, info) => {
        test.skip(info.project.name !== (width > height ? 'desktop' : 'mobile'), 'Use the matching viewport project.');
        await page.setViewportSize({ width, height });
        await openLevel(page);
        for (const level of [1, 2, 3]) {
            if (level > 1) {
                await page.getByRole('button', { name: 'Retour' }).click();
                await levelButton(page, level).click();
            }
            const layout = await page.locator('.motsmeles-play').evaluate(play => {
                const header = play.querySelector('.motsmeles-header')!.getBoundingClientRect();
                const words = play.querySelector('.motsmeles-words')!.getBoundingClientRect();
                const targets = [...play.querySelectorAll('.motsmeles-cell, .motsmeles-word, .motsmeles-bubble')];
                return {
                    usefulArea: header.width * (words.bottom - header.top) / (innerWidth * innerHeight),
                    fits: document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth &&
                        targets.every(el => {
                            const b = el.getBoundingClientRect();
                            return b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight;
                        }),
                    largeCells: targets.filter(el => el.matches('.motsmeles-cell')).every(el => {
                        const { width, height } = el.getBoundingClientRect();
                        return width >= 44 && height >= 44;
                    }),
                };
            });
            expect(layout.usefulArea).toBeGreaterThanOrEqual(.95);
            expect(layout.fits).toBe(true);
            expect(layout.largeCells).toBe(true);
        }
    });
}

for (const [width, height] of [[390, 844], [360, 740], [405, 720], [844, 390], [1280, 800]] as const) {
    test(`the word search level picker fills ${width} × ${height} without scrolling`, async ({ page }, info) => {
        test.skip(info.project.name !== (width === 1280 ? 'desktop' : 'mobile'), 'Use the matching viewport project.');
        await page.setViewportSize({ width, height });
        await page.addInitScript(() => {
            localStorage.setItem('opencadkid.v1', JSON.stringify({ version: 1, locale: 'fr', voice: false, sound: false }));
            localStorage.setItem('opencadkid-son-2026-11-17', '1');
            localStorage.setItem('opencadkid.motsmeles.v1', '{"1":1}');
        });
        await page.goto('/');
        await card(page).click();

        const picker = page.locator('.motsmeles-levels');
        const buttons = picker.locator('[data-motsmeles-level]');
        await expect(buttons).toHaveCount(3);
        await expect(levelButton(page, 1).getByText('4 × 4')).toBeVisible();
        await expect(levelButton(page, 1).getByLabel('Terminé')).toHaveText('★');
        await expect(picker.getByText('Choisis un niveau.')).toBeVisible();

        const layout = await picker.evaluate(async section => {
            const owl = section.querySelector<HTMLImageElement>('.motsmeles-owl')!;
            await owl.decode();
            const boxes = [...section.querySelectorAll('[data-motsmeles-level]')].map(button => {
                const { left, top, bottom, height } = button.getBoundingClientRect();
                const fontSize = parseFloat(getComputedStyle(button.querySelector('strong')!).fontSize);
                return { left, top, bottom, height, fontSize };
            });
            const owlRect = owl.getBoundingClientRect();
            const bubble = section.querySelector('.motsmeles-level-guide p')!.getBoundingClientRect();
            const header = section.querySelector('header')!.getBoundingClientRect();
            const safeBottom = parseFloat(getComputedStyle(section).paddingBottom);
            const owlHeight = Math.min(owlRect.height, owlRect.width * owl.naturalHeight / owl.naturalWidth);
            return {
                boxes, owlHeight,
                viewport: { width: innerWidth, height: innerHeight },
                scrollWidth: document.documentElement.scrollWidth,
                scrollHeight: document.documentElement.scrollHeight,
                portraitGaps: [
                    owlRect.bottom - owlHeight - header.bottom,
                    bubble.top - owlRect.bottom,
                    boxes[0]!.top - bubble.bottom,
                    boxes[1]!.top - boxes[0]!.bottom,
                    boxes[2]!.top - boxes[1]!.bottom,
                    innerHeight - safeBottom - boxes[2]!.bottom,
                ],
                owlRight: owlRect.right,
            };
        });
        expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport.width);
        expect(layout.scrollHeight).toBeLessThanOrEqual(layout.viewport.height);
        for (const { top, bottom, height: cardHeight, fontSize } of layout.boxes) {
            expect(cardHeight).toBeGreaterThanOrEqual(72);
            expect(fontSize).toBeGreaterThanOrEqual(24);
            expect(top).toBeGreaterThanOrEqual(0);
            expect(bottom).toBeLessThanOrEqual(layout.viewport.height);
        }
        if (width < height) {
            for (const gap of layout.portraitGaps) {
                expect(gap).toBeGreaterThanOrEqual(0);
                expect(gap).toBeLessThan(24);
            }
        } else {
            expect(layout.boxes[0]!.left).toBeGreaterThan(layout.owlRight);
        }
        if (width === 390) expect(layout.owlHeight).toBeGreaterThanOrEqual(160);
    });
}
