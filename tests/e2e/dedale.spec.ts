import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { cellXY, friendsAt, goalsLeft, levelOf, levels, solve, type Fail, type Move, type State } from '../../src/engines/dedale';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; run: boolean; back: number; zone: { x: number; y: number; width: number; height: number } | null; geom: { x0: number; y0: number; cell: number; w: number; h: number } | null; hint: Move | null; busy: boolean; fail: Fail | null }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { dedale: Probe } } }).__kid.state().dedale);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.dedale.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="dedale"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const DELTA: Record<Move, [number, number]> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
const KEYS: Record<Move, string> = { haut: 'ArrowUp', bas: 'ArrowDown', gauche: 'ArrowLeft', droite: 'ArrowRight' };
const LETTERS: Record<string, Move> = { h: 'haut', b: 'bas', g: 'gauche', d: 'droite' };
/** The middle of the cell x, y on the screen. */
const center = (p: Probe, x: number, y: number) => { const g = p.geom!; return { x: g.x0 + (x + .5) * g.cell, y: g.y0 + (y + .5) * g.cell }; };
const where = (s: State) => cellXY(levelOf(s.level), s.boubou);
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.steps > before.steps; }, { timeout: 15_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** A step as a child does it: a slide on the board from Boubou, or a touch on the neighbouring cell. */
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
    await page.locator('.dedale-zone').focus();
    await page.keyboard.press(KEYS[m]);
}
/** Plays to the end with the keyboard (a tunnel step has no cell to touch). */
async function finish(page: Page): Promise<void> {
    let s = (await probe(page)).state!;
    while (!s.finished) { const before = s; await key(page, solve(s)![0]!); s = await settled(page, before); }
}

test('Boubou says the scene, slides and touches walk him, and the last seed makes the flowers grow, stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-dedale-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-dedale-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-dedale-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Le petit chemin', 'Glisse ton doigt ou touche une flèche : Boubou avance d’une case.', 'Ramasse toutes les graines.']);
    await expect(page.locator('[data-arrow]')).toHaveCount(1);
    await expect(page.locator('[data-goal]')).toHaveCount(3);
    const s = await act(page, 'droite', 'slide');
    expect(where(s)).toEqual({ x: 1, y: 1 });
    await act(page, 'droite');
    await expect(page.locator('[data-goal][data-got]')).toHaveCount(1);
    for (let k = 0; k < 4; k++) await act(page, 'droite', k % 2 ? 'tap' : 'slide');
    await expect(page.locator('.dedale-pousse').first()).toBeAttached();
    await expect(page.locator('.dedale-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    expect((await probe(page)).records).toEqual({ 1: 3 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.dedale.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#dedale-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-dedale-level]:not([disabled])')).toHaveCount(2);
});

test('a step into a hedge is a funny try: boing, the hedge shakes, nothing moves', async ({ page }) => {
    await open(page);
    await page.locator('[data-dedale-level="1"]').click();
    const before = (await probe(page)).state!;
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await key(page, 'haut');
    await expect(page.locator('[data-boubou] .dedale-boing')).toHaveCount(1);
    await expect(page.locator('[data-hedge="0,0"] .dedale-secoue')).toHaveCount(1);
    await expect(page.locator('.dedale-visage-surprise')).toHaveCount(1);
    await expect(page.locator('.dedale-bubble text')).toHaveText('Boing !');
    // Every cell is its own group.
    await expect(page.locator('[data-cells] > g')).toHaveCount(before.grid.length);
    expect((await media(page)).speech).toEqual(['Boing ! On ne passe pas dans la haie.']);
    const after = await settled(page, before);
    expect([after.grid, after.boubou, after.t, after.tries, after.helps]).toEqual([before.grid, before.boubou, before.t, 1, 0]);
    await expect(page.locator('.dedale-boing')).toHaveCount(0);
});

test('friends are a hug, a sneeze; the puddle splashes; the closed gate says not yet', async ({ page }) => {
    await open(page, upTo(10));
    await page.locator('[data-dedale-level="8"]').click();
    let before = (await probe(page)).state!;
    await key(page, 'droite');
    await expect(page.locator('[data-boubou] .dedale-calin')).toHaveCount(1);
    await expect(page.locator('[data-friend][data-kind="herisson"] .dedale-rit')).toHaveCount(1);
    await expect(page.locator('.dedale-bubble text')).toHaveText('Câlin !');
    expect((await settled(page, before)).t).toBe(before.t);
    await page.locator('#back').click();
    await page.locator('[data-dedale-level="5"]').click();
    before = await walk(page, 'd g d g d d');
    expect(before.t).toBe(0);
    await key(page, 'droite');
    await expect(page.locator('[data-boubou] .dedale-atchoum')).toHaveCount(1);
    await expect(page.locator('.dedale-bubble text')).toHaveText('Atchoum !');
    await settled(page, before);
    await page.locator('#back').click();
    await page.locator('[data-dedale-level="7"]').click();
    before = await walk(page, 'd');
    await key(page, 'droite');
    await expect(page.locator('[data-boubou] .dedale-splash')).toHaveCount(1);
    await expect(page.locator('[data-puddle="2,0"] .dedale-vague')).toHaveCount(1);
    await settled(page, before);
    await page.locator('#back').click();
    await page.locator('[data-dedale-level="11"]').click();
    before = await walk(page, 'b b b b b d d d');
    await key(page, 'haut');
    await expect(page.locator('[data-boubou] .dedale-toque')).toHaveCount(1);
    await expect(page.locator('.dedale-pas-encore')).toHaveCount(1);
    await expect(page.locator('.dedale-bubble text')).toHaveText('Pas encore !');
    expect((await settled(page, before)).boubou).toBe(before.boubou);
});

