import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { goodPlace, HEIGHT, levels, reach, WIDTH, type Miss, type Place, type Reach, type State } from '../../src/engines/collier';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; aim: number; zone: { x: number; y: number; width: number; height: number } | null; launch: { x: number; y: number } | null; help: boolean; good: Reach | null; flying: boolean }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { collier: Probe } } }).__kid.state().collier);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.collier.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="collier"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
/** A touch at `reachUnits` from Boubou's bead in the direction `angle`: a tap aims there and throws. */
async function tapAt(page: Page, angle: number, reachUnits = 55): Promise<void> {
    const p = await probe(page), z = p.zone!, from = p.launch!, shots = p.state!.shots;
    const to = { x: from.x + Math.sin(angle) * reachUnits / WIDTH * z.width, y: from.y - Math.cos(angle) * reachUnits / HEIGHT * z.height };
    await page.mouse.click(to.x, to.y);
    await expect.poll(async () => (await probe(page)).state!.shots).toBe(shots + 1);
    await expect.poll(async () => (await probe(page)).flying).toBe(false);
}
/** The finger goes down, slides towards `angle` showing the dotted line, and lets go. */
async function slideAt(page: Page, angle: number): Promise<void> {
    const p = await probe(page), z = p.zone!, from = p.launch!, shots = p.state!.shots;
    const at = (d: number) => ({ x: from.x + Math.sin(angle) * d / WIDTH * z.width, y: from.y - Math.cos(angle) * d / HEIGHT * z.height });
    const a = at(20), b = at(60);
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 4 });
    await expect(page.locator('[data-aim]')).toHaveAttribute('opacity', '1');
    await page.mouse.up();
    await expect.poll(async () => (await probe(page)).state!.shots).toBe(shots + 1);
    await expect.poll(async () => (await probe(page)).flying).toBe(false);
}
const aimOf = (s: State, place: Place): number => reach(s).find(r => r.place.neck === place.neck && r.place.index === place.index)!.aim;
const findMiss = (s: State, miss: Miss): number => reach(s).find(r => r.bounces === 0 && missOf(s, r) === miss)!.aim;
function missOf(s: State, r: Reach): Miss | null {
    const n = s.necks[r.place.neck]!, near = [n[r.place.index - 1], n[r.place.index]].filter(Boolean), c = s.queue[0];
    if (c === 'arc') return null;
    let size = 1;
    for (let k = r.place.index - 1; k >= 0 && !n[k]!.asleep && n[k]!.color === c; k--) size++;
    for (let k = r.place.index; k < n.length && !n[k]!.asleep && n[k]!.color === c; k++) size++;
    if (size >= 3) return null;
    return near.some(b => b!.asleep) ? 'dodo' : size === 2 ? 'chatouille' : r.place.index === 0 || r.place.index === n.length ? 'bout' : 'rougit';
}

test('Boubou says the scene, a touch on the necklace throws the bead there, three fly away; the scene ends with stars saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-collier-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-collier-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-collier-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Bonjour, les perles !', 'Touche le collier, ou glisse ton doigt pour viser, puis lâche !', 'Fais trois pareilles : elles s’envolent.']);
    await expect(page.locator('[data-bead]')).toHaveCount(4);
    let p = await probe(page);
    const first = p.state!.necks[0]!.length;
    // The best place for the bead in hand, touched directly.
    await tapAt(page, goodPlace(p.state!)!.aim);
    p = await probe(page);
    expect(p.state!.flown).toBe(3); expect(p.state!.necks[0]!.length).toBe(first - 2);
    await expect(page.locator('.collier-fly')).toHaveCount(3);
    while (!p.state!.finished) { await slideAt(page, goodPlace(p.state!)!.aim); p = await probe(page); }
    expect(p.records).toEqual({ 1: 3 });
    await expect(page.locator('.collier-reward .stars')).toHaveText('★★★');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.collier.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#collier-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-collier-level]:not([disabled])')).toHaveCount(2);
});

test('a throw into the void goes boing and comes back to Boubou, nothing else changes', async ({ page }) => {
    await open(page);
    await page.locator('[data-collier-level="1"]').click();
    const before = (await probe(page)).state!;
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await tapAt(page, 100 * Math.PI / 180, 40);
    await expect(page.locator('[data-miss="boing"]')).toHaveCount(1);
    await expect(page.locator('.collier-boubou[data-react="scratch"]')).toHaveCount(1);
    expect((await media(page)).speech).toEqual(['Boing ! La perle revient dans ma main.']);
    const after = (await probe(page)).state!;
    expect(after.necks).toEqual(before.necks); expect(after.queue).toEqual(before.queue); expect(after.dry).toBe(1);
    await expect(page.locator('[data-current] circle').first()).toBeVisible();
    await expect(page.locator('[data-miss]')).toHaveCount(0, { timeout: 4_000 });
});

