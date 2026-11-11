import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { cellXY, levelOf, levels, solve, type Fail, type Move, type State } from '../../src/engines/pepites';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; back: number; zone: { x: number; y: number; width: number; height: number } | null; geom: { x0: number; y0: number; cell: number; w: number; h: number } | null; hint: Move | null; busy: boolean; fail: Fail | null }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { pepites: Probe } } }).__kid.state().pepites);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.pepites.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="pepites"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const DELTA: Record<Move, [number, number]> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
const KEYS: Record<Move, string> = { haut: 'ArrowUp', bas: 'ArrowDown', gauche: 'ArrowLeft', droite: 'ArrowRight' };
const LETTERS: Record<string, Move> = { h: 'haut', b: 'bas', g: 'gauche', d: 'droite' };
/** The middle of the cell x, y on the screen. */
const center = (p: Probe, x: number, y: number) => { const g = p.geom!; return { x: g.x0 + (x + .5) * g.cell, y: g.y0 + (y + .5) * g.cell }; };
const where = (s: State) => cellXY(levelOf(s.level), s.lumi);
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.steps > before.steps; }, { timeout: 10_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** A step as a child does it: a slide on the board from Lumi, or a touch on the neighbouring cell. */
async function act(page: Page, a: Move, how: 'slide' | 'tap' = 'tap'): Promise<State> {
    const p = await probe(page), s = p.state!, h = where(s), [dx, dy] = DELTA[a];
    if (how === 'tap') { const c = center(p, h.x + dx, h.y + dy); await page.mouse.click(c.x, c.y); }
    else {
        const c = center(p, h.x, h.y);
        await page.mouse.move(c.x, c.y); await page.mouse.down();
        await page.mouse.move(c.x + dx * p.geom!.cell * .7, c.y + dy * p.geom!.cell * .7, { steps: 4 }); await page.mouse.up();
    }
    return settled(page, s);
}
async function walk(page: Page, steps: string): Promise<State> {
    let s = (await probe(page)).state!;
    for (const m of steps.split(' ')) s = await act(page, LETTERS[m]!);
    return s;
}
async function key(page: Page, m: Move): Promise<void> {
    await page.locator('.pepites-zone').focus();
    await page.keyboard.press(KEYS[m]);
}

test('Lumi says the scene, slides and touches dig her way, and the door ends the scene with stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-pepites-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-pepites-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-pepites-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Je creuse tout droit', 'Glisse ton doigt ou touche une flèche : Lumi creuse d’une case.', 'Ramasse toutes les pépites, puis rentre à la maison.']);
    await expect(page.locator('[data-arrow]')).toHaveCount(3);
    await expect(page.locator('[data-goal]')).toHaveCount(1);
    const s = await act(page, 'bas', 'slide');
    expect(where(s)).toEqual({ x: 2, y: 1 });
    await act(page, 'bas');
    await expect(page.locator('[data-goal][data-got]')).toHaveCount(1);
    await expect(page.locator('[data-door][data-ready]')).toHaveCount(1);
    await act(page, 'bas', 'slide'); await act(page, 'bas'); await act(page, 'bas');
    await expect(page.locator('.pepites-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    expect((await probe(page)).records).toEqual({ 1: 3 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.pepites.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#pepites-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-pepites-level]:not([disabled])')).toHaveCount(2);
});

