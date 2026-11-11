import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { levels, type Fail, type State } from '../../src/engines/essaim';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; zone: { x: number; y: number; width: number; height: number } | null; geom: { x0: number; cell: number; rocketY: number; top: number; bottom: number; left: number; right: number } | null; paused: boolean; fail: Fail | null; held: boolean; ending: boolean; hint: { goal: number; lane: number }[] }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { essaim: Probe } } }).__kid.state().essaim);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.essaim.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="essaim"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
/** The sky of a lane, two rows above the rocket; -1 and 5 are the edge bands. */
const at = (p: Probe, lane: number) => { const g = p.geom!; return { x: lane < 0 ? (g.left + g.x0) / 2 : lane > 4 ? (g.x0 + 5 * g.cell + g.right) / 2 : g.x0 + (lane + .5) * g.cell, y: g.rocketY - 2 * g.cell }; };
async function tap(page: Page, lane: number): Promise<State> {
    const p = await probe(page), c = at(p, lane), before = p.state!.touches;
    await page.mouse.click(c.x, c.y);
    await expect.poll(async () => (await probe(page)).state!.touches).toBe(before + 1);
    return (await probe(page)).state!;
}
const got = async (page: Page): Promise<number> => (await probe(page)).state!.goals.filter(g => g.got).length;
const clear = (page: Page) => page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
/** Waits for a funny try and checks it while it plays: the rocket's animation, the thing's, the bubble. */
async function funny(page: Page, kind: Fail, rocket: string, thing: string, word: string, timeout = 15_000): Promise<void> {
    await expect.poll(async () => (await probe(page)).fail, { timeout }).toBe(kind);
    await expect(page.locator(`[data-rocket] .essaim-fusee.${rocket}`)).toHaveCount(1);
    await expect(page.locator(thing).first()).toBeAttached();
    await expect(page.locator('.essaim-bulle-mot text')).toHaveText(word);
    await expect.poll(async () => (await probe(page)).fail, { timeout: 5_000 }).toBeNull();
}

test('Boubou says the scene, the rocket picks up the stars, the home planet comes down, and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-essaim-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-essaim-level]:not([disabled])')).toHaveCount(1);
    await clear(page);
    await page.locator('[data-essaim-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Bonjour les étoiles', 'Touche un couloir du ciel : la fusée de Boubou y glisse.', 'Ramasse les étoiles et les amis perdus.']);
    await expect(page.locator('[data-goal]')).toHaveCount(4);
    // The three stars straight ahead come by themselves.
    await expect.poll(() => got(page), { timeout: 15_000 }).toBe(3);
    await expect(page.locator('[data-goal][data-got]')).toHaveCount(3);
    // The far one on the left: a touch on the left lane.
    const s = await tap(page, 0);
    expect(s.target).toBe(0);
    await expect.poll(async () => (await probe(page)).state!.finished, { timeout: 15_000 }).toBe(true);
    await expect(page.locator('[data-planet] .essaim-planete')).toHaveCount(1);
    await expect(page.locator('.essaim-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    expect((await probe(page)).records).toEqual({ 1: 3 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.essaim.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#essaim-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-essaim-level]:not([disabled])')).toHaveCount(2);
});

test('a soft rock in the lane is a funny try: boing, the rocket spins, nothing changes', async ({ page }) => {
    await open(page, upTo(5));
    await page.locator('[data-essaim-level="6"]').click();
    await clear(page);
    // Scene 6: the rocket stays in the middle lane; the star of row 1 comes by the magnet, the rock of row 2 is in its lane.
    await funny(page, 'rocher', 'essaim-fusee-toupie', '[data-thing="o"] .essaim-rocher-mou', 'Boing !');
    expect((await media(page)).speech).toContain('Boing ! La fusée rebondit sur le rocher mou et fait la toupie.');
    const s = (await probe(page)).state!;
    expect([s.tries, s.touches, s.goals.filter(g => g.got).length, s.pos]).toEqual([1, 0, 1, 4]);
});

