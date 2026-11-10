import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { landing, levels, levelOf, moves, possible, solve, step, type Action, type Fail, type State } from '../../src/engines/traverse';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; zone: { x: number; y: number; width: number; height: number } | null; geom: { x0: number; y0: number; cw: number; ch: number; h: number } | null; hint: Action | null; busy: boolean; fail: Fail | null }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { traverse: Probe } } }).__kid.state().traverse);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.traverse.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="traverse"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const center = (p: Probe, x: number, y: number) => ({ x: p.geom!.x0 + (x + .5) * p.geom!.cw, y: p.geom!.y0 + (p.geom!.h - 1 - y + .5) * p.geom!.ch });
const DELTA: Record<string, [number, number]> = { haut: [0, 1], bas: [0, -1], gauche: [-1, 0], droite: [1, 0] };
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.steps > before.steps; }, { timeout: 10_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** One step as a child does it: a slide on the board, a touch on the neighbouring cell, the light or the eye. */
async function act(page: Page, a: Action, how: 'slide' | 'tap'): Promise<State> {
    const p = await probe(page), s = p.state!;
    if (a === 'feu') { const lt = (await page.locator('[data-light]').boundingBox())!; await page.mouse.click(lt.x + lt.width / 2, lt.y + lt.height / 2); }
    else if (a === 'attendre') await page.locator('#traverse-wait').click();
    else if (how === 'tap') { const c = center(p, s.x + DELTA[a]![0], s.y + DELTA[a]![1]); await page.mouse.click(c.x, c.y); }
    else {
        const c = center(p, s.x, s.y), [dx, dy] = DELTA[a]!;
        await page.mouse.move(c.x, c.y); await page.mouse.down();
        await page.mouse.move(c.x + dx * p.geom!.cw * .7, c.y - dy * p.geom!.ch * .7, { steps: 4 }); await page.mouse.up();
    }
    return settled(page, s);
}
const failStep = (s: State, wanted?: Fail): Action | null => possible(s).find(a => { const r = step(s, a); return r?.landing && !r.landing.ok && (!wanted || r.landing.fail === wanted); }) ?? null;
/** Steps along the bank, left and right, until a step up would be the funny try wanted. */
async function until(page: Page, s: State, wanted: Fail): Promise<State> {
    const up = (st: State): boolean => { const r = step(st, 'haut'); return Boolean(r?.landing && !r.landing.ok && r.landing.fail === wanted); };
    for (let k = 0; !up(s); k++) { const side: Action = k % 4 < 2 ? 'gauche' : 'droite'; s = await act(page, step(s, side)?.landing?.ok ? side : side === 'gauche' ? 'droite' : 'gauche', 'tap'); }
    return s;
}

test('Lumi says the scene, slides and touches move the little one and the world, and the scene ends with stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-traverse-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-traverse-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-traverse-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Une petite route', 'Glisse ton doigt ou touche une flèche. À chaque pas du petit, tout avance d’un pas.', 'Aide le petit à aller à la maison.']);
    let p = await probe(page), k = 0;
    // Big arrows on the cells the little one can step to.
    await expect(page.locator('[data-arrow]')).toHaveCount(moves.filter(a => landing(levelOf(1), p.state!, a)).length);
    for (const a of solve(p.state!)!) {
        const before = p.state!, after = await act(page, a, k++ % 2 ? 'tap' : 'slide');
        expect(after.t).toBe(before.t + 1); expect(after.steps).toBe(k);
        p = await probe(page);
    }
    expect(p.state!.finished).toBe(true);
    expect(p.records).toEqual({ 1: 3 });
    await expect(page.locator('.traverse-reward .stars')).toHaveText('★★★');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.traverse.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#traverse-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-traverse-level]:not([disabled])')).toHaveCount(2);
});

test('a step under a car is a funny try: the car honks and brakes, the little one jumps back, the world waits', async ({ page }) => {
    await open(page, { 1: 3 });
    await page.locator('[data-traverse-level="2"]').click();
    const before = (await probe(page)).state!, a = failStep(before, 'voiture')!;
    expect(a).toBe('haut');
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    const p = await probe(page), c = center(p, before.x, before.y + 1);
    await page.mouse.click(c.x, c.y);
    await expect(page.locator('.traverse-recule')).toHaveCount(1);
    await expect(page.locator('.traverse-surpris')).toHaveCount(1);
    await expect(page.locator('.traverse-bubble text')).toHaveText('Tut tut !');
    expect((await media(page)).speech).toEqual(['Tut tut ! La voiture freine. Hop, on recule !']);
    const after = await settled(page, before);
    expect([after.x, after.y, after.t, after.helps, after.tries]).toEqual([before.x, before.y, before.t, 0, 1]);
    await expect(page.locator('.traverse-recule')).toHaveCount(0);
});

