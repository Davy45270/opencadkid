import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { levelOf, levels, type Drop, type Funny, type State } from '../../src/engines/orbite';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; now: number; zone: { x: number; y: number; width: number; height: number } | null; geom: { x0: number; cell: number; cols: number; top: number; row: number; birdY: number; lumiY: number; bottom: number } | null; hint: number | null; busy: boolean; fail: Funny | null; offset: number | null; bird: number | null; drops: Drop[] }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { orbite: Probe } } }).__kid.state().orbite);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.orbite.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="orbite"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
/** The sky above column x, at the height of the bird's lane. */
const above = (p: Probe, x: number) => { const g = p.geom!; return { x: g.x0 + (x + .5) * g.cell, y: g.birdY }; };
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.touches !== before.touches; }, { timeout: 15_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** A touch on the sky above a column: Lumi runs there and throws a heart. */
async function tap(page: Page, x: number): Promise<State> {
    const p = await probe(page), c = above(p, x), before = p.state!;
    await page.mouse.click(c.x, c.y);
    return settled(page, before);
}
/** A touch whose funny try is checked while it plays: the heart's animation, the thing's, the bubble. */
async function tryFunny(page: Page, x: number, kind: Funny, heart: string, thing: string, word: string): Promise<State> {
    const p = await probe(page), c = above(p, x), before = p.state!;
    await page.mouse.click(c.x, c.y);
    await expect.poll(async () => (await probe(page)).fail, { timeout: 8_000 }).toBe(kind);
    await expect(page.locator(heart)).toHaveCount(1);
    await expect(page.locator(thing).first()).toBeAttached();
    await expect(page.locator('.orbite-bulle text')).toHaveText(word);
    return settled(page, before);
}
/** Plays a still scene to its end: each touch under the lowest grumpy cloud of a column (the wind taken into account). */
async function finish(page: Page): Promise<void> {
    let s = (await probe(page)).state!;
    while (!s.finished) s = await tap(page, await goodColumn(page));
}
async function goodColumn(page: Page): Promise<number> {
    const p = await probe(page), s = p.state!, off = p.offset!, wind = levelOf(s.level).wind ?? 0;
    for (let j = 0; j < s.troop[0]!.length; j++) for (let r = s.troop.length - 1; r >= 0; r--) { const c = s.troop[r]![j]!; if (c === '.') continue; if (c !== 's') return off + j - wind; break; }
    throw new Error('no grumpy cloud');
}
const clear = (page: Page) => page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });

test('Lumi says the scene, a touch sends a heart, the cloud smiles and flies away, and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-orbite-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-orbite-level]:not([disabled])')).toHaveCount(1);
    await clear(page);
    await page.locator('[data-orbite-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Bonjour les nuages', 'Touche le ciel au-dessus d’un nuage : Lumi y court et lance un cœur.', 'Fais sourire tous les nuages.']);
    await expect(page.locator('[data-goal]')).toHaveCount(3);
    await expect(page.locator('[data-cloud]')).toHaveCount(3);
    let s = await tap(page, 2);
    expect(s.troop).toEqual(['n.n']); expect(s.lumi).toBe(2);
    await expect(page.locator('[data-cloud]')).toHaveCount(2);
    await expect(page.locator('[data-goal][data-got]')).toHaveCount(1);
    await tap(page, 1);
    s = await tap(page, 3);
    expect(s.finished).toBe(true);
    await expect(page.locator('[data-sun] .orbite-soleil-haut')).toHaveCount(1);
    await expect(page.locator('.orbite-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    expect((await probe(page)).records).toEqual({ 1: 3 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.orbite.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#orbite-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-orbite-level]:not([disabled])')).toHaveCount(2);
});

