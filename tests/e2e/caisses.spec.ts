import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { levels, solve, step, type Action, type Fail, type Move, type State } from '../../src/engines/caisses';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; grip: Move | 'any' | null; back: number; zone: { x: number; y: number; width: number; height: number } | null; geom: { x0: number; y0: number; cell: number; w: number; h: number; flip: boolean } | null; hint: Action | null; busy: boolean; fail: Fail | null }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { caisses: Probe } } }).__kid.state().caisses);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.caisses.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="caisses"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const TURN: Record<Move, Move> = { haut: 'gauche', gauche: 'haut', bas: 'droite', droite: 'bas' };
const DELTA: Record<Move, [number, number]> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
/** The middle of the cell x, y of the game on the screen (the board may be drawn turned on its diagonal). */
const center = (p: Probe, x: number, y: number) => { const g = p.geom!, col = g.flip ? y : x, row = g.flip ? x : y; return { x: g.x0 + (col + .5) * g.cell, y: g.y0 + (row + .5) * g.cell }; };
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.steps > before.steps; }, { timeout: 10_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** A move as a child does it: a slide on the board from Boubou, or a touch on the neighbouring cell. */
async function move(page: Page, m: Move, how: 'slide' | 'tap'): Promise<State> {
    const p = await probe(page), s = p.state!, [dx, dy] = DELTA[m];
    if (how === 'tap') {
        // A first touch on a crate holds it; a second one pushes it.
        const c = center(p, s.x + dx, s.y + dy);
        if (s.crates.some(k => !k.sunk && k.x === s.x + dx && k.y === s.y + dy)) { await page.mouse.click(c.x, c.y); await expect.poll(async () => (await probe(page)).grip).toBe(m); }
        await page.mouse.click(c.x, c.y);
    }
    else {
        const c = center(p, s.x, s.y), sm = p.geom!.flip ? TURN[m] : m, [sx, sy] = DELTA[sm];
        await page.mouse.move(c.x, c.y); await page.mouse.down();
        await page.mouse.move(c.x + sx * p.geom!.cell * .7, c.y + sy * p.geom!.cell * .7, { steps: 4 }); await page.mouse.up();
    }
    return settled(page, s);
}
/** Any step of the engine: a pull is a touch on the crate behind, then a touch on the cell Boubou steps to. */
async function act(page: Page, a: Action): Promise<State> {
    if (!a.startsWith('tire-')) return move(page, a as Move, 'tap');
    const m = a.slice(5) as Move, p = await probe(page), s = p.state!, [dx, dy] = DELTA[m];
    const box = center(p, s.x - dx, s.y - dy); await page.mouse.click(box.x, box.y);
    await expect.poll(async () => (await probe(page)).grip).not.toBeNull();
    const to = center(p, s.x + dx, s.y + dy); await page.mouse.click(to.x, to.y);
    return settled(page, s);
}

test('Boubou says the scene, slides and touches push the crate, and the scene ends with stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-caisses-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-caisses-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-caisses-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Tout droit !', 'Glisse ton doigt ou touche une flèche : Boubou pousse la caisse devant lui.', 'Range les jouets sur les places.']);
    await expect(page.locator('[data-arrow]')).toHaveCount(4);
    let s = await move(page, 'droite', 'slide');
    expect(s.crates[0]).toMatchObject({ x: 3, y: 2 });
    s = await move(page, 'droite', 'tap');
    expect(s.finished).toBe(true);
    expect((await probe(page)).records).toEqual({ 1: 3 });
    await expect(page.locator('.caisses-reward .stars')).toHaveText('★★★');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.caisses.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#caisses-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-caisses-level]:not([disabled])')).toHaveCount(2);
});

test('a push against the wall is a funny try: bonk, the crate makes big eyes, nothing moves', async ({ page }) => {
    await open(page, upTo(3));
    await page.locator('[data-caisses-level="4"]').click();
    const before = (await probe(page)).state!;
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('.caisses-zone').focus();
    await page.keyboard.press(((await probe(page)).geom!.flip ? 'ArrowUp' : 'ArrowLeft'));
    await expect(page.locator('.caisses-bonk')).toHaveCount(1);
    await expect(page.locator('.caisses-gros-yeux')).toHaveCount(1);
    await expect(page.locator('.caisses-bubble text')).toHaveText('Bonk !');
    expect((await media(page)).speech).toEqual(['Bonk ! La caisse touche le mur, elle fait les gros yeux.']);
    const after = await settled(page, before);
    expect([after.x, after.y, after.crates, after.tries, after.helps]).toEqual([before.x, before.y, before.crates, 1, 0]);
    await expect(page.locator('.caisses-bonk')).toHaveCount(0);
});

