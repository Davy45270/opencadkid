import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { hint, levels, shapeOf, shapeWidth, type Funny, type Pose, type State } from '../../src/engines/empilo';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; col: number; zone: { x: number; y: number; width: number; height: number } | null; geom: { x0: number; y0: number; cell: number; w: number; h: number; sky: number } | null; hint: Pose | null; busy: boolean; fail: Funny | null }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { empilo: Probe } } }).__kid.state().empilo);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.empilo.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="empilo"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
/** The middle of column x, in the sky above the well. */
const sky = (p: Probe, x: number) => { const g = p.geom!; return { x: g.x0 + (x + .5) * g.cell, y: g.y0 - g.cell / 2 }; };
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && (p.state!.poses !== before.poses || p.state!.tries !== before.tries); }, { timeout: 15_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** A touch on a column: the piece goes there and comes down. */
async function tap(page: Page, x: number): Promise<State> {
    const p = await probe(page), c = sky(p, x), before = p.state!;
    await page.mouse.click(c.x, c.y);
    return settled(page, before);
}
/** A pose as a child does it: the swap button, the turn button, then a touch on the column. */
async function act(page: Page, pose: Pose): Promise<State> {
    let s = (await probe(page)).state!;
    if (pose.piece === 'autre') { await page.locator('#empilo-echange').click(); s = (await probe(page)).state!; }
    for (let k = 0; k < ((pose.rot - s.rot) & 3); k++) await page.locator('#empilo-tourne').click();
    const w = shapeWidth(shapeOf(s.hand, pose.rot));
    return tap(page, pose.col + Math.floor((w - 1) / 2));
}
async function finish(page: Page): Promise<void> {
    let s = (await probe(page)).state!;
    while (!s.finished) s = await act(page, hint(s)!);
}
const clear = (page: Page) => page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });

test('Lumi says the scene, a touch drops a cube, a full row flies away as butterflies, and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-empilo-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-empilo-level]:not([disabled])')).toHaveCount(1);
    await clear(page);
    await page.locator('[data-empilo-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Un cube, deux cubes', 'Glisse la pièce au-dessus d’une colonne, ou touche une colonne : elle descend et se pose.', 'Fais s’envoler 2 rangées.']);
    await expect(page.locator('[data-goal-row]')).toHaveCount(2);
    await expect(page.locator('#empilo-tourne')).toHaveCount(0);
    let s = await tap(page, 0);
    expect(s.cols).toEqual(['u', '', '']);
    await expect(page.locator('[data-cell]')).toHaveCount(1);
    await tap(page, 1);
    s = await tap(page, 2);
    expect(s.rows).toBe(1); expect(s.cols).toEqual(['', '', '']);
    await expect(page.locator('[data-goal-row][data-got]')).toHaveCount(1);
    for (const x of [0, 1, 2]) await tap(page, x);
    await expect(page.locator('.empilo-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    expect((await probe(page)).records).toEqual({ 1: 3 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.empilo.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#empilo-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-empilo-level]:not([disabled])')).toHaveCount(2);
});

test('a piece dropped on the little cloud is a funny try: atchoo, the cloud sneezes, nothing changes', async ({ page }) => {
    await open(page, upTo(14));
    await page.locator('[data-empilo-level="15"]').click();
    const before = (await probe(page)).state!;
    expect(before.cloud).toBe(1);
    await clear(page);
    const p = await probe(page), c = sky(p, 1);
    await page.mouse.click(c.x, c.y);
    await expect(page.locator('[data-piece] .empilo-souffle')).toHaveCount(1);
    await expect(page.locator('[data-cloud] .empilo-atchoum')).toHaveCount(1);
    await expect(page.locator('.empilo-bubble text')).toHaveText('Atchoum !');
    expect((await media(page)).speech).toEqual(['Atchoum ! Le nuage souffle la pièce.']);
    const after = await settled(page, before);
    expect([after.cols, after.cloud, after.poses, after.tries]).toEqual([before.cols, before.cloud, 0, 1]);
    await expect(page.locator('.empilo-souffle')).toHaveCount(0);
    // Elsewhere the cube comes down, and the cloud floats one column on.
    const s = await tap(page, 0);
    expect(s.cols[0]).toBe('u'); expect(s.cloud).toBe(2);
});

