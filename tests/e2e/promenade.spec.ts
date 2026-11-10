import type { Locator, Page } from '@playwright/test';
import { test, expect, media, passGate, prepare, state } from './helpers';
import { levels, type Role, type State, type Target } from '../../src/engines/promenade';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<string, number>; zone: { x: number; y: number; width: number; height: number } | null; waiting: number | null; needed: string | null; offered: Role[]; targets: Target[] }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { promenade: Probe } } }).__kid.state().promenade);
const KEY = 'opencadkid.promenade.v2';
async function open(page: Page, records?: Record<string, number>, key = KEY): Promise<void> {
    if (records) await page.addInitScript(([r, k]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, JSON.stringify(r)); sessionStorage.setItem('seeded', '1'); } }, [records, key] as const);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="promenade"]').click();
}
const press = async (target: Locator) => { if (test.info().project.name === 'mobile') await target.tap(); else await target.click(); };
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const waitsAt = async (page: Page, gate: number) => { await expect.poll(async () => (await probe(page)).waiting, { timeout: 20_000 }).toBe(gate); };
const finished = async (page: Page) => { await expect.poll(async () => (await probe(page)).state!.finished, { timeout: 30_000 }).toBe(true); };

test('the trapdoor opens, the five foals walk home, then one touch builds a bridge: stars saved and next level unlocked', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-promenade-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-promenade-level]:not([disabled])')).toHaveCount(1);
    await page.locator('[data-promenade-level="1"]').click();
    let p = await probe(page); expect(p.screen).toBe('play'); expect(p.state!.started).toBe(false);
    expect((await media(page)).speech.slice(-2)).toEqual(['Allons nous promener !', 'Touche la trappe : les petits de Lumi vont marcher jusqu’à la porte arc-en-ciel.']);
    // Nothing moves before the child opens the trapdoor.
    await page.waitForTimeout(400); expect((await probe(page)).state!.foals.every(f => !f.out)).toBe(true);
    await press(page.locator('#promenade-start'));
    await finished(page);
    p = await probe(page); expect(p.records).toEqual({ 1: 3 });
    await expect(page.locator('.promenade-reward .stars')).toHaveText('★★★');
    expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!) as object, KEY)).toEqual({ 1: 3 });
    await page.locator('#promenade-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await press(page.locator('#promenade-start'));
    await waitsAt(page, 0);
    // A single job on offer: the touch on the waiting foal is enough, no buttons to choose from.
    await expect(page.locator('.promenade-roles')).not.toHaveAttribute('data-open', '');
    await press(page.locator('#promenade-foal'));
    await finished(page);
    await expect(page.locator('.promenade-zone [data-bridge]')).toHaveCount(1);
    expect((await probe(page)).records).toEqual({ 1: 3, 2: 3 });
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-promenade-level]:not([disabled])')).toHaveCount(3);
    await page.locator('#back').click(); expect((await state(page)).screen).toBe('home');
});

test('a wrong job is a funny try, three make the right one shine and Lumi names it', async ({ page }) => {
    await open(page, upTo(7));
    await page.locator('[data-promenade-level="8"]').click();
    await press(page.locator('#promenade-start'));
    await waitsAt(page, 0);
    await press(page.locator('#promenade-foal'));
    await expect(page.locator('.promenade-roles')).toHaveAttribute('data-open', '');
    const p = await probe(page); expect(p.offered).toEqual(['pont', 'tunnel', 'trou', 'echelle']); expect(p.needed).toBe('pont');
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    // Each wrong job is tried for real: its own little scene plays, then the foal waits again, nothing lost.
    for (const [role, scene] of [['tunnel', 'plouf'], ['trou', 'jet']] as const) {
        await press(page.locator(`[data-role="${role}"]`));
        await expect(page.locator(`[data-fail="${scene}"]`)).toHaveCount(1);
        await waitsAt(page, 0);
        await expect(page.locator('[data-fail]')).toHaveCount(0);
        const after = await probe(page); expect(after.state!.cleared[0]).toBe(false); expect(after.state!.foals.every(f => !f.home)).toBe(true);
        await expect(page.locator('[data-role][data-hint]')).toHaveCount(0);
    }
    expect((await media(page)).speech).toEqual([]);
    await press(page.locator('[data-role="echelle"]'));
    await expect(page.locator('[data-fail="balancoire"]')).toHaveCount(1);
    await waitsAt(page, 0);
    await expect(page.locator('[data-role="pont"][data-hint]')).toHaveCount(1);
    expect((await media(page)).speech).toEqual(['Fais un pont !']);
    await press(page.locator('[data-role="pont"]'));
    await expect.poll(async () => (await probe(page)).state!.cleared[0], { timeout: 5_000 }).toBe(true);
    await waitsAt(page, 1);
    await press(page.locator('#promenade-foal')); await press(page.locator('[data-role="tunnel"]'));
    await finished(page);
    expect((await probe(page)).records[8]).toBe(2);
    await expect(page.locator('.promenade-reward .stars')).toHaveText('★★☆');
});