test('a heart that goes past the troop bounces on the Moon: boing, nothing changes', async ({ page }) => {
    await open(page);
    await page.locator('[data-orbite-level="1"]').click();
    await clear(page);
    const before = (await probe(page)).state!;
    const after = await tryFunny(page, 0, 'lune', '[data-heart] .orbite-coeur-boing', '[data-moon] .orbite-lune-boing', 'Boing !');
    expect((await media(page)).speech).toEqual(['Boing ! Le cœur rebondit sur la Lune.']);
    expect([after.troop, after.hearts, after.tries, after.dry]).toEqual([before.troop, 1, 1, 1]);
    await expect(page.locator('.orbite-coeur-boing')).toHaveCount(0);
    // Between the two clouds that are left once the middle one smiled: they giggle.
    await tap(page, 2);
    await tryFunny(page, 2, 'entre', '[data-heart] .orbite-coeur-zigzag', '.orbite-chatouille', 'Hi hi !');
});

test('the helmet blushes, the smiling cloud blows a kiss, the wind bonks, the bird loops, a drop opens the umbrella', async ({ page }) => {
    await open(page, upTo(19));
    // Scene 8: the helmet cloud blushes at the first heart and smiles at the second.
    await page.locator('[data-orbite-level="8"]').click();
    let s = await tryFunny(page, 3, 'rougit', '[data-heart] .orbite-coeur-fond', '.orbite-rougit', 'Oh ! Encore un !');
    expect(s.troop).toEqual(['nrn']); expect(s.dry).toBe(0);
    await expect(page.locator('[data-cloud="0,1"][data-kind="r"]')).toHaveCount(1);
    expect((await tap(page, 3)).troop).toEqual(['n.n']);
    // Scene 20: a cloud that already smiles gets a kiss.
    await page.locator('#back').click(); await page.locator('[data-orbite-level="20"]').click();
    s = await tryFunny(page, 2, 'bisou', '[data-heart] .orbite-coeur-bisou', '[data-cloud="0,1"] .orbite-bisou', 'Smack !');
    expect(s.troop).toEqual(['nsns']);
    // Scene 18: the wind pushes the heart from the last column against the edge; from column 1, it reaches column 2.
    await page.locator('#back').click(); await page.locator('[data-orbite-level="18"]').click();
    await expect(page.locator('[data-wind]')).toHaveCount(1);
    await tryFunny(page, 5, 'bord', '[data-heart] .orbite-coeur-bonk', '[data-frame].orbite-secoue', 'Bonk !');
    expect((await tap(page, 1)).troop).toEqual(['.nn']);
    // Scene 12: a drop falls over column 4; Lumi goes under it and opens her umbrella, no heart is thrown.
    await page.locator('#back').click(); await page.locator('[data-orbite-level="12"]').click();
    await expect.poll(async () => { const p = await probe(page); return p.drops.some(d => d.x === 4 && d.fall <= 6); }, { timeout: 10_000 }).toBe(true);
    s = await tryFunny(page, 4, 'pluie', '[data-lumi] .orbite-ebroue', '[data-lumi] .orbite-parapluie', 'Plic !');
    expect([s.hearts, s.touches, s.tries]).toEqual([0, 1, 1]);
    // Scene 10: the bird flies under the troop; a heart on it makes it loop.
    await page.locator('#back').click(); await page.locator('[data-orbite-level="10"]').click();
    let col = -1;
    await expect.poll(async () => { const p = await probe(page); const b = p.bird ?? -9, c = Math.round(b); col = c; return c >= 1 && c <= 4 && b - c >= -.13 && b - c <= .01; }, { timeout: 15_000 }).toBe(true);
    s = await tryFunny(page, col, 'oiseau', '[data-heart] .orbite-coeur-plume', '[data-bird] .orbite-pirouette', 'Youpi !');
    expect(s.troop).toEqual(['nnnn']);
});