test('touching the crate stuck to Boubou, then stepping back, pulls it; pulling nothing makes him fall on his bottom', async ({ page }) => {
    await open(page, upTo(3));
    await page.locator('[data-caisses-level="4"]').click();
    let s = await act(page, 'tire-droite');
    expect(s.crates[0]).toMatchObject({ x: 1, y: 0 }); expect([s.x, s.y]).toEqual([2, 0]);
    expect((await probe(page)).grip).toBeNull();
    // The pull button with nothing behind Boubou.
    s = await move(page, 'bas', 'tap');
    await page.locator('#caisses-tire').click();
    await expect(page.locator('#caisses-tire')).toHaveAttribute('aria-pressed', 'true');
    const before = s, c = center(await probe(page), s.x + 1, s.y);
    await page.mouse.click(c.x, c.y);
    await expect(page.locator('.caisses-fesses')).toHaveCount(1);
    s = await settled(page, before);
    expect([s.x, s.y, s.tries]).toEqual([before.x, before.y, 1]);
});

test('the back button is free and goes back as far as wanted', async ({ page }) => {
    await open(page, upTo(5));
    await page.locator('[data-caisses-level="6"]').click();
    const first = (await probe(page)).state!;
    await expect(page.locator('#caisses-retour')).toBeDisabled();
    for (const a of solve(first)!.slice(0, 4)) await act(page, a);
    expect((await probe(page)).back).toBe(4);
    for (let k = 0; k < 4; k++) await page.locator('#caisses-retour').click();
    const p = await probe(page);
    expect([p.state!.x, p.state!.y, p.state!.crates]).toEqual([first.x, first.y, first.crates]);
    expect(p.state!.helps).toBe(0); expect(p.back).toBe(0);
});

test('three funny tries make the right next step shine; taking it costs one star', async ({ page }) => {
    await open(page, upTo(2));
    await page.locator('[data-caisses-level="3"]').click();
    let s = (await probe(page)).state!;
    for (let k = 0; k < 3; k++) {
        await page.locator('#caisses-tire').click();
        const before = s, c = center(await probe(page), s.x, s.y + 1);
        await page.mouse.click(c.x, c.y);
        s = await settled(page, before);
    }
    const p = await probe(page);
    expect(p.hint).toBe(solve(s)![0]);
    await expect(page.locator('.caisses-hint')).toHaveCount(1);
    s = await act(page, p.hint!);
    expect(s.helps).toBe(1); expect(s.dry).toBe(0);
    await expect(page.locator('.caisses-hint')).toHaveCount(0);
    while (!s.finished) s = await act(page, solve(s)![0]!);
    await expect(page.locator('.caisses-reward .stars')).toHaveText('★★☆');
});

test('the ice, the belt, the gate and the hole work on the board as in the game', async ({ page }) => {
    await open(page, upTo(11));
    await page.locator('[data-caisses-level="9"]').click();
    await expect(page.locator('[data-gate][data-open]')).toHaveCount(0);
    for (const a of ['gauche', 'haut', 'haut', 'droite'] as Move[]) await act(page, a);
    await expect(page.locator('[data-gate][data-open]')).toHaveCount(1);
    await expect(page.locator('[data-button][data-pressed]')).toHaveCount(1);
    await page.locator('#back').click();
    await page.locator('[data-caisses-level="11"]').click();
    let s = (await probe(page)).state!;
    for (const a of ['gauche', 'haut', 'haut', 'droite', 'droite'] as Move[]) s = await act(page, a);
    expect(s.crates[0]!.sunk).toBe(true);
    await expect(page.locator('[data-crate][data-sunk]')).toHaveCount(1);
    await expect(page.locator('[data-hole][data-filled]')).toHaveCount(1);
    await page.locator('#back').click();
    await page.locator('[data-caisses-level="10"]').click();
    await act(page, 'haut'); s = await act(page, 'droite');
    expect(s.finished).toBe(true);
    expect(step((await probe(page)).state!, 'haut')).toBeNull();
});

test('the board takes the height of a 390 × 844 phone with cells of at least 44 px, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 4, 6, 11, 21, 24, 32]) {
        await page.locator(`[data-caisses-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!, g = p.geom!;
        expect(g.cell, `scene ${id}`).toBeGreaterThanOrEqual(44);
        const stage = (await page.locator('.caisses-stage').boundingBox())!;
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.97);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(450);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        // The grid itself, not only the hedge around it, takes most of the height or of the width.
        const rows = g.flip ? g.w : g.h, cols = g.flip ? g.h : g.w;
        expect(Math.max(g.cell * rows / stage.height, g.cell * cols / stage.width), `scene ${id}`).toBeGreaterThan(0.85);
        await page.locator('#back').click();
    }
    await page.locator('[data-caisses-level="32"]').click();
    // A wide font, as on the CI runner (DejaVu Sans): the two tool buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        // The board is laid out again on the resize event, one frame after the viewport changes.
        // Read as text so that a failure shows the sizes, not only « false ».
        // Compared with the width asked for: a mobile browser widens its layout to fit what overflows.
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement; return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), sentence ${Math.round(document.querySelector('.caisses-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
});

test('erasing the progress in the parents’ space also erases the crate stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.caisses.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
