import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { cellXY, levelOf, levels, solve, type Action, type Fail, type Move, type State } from '../../src/engines/chenille';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; back: number; zone: { x: number; y: number; width: number; height: number } | null; geom: { x0: number; y0: number; cell: number; w: number; h: number; flip: boolean } | null; hint: Action | null; busy: boolean; fail: Fail | null }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { chenille: Probe } } }).__kid.state().chenille);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.chenille.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="chenille"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const TURN: Record<Move, Move> = { haut: 'gauche', gauche: 'haut', bas: 'droite', droite: 'bas' };
const DELTA: Record<Move, [number, number]> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
const KEYS: Record<Move, string> = { haut: 'ArrowUp', bas: 'ArrowDown', gauche: 'ArrowLeft', droite: 'ArrowRight' };
/** The middle of the cell x, y of the game on the screen (the board may be drawn turned on its diagonal). */
const center = (p: Probe, x: number, y: number) => { const g = p.geom!, col = g.flip ? y : x, row = g.flip ? x : y; return { x: g.x0 + (col + .5) * g.cell, y: g.y0 + (row + .5) * g.cell }; };
const headOf = (s: State) => cellXY(levelOf(s.level), s.body[0]!);
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.steps > before.steps; }, { timeout: 10_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** A step as a child does it: a slide on the board from the head, a touch on the neighbouring cell, or the big button. */
async function act(page: Page, a: Action, how: 'slide' | 'tap' = 'tap'): Promise<State> {
    const p = await probe(page), s = p.state!;
    if (a === 'retourne') await page.locator('#chenille-tourne').click();
    else {
        const h = headOf(s), [dx, dy] = DELTA[a];
        if (how === 'tap') { const c = center(p, h.x + dx, h.y + dy); await page.mouse.click(c.x, c.y); }
        else {
            const c = center(p, h.x, h.y), [sx, sy] = DELTA[p.geom!.flip ? TURN[a] : a];
            await page.mouse.move(c.x, c.y); await page.mouse.down();
            await page.mouse.move(c.x + sx * p.geom!.cell * .7, c.y + sy * p.geom!.cell * .7, { steps: 4 }); await page.mouse.up();
        }
    }
    return settled(page, s);
}
async function key(page: Page, m: Move): Promise<void> {
    const p = await probe(page);
    await page.locator('.chenille-zone').focus();
    await page.keyboard.press(KEYS[p.geom!.flip ? TURN[m] : m]);
}

test('Lumi says the scene, slides and touches guide the caterpillar, and the butterfly ends the scene with stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-chenille-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-chenille-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-chenille-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Miam, une feuille !', 'Glisse ton doigt ou touche une flèche : la chenille avance d’une case.', 'Mange toutes les feuilles, puis va dans le cocon.']);
    await expect(page.locator('[data-arrow]')).toHaveCount(3);
    await expect(page.locator('[data-goal]')).toHaveCount(1);
    let s = await act(page, 'haut', 'slide');
    expect(headOf(s)).toEqual({ x: 2, y: 3 });
    s = await act(page, 'haut');
    expect(s.body.length).toBe(3);
    await expect(page.locator('[data-goal][data-eaten]')).toHaveCount(1);
    await expect(page.locator('[data-cocoon][data-ready]')).toHaveCount(1);
    await act(page, 'haut', 'slide'); await act(page, 'haut');
    await expect(page.locator('.chenille-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    await expect(page.locator('.chenille-papillon')).toHaveCount(1);
    expect((await probe(page)).records).toEqual({ 1: 3 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.chenille.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#chenille-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-chenille-level]:not([disabled])')).toHaveCount(2);
});

test('a step into the hedge is a funny try: boing, the caterpillar rubs its head, nothing moves', async ({ page }) => {
    await open(page);
    await page.locator('[data-chenille-level="1"]').click();
    await act(page, 'gauche'); await act(page, 'gauche');
    const before = (await probe(page)).state!;
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await key(page, 'gauche');
    await expect(page.locator('.chenille-frotte')).toHaveCount(1);
    await expect(page.locator('.chenille-visage-surprise')).toHaveCount(1);
    await expect(page.locator('.chenille-bubble text')).toHaveText('Boing !');
    expect((await media(page)).speech).toEqual(['Boing ! La chenille se cogne la tête.']);
    const after = await settled(page, before);
    expect([after.body, after.eaten, after.tries, after.helps]).toEqual([before.body, before.eaten, 1, 0]);
    await expect(page.locator('.chenille-frotte')).toHaveCount(0);
});

test('going back on itself makes it dizzy; the big button turns it round, the tail becoming the head', async ({ page }) => {
    await open(page, upTo(5));
    await page.locator('[data-chenille-level="6"]').click();
    const first = (await probe(page)).state!;
    await key(page, 'bas');
    await expect(page.locator('.chenille-tournis')).toHaveCount(1);
    let s = await settled(page, first);
    expect(s.body).toEqual(first.body);
    s = await act(page, 'retourne');
    expect(s.body).toEqual([...first.body].reverse());
    // The way through the hedge alley needs turning round: play it to the end.
    while (!s.finished) s = await act(page, solve(s)![0]!);
    await expect(page.locator('.chenille-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
});

test('the back button is free and goes back as far as wanted', async ({ page }) => {
    await open(page, upTo(13));
    await page.locator('[data-chenille-level="14"]').click();
    const first = (await probe(page)).state!;
    await expect(page.locator('#chenille-retour')).toBeDisabled();
    for (const a of solve(first)!.slice(0, 5)) await act(page, a);
    expect((await probe(page)).back).toBe(5);
    for (let k = 0; k < 5; k++) await page.locator('#chenille-retour').click();
    const p = await probe(page);
    expect([p.state!.body, p.state!.eaten, p.state!.grow]).toEqual([first.body, first.eaten, first.grow]);
    expect(p.state!.helps).toBe(0); expect(p.back).toBe(0);
    await expect(page.locator('[data-food][data-eaten]')).toHaveCount(0);
});

test('three funny tries make the right next step shine; taking it costs one star', async ({ page }) => {
    await open(page, upTo(2));
    await page.locator('[data-chenille-level="3"]').click();
    let s = (await probe(page)).state!;
    for (let k = 0; k < 3; k++) { const before = s; await key(page, 'droite'); s = await settled(page, before); }
    expect(s.tries).toBe(3);
    const p = await probe(page);
    expect(p.hint).toBe(solve(s)![0]);
    await expect(page.locator('.chenille-hint')).toHaveCount(1);
    s = await act(page, p.hint!);
    expect(s.helps).toBe(1); expect(s.dry).toBe(0);
    await expect(page.locator('.chenille-hint')).toHaveCount(0);
    while (!s.finished) s = await act(page, solve(s)![0]!);
    await expect(page.locator('.chenille-reward .stars')).toHaveText('★★☆', { timeout: 10_000 });
});

test('the tunnel takes the head out of the other hole, and a colour out of order makes the leaf shake its head', async ({ page }) => {
    await open(page, upTo(20));
    await page.locator('[data-chenille-level="15"]').click();
    await act(page, 'haut');
    const s = await act(page, 'haut');
    expect(headOf(s)).toEqual({ x: 2, y: 0 });
    await page.locator('#back').click();
    await page.locator('[data-chenille-level="21"]').click();
    await act(page, 'haut'); const before = await act(page, 'gauche');
    await key(page, 'haut');
    await expect(page.locator('.chenille-secoue')).toHaveCount(1);
    await expect(page.locator('.chenille-non')).toHaveCount(1);
    const after = await settled(page, before);
    expect([after.body, after.eaten]).toEqual([before.body, 0]);
});

test('the board takes the height of a 390 × 844 phone with cells of at least 44 px, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 8, 10, 13, 22, 26, 32]) {
        await page.locator(`[data-chenille-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!, g = p.geom!;
        expect(g.cell, `scene ${id}`).toBeGreaterThanOrEqual(44);
        const stage = (await page.locator('.chenille-stage').boundingBox())!;
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.97);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(450);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        const rows = g.flip ? g.w : g.h, cols = g.flip ? g.h : g.w;
        expect(Math.max(g.cell * rows / stage.height, g.cell * cols / stage.width), `scene ${id}`).toBeGreaterThan(0.85);
        await page.locator('#back').click();
    }
    await page.locator('[data-chenille-level="32"]').click();
    // A wide font, as on the CI runner (DejaVu Sans): the two big buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
        expect(size, `width ${width}`).toEqual({ width, height: 844 });
    }
});

test('erasing the progress in the parents’ space also erases the caterpillar stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.chenille.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