test('three touches that make no cloud smile make the good column shine; taking it costs one star', async ({ page }) => {
    await open(page);
    await page.locator('[data-orbite-level="1"]').click();
    let s = (await probe(page)).state!;
    for (let k = 0; k < 3; k++) s = await tap(page, 0);
    expect(s.dry).toBe(3);
    const p = await probe(page);
    expect(p.hint).toBe(1);
    await expect(page.locator('[data-hint-col="1"] .orbite-hint')).toHaveCount(1);
    s = await tap(page, p.hint!);
    expect(s.helps).toBe(1); expect(s.dry).toBe(0);
    await expect(page.locator('.orbite-hint')).toHaveCount(0);
    await finish(page);
    await expect(page.locator('.orbite-reward .stars')).toHaveText('★★☆', { timeout: 10_000 });
});

test('the sky takes the height of a 390 × 844 phone with columns of at least 44 px and big clouds, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 12, 24, 32]) {
        await page.locator(`[data-orbite-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!, g = p.geom!;
        expect(g.cell, `scene ${id}`).toBeGreaterThanOrEqual(44);
        const stage = (await page.locator('.orbite-stage').boundingBox())!;
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.97);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(450);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        expect(g.cell * g.cols / stage.width, `scene ${id}`).toBeGreaterThan(0.85);
        // Lumi at the bottom, the troop at the top: the sky goes from one end of the stage to the other.
        expect(g.bottom - g.lumiY, `scene ${id}`).toBeLessThan(g.cell);
        // Every cloud is big: almost a column wide; Lumi more than a column high.
        for (const box of await page.locator('[data-cloud] .orbite-nuage').evaluateAll(els => els.map(e => e.getBoundingClientRect().width))) expect(box / g.cell, `scene ${id}`).toBeGreaterThan(0.85);
        expect((await page.locator('[data-lumi] .orbite-lumi-corps').boundingBox())!.height / g.cell, `scene ${id}`).toBeGreaterThan(1.1);
        if (id === 12) {
            await expect.poll(async () => (await probe(page)).drops.length, { timeout: 10_000 }).toBeGreaterThan(0);
            expect((await page.locator('[data-drop] .orbite-goutte').first().boundingBox())!.height, 'a drop').toBeGreaterThanOrEqual(36);
        }
        await page.locator('#back').click();
    }
    // The heart in flight is big too.
    await page.locator('[data-orbite-level="1"]').click();
    const p = await probe(page), c = above(p, 0);
    await page.mouse.click(c.x, c.y);
    await expect.poll(async () => (await page.locator('[data-heart] .orbite-coeur path').count())).toBeGreaterThan(0);
    expect((await page.locator('[data-heart] .orbite-coeur').boundingBox())!.width / p.geom!.cell, 'the heart').toBeGreaterThan(0.6);
    await expect.poll(async () => (await probe(page)).busy, { timeout: 10_000 }).toBe(false);
    // A wide font, as on the CI runner (DejaVu Sans): the sentence, the goals and the end buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    const fits = async (what: string): Promise<void> => {
        for (const width of [320, 390, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            // Read as text so that a failure shows the sizes. Compared with the width asked for: a mobile browser widens its
            // layout to fit what overflows.
            await expect.poll(() => page.evaluate(w => { const d = document.documentElement; return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), sentence ${Math.round(document.querySelector('.orbite-instruction')?.getBoundingClientRect().height ?? 0)} px, goals ${Math.round(document.querySelector('.orbite-goals')?.getBoundingClientRect().height ?? 0)} px, buttons ${[...document.querySelectorAll('.orbite-reward button')].map(b => Math.round(b.getBoundingClientRect().width)).join('+')} px`; }, width), { message: `${what}, width ${width}` }).toBe('fits');
        }
    };
    await fits('playing');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#back').click();
    await page.locator('[data-orbite-level="24"]').click();
    await finish(page);
    await expect(page.locator('#orbite-next')).toBeVisible({ timeout: 10_000 });
    await fits('the end of a scene');
});

test('erasing the progress in the parents’ space also erases the clouds stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.orbite.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
