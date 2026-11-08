import type { Page } from '@playwright/test';
import { test, expect, passGate, prepare, state } from './helpers';
import { levels, type State } from '../../src/engines/cherche';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; zone: { x: number; y: number; width: number; height: number } | null; field: { width: number; height: number } }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { cherche: Probe } } }).__kid.state().cherche);
const onScreen = (p: Probe, x: number, y: number) => ({ x: p.zone!.x + x * p.zone!.width / p.field.width, y: p.zone!.y + y * p.zone!.height / p.field.height });
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.cherche.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="cherche"]').click();
}
const touch = async (page: Page, p: { x: number; y: number }) => { if (test.info().project.name === 'mobile') await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); };

test('find every object of the first level: stars saved, next level unlocked, and the way back', async ({ page }) => {
    const props: string[] = [];
    page.on('response', r => { if (/\/assets\/cherche-[\w-]+\.webp$/.test(r.url()) && r.ok()) props.push(r.url()); });
    await open(page);
    await expect(page.locator('[data-cherche-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-cherche-level]:not([disabled])')).toHaveCount(1);
    await page.locator('[data-cherche-level="1"]').click();
    let p = await probe(page); expect(p.screen).toBe('play'); expect(p.state!.level).toBe(1);
    await expect(page.locator('.cherche-list [data-wanted]')).toHaveCount(levels[0]!.find);
    await expect(page.locator('.cherche-zone [data-item]')).toHaveCount(levels[0]!.find + levels[0]!.decoys);
    // Each target touched a little off its centre, as a finger would.
    for (const [i, it] of p.state!.items.entries()) if (it.target) {
        await touch(page, onScreen(p, it.x + 9, it.y - 7));
        await expect(page.locator(`.cherche-zone [data-item="${i}"]`)).toHaveAttribute('data-found', 'true');
        p = await probe(page);
    }
    expect(p.state!.finished).toBe(true); expect(p.records).toEqual({ 1: 3 });
    await expect(page.locator('.cherche-reward .stars')).toHaveText('★★★');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.cherche.v1')!) as object)).toEqual({ 1: 3 });
    // The props drawn in the scene are real pictures, served by the app.
    if (p.state!.items.some(it => !['apple', 'pear', 'berry', 'carrot', 'star', 'fish', 'flower'].includes(it.kind))) expect(props.length).toBeGreaterThan(0);
    await page.locator('#cherche-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-cherche-level]:not([disabled])')).toHaveCount(2);
    await page.locator('#back').click(); expect((await state(page)).screen).toBe('home');
});

test('a miss is gentle, three in a row light up an object to find', async ({ page }) => {
    await open(page);
    await page.locator('[data-cherche-level="1"]').click();
    const p = await probe(page);
    const decoy = p.state!.items.find(it => !it.target)!;
    for (let i = 0; i < 3; i++) await touch(page, onScreen(p, decoy.x, decoy.y));
    const after = await probe(page);
    expect(after.state!.misses).toBe(3); expect(after.state!.items.every(it => !it.found)).toBe(true);
    await expect(page.locator('.cherche-zone [data-hint]')).toHaveCount(1);
    expect(after.state!.items[after.state!.hint!]!.target).toBe(true);
});

test('the last level opens with the scenery hiding some objects, and every screen fits from 320 to 1280 px', async ({ page }) => {
    await open(page, Object.fromEntries(levels.slice(0, -1).map(l => [l.id, 1])));
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(`[data-cherche-level="${levels.length}"]`).click();
    const last = levels.at(-1)!;
    await expect(page.locator('.cherche-zone [data-item]')).toHaveCount(last.find + last.decoys);
    await expect(page.locator('.cherche-zone [data-cover]')).toHaveCount(last.covered);
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        // On a phone, the tap zone of an object to find stays at least 44 CSS px wide.
        const p = await probe(page);
        if (width <= 390) expect(p.zone!.width / p.field.width * 40).toBeGreaterThanOrEqual(width === 320 ? 36 : 44);
    }
});

test('erasing the progress in the parents’ space also erases the hide-and-seek and snack stars', async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('opencadkid.gouter.v1', JSON.stringify({ 1: 3 })); });
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => [localStorage.getItem('opencadkid.cherche.v1'), localStorage.getItem('opencadkid.gouter.v1')]);
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toEqual(['{"1":3,"2":2}', '{"1":3}']);
    // Before this fix, both stayed: only the main save was reset.
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toEqual(['{}', '{}']);
});
