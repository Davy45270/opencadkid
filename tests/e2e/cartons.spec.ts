import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { greedyAction, levels, type Action, type Move, type State } from '../../src/engines/cartons';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; zone: { x: number; y: number; width: number; height: number } | null; geom: { x0: number; y0: number; cell: number; w: number; h: number } | null; hint: { kind: string; x: number; y: number } | null; busy: boolean; funny: string[] }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { cartons: Probe } } }).__kid.state().cartons);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.cartons.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="cartons"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const DELTA: Record<Move, [number, number]> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
const center = (p: Probe, x: number, y: number) => { const g = p.geom!; return { x: g.x0 + (x + .5) * g.cell, y: g.y0 + (y + .5) * g.cell }; };
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.steps > before.steps; }, { timeout: 10_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** A gesture as a child does it: a touch on the cell next to Tutu, the box button, the wait button. */
async function act(page: Page, a: Action): Promise<State> {
    const p = await probe(page), s = p.state!;
    if (a === 'poser') await page.locator('#cartons-poser').click();
    else if (a === 'attendre') await page.locator('#cartons-attendre').click();
    else { const c = center(p, s.x + DELTA[a][0], s.y + DELTA[a][1]); await page.mouse.click(c.x, c.y); }
    return settled(page, s);
}

test('Tutu says the scene, a touch walks, the box counts 3, 2, 1 and goes pouf, and the scene ends with stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-cartons-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-cartons-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-cartons-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Un carton !', 'Touche une case à côté de Tutu pour marcher. Le bouton boîte pose la boîte à confettis : 3, 2, 1… pouf !', 'Trouve les surprises cachées dans les cartons.']);
    await expect(page.locator('[data-arrow]')).toHaveCount(4);
    let s = await act(page, 'bas');
    expect([s.x, s.y]).toEqual([1, 3]);
    await act(page, 'haut');
    await act(page, 'poser');
    await expect(page.locator('[data-box] .cartons-pastille text')).toHaveText('3');
    // The dotted cross shows where the confetti will go before the pouf, the kitten's carton included.
    await expect(page.locator('[data-reach="3,2"]')).toHaveCount(1);
    await act(page, 'attendre');
    await expect(page.locator('[data-box] .cartons-pastille text')).toHaveText('2');
    await act(page, 'attendre');
    await expect(page.locator('[data-box] .cartons-pastille text')).toHaveText('1');
    s = await act(page, 'attendre');
    expect(s.finished).toBe(true); expect(s.found).toEqual(['chaton']);
    expect((await probe(page)).records).toEqual({ 1: 3 });
    await expect(page.locator('.cartons-reward .stars')).toHaveText('★★★');
    await expect(page.locator('.cartons-shelf [data-found]')).toHaveCount(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.cartons.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#cartons-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-cartons-level]:not([disabled])')).toHaveCount(2);
});

test('a step into the bricks is a funny try: Tutu pulls a face, nothing moves', async ({ page }) => {
    await open(page, upTo(3));
    await page.locator('[data-cartons-level="4"]').click();
    for (const a of ['gauche', 'gauche', 'haut'] as Move[]) await act(page, a);
    const before = (await probe(page)).state!;
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('.cartons-zone').focus();
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('.cartons-grimace')).toHaveCount(1);
    await expect(page.locator('.cartons-bulle text')).toHaveText('Beuh !');
    expect((await media(page)).speech).toEqual(['Beuh ! Tutu fait une grimace au mur.']);
    const after = await settled(page, before);
    expect([after.x, after.y, after.grid, after.t, after.tries]).toEqual([before.x, before.y, before.grid, before.t, 1]);
    await expect(page.locator('.cartons-grimace')).toHaveCount(0);
});