test('a step into hard rock is a funny try: bzzz, Lumi shivers, nothing moves', async ({ page }) => {
    await open(page, upTo(12));
    await page.locator('[data-pepites-level="13"]').click();
    const before = (await probe(page)).state!;
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await key(page, 'bas');
    await expect(page.locator('.pepites-bzzz')).toHaveCount(1);
    await expect(page.locator('.pepites-vibre')).toHaveCount(1);
    // Every cell is its own group (an unclosed tag once nested them all), and the one that shivers is the one under Lumi.
    await expect(page.locator('[data-cells] > g')).toHaveCount(before.grid.length);
    await expect(page.locator('[data-hard="2,1"] .pepites-vibre')).toHaveCount(1);
    await expect(page.locator('.pepites-visage-surprise')).toHaveCount(1);
    await expect(page.locator('.pepites-bubble text')).toHaveText('Bzzz !');
    expect((await media(page)).speech).toEqual(['Bzzz ! La roche dure ne se creuse pas.']);
    const after = await settled(page, before);
    expect([after.grid, after.lumi, after.tries, after.helps]).toEqual([before.grid, before.lumi, 1, 0]);
    await expect(page.locator('.pepites-bzzz')).toHaveCount(0);
});

test('a rock that falls on the hat goes bonk; a rock too heavy makes big eyes', async ({ page }) => {
    await open(page, upTo(3));
    await page.locator('[data-pepites-level="4"]').click();
    await walk(page, 'b b b b b g g h h h');
    const before = (await probe(page)).state!;
    await key(page, 'bas');
    await expect(page.locator('.pepites-bonk')).toHaveCount(1);
    await expect(page.locator('.pepites-etoiles')).toHaveCount(1);
    await expect(page.locator('.pepites-bubble text')).toHaveText('Bonk !');
    await expect.poll(async () => (await probe(page)).fail).toBe('chapeau');
    const after = await settled(page, before);
    expect(where(after)).toEqual({ x: 2, y: 3 }); expect(after.tries).toBe(1);
    await expect.poll(async () => (await probe(page)).busy).toBe(false);
    await page.locator('#back').click();
    await page.locator('[data-pepites-level="3"]').click();
    const under = await walk(page, 'd d d d b b b g g');
    await key(page, 'haut');
    await expect(page.locator('.pepites-pousse')).toHaveCount(1);
    await expect(page.locator('.pepites-gros-yeux')).toHaveCount(1);
    const still = await settled(page, under);
    expect(still.grid).toBe(under.grid);
    // A step back: the rock drops into the hole.
    const dropped = await act(page, 'droite');
    expect(dropped.grid[3 * 6 + 2]).toBe('o');
    await expect(page.locator('[data-thing="o"][data-cell="20"]')).toHaveCount(1);
});

test('the worm yawns, the water goes plouf, the closed door says not yet', async ({ page }) => {
    await open(page, upTo(18));
    await page.locator('[data-pepites-level="19"]').click();
    await walk(page, 'b b b');
    await key(page, 'bas');
    await expect(page.locator('.pepites-chut')).toHaveCount(1);
    await expect(page.locator('.pepites-baille')).toHaveCount(1);
    await expect.poll(async () => (await probe(page)).busy).toBe(false);
    // An apple, then the worm wriggles off.
    let s = await walk(page, 'g h b d b');
    expect(s.basket).toBe(0); expect(s.grid[4 * 5 + 2]).toBe('_');
    await page.locator('#back').click();
    await page.locator('[data-pepites-level="16"]').click();
    await walk(page, 'd d d d d b b g g');
    await key(page, 'gauche');
    await expect(page.locator('.pepites-plouf')).toHaveCount(1);
    await expect(page.locator('.pepites-vague')).toHaveCount(1);
    await expect.poll(async () => (await probe(page)).busy).toBe(false);
    await page.locator('#back').click();
    await page.locator('[data-pepites-level="2"]').click();
    s = await walk(page, 'b b b b b b d');
    await key(page, 'droite');
    await expect(page.locator('.pepites-toque')).toHaveCount(1);
    await expect(page.locator('.pepites-pas-encore')).toHaveCount(1);
    await expect(page.locator('.pepites-bubble text')).toHaveText('Pas encore !');
    expect((await settled(page, s)).lumi).toBe(s.lumi);
});

