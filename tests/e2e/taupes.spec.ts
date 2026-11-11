import type { Page } from '@playwright/test';
import { homedir } from 'node:os';
import { test, expect, media, passGate, prepare } from './helpers';
import { goodCell, levels, molesOf, type State } from '../../src/engines/taupes';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; mode: 'creuser' | 'carotte'; zone: { x: number; y: number; width: number; height: number } | null; geom: { x0: number; y0: number; cell: number; w: number; h: number } | null; hint: number | null; busy: boolean; funny: string[] }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { taupes: Probe } } }).__kid.state().taupes);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.taupes.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="taupes"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const centre = (p: Probe, i: number) => { const g = p.geom!; return { x: g.x0 + (i % g.w + .5) * g.cell, y: g.y0 + (Math.floor(i / g.w) + .5) * g.cell }; };
/** Waits until the gesture is played and its animation over. */
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.moves > before.moves; }, { timeout: 10_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** A finger on a cell, as a child does it. */
async function tap(page: Page, i: number): Promise<State> {
    const p = await probe(page), c = centre(p, i);
    await page.mouse.click(c.x, c.y);
    return settled(page, p.state!);
}
const clearSpeech = (page: Page) => page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
const level = (page: Page, id: number) => page.locator(`[data-taupes-level="${id}"]`).click();

test('Tutu says the scene, a touch opens a clod on its flower and dots, and the scene ends with the party and stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-taupes-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-taupes-level]:not([disabled])')).toHaveCount(1);
    await clearSpeech(page);
    await level(page, 1);
    expect((await media(page)).speech).toEqual(['Une taupe dort', 'Touche une motte. Sans taupe, elle s’ouvre sur une fleur : les petites taupes dessinées disent combien dorment juste à côté.', 'Ouvre toutes les mottes, sauf celle de la taupe.']);
    // No carrot yet: no tool buttons, the pocket shows the sleeping mole.
    await expect(page.locator('.taupes-tools')).toHaveCount(0);
    await expect(page.locator('[data-kind="motte"]')).toHaveCount(3);
    let s = await tap(page, 5);
    expect(s.open).toContain(5);
    await expect(page.locator('[data-cell="5"] [data-dots="1"]')).toHaveCount(1);
    await expect(page.locator('#taupes-message')).toHaveText('Une taupe dort juste à côté.');
    s = await tap(page, 7);
    expect(s.finished).toBe(true);
    await expect(page.locator('.taupes-fete')).toHaveCount(1);
    expect((await probe(page)).records).toEqual({ 1: 3 });
    await expect(page.locator('.taupes-reward .stars')).toHaveText('★★★');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.taupes.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#taupes-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-taupes-level]:not([disabled])')).toHaveCount(2);
});

test('a mole touched is a funny try: it yawns « shh », and nothing changes', async ({ page }) => {
    await open(page);
    await level(page, 1);
    const before = (await probe(page)).state!;
    await clearSpeech(page);
    const c = centre(await probe(page), 8);
    await page.mouse.click(c.x, c.y);
    await expect(page.locator('.taupes-baille')).toHaveCount(1);
    await expect(page.locator('.taupes-bulle text')).toHaveText('Chut !');
    await expect(page.locator('.taupes-tutu-chut')).toHaveCount(1);
    expect((await media(page)).speech).toEqual(['Chut, je dors ! La taupe bâille et se rendort.']);
    const after = await settled(page, before);
    expect([after.open, after.tries, after.finished]).toEqual([before.open, 1, false]);
    await expect(page.locator('.taupes-baille')).toHaveCount(0);
    await expect(page.locator('[data-cell="8"]')).toHaveAttribute('data-kind', 'motte');
});

