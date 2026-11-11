import type { Page } from '@playwright/test';
import { homedir } from 'node:os';
import { test, expect, media, passGate, prepare } from './helpers';
import { candidates, hint, imagesOf, levels, sizeOf, solutionOf, start, type Fail, type State } from '../../src/engines/grille';

interface Rect { x: number; y: number; width: number; height: number }
interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; cell: number | null; image: number | null; board: Rect | null; cellSize: number | null; hint: { cell: number; image: number } | null; busy: boolean; fail: Fail | null }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { grille: Probe } } }).__kid.state().grille);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.grille.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="grille"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const clear = (page: Page) => page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
/** Waits until nothing moves any more, then gives the state. */
async function settled(page: Page, gestures: number): Promise<State> {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.gestures >= gestures; }, { timeout: 10_000 }).toBe(true);
    return (await probe(page)).state!;
}
/** A touch on a cell, then on a picture of the tray. */
async function put(page: Page, cell: number, image: number): Promise<State> {
    const before = (await probe(page)).state!;
    await page.locator(`[data-cell="${cell}"]`).click();
    await page.locator(`[data-image="${image}"]`).click();
    return settled(page, before.gestures + 1);
}
/** The first scene with an empty cell where a wrong picture has no twin. */
const shrug = ((): { id: number; cell: number; image: number } => {
    for (const l of levels) {
        const s = start(l.id), n = sizeOf(l);
        for (let cell = 0; cell < n * n; cell++) if (s.cells[cell]! < 0) for (const image of candidates(s.cells, n, imagesOf(l), cell)) if (image !== solutionOf(l)[cell]) return { id: l.id, cell, image };
    }
    throw new Error('no scene with a shrug');
})();
const center = async (page: Page, selector: string) => { const b = (await page.locator(selector).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

test('CaliRoux says the scene, a touch on the empty cell then on the picture fills it, and the scene ends with stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-grille-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-grille-level]:not([disabled])')).toHaveCount(1);
    await clear(page);
    await page.locator('[data-grille-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Il manque un fruit', 'Touche la case vide, puis l’image qui manque.', 'Chaque image une seule fois par ligne, par colonne et par carré.', 'Remplis la grille.']);
    await expect(page.locator('[data-cell]')).toHaveCount(16);
    await expect(page.locator('[data-image]')).toHaveCount(4);
    await page.locator('[data-cell="10"]').click();
    await expect(page.locator('[data-cell="10"][data-chosen]')).toHaveCount(1);
    await page.locator('[data-image="3"]').click();
    const s = await settled(page, 1);
    expect(s.finished).toBe(true); expect(s.cells[10]).toBe(3);
    expect((await probe(page)).records).toEqual({ 1: 3 });
    await expect(page.locator('.grille-reward .stars')).toHaveText('★★★');
    // The grid becomes a little painting: every fruit dances.
    await expect(page.locator('.grille-board[data-done] .grille-danse')).toHaveCount(16);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.grille.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#grille-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-grille-level]:not([disabled])')).toHaveCount(2);
});

test('a fruit already in the row pulls a face, and the picture put goes back to the tray', async ({ page }) => {
    await open(page);
    await page.locator('[data-grille-level="1"]').click();
    await clear(page);
    // The picture first, then the cell: the apple is already in the row.
    await page.locator('[data-image="0"]').click();
    await expect(page.locator('[data-image="0"][data-chosen]')).toHaveCount(1);
    await page.locator('[data-cell="10"]').click();
    await expect.poll(async () => (await probe(page)).fail).toBe('grimace');
    await expect(page.locator('.grille-cell .grille-in.grille-grimace').first()).toBeVisible();
    await expect(page.locator('[data-cell="10"] .grille-ghost')).toHaveCount(1);
    await expect(page.locator('.grille-bulle text')).toHaveText('Beurk !');
    expect((await media(page)).speech).toEqual(['Où va la pomme ?', 'Beurk ! La pomme est déjà dans la ligne.']);
    const s = await settled(page, 1);
    expect([s.cells[10], s.tries, s.helps, s.finished]).toEqual([-1, 1, 0, false]);
    await expect(page.locator('.grille-ghost')).toHaveCount(0);
    await expect(page.locator('.grille-grimace')).toHaveCount(0);
});