test('a bead that makes no line goes in anyway with a funny face; the far end bead slides off', async ({ page }) => {
    await open(page, upTo(1));
    await page.locator('[data-collier-level="2"]').click();
    const s = (await probe(page)).state!, angle = reach(s).find(r => missOf(s, r) === 'rougit' || missOf(s, r) === 'bout')!.aim;
    await tapAt(page, angle);
    const shot = await page.evaluate(() => (window as unknown as { __kid: { state: () => { collier: { last: { miss: string; dropped: unknown } } } } }).__kid.state().collier.last);
    expect(['rougit', 'bout']).toContain(shot.miss);
    await expect(page.locator(`.collier-${shot.miss}`)).toHaveCount(1);
    const after = (await probe(page)).state!;
    expect(after.necks[0]!.length).toBe(s.necks[0]!.length); expect(shot.dropped).not.toBeNull();
    await expect(page.locator('[data-dropped]')).toHaveCount(1);
});

test('the big button swaps the beads for free; arrows aim and Enter throws; three throws without a line make a good place pulse', async ({ page }) => {
    await open(page, upTo(2));
    await page.locator('[data-collier-level="3"]').click();
    let s = (await probe(page)).state!;
    await page.locator('#collier-echange').click();
    expect((await probe(page)).state!.queue).toEqual([s.queue[1], s.queue[0]]);
    await page.locator('.collier-zone').focus();
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    expect((await probe(page)).aim).toBeCloseTo(-6 * Math.PI / 180);
    await expect(page.locator('[data-aim]')).toHaveAttribute('opacity', '1');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await probe(page)).state!.shots).toBe(1);
    await expect.poll(async () => (await probe(page)).flying).toBe(false);
    s = (await probe(page)).state!;
    while (s.dry < 3) {
        const miss = reach(s).find(r => missOf(s, r) !== null);
        if (miss) await tapAt(page, miss.aim); else await tapAt(page, 100 * Math.PI / 180, 40);
        s = (await probe(page)).state!;
    }
    const h = await probe(page); expect(h.help).toBe(true);
    await expect(page.locator('[data-place]')).toHaveAttribute('opacity', '1');
    await expect(page.locator('path[data-help]')).toHaveAttribute('opacity', '1');
    await tapAt(page, aimOf(s, h.good!.place));
    const after = (await probe(page)).state!; expect(after.helps).toBe(1); expect(after.dry).toBe(0);
});

test('a sleeping bead snores; the ring goes all around Boubou and he throws downwards too', async ({ page }) => {
    await open(page, upTo(17));
    await page.locator('[data-collier-level="9"]').click();
    let s = (await probe(page)).state!;
    await page.locator('#collier-echange').click(); s = (await probe(page)).state!;
    if (s.queue[0] === 'arc' || !reach(s).some(r => missOf(s, r) === 'dodo')) { await page.locator('#collier-echange').click(); s = (await probe(page)).state!; }
    await tapAt(page, findMiss(s, 'dodo'));
    await expect(page.locator('.collier-dodo')).toHaveCount(1);
    await expect(page.locator('[data-bead][data-asleep]')).toHaveCount(1);
    await page.locator('#back').click();
    await page.locator('[data-collier-level="18"]').click();
    s = (await probe(page)).state!;
    const down = reach(s).filter(r => Math.abs(r.aim) > 2.2);
    expect(down.length).toBeGreaterThan(0);
    await tapAt(page, down[0]!.aim, 30);
    expect((await probe(page)).state!.shots).toBe(1);
});

test('the board takes the height of a 390 × 844 phone with beads of at least 44 px, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 6, 18, 32]) {
        await page.locator(`[data-collier-level="${id}"]`).click();
        const zone = (await probe(page)).zone!, stage = (await page.locator('.collier-stage').boundingBox())!;
        const bead = (await page.locator('[data-bead]').first().boundingBox())!;
        expect(bead.width, `scene ${id}`).toBeGreaterThanOrEqual(44);
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.9);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(450);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        await page.locator('#back').click();
    }
    await page.locator('[data-collier-level="32"]').click();
    // A wide font, as on the CI runner (DejaVu Sans): the swap button and the sentence must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        // Read as text so that a failure shows the sizes, not only « false ».
        // Compared with the width asked for: a mobile browser widens its layout to fit what overflows.
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement, b = document.querySelector('#collier-echange')!.getBoundingClientRect(); return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && b.right <= w ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), button ${Math.round(b.width)} px wide ending at ${Math.round(b.right)}, sentence ${Math.round(document.querySelector('.collier-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
});

test('erasing the progress in the parents’ space also erases the necklace stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.collier.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