test('the water and the train are funny tries too, each with its own animation', async ({ page }) => {
    await open(page, upTo(11));
    await page.locator('[data-traverse-level="8"]').click();
    let s = await until(page, (await probe(page)).state!, 'plouf');
    await page.locator('.traverse-zone').focus();
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('.traverse-plouf')).toHaveCount(1);
    await expect(page.locator('.traverse-mouille')).toHaveCount(1);
    s = await settled(page, s); expect(s.tries).toBe(1);
    await page.locator('#back').click();
    await page.locator('[data-traverse-level="12"]').click();
    // Walk along the start bank until the barrier rings.
    s = await until(page, (await probe(page)).state!, 'train');
    const before = s;
    await page.locator('.traverse-zone').focus(); await page.keyboard.press('ArrowUp');
    await expect(page.locator('.traverse-siffle')).toHaveCount(1);
    await expect(page.locator('[data-rail][data-closed]')).toHaveCount(1);
    s = await settled(page, before); expect([s.x, s.y, s.t]).toEqual([before.x, before.y, before.t]);
});

test('three funny tries make the right next step shine; taking it costs one star', async ({ page }) => {
    await open(page, { 1: 3 });
    await page.locator('[data-traverse-level="2"]').click();
    let s = (await probe(page)).state!;
    for (let k = 0; k < 3; k++) s = await act(page, failStep(s)!, 'tap');
    const p = await probe(page);
    expect(p.hint).toBe(solve(s)![0]);
    await expect(page.locator('.traverse-hint')).toHaveCount(1);
    s = await act(page, p.hint!, 'tap');
    expect(s.helps).toBe(1); expect(s.dry).toBe(0);
    await expect(page.locator('.traverse-hint')).toHaveCount(0);
    while (!s.finished) s = await act(page, solve(s)![0]!, 'tap');
    await expect(page.locator('.traverse-reward .stars')).toHaveText('★★☆');
});

test('the light stops the cars and the eye lets the world move on', async ({ page }) => {
    await open(page, upTo(15));
    await page.locator('[data-traverse-level="15"]').click();
    const cars = () => page.locator('[data-thing][data-kind="c"]').evaluateAll(els => els.map(el => (el as HTMLElement).dataset.pos).join(','));
    const still = await cars();
    let s = await act(page, 'feu', 'tap');
    expect(s.red).toBe(3);
    await expect(page.locator('[data-light][data-red="true"]')).toHaveCount(1);
    s = await act(page, 'haut', 'tap'); expect(s.y).toBe(1);
    expect(await cars()).toBe(still);
    await page.locator('#back').click();
    await page.locator('[data-traverse-level="16"]').click();
    await expect(page.locator('#traverse-wait')).toBeVisible();
    s = await act(page, 'attendre', 'tap');
    expect([s.x, s.y, s.t]).toEqual([3, 0, 1]);
});

test('the board takes the height of a 390 × 844 phone with cells of at least 44 px, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await open(page, upTo(33));
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of [1, 8, 15, 16, 30, 33, 34]) {
        await page.locator(`[data-traverse-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!;
        expect(p.geom!.cw, `scene ${id}`).toBeGreaterThanOrEqual(44);
        expect(p.geom!.ch, `scene ${id}`).toBeGreaterThanOrEqual(44);
        const stage = (await page.locator('.traverse-stage').boundingBox())!;
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.97);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(450);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        // The grid itself, not only the banks around it, takes most of the height.
        expect(p.geom!.ch * p.geom!.h / stage.height, `scene ${id}`).toBeGreaterThan(id === 1 ? 0.45 : 0.6);
        await page.locator('#back').click();
    }
    await page.locator('[data-traverse-level="34"]').click();
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight), `width ${width}`).toBe(true);
    }
});

test('erasing the progress in the parents’ space also erases the crossing stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.traverse.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
