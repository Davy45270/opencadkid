import type { Locator, Page } from '@playwright/test';
import { test, expect, media, passGate, prepare, state } from './helpers';
import { levels, type Role, type State } from '../../src/engines/promenade';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; zone: { x: number; y: number; width: number; height: number } | null; waiting: number | null; needed: Role | null; offered: Role[] }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { promenade: Probe } } }).__kid.state().promenade);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.promenade.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="promenade"]').click();
}
const press = async (target: Locator) => { if (test.info().project.name === 'mobile') await target.tap(); else await target.click(); };
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const waitsAt = async (page: Page, obstacle: number) => { await expect.poll(async () => (await probe(page)).waiting, { timeout: 20_000 }).toBe(obstacle); await expect(page.locator('#promenade-foal')).toBeVisible(); };

test('the trapdoor opens, the five foals walk home, then one touch builds a bridge: stars saved and next level unlocked', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-promenade-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-promenade-level]:not([disabled])')).toHaveCount(1);
    await page.locator('[data-promenade-level="1"]').click();
    let p = await probe(page); expect(p.screen).toBe('play'); expect(p.state!.started).toBe(false);
    // Nothing moves before the child opens the trapdoor.
    await page.waitForTimeout(400); expect((await probe(page)).state!.foals.every(f => !f.out)).toBe(true);
    await press(page.locator('#promenade-start'));
    await expect.poll(async () => (await probe(page)).state!.finished, { timeout: 20_000 }).toBe(true);
    p = await probe(page); expect(p.records).toEqual({ 1: 3 });
    await expect(page.locator('.promenade-reward .stars')).toHaveText('★★★');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.promenade.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#promenade-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await press(page.locator('#promenade-start'));
    await waitsAt(page, 0);
    // A single job on offer: the touch on the waiting foal is enough, no buttons to choose from.
    await expect(page.locator('.promenade-roles')).not.toHaveAttribute('data-open', '');
    await press(page.locator('#promenade-foal'));
    await expect.poll(async () => (await probe(page)).state!.finished, { timeout: 20_000 }).toBe(true);
    await expect(page.locator('.promenade-zone [data-bridge]')).toHaveCount(1);
    expect((await probe(page)).records).toEqual({ 1: 3, 2: 3 });
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-promenade-level]:not([disabled])')).toHaveCount(3);
    await page.locator('#back').click(); expect((await state(page)).screen).toBe('home');
});

test('a wrong job is gentle, two make the right one shine and Lumi names it', async ({ page }) => {
    await open(page, upTo(5));
    await page.locator('[data-promenade-level="6"]').click();
    await press(page.locator('#promenade-start'));
    await waitsAt(page, 0);
    await press(page.locator('#promenade-foal'));
    await expect(page.locator('.promenade-roles')).toHaveAttribute('data-open', '');
    const p = await probe(page); expect(p.offered).toEqual(['pont', 'tunnel']); expect(p.needed).toBe('pont');
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await press(page.locator('[data-role="tunnel"]'));
    let after = await probe(page); expect(after.state!.errors[0]).toBe(1); expect(after.state!.cleared[0]).toBe(false);
    await expect(page.locator('[data-role][data-hint]')).toHaveCount(0);
    // Nobody fell: the five are still out or waiting in the trapdoor, none lost.
    expect(after.state!.foals.every(f => !f.home)).toBe(true);
    await press(page.locator('[data-role="tunnel"]'));
    await expect(page.locator('[data-role="pont"][data-hint]')).toHaveCount(1);
    expect((await media(page)).speech).toEqual(['Fais un pont !']);
    await press(page.locator('[data-role="pont"]'));
    await expect.poll(async () => (await probe(page)).state!.cleared[0], { timeout: 5_000 }).toBe(true);
    await waitsAt(page, 1);
    await press(page.locator('#promenade-foal')); await press(page.locator('[data-role="tunnel"]'));
    await expect.poll(async () => (await probe(page)).state!.finished, { timeout: 20_000 }).toBe(true);
    after = await probe(page); expect(after.records[6]).toBe(2);
    await expect(page.locator('.promenade-reward .stars')).toHaveText('★★☆');
});

test('a three-floor level fits a 390 × 844 phone without scrolling, with big touch zones, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await open(page, upTo(44));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-promenade-level="45"]').click();
    expect(levels[44]!.floors).toHaveLength(3);
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await press(page.locator('#promenade-start'));
    await waitsAt(page, 0);
    const foal = (await page.locator('#promenade-foal').boundingBox())!;
    expect(foal.width).toBeGreaterThanOrEqual(88); expect(foal.height).toBeGreaterThanOrEqual(88);
    await press(page.locator('#promenade-foal'));
    for (const box of await Promise.all((await page.locator('[data-role]').all()).map(b => b.boundingBox()))) { expect(box!.width).toBeGreaterThanOrEqual(72); expect(box!.y + box!.height).toBeLessThanOrEqual(844); }
});

test('erasing the progress in the parents’ space also erases the walk stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.promenade.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