test('the wall bonks, the hole goes ouh ouh, four turns make the piece dizzy, the rainbow looks for a hole', async ({ page }) => {
    await open(page, upTo(18));
    // Scene 3: a domino slid over the right edge bumps the wall.
    await page.locator('[data-empilo-level="3"]').click();
    let p = await probe(page), before = p.state!;
    const from = sky(p, 1), to = sky(p, 3);
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move(to.x + p.geom!.cell * .3, to.y, { steps: 6 }); await page.mouse.up();
    await expect(page.locator('[data-piece] .empilo-bonk')).toHaveCount(1);
    await expect(page.locator('[data-frame].empilo-secoue')).toHaveCount(1);
    await expect(page.locator('.empilo-bubble text')).toHaveText('Bonk !');
    expect((await settled(page, before)).cols).toEqual(before.cols);
    // Scene 4: a corner over an empty cell leaves a hole that echoes, then its cube slides into it.
    await page.locator('#back').click(); await page.locator('[data-empilo-level="4"]').click();
    await tap(page, 1); await tap(page, 0);
    before = (await probe(page)).state!;
    p = await probe(page); const c = sky(p, 2);
    await page.mouse.click(c.x, c.y);
    await expect(page.locator('[data-hole] .empilo-echo').first()).toBeAttached();
    await expect(page.locator('[data-piece] .empilo-tasse')).toHaveCount(1);
    await expect(page.locator('.empilo-bubble text')).toHaveText('Ouh ouh…');
    const s = await settled(page, before);
    expect(s.cols.map(c => c.length)).toEqual([2, 1, 3, 1, 0]);
    // Scene 6: four turns in a row.
    await page.locator('#back').click(); await page.locator('[data-empilo-level="6"]').click();
    before = (await probe(page)).state!;
    for (let k = 0; k < 4; k++) await page.locator('#empilo-tourne').click();
    await expect(page.locator('[data-piece] .empilo-tournis')).toHaveCount(1);
    await expect(page.locator('#empilo-tourne.empilo-vertige')).toHaveCount(1);
    expect((await settled(page, before)).rot).toBe(0);
    // Scene 18: the rainbow dropped on a column with no hole.
    await page.locator('#back').click(); await page.locator('[data-empilo-level="18"]').click();
    await tap(page, 0); await tap(page, 4);
    expect((await probe(page)).state!.hand).toBe('a');
    before = (await probe(page)).state!;
    p = await probe(page); const r = sky(p, 0);
    await page.mouse.click(r.x, r.y);
    await expect(page.locator('[data-piece] .empilo-cherche')).toHaveCount(1);
    await expect(page.locator('.empilo-bubble text')).toHaveText('Pas de trou ?');
    await settled(page, before);
    // In the hole between the towers, it fills it to the top: three rows fly.
    expect((await tap(page, 2)).rows).toBe(3);
});

test('a slide carries the piece over a column, the turn button turns it, the swap button gives the other piece', async ({ page }) => {
    await open(page, upTo(8));
    await page.locator('[data-empilo-level="8"]').click();
    let p = await probe(page);
    expect([p.state!.hand, p.state!.other]).toEqual(['t', 'u']);
    await page.locator('#empilo-echange').click();
    p = await probe(page); expect([p.state!.hand, p.state!.other]).toEqual(['u', 't']);
    await page.locator('#empilo-echange').click();
    await page.locator('#empilo-tourne').click();
    p = await probe(page); expect(p.state!.rot).toBe(1);
    // Standing, the train is one column wide: slid from the left to the gap, it fills three rows at once.
    const before = p.state!, a = sky(p, 0), b = sky(p, 2);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 6 });
    expect((await probe(page)).col).toBe(2);
    await page.mouse.up();
    const s = await settled(page, before);
    expect(s.rows).toBe(3); expect(s.cols.every(c => c === '')).toBe(true);
});

test('three poses that move no goal make a good place shine in gold; taking it costs one star', async ({ page }) => {
    await open(page, upTo(2));
    await page.locator('[data-empilo-level="2"]').click();
    let s = await tap(page, 0);
    for (let k = 0; k < 3; k++) s = await tap(page, 0);
    expect(s.dry).toBe(3);
    const p = await probe(page);
    expect(p.hint).not.toBeNull();
    await expect(page.locator('.empilo-hint').first()).toBeAttached();
    s = await act(page, p.hint!);
    expect(s.helps).toBe(1); expect(s.dry).toBe(0);
    await expect(page.locator('.empilo-hint')).toHaveCount(0);
    await finish(page);
    await expect(page.locator('.empilo-reward .stars')).toHaveText('★★☆', { timeout: 10_000 });
});

test('the well takes the height of a 390 × 844 phone with cells of at least 44 px, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 9, 12, 23, 31, 32]) {
        await page.locator(`[data-empilo-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!, g = p.geom!;
        expect(g.cell, `scene ${id}`).toBeGreaterThanOrEqual(44);
        const stage = (await page.locator('.empilo-stage').boundingBox())!;
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.97);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(450);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        expect(Math.max(g.cell * (g.h + g.sky) / stage.height, g.cell * g.w / stage.width), `scene ${id}`).toBeGreaterThan(0.85);
        // A cube of the piece fills most of its cell.
        const cube = (await page.locator('[data-piece] .empilo-inner > g').first().boundingBox())!;
        expect(Math.min(cube.width, cube.height) / g.cell, `scene ${id}`).toBeGreaterThan(0.85);
        for (const b of ['#empilo-echange', '#empilo-tourne']) if (await page.locator(b).count()) expect((await page.locator(b).boundingBox())!.height, `scene ${id}`).toBeGreaterThanOrEqual(44);
        await page.locator('#back').click();
    }
    await page.locator('[data-empilo-level="32"]').click();
    // A wide font, as on the CI runner (DejaVu Sans): the two tool buttons and the end buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    const fits = async (what: string): Promise<void> => {
        for (const width of [320, 390, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            // Read as text so that a failure shows the sizes. Compared with the width asked for: a mobile browser widens its
            // layout to fit what overflows.
            await expect.poll(() => page.evaluate(w => { const d = document.documentElement; return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), sentence ${Math.round(document.querySelector('.empilo-instruction')?.getBoundingClientRect().height ?? 0)} px, buttons ${[...document.querySelectorAll('.empilo-tools button, .empilo-reward button')].map(b => Math.round(b.getBoundingClientRect().width)).join('+')} px`; }, width), { message: `${what}, width ${width}` }).toBe('fits');
        }
    };
    await fits('playing');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#back').click();
    await page.locator('[data-empilo-level="31"]').click();
    await finish(page);
    await expect(page.locator('#empilo-next')).toBeVisible({ timeout: 10_000 });
    await fits('the end of a scene');
});

test('erasing the progress in the parents’ space also erases the cubes stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.empilo.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