test('the friends walk their dotted round one cell per step of Boubou; the sun makes them dance and give a seed', async ({ page }) => {
    await open(page, upTo(9));
    await page.locator('[data-dedale-level="9"]').click();
    await expect(page.locator('[data-routes] polyline')).toHaveCount(1);
    const butterfly = page.locator('[data-friend="0"]');
    const cellOf = async (): Promise<string | null> => butterfly.getAttribute('data-cell');
    expect(await cellOf()).toBe(String(friendsAt(levelOf(9), 0)[0]));
    await walk(page, 'g g g h');
    expect(await cellOf()).toBe(String(friendsAt(levelOf(9), 4)[0]));
    const before = (await probe(page)).state!;
    await key(page, 'haut');
    await expect(page.locator('[data-friend] .dedale-danse')).toHaveCount(1);
    await expect(page.locator('.dedale-cadeau')).toHaveCount(1);
    const s = await settled(page, before);
    expect(s.bonus).toBe(1);
    await expect(page.locator('[data-bonus]')).toHaveCount(1);
    expect(await cellOf()).toBe(String(friendsAt(levelOf(9), before.t)[0]));
});

test('with « by himself », a slide walks Boubou along the snail’s alley to the next seed; the back button undoes each step', async ({ page }) => {
    await open(page, upTo(11));
    await page.locator('[data-dedale-level="12"]').click();
    await expect(page.locator('#dedale-seul')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#dedale-seul').click();
    await expect(page.locator('#dedale-seul')).toHaveAttribute('aria-pressed', 'true');
    const first = (await probe(page)).state!;
    const p = await probe(page), c = center(p, 0, 0);
    await page.mouse.move(c.x, c.y); await page.mouse.down();
    await page.mouse.move(c.x + p.geom!.cell * .7, c.y, { steps: 4 }); await page.mouse.up();
    await expect.poll(async () => { const q = await probe(page); return !q.busy && q.state!.steps >= 18; }, { timeout: 20_000 }).toBe(true);
    const s = (await probe(page)).state!;
    expect(where(s)).toEqual({ x: 0, y: 6 }); expect(goalsLeft(s.grid)).toBe(goalsLeft(first.grid) - 1);
    expect((await probe(page)).back).toBe(18);
    for (let k = 0; k < 18; k++) await page.locator('#dedale-retour').click();
    const back = (await probe(page)).state!;
    expect([back.grid, back.boubou]).toEqual([first.grid, first.boubou]);
    await expect(page.locator('#dedale-retour')).toBeDisabled();
});

test('three funny tries make the way to the nearest seed pulse; taking it costs one star', async ({ page }) => {
    await open(page);
    await page.locator('[data-dedale-level="1"]').click();
    let s = (await probe(page)).state!;
    for (let k = 0; k < 3; k++) { const before = s; await key(page, 'haut'); s = await settled(page, before); }
    expect(s.tries).toBe(3);
    const p = await probe(page);
    expect(p.hint).toBe('droite');
    await expect(page.locator('.dedale-hint')).toHaveCount(1);
    s = await act(page, p.hint!);
    expect(s.helps).toBe(1); expect(s.dry).toBe(0);
    await expect(page.locator('.dedale-hint')).toHaveCount(0);
    while (!s.finished) s = await act(page, solve(s)![0]!);
    await expect(page.locator('.dedale-reward .stars')).toHaveText('★★☆', { timeout: 10_000 });
});

test('the board takes the height of a 390 × 844 phone with cells of at least 44 px, seeds stay big, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 4, 12, 23, 31, 32]) {
        await page.locator(`[data-dedale-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!, g = p.geom!;
        expect(g.cell, `scene ${id}`).toBeGreaterThanOrEqual(44);
        const stage = (await page.locator('.dedale-stage').boundingBox())!;
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.97);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(450);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        expect(Math.max(g.cell * g.h / stage.height, g.cell * g.w / stage.width), `scene ${id}`).toBeGreaterThan(0.85);
        // A seed fills most of its cell, and Boubou is as big as one.
        const seed = (await page.locator('.dedale-graine').first().boundingBox())!, boubou = (await page.locator('[data-boubou] .dedale-inner').boundingBox())!;
        expect(Math.min(seed.width, seed.height) / g.cell, `scene ${id}`).toBeGreaterThan(0.7);
        expect(boubou.height / g.cell, `scene ${id}`).toBeGreaterThan(0.85);
        for (const b of ['#dedale-retour', '#dedale-seul']) expect((await page.locator(b).boundingBox())!.height, `scene ${id}`).toBeGreaterThanOrEqual(44);
        await page.locator('#back').click();
    }
    await page.locator('[data-dedale-level="32"]').click();
    // A wide font, as on the CI runner (DejaVu Sans): the two tool buttons and the end buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    const fits = async (what: string): Promise<void> => {
        for (const width of [320, 390, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            // The board is laid out again on the resize event; read as text so that a failure shows the sizes. Compared with
            // the width asked for: a mobile browser widens its layout to fit what overflows.
            await expect.poll(() => page.evaluate(w => { const d = document.documentElement; return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), sentence ${Math.round(document.querySelector('.dedale-instruction')?.getBoundingClientRect().height ?? 0)} px, buttons ${[...document.querySelectorAll('.dedale-tools button, .dedale-reward button')].map(b => Math.round(b.getBoundingClientRect().width)).join('+')} px`; }, width), { message: `${what}, width ${width}` }).toBe('fits');
        }
    };
    await fits('playing');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#back').click();
    await page.locator('[data-dedale-level="31"]').click();
    await finish(page);
    await expect(page.locator('#dedale-next')).toBeVisible({ timeout: 10_000 });
    await fits('the end of a scene');
});

test('erasing the progress in the parents’ space also erases the garden stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.dedale.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