test('the dust makes it sneeze, the edge says peekaboo, a lost friend follows the rocket, a held finger slows the sky', async ({ page }) => {
    await open(page, upTo(6));
    // Scene 7: the dust of row 3 is in lane 1.
    await page.locator('[data-essaim-level="7"]').click();
    await tap(page, 1);
    await expect.poll(async () => (await probe(page)).fail, { timeout: 15_000 }).toBe('poussiere');
    await expect(page.locator('[data-rocket] .essaim-fusee.essaim-poussiereuse')).toHaveCount(1);
    await expect(page.locator('[data-thing="d"] .essaim-poussiere-pouf').first()).toBeAttached();
    await expect(page.locator('.essaim-bulle-mot text')).toHaveText('Atchoum !');
    // The left edge: the rocket goes to the edge lane and the shooting star waves.
    await expect.poll(async () => (await probe(page)).fail, { timeout: 5_000 }).toBeNull();
    const p = await probe(page), c = at(p, -1);
    await page.mouse.click(c.x, c.y);
    await funny(page, 'bord', 'essaim-fusee-rebond', '[data-edge="left"] .essaim-filante-coucou', 'Coucou !');
    expect((await probe(page)).state!.target).toBe(0);
    // Scene 4: the little rocket waits in lane 3 (row 4): it lines up behind Boubou.
    await page.locator('#back').click(); await page.locator('[data-essaim-level="4"]').click();
    await tap(page, 3);
    await expect(page.locator('[data-train] [data-friend][data-kind="F"]')).toHaveCount(1, { timeout: 15_000 });
    expect((await probe(page)).state!.train).toEqual(['F']);
    // A finger held on the sky slows it down; lifted, it goes on as before.
    const q = await probe(page), d = at(q, 3);
    await page.mouse.move(d.x, d.y); await page.mouse.down();
    await expect.poll(async () => (await probe(page)).held).toBe(true);
    await page.mouse.up();
    await expect.poll(async () => (await probe(page)).held).toBe(false);
});

test('the sky takes the height of a 390 × 844 phone with lanes of at least 44 px and big things, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [8, 18, 32]) {
        await page.locator(`[data-essaim-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!, g = p.geom!;
        expect(g.cell, `scene ${id}`).toBeGreaterThanOrEqual(44);
        const stage = (await page.locator('.essaim-stage').boundingBox())!;
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.97);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(450);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        expect(g.cell * 5 / stage.width, `scene ${id}`).toBeGreaterThan(0.8);
        // The rocket near the bottom, more than a lane high; every star, friend, gate and rock most of a lane wide.
        expect(g.bottom - g.rocketY, `scene ${id}`).toBeLessThan(2 * g.cell);
        expect((await page.locator('[data-rocket] .essaim-fusee').boundingBox())!.height / g.cell, `scene ${id}`).toBeGreaterThan(1.1);
        const things = await page.locator('[data-sky] [data-thing] .essaim-chose').evaluateAll(els => els.map(e => ({ kind: (e.parentElement as HTMLElement).dataset.thing!, w: e.getBoundingClientRect().width })));
        expect(things.length, `scene ${id}`).toBeGreaterThan(3);
        for (const t of things) if (t.kind !== 'h') expect(t.w / g.cell, `scene ${id}, ${t.kind}`).toBeGreaterThan(0.6);
        await page.locator('#back').click();
    }
    // A wide font, as on the CI runner (DejaVu Sans): the sentence, the goals and the end buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    const fits = async (what: string): Promise<void> => {
        for (const width of [320, 390, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            // Read as text so that a failure shows the sizes. Compared with the width asked for: a mobile browser widens its
            // layout to fit what overflows.
            await expect.poll(() => page.evaluate(w => { const d = document.documentElement; return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), sentence ${Math.round(document.querySelector('.essaim-instruction')?.getBoundingClientRect().height ?? 0)} px, goals ${Math.round(document.querySelector('.essaim-goals')?.getBoundingClientRect().height ?? 0)} px, buttons ${[...document.querySelectorAll('.essaim-reward button')].map(b => Math.round(b.getBoundingClientRect().width)).join('+')} px`; }, width), { message: `${what}, width ${width}` }).toBe('fits');
        }
    };
    await page.locator('[data-essaim-level="18"]').click();
    await fits('playing');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#back').click();
    await page.locator('[data-essaim-level="1"]').click();
    await expect.poll(() => got(page), { timeout: 15_000 }).toBe(3);
    await tap(page, 0);
    await expect(page.locator('#essaim-next')).toBeVisible({ timeout: 20_000 });
    await fits('the end of a scene');
});

test('erasing the progress in the parents’ space also erases the trip stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.essaim.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