test('the carrot: the tool or a long press puts one on a mole; a rabbit takes one put on an empty clod; dug, it jumps', async ({ page }) => {
    await open(page, upTo(11));
    await level(page, 12);
    const p = await probe(page), mole = molesOf(levels[11]!)[0]!, empty = levels[11]!.rows.join('').indexOf('.');
    // A long press on the mole.
    const c = centre(p, mole);
    await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.waitForTimeout(650); await page.mouse.up();
    let s = await settled(page, p.state!);
    expect(s.carrots).toEqual([mole]);
    await expect(page.locator(`[data-cell="${mole}"] .taupes-carotte`)).toHaveCount(1);
    await expect(page.locator('.taupes-poche [data-used]')).toHaveCount(1);
    // Dug, the carrot jumps.
    const b = s; await page.mouse.click(c.x, c.y);
    await expect(page.locator('.taupes-saute')).toHaveCount(1); s = await settled(page, b);
    // The carrot tool, on an empty clod: the rabbit.
    await page.locator('#taupes-carotte').click();
    await expect(page.locator('#taupes-carotte')).toHaveAttribute('aria-pressed', 'true');
    const e = centre(await probe(page), empty); await page.mouse.click(e.x, e.y);
    await expect(page.locator('.taupes-lapin')).toHaveCount(1);
    await expect(page.locator('.taupes-bulle text')).toHaveText('Hop hop !');
    s = await settled(page, s);
    expect([s.carrots, s.open.includes(empty)]).toEqual([[mole], false]);
    // With the tool, the carrot comes back to the pocket.
    await page.mouse.click(c.x, c.y); s = await settled(page, s);
    expect(s.carrots).toEqual([]);
    await page.locator('#taupes-creuser').click(); expect((await probe(page)).mode).toBe('creuser');
});

test('Tutu, the lawn round the garden, a flower and a rock each play their funny try', async ({ page }) => {
    await open(page, upTo(11));
    await level(page, 12);
    let s = (await probe(page)).state!;
    const rock = levels[11]!.rows.join('').indexOf('#'), flower = s.open[0]!;
    const plays: [() => Promise<void>, string, string][] = [
        [() => page.locator('#guide').click(), '.taupes-galipette', 'Youpi !'],
        [async () => { const p = await probe(page), g = p.geom!, z = p.zone!; await page.mouse.click(g.x0 + g.cell, z.y + Math.max(6, (g.y0 - z.y) / 2)); }, '.taupes-ver', 'Coucou !'],
        [async () => { const c = centre(await probe(page), flower); await page.mouse.click(c.x, c.y); }, '.taupes-atchoum', 'Atchoum !'],
        [async () => { const c = centre(await probe(page), rock); await page.mouse.click(c.x, c.y); }, '.taupes-toc', 'Toc !']
    ];
    for (const [go, cls, word] of plays) {
        const before = s;
        await go();
        await expect(page.locator(cls), cls).toHaveCount(1);
        await expect(page.locator('.taupes-bulle text')).toHaveText(word);
        s = await settled(page, before);
        expect([s.open, s.tries]).toEqual([before.open, before.tries + 1]);
    }
    // After three funny tries and more, a clod shines.
    await expect(page.locator('[data-hint]')).toHaveCount(1);
});

test('after three funny tries the clod to dig shines; digging it costs one star', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, upTo(9));
    await level(page, 10);
    for (let k = 0; k < 3; k++) { const b = (await probe(page)).state!; await page.locator('#guide').click(); await settled(page, b); }
    const p = await probe(page);
    expect(p.hint).not.toBeNull();
    await expect(page.locator(`[data-hint="${p.hint}"]`)).toHaveCount(1);
    let s = await tap(page, p.hint!);
    expect(s.helps).toBe(1);
    while (!s.finished) s = await tap(page, goodCell(s)!);
    await expect(page.locator('.taupes-reward .stars')).toHaveText('★★☆');
});

test('a clod with no mole around opens its neighbours by itself', async ({ page }) => {
    await open(page, upTo(5));
    await level(page, 6);
    const s = await tap(page, 11);
    expect(s.open).toEqual(expect.arrayContaining([10, 11]));
    await expect(page.locator('[data-cell="10"]')).toHaveAttribute('data-kind', 'fleur');
});