test('the back button is free and goes back as far as wanted', async ({ page }) => {
    await open(page, upTo(5));
    await page.locator('[data-pepites-level="6"]').click();
    const first = (await probe(page)).state!;
    await expect(page.locator('#pepites-retour')).toBeDisabled();
    for (const a of solve(first)!.slice(0, 5)) await act(page, a);
    expect((await probe(page)).back).toBe(5);
    for (let k = 0; k < 5; k++) await page.locator('#pepites-retour').click();
    const p = await probe(page);
    expect([p.state!.grid, p.state!.lumi]).toEqual([first.grid, first.lumi]);
    expect(p.state!.helps).toBe(0); expect(p.back).toBe(0);
    await expect(page.locator('[data-thing="o"][data-cell="12"]')).toHaveCount(1);
});

test('three funny tries make the right next step shine; taking it costs one star', async ({ page }) => {
    await open(page);
    await page.locator('[data-pepites-level="1"]').click();
    let s = (await probe(page)).state!;
    for (let k = 0; k < 3; k++) { const before = s; await key(page, 'haut'); s = await settled(page, before); }
    expect(s.tries).toBe(3);
    const p = await probe(page);
    expect(p.hint).toBe(solve(s)![0]);
    await expect(page.locator('.pepites-hint')).toHaveCount(1);
    s = await act(page, p.hint!);
    expect(s.helps).toBe(1); expect(s.dry).toBe(0);
    await expect(page.locator('.pepites-hint')).toHaveCount(0);
    while (!s.finished) s = await act(page, solve(s)![0]!);
    await expect(page.locator('.pepites-reward .stars')).toHaveText('★★☆', { timeout: 10_000 });
});

test('the board takes the height of a 390 × 844 phone with cells of at least 44 px, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(29));
    for (const id of [1, 8, 9, 17, 27, 30]) {
        await page.locator(`[data-pepites-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!, g = p.geom!;
        expect(g.cell, `scene ${id}`).toBeGreaterThanOrEqual(44);
        const stage = (await page.locator('.pepites-stage').boundingBox())!;
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.97);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(450);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        expect(Math.max(g.cell * g.h / stage.height, g.cell * g.w / stage.width), `scene ${id}`).toBeGreaterThan(0.85);
        const button = (await page.locator('#pepites-retour').boundingBox())!;
        expect(button.height, `scene ${id}`).toBeGreaterThanOrEqual(44);
        await page.locator('#back').click();
    }
    await page.locator('[data-pepites-level="30"]').click();
    // A wide font, as on the CI runner (DejaVu Sans): the big button and the end buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    const fits = async (what: string): Promise<void> => {
        for (const width of [320, 390, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            // The board is laid out again on the resize event; read as text so that a failure shows the sizes. Compared with
            // the width asked for: a mobile browser widens its layout to fit what overflows.
            await expect.poll(() => page.evaluate(w => { const d = document.documentElement; return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), sentence ${Math.round(document.querySelector('.pepites-instruction')?.getBoundingClientRect().height ?? 0)} px, buttons ${[...document.querySelectorAll('.pepites-tools button, .pepites-reward button')].map(b => Math.round(b.getBoundingClientRect().width)).join('+')} px`; }, width), { message: `${what}, width ${width}` }).toBe('fits');
        }
    };
    await fits('playing');
    await page.setViewportSize({ width: 390, height: 844 });
    let s = (await probe(page)).state!;
    while (!s.finished) s = await act(page, solve(s)![0]!);
    await expect(page.locator('.pepites-reward .stars')).toBeVisible({ timeout: 10_000 });
    await page.locator('#back').click();
    await page.locator('[data-pepites-level="29"]').click();
    s = (await probe(page)).state!;
    while (!s.finished) s = await act(page, solve(s)![0]!);
    await expect(page.locator('#pepites-next')).toBeVisible({ timeout: 10_000 });
    await fits('the end of a scene');
});

test('erasing the progress in the parents’ space also erases the nugget stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.pepites.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
