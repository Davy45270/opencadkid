import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { goodSwap, levels, swap, type Miss, type State } from '../../src/engines/bonbons';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; selected: number | null; zone: { x: number; y: number; width: number; height: number } | null; cell: number; cells: { x: number; y: number }[]; help: [number, number] | null; busy: boolean; miss: Miss | null }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { bonbons: Probe } } }).__kid.state().bonbons);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.bonbons.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="bonbons"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && (p.state!.swaps + p.state!.tries) > (before.swaps + before.tries); }, { timeout: 10_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** The finger goes down on cell a and slides to cell b. */
async function slide(page: Page, a: number, b: number): Promise<State> {
    const p = await probe(page), from = p.cells[a]!, to = p.cells[b]!;
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2 + (to.x - from.x) * 0.1, (from.y + to.y) / 2 + (to.y - from.y) * 0.1, { steps: 4 });
    await page.mouse.up();
    return settled(page, p.state!);
}
/** Two touches: cell a, then cell b. */
async function taps(page: Page, a: number, b: number): Promise<State> {
    const p = await probe(page);
    await page.mouse.click(p.cells[a]!.x, p.cells[a]!.y);
    await expect.poll(async () => (await probe(page)).selected).toBe(a);
    await page.mouse.click(p.cells[b]!.x, p.cells[b]!.y);
    return settled(page, p.state!);
}
const missPair = (s: State, wanted?: Miss): [number, number] => {
    for (let i = 0; i < s.grid.length; i++) for (const j of [i + 1, i + s.cols]) { const r = swap(s, i, j); if (r && !r.valid && (!wanted || r.miss === wanted)) return [i, j]; }
    throw new Error('no funny try');
};

test('Lumi says the scene, a slide or two touches swap, lines go into the jar and the scene ends with stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-bonbons-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-bonbons-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-bonbons-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Bonjour, les bonbons !', 'Fais glisser un bonbon vers son voisin pour les échanger.', 'Remplis le pot de Lumi : 8 cœurs rouges.']);
    await expect(page.locator('[data-goal="pot-rouge"] b')).toHaveText('8');
    let p = await probe(page), k = 0;
    while (!p.state!.finished) {
        const [a, b] = goodSwap(p.state!)!;
        const after = k++ % 2 ? await taps(page, a, b) : await slide(page, a, b);
        expect(after.swaps).toBe(k);
        p = await probe(page);
    }
    expect(p.records).toEqual({ 1: 3 });
    await expect(page.locator('.bonbons-reward .stars')).toHaveText('★★★');
    await expect(page.locator('[data-goal="pot-rouge"][data-done]')).toHaveCount(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.bonbons.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#bonbons-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-bonbons-level]:not([disabled])')).toHaveCount(2);
});

test('a swap that makes no line is a funny try: both sweets react and come back, nothing changes', async ({ page }) => {
    await open(page);
    await page.locator('[data-bonbons-level="1"]').click();
    const before = (await probe(page)).state!, [a, b] = missPair(before), miss = swap(before, a, b)!.miss!;
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    const p = await probe(page);
    await page.mouse.move(p.cells[a]!.x, p.cells[a]!.y); await page.mouse.down(); await page.mouse.move(p.cells[b]!.x, p.cells[b]!.y, { steps: 3 }); await page.mouse.up();
    await expect(page.locator(`.bonbons-${miss}`)).toHaveCount(2);
    await expect(page.locator('[data-miss-face]')).toHaveCount(2);
    const fr: Record<Miss, string> = { cogne: 'Bong ! Ils se sont cognés.', saute: 'Hop, hop… et ils reviennent !', rougit: 'Deux pareils ! Ils rougissent.', chatouille: 'Hi hi, ça chatouille !', froisse: 'Le papier fait cric-crac !', lourd: 'Trop lourd, le cube de sucre !', colle: 'Oh, ça colle, le chocolat !' };
    expect((await media(page)).speech).toEqual([fr[miss]]);
    const after = await settled(page, before);
    expect(after.grid).toEqual(before.grid); expect(after.pot).toEqual(before.pot); expect(after.tries).toBe(1); expect(after.swaps).toBe(0);
    await expect(page.locator('[data-miss-face]')).toHaveCount(0);
    // Each tile is back on its own cell.
    for (const [i, t] of before.grid.entries()) if (t) await expect(page.locator(`[data-tile="${t.id}"]`)).toHaveAttribute('data-at', String(i));
});

test('three tries bring two shining sweets; the helped swap costs one star', async ({ page }) => {
    await open(page);
    await page.locator('[data-bonbons-level="1"]').click();
    let s = (await probe(page)).state!;
    for (let k = 0; k < 3; k++) { const [a, b] = missPair(s); s = await slide(page, a, b); }
    const p = await probe(page);
    expect(p.help).toEqual(goodSwap(s));
    await expect(page.locator('.bonbons-hint')).toHaveCount(2);
    s = await slide(page, p.help![0], p.help![1]);
    expect(s.helps).toBe(1); expect(s.dry).toBe(0);
    await expect(page.locator('.bonbons-hint')).toHaveCount(0);
});

test('the board takes the height of a 390 × 844 phone with sweets of at least 44 px, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await open(page, upTo(31));
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of [1, 4, 12, 13, 27, 29, 32]) {
        await page.locator(`[data-bonbons-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!;
        expect(p.cell, `scene ${id}`).toBeGreaterThanOrEqual(44);
        const goals = (await page.locator('.bonbons-goals').boundingBox())!;
        expect(goals.y + goals.height, `scene ${id}`).toBeLessThanOrEqual(844);
        // The board fills the room left between Lumi and the goals: all of it across or down, and most of it down.
        const stage = (await page.locator('.bonbons-stage').boundingBox())!;
        expect(Math.max(zone.width / stage.width, zone.height / stage.height), `scene ${id}`).toBeGreaterThan(0.97);
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.8);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(450);
        await page.locator('#back').click();
    }
    await page.locator('[data-bonbons-level="32"]').click();
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight), `width ${width}`).toBe(true);
    }
});

test('erasing the progress in the parents’ space also erases the sweets stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.bonbons.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