test('animals squabble, shapes bump, a picture with no twin shrugs, and the finished grid of animals dances in a ring', async ({ page }) => {
    await open(page, upTo(levels.length - 1));
    await page.locator('[data-grille-level="2"]').click();
    // Scene 2: the cat goes in the bottom corner; the dog is already in its row.
    await put(page, 15, 1);
    expect((await probe(page)).state!.tries).toBe(1);
    await page.locator(`[data-cell="15"]`).click(); await page.locator('[data-image="1"]').click();
    await expect.poll(async () => (await probe(page)).fail).toBe('chamaille');
    await expect(page.locator('[data-cell="15"] .grille-ghost.grille-chamaille')).toHaveCount(1);
    await settled(page, 2);
    await put(page, 15, 0);
    await expect(page.locator('.grille-board[data-done] .grille-ronde')).toHaveCount(16);
    await page.locator('#back').click();
    await page.locator('[data-grille-level="3"]').click();
    await page.locator('[data-cell="3"]').click(); await page.locator('[data-image="0"]').click();
    await expect.poll(async () => (await probe(page)).fail).toBe('cogne');
    await expect(page.locator('.grille-in.grille-cogne').first()).toBeVisible();
    await settled(page, 1);
    // A cell where two pictures fit by their row, column and square: the wrong one, with no twin, shrugs.
    await page.locator('#back').click();
    await page.locator(`[data-grille-level="${shrug.id}"]`).click();
    await page.locator(`[data-cell="${shrug.cell}"]`).click(); await page.locator(`[data-image="${shrug.image}"]`).click();
    await expect.poll(async () => (await probe(page)).fail).toBe('pasici');
    await expect(page.locator('.grille-ghost.grille-haussement')).toHaveCount(1);
});

test('a given cell waves, a full cell sends the picture somersaulting, CaliRoux rolls over, a shaken picture gets dizzy', async ({ page }) => {
    await open(page, upTo(3));
    await page.locator('[data-grille-level="4"]').click();
    await page.locator('[data-cell="0"]').click();
    await expect.poll(async () => (await probe(page)).fail).toBe('coucou');
    await expect(page.locator('[data-cell="0"] .grille-coucou')).toHaveCount(1);
    await expect(page.locator('.grille-bulle text')).toHaveText('Coucou !');
    let s = await settled(page, 1);
    // A right picture, then another on the same cell: a somersault.
    const h = hint(s)!;
    s = await put(page, h.cell, h.image);
    expect(s.cells[h.cell]).toBe(h.image);
    await page.locator(`[data-image="0"]`).click(); await page.locator(`[data-cell="${h.cell}"]`).click();
    await expect.poll(async () => (await probe(page)).fail).toBe('salto');
    await expect(page.locator(`[data-cell="${h.cell}"] .grille-ghost.grille-salto`)).toHaveCount(1);
    s = await settled(page, s.gestures + 1);
    await page.locator('#grille-caliroux').click();
    await expect.poll(async () => (await probe(page)).fail).toBe('roulade');
    await expect(page.locator('.grille-guide.grille-roulade')).toHaveCount(1);
    s = await settled(page, s.gestures + 1);
    // Shaking a picture: quick moves left and right while holding it.
    const c = await center(page, '[data-image="1"]');
    await page.mouse.move(c.x, c.y); await page.mouse.down();
    for (let k = 0; k < 6; k++) await page.mouse.move(c.x + (k % 2 ? -40 : 40), c.y - 60, { steps: 3 });
    await page.mouse.up();
    await expect.poll(async () => (await probe(page)).fail).toBe('tournis');
    await expect(page.locator('[data-image="1"] .grille-tournis')).toHaveCount(1);
    await settled(page, s.gestures + 1);
});

test('dragging a picture from the tray onto its cell puts it there', async ({ page }) => {
    await open(page, upTo(4));
    await page.locator('[data-grille-level="5"]').click();
    const s = (await probe(page)).state!, h = hint(s)!;
    const from = await center(page, `[data-image="${h.image}"]`), to = await center(page, `[data-cell="${h.cell}"]`);
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 12 }); await page.mouse.up();
    const after = await settled(page, 1);
    expect(after.cells[h.cell]).toBe(h.image); expect(after.tries).toBe(0);
});

test('three funny tries make the right picture and its cell shine; taking it costs one star', async ({ page }) => {
    await open(page, upTo(4));
    await page.locator('[data-grille-level="5"]').click();
    for (let k = 0; k < 3; k++) { await page.locator('#grille-caliroux').click(); await settled(page, k + 1); }
    const p = await probe(page);
    expect(p.hint).toEqual(hint(p.state!));
    await expect(page.locator(`[data-cell="${p.hint!.cell}"] .grille-hint`)).toHaveCount(1);
    await expect(page.locator(`[data-image="${p.hint!.image}"] .grille-hint`)).toHaveCount(1);
    let s = await put(page, p.hint!.cell, p.hint!.image);
    expect(s.helps).toBe(1); expect(s.dry).toBe(0);
    await expect(page.locator('.grille-hint')).toHaveCount(0);
    while (!s.finished) { const h = hint(s)!; s = await put(page, h.cell, h.image); }
    await expect(page.locator('.grille-reward .stars')).toHaveText('★★☆');
});