test('a pouf on an empty carton brings out the clown, and Tutu in the cross sneezes; a box far from any carton goes pfff', async ({ page }) => {
    await open(page, upTo(1));
    await page.locator('[data-cartons-level="2"]').click();
    // From where Tutu starts, the cross meets no carton.
    await act(page, 'poser');
    await act(page, 'attendre'); await act(page, 'attendre');
    let p = await probe(page), before = p.state!;
    await page.locator('#cartons-attendre').click();
    await expect.poll(async () => (await probe(page)).funny).toEqual(['pfff']);
    await expect(page.locator('.cartons-pfff')).toHaveCount(1);
    await settled(page, before);
    await act(page, 'haut'); await act(page, 'haut'); await act(page, 'poser');
    await act(page, 'attendre'); await act(page, 'attendre');
    p = await probe(page); before = p.state!;
    await page.locator('#cartons-attendre').click();
    await expect(page.locator('.cartons-ressort')).toHaveCount(1);
    await expect(page.locator('.cartons-atchoum')).toHaveCount(1);
    await expect(page.locator('.cartons-sort')).toHaveCount(1);
    const s = await settled(page, before);
    expect(s.finished).toBe(true);
});

test('three poufs without a treasure make the best cell shine; putting the box there costs one star', async ({ page }) => {
    // Twelve poufs and more: the short timings of reduced motion keep the test quick.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, upTo(2));
    await page.locator('[data-cartons-level="3"]').click();
    for (let k = 0; k < 3; k++) { await act(page, 'poser'); for (let j = 0; j < 3; j++) await act(page, 'attendre'); }
    const p = await probe(page);
    expect(p.hint).toMatchObject({ kind: 'poser' });
    await expect(page.locator('[data-hint]')).toHaveCount(1);
    let s = p.state!;
    while (!s.finished) s = await act(page, greedyAction(s)!);
    expect(s.helps).toBe(1);
    await expect(page.locator('.cartons-reward .stars')).toHaveText('★★☆');
});

test('the fan blows the box one cell, the big box sends confetti further, and friends walk their round', async ({ page }) => {
    await open(page, upTo(15));
    await page.locator('[data-cartons-level="16"]').click();
    for (const a of ['gauche', 'gauche', 'haut', 'haut'] as Move[]) await act(page, a);
    let s = await act(page, 'poser');
    expect(s.boxes).toEqual([{ x: 2, y: 2, count: 3 }]);
    await expect(page.locator('[data-box="2,2"]')).toHaveCount(1);
    await page.locator('#back').click();
    await page.locator('[data-cartons-level="10"]').click();
    s = await act(page, 'haut');
    expect(s.range).toBe(3);
    await page.locator('#back').click();
    await page.locator('[data-cartons-level="13"]').click();
    await expect(page.locator('[data-friend]')).toHaveCount(1);
    await act(page, 'attendre');
    expect((await probe(page)).state!.t).toBe(1);
});

test('the yard takes the height of a 390 × 844 phone with cells of at least 44 px, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 5, 12, 22, 30, 32]) {
        await page.locator(`[data-cartons-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!, g = p.geom!;
        expect(g.cell, `scene ${id}`).toBeGreaterThanOrEqual(44);
        const stage = (await page.locator('.cartons-stage').boundingBox())!;
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.97);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(420);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        expect(Math.max(g.cell * g.h / stage.height, g.cell * g.w / stage.width), `scene ${id}`).toBeGreaterThan(0.85);
        await page.locator('#back').click();
    }
    await page.locator('[data-cartons-level="32"]').click();
    // A wide font, as on the CI runner (DejaVu Sans): the two tool buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        // Read as text so that a failure shows the sizes; compared with the width asked for, since a mobile browser widens
        // its layout to fit what overflows.
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement, tools = document.querySelector('.cartons-tools')?.getBoundingClientRect(); return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && (tools?.right ?? 0) <= w ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), tools ${Math.round(tools?.left ?? 0)}–${Math.round(tools?.right ?? 0)} px, sentence ${Math.round(document.querySelector('.cartons-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
});

test('erasing the progress in the parents’ space also erases the surprise stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.cartons.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
