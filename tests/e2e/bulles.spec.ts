import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { aims, fire, goodAim, HEIGHT, levels, score, WIDTH, type Miss, type State } from '../../src/engines/bulles';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; aim: number; zone: { x: number; y: number; width: number; height: number } | null; launch: { x: number; y: number } | null; help: boolean; good: number | null; flying: boolean }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { bulles: Probe } } }).__kid.state().bulles);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.bulles.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="bulles"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
/** The finger goes down on Boubou's bubble, slides towards `angle`, and lets go. */
async function throwAt(page: Page, angle: number): Promise<void> {
    const p = await probe(page), z = p.zone!, from = p.launch!;
    const to = { x: from.x + Math.sin(angle) * 120 / WIDTH * z.width, y: from.y - Math.cos(angle) * 120 / HEIGHT * z.height };
    const shots = p.state!.shots;
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await expect(page.locator('[data-aim]')).toHaveAttribute('opacity', '1');
    await page.mouse.up();
    await expect.poll(async () => (await probe(page)).state!.shots).toBe(shots + 1);
    await expect.poll(async () => (await probe(page)).flying).toBe(false);
}
/** The aim of the best throw from here, as the greedy solver chooses it. */
const best = (s: State): number => aims.reduce((b, a) => score(levels[s.level - 1]!, fire(s, a).shot!) > score(levels[s.level - 1]!, fire(s, b).shot!) + 1e-9 ? a : b, 0);
const findMiss = (s: State, miss: Miss): number => aims.find(a => fire(s, a).shot!.miss === miss)!;

test('Boubou says the scene, the finger aims with a dotted line and lets go to throw; the scene ends with stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-bulles-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-bulles-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-bulles-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Bonjour, les bulles !', 'Pose ton doigt, vise, puis lâche !']);
    let p = await probe(page);
    while (!p.state!.finished) { await throwAt(page, best(p.state!)); p = await probe(page); }
    expect(p.records).toEqual({ 1: 3 });
    await expect(page.locator('.bulles-reward .stars')).toHaveText('★★★');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.bulles.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#bulles-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-bulles-level]:not([disabled])')).toHaveCount(2);
});

test('a throw into the void goes boing, Boubou scratches his head, nothing else changes', async ({ page }) => {
    await open(page);
    await page.locator('[data-bulles-level="1"]').click();
    const before = (await probe(page)).state!;
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await throwAt(page, findMiss(before, 'boing'));
    await expect(page.locator('[data-miss="boing"]')).toHaveCount(1);
    await expect(page.locator('.bulles-boubou[data-react="scratch"]')).toHaveCount(1);
    expect((await media(page)).speech).toEqual(['Boing ! Il n’y a rien là-haut.']);
    const after = (await probe(page)).state!;
    expect(after.cells).toHaveLength(before.cells.length + 1); expect(after.butterflies).toBe(0); expect(after.flowers).toBe(0); expect(after.top).toBe(0);
    // The face goes away by itself; the stuck bubble stays.
    await expect(page.locator('[data-miss]')).toHaveCount(0, { timeout: 4_000 });
    await expect(page.locator('[data-cell]')).toHaveCount(before.cells.length + 1);
});

test('letting go below Boubou cancels; arrows aim and Enter throws; three throws for nothing bring the golden line', async ({ page }) => {
    await open(page);
    await page.locator('[data-bulles-level="1"]').click();
    const p = await probe(page), z = p.zone!, from = p.launch!;
    await page.mouse.move(from.x, from.y - 40); await page.mouse.down(); await page.mouse.move(from.x + 10, z.y + z.height - 4, { steps: 3 }); await page.mouse.up();
    await page.waitForTimeout(200); expect((await probe(page)).state!.shots).toBe(0);
    await page.locator('.bulles-zone').focus();
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    expect((await probe(page)).aim).toBeCloseTo(-6 * Math.PI / 180);
    await expect(page.locator('[data-aim]')).toHaveAttribute('opacity', '1');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await probe(page)).state!.shots).toBe(1);
    await expect.poll(async () => (await probe(page)).flying).toBe(false);
    // Throws that change nothing, until the help shows a good throw with a golden line.
    let s = (await probe(page)).state!;
    while (s.dry < 3) { await throwAt(page, aims.find(a => fire(s, a).shot!.miss)!); s = (await probe(page)).state!; }
    const h = await probe(page); expect(h.help).toBe(true); expect(h.good).toBeCloseTo(goodAim(s)!);
    await expect(page.locator('path[data-help]')).toHaveAttribute('opacity', '1');
    await throwAt(page, h.good!);
    const after = (await probe(page)).state!; expect(after.helps).toBe(1); expect(after.dry).toBe(0);
});

test('a scene fits a 390 × 844 phone without scrolling, with big bubbles, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await open(page, upTo(31));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-bulles-level="32"]').click();
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight), `width ${width}`).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const bubble = (await page.locator('[data-cell]').first().boundingBox())!;
    expect(bubble.width).toBeGreaterThanOrEqual(40);
    const zone = (await page.locator('.bulles-zone').boundingBox())!;
    expect(zone.y + zone.height).toBeLessThanOrEqual(844);
});

test('erasing the progress in the parents’ space also erases the bubble stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.bulles.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