test('on a 390 × 844 phone the grid takes the height, cells are big, nothing covers anything, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(levels.length - 1));
    for (const l of levels) {
        await page.locator(`[data-grille-level="${l.id}"]`).click();
        await expect.poll(async () => (await probe(page)).board).not.toBeNull();
        const found = await page.evaluate(n => {
            const problems: string[] = [], r = (s: string) => document.querySelector(s)!.getBoundingClientRect();
            const board = r('.grille-board'), tray = r('.grille-tray'), talk = r('.grille-instruction'), play = r('.grille-play');
            const cells = [...document.querySelectorAll('.grille-cell')].map(e => e.getBoundingClientRect()), picks = [...document.querySelectorAll('.grille-pick')].map(e => e.getBoundingClientRect());
            const min = n === 4 ? 64 : 48;
            for (const c of cells) if (Math.min(c.width, c.height) < min) { problems.push(`cell ${Math.round(c.width)}×${Math.round(c.height)} px`); break; }
            for (const p of picks) if (Math.min(p.width, p.height) < 60) { problems.push(`tray picture ${Math.round(p.width)}×${Math.round(p.height)} px`); break; }
            if (talk.bottom > board.top + 1) problems.push('the sentence covers the grid');
            if (board.bottom > tray.top + 1) problems.push('the grid covers the tray');
            if (tray.bottom > innerHeight + 1) problems.push(`tray ends at ${Math.round(tray.bottom)} px`);
            if (board.left < -0.5 || board.right > innerWidth + 0.5) problems.push('grid out of the screen');
            // The grid and the tray, what the child plays with, fill most of the screen below the header.
            const share = (board.height + tray.height) / (innerHeight - play.top);
            if (share < 0.6) problems.push(`action ${Math.round(share * 100)} % of the screen`);
            if (board.width < 0.9 * innerWidth - 32) problems.push(`grid ${Math.round(board.width)} px wide`);
            return problems;
        }, sizeOf(l));
        expect(found, `scene ${l.id}`).toEqual([]);
        await page.locator('#back').click();
    }
    await page.locator(`[data-grille-level="${levels.length}"]`).click();
    // A wide font, as on the CI runner (DejaVu Sans): the sentence and the tray must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement, b = document.querySelector('.grille-board')?.getBoundingClientRect(), t = document.querySelector('.grille-tray')?.getBoundingClientRect(); return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && (b?.right ?? 0) <= w && (t?.bottom ?? 0) <= innerHeight ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), grid ${Math.round(b?.left ?? 0)}–${Math.round(b?.right ?? 0)}, tray bottom ${Math.round(t?.bottom ?? 0)}, sentence ${Math.round(document.querySelector('.grille-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
    // The finish buttons side by side, with the wide font, at 320 px.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator('#back').click(); await page.locator('[data-grille-level="1"]').click();
    await put(page, 10, 3);
    await expect(page.locator('.grille-reward')).toBeVisible();
    await expect.poll(() => page.evaluate(() => { const d = document.documentElement, b = [...document.querySelectorAll('.grille-reward button')].map(e => e.getBoundingClientRect()); return d.scrollWidth <= 320 && d.scrollHeight <= innerHeight && b.every(x => x.left >= 0 && x.right <= 320 && x.bottom <= innerHeight) ? 'fits' : `page ${d.scrollWidth}×${d.scrollHeight}, buttons ${b.map(x => `${Math.round(x.left)}–${Math.round(x.right)}/${Math.round(x.bottom)}`).join(', ')}`; })).toBe('fits');
});

test('erasing the progress in the parents’ space also erases the grid stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.grille.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});

test('phone captures of the grid', async ({ page, isMobile }) => {
    test.skip(process.env.CAPTURES !== '1' || !isMobile, 'Set CAPTURES=1 for the phone captures.');
    test.setTimeout(120_000);
    const dir = `${homedir()}/Projets/jeux/captures-kid-grille`;
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(levels.length - 1));
    await page.screenshot({ path: `${dir}/01-niveaux.png` });
    await page.locator('[data-grille-level="1"]').click();
    await page.screenshot({ path: `${dir}/02-une-case-vide.png` });
    await page.locator('[data-image="0"]').click(); await page.locator('[data-cell="10"]').click();
    await page.waitForTimeout(450); await page.screenshot({ path: `${dir}/03-essai-grimace.png` });
    await settled(page, 1);
    await page.locator('#back').click(); await page.locator('[data-grille-level="2"]').click();
    await page.locator('[data-cell="15"]').click(); await page.locator('[data-image="1"]').click();
    await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/04-essai-chamaille.png` });
    await settled(page, 1);
    await put(page, 15, 0);
    await page.waitForTimeout(600); await page.screenshot({ path: `${dir}/05-tableau-anime.png` });
    await page.locator('#back').click(); await page.locator('[data-grille-level="12"]').click();
    await page.locator('[data-cell="13"]').click();
    await page.screenshot({ path: `${dir}/06-croiser-case-choisie.png` });
    await page.locator('#back').click(); await page.locator('[data-grille-level="23"]').click();
    await page.screenshot({ path: `${dir}/07-grande-grille.png` });
    await page.locator('#back').click(); await page.locator('[data-grille-level="34"]').click();
    for (let k = 0; k < 3; k++) { await page.locator('#grille-caliroux').click(); if (k === 0) { await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/08-essai-roulade.png` }); } await settled(page, k + 1); }
    await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/09-aide-qui-brille.png` });
});