test('on a 390 × 844 phone the garden fills the stage with cells of at least 56 px in every scene, and nothing overflows from 320 to 1280 px', async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const l of levels) {
        await level(page, l.id);
        const p = await probe(page), g = p.geom!, zone = p.zone!;
        const stage = (await page.locator('.taupes-stage').boundingBox())!;
        expect(g.cell, `scene ${l.id}`).toBeGreaterThanOrEqual(56);
        expect(zone.height / stage.height, `scene ${l.id}`).toBeGreaterThan(0.97);
        // The garden fills the stage one way at least: no thin band of action under a big void.
        expect(Math.max(g.cell * g.h / stage.height, g.cell * g.w / stage.width), `scene ${l.id}`).toBeGreaterThan(0.8);
        expect(g.cell * g.h / stage.height, `scene ${l.id}`).toBeGreaterThan(0.6);
        // The whole garden is inside the stage, and the stage does not run under the tools or off the screen.
        expect(g.x0 >= zone.x - 1 && g.y0 >= zone.y - 1 && g.x0 + g.cell * g.w <= zone.x + zone.width + 1 && g.y0 + g.cell * g.h <= zone.y + zone.height + 1, `scene ${l.id}`).toBe(true);
        expect(zone.y + zone.height, `scene ${l.id}`).toBeLessThanOrEqual(844);
        const tools = await page.locator('.taupes-tools').count() ? await page.locator('.taupes-tools').boundingBox() : null;
        if (tools) { expect(tools.y, `scene ${l.id}`).toBeGreaterThanOrEqual(zone.y + zone.height - 1); expect(tools.height).toBeGreaterThanOrEqual(64); }
        const guide = (await page.locator('#guide').boundingBox())!;
        expect(Math.min(guide.width, guide.height)).toBeGreaterThanOrEqual(44);
        await page.locator('#back').click();
    }
    // The wide-font overflow check runs in the desktop project.
    if (info.project.name !== 'desktop') return;
    await level(page, 32);
    // A wide font, as on the CI runner (DejaVu Sans): the tool buttons and the sentence must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement, tools = document.querySelector('.taupes-tools')?.getBoundingClientRect(); return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && (tools?.right ?? 0) <= w ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), tools ${Math.round(tools?.left ?? 0)}–${Math.round(tools?.right ?? 0)} px, sentence ${Math.round(document.querySelector('.taupes-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
});

test('erasing the progress in the parents’ space also erases the mole stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.taupes.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});

test('phone captures', async ({ page, isMobile }) => {
    test.skip(process.env.CAPTURES !== '1' || !isMobile, 'Set CAPTURES=1 for the phone captures.');
    test.setTimeout(120_000);
    const dir = `${homedir()}/Projets/jeux/captures-kid-taupes`;
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    await page.screenshot({ path: `${dir}/01-niveaux.png` });
    await level(page, 1); await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/02-premier-jardin.png` });
    let c = centre(await probe(page), 8); await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(500); await page.screenshot({ path: `${dir}/03-essai-taupe-baille.png` });
    await page.locator('#back').click(); await level(page, 12);
    const mole = molesOf(levels[11]!)[0]!, empty = levels[11]!.rows.join('').indexOf('.');
    await page.locator('#taupes-carotte').click();
    c = centre(await probe(page), empty); await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(450); await page.screenshot({ path: `${dir}/04-essai-lapin.png` });
    await expect.poll(async () => (await probe(page)).busy).toBe(false);
    c = centre(await probe(page), mole); await page.mouse.click(c.x, c.y);
    await expect.poll(async () => (await probe(page)).busy).toBe(false);
    await page.locator('#taupes-creuser').click();
    await page.screenshot({ path: `${dir}/05-carotte-posee.png` });
    await page.locator('#back').click(); await level(page, 21);
    let s = (await probe(page)).state!;
    for (let k = 0; k < 4; k++) s = await tap(page, goodCell(s)!);
    await page.screenshot({ path: `${dir}/06-zigzag-en-cours.png` });
    for (let k = 0; k < 3; k++) { const b = (await probe(page)).state!; await page.locator('#guide').click(); if (k === 0) { await page.waitForTimeout(600); await page.screenshot({ path: `${dir}/07-essai-galipette.png` }); } await settled(page, b); }
    await page.screenshot({ path: `${dir}/08-aide-qui-brille.png` });
    await page.locator('#back').click(); await level(page, 32);
    await page.screenshot({ path: `${dir}/09-grande-fete-debut.png` });
    s = (await probe(page)).state!;
    while (!s.finished) s = await tap(page, goodCell(s)!);
    await page.waitForTimeout(700); await page.screenshot({ path: `${dir}/10-la-fete.png` });
});