test('the scenery waits for a touch: treats into the basket, a sleeping bear, a lost rabbit who follows home', async ({ page }) => {
    await open(page, upTo(9));
    await page.locator('[data-promenade-level="10"]').click();
    await press(page.locator('[data-treat="0"]'));
    await expect(page.locator('[data-basket="1"]')).toHaveCount(1);
    await press(page.locator('#promenade-start'));
    await waitsAt(page, 0);
    await expect(page.locator('#promenade-foal')).toBeHidden();
    await expect(page.locator('[data-bear="sleep"]')).toHaveCount(1);
    await press(page.locator('#promenade-thing'));
    await expect(page.locator('[data-bear="awake"]')).toHaveCount(1);
    await finished(page);
    await page.locator('#back').click(); await page.locator('[data-promenade-level="7"]').click();
    await press(page.locator('#promenade-start'));
    await waitsAt(page, 0);
    await press(page.locator('#promenade-thing'));
    await expect.poll(async () => (await probe(page)).state!.friend !== null, { timeout: 5_000 }).toBe(true);
    await finished(page);
    expect((await probe(page)).state!.friend!.home).toBe(true);
    expect((await media(page)).speech.at(-1)).toBe('Bravo ! Les cinq petits et leur ami sont arrivés !');
});

test('a three-floor level fits a 390 × 844 phone without scrolling, with big touch zones, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await open(page, upTo(51));
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of [45, 52]) {
        await page.locator(`[data-promenade-level="${id}"]`).click();
        expect(levels[id - 1]!.floors).toHaveLength(3);
        for (const width of [320, 390, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight), `level ${id} at ${width}`).toBe(true);
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('#back').click();
    }
    await page.locator('[data-promenade-level="45"]').click();
    await press(page.locator('#promenade-start'));
    // The drawbridge flower is there from the start, far from the troupe; the first gate is the drawbridge itself.
    const flower = (await page.locator('#promenade-flower').boundingBox())!;
    expect(flower.width).toBeGreaterThanOrEqual(88);
    await press(page.locator('#promenade-flower'));
    await waitsAt(page, 1);
    const foal = (await page.locator('#promenade-foal').boundingBox())!;
    expect(foal.width).toBeGreaterThanOrEqual(88); expect(foal.height).toBeGreaterThanOrEqual(88);
    await press(page.locator('#promenade-foal'));
    await expect(page.locator('[data-role]')).toHaveCount(4);
    for (const box of await Promise.all((await page.locator('[data-role]').all()).map(b => b.boundingBox()))) { expect(box!.width).toBeGreaterThanOrEqual(72); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(390); expect(box!.y + box!.height).toBeLessThanOrEqual(844); }
});

test('the first walk’s progress keeps its open levels, and erasing in the parents’ space erases the walk stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 }, 'opencadkid.promenade.v1');
    // Levels changed: the old stars are not shown on new levels, but as many levels stay open.
    await expect(page.locator('[data-promenade-level]:not([disabled])')).toHaveCount(3);
    await expect(page.locator('[data-promenade-level] span:has-text("★")')).toHaveCount(0);
    const stored = () => page.evaluate(() => [localStorage.getItem('opencadkid.promenade.v2'), localStorage.getItem('opencadkid.promenade.v1')]);
    expect(await stored()).toEqual(['{"open":3}', null]);
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toEqual(['{"open":3}', null]);
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toEqual(['{}', null]);
});
