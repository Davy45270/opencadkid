import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { aims, fire, goodAim, HEIGHT, levels, WIDTH, type Miss, type Shot, type State } from '../../src/engines/briques';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; aim: number; last: Shot | null; zone: { x: number; y: number; width: number; height: number } | null; launch: { x: number; y: number } | null; help: boolean; good: number | null; flying: boolean }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { briques: Probe } } }).__kid.state().briques);
/** Opens the game. `still` asks for reduced motion: the ball lands at once, the funny tries stay on screen. */
async function open(page: Page, records?: Record<number, number>, still = false): Promise<void> {
    if (still) await page.emulateMedia({ reducedMotion: 'reduce' });
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.briques.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="briques"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const screenAt = (p: Probe, deg: number, reach: number) => { const a = deg * Math.PI / 180; return { x: p.launch!.x + Math.sin(a) * reach / WIDTH * p.zone!.width, y: p.launch!.y - Math.cos(a) * reach / HEIGHT * p.zone!.height }; };
/** A touch at `deg` from Lumi's ball: a tap aims there and throws. */
async function tapAt(page: Page, deg: number): Promise<void> {
    const p = await probe(page), shots = p.state!.shots, to = screenAt(p, deg, 60);
    await page.mouse.click(to.x, to.y);
    // The new state comes when the ball is back in Lumi's arms: a long flight takes a few seconds.
    await expect.poll(async () => (await probe(page)).state!.shots, { timeout: 15_000 }).toBe(shots + 1);
    await expect.poll(async () => (await probe(page)).flying).toBe(false);
}
/** Throws the help's direction until a throw that gives `miss` exists, then returns its angle. */
async function towards(page: Page, miss: Miss): Promise<number> {
    for (;;) {
        const s = (await probe(page)).state!, a = aims.find(x => fire(s, x).shot!.miss === miss);
        if (a !== undefined) return a;
        await tapAt(page, goodAim(s)!);
    }
}

test('Lumi says the scene, a touch throws the ball, bricks break and come back to her; the drawing shows and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-briques-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-briques-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-briques-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Bonjour, les briques !', 'Touche le mur, ou glisse ton doigt pour viser, puis lâche !', 'Casse les briques : un dessin se cache derrière.']);
    await expect(page.locator('[data-brick]')).toHaveCount(12);
    let p = await probe(page);
    // The ball flies (visible on its way), breaks what it touches and lands back in Lumi's arms.
    const s0 = p.state!, expected = fire(s0, goodAim(s0)!);
    const shots = s0.shots, to = screenAt(p, goodAim(s0)!, 60);
    await page.mouse.click(to.x, to.y);
    await expect.poll(async () => (await probe(page)).flying).toBe(true);
    await expect(page.locator('[data-flight] [data-ball]')).toHaveCount(1);
    await expect.poll(async () => (await probe(page)).flying, { timeout: 15_000 }).toBe(false);
    p = await probe(page);
    expect(p.state!.shots).toBe(shots + 1); expect(p.state!.bricks).toEqual(expected.state.bricks);
    await expect(page.locator('[data-brick]')).toHaveCount(expected.state.bricks.length);
    await expect(page.locator('[data-hand] circle').first()).toBeVisible();
    while (!p.state!.finished) { await tapAt(page, goodAim(p.state!)!); p = await probe(page); }
    expect(p.records).toEqual({ 1: 3 });
    await expect(page.locator('.briques-reward .stars')).toHaveText('★★★');
    await expect(page.locator('[data-picture].briques-wow')).toHaveCount(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.briques.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#briques-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-briques-level]:not([disabled])')).toHaveCount(2);
});

test('a throw against the iron bricks is a funny try: the iron laughs, nothing breaks, the ball comes back to Lumi', async ({ page }) => {
    await open(page, upTo(10), true);
    await page.locator('[data-briques-level="11"]').click();
    const angle = await towards(page, 'rigole'), before = (await probe(page)).state!;
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await tapAt(page, angle);
    const after = (await probe(page)).state!;
    expect((await probe(page)).last!.miss).toBe('rigole');
    await expect(page.locator('.briques-rigole')).not.toHaveCount(0);
    expect((await media(page)).speech).toEqual(['Hihi ! Le fer rigole, il ne casse pas.']);
    expect(after.broken).toBe(before.broken); expect(after.dry).toBe(before.dry + 1);
    await expect(page.locator('[data-hand] circle').first()).toBeVisible();
    await expect(page.locator('.briques-rigole')).toHaveCount(0, { timeout: 4_000 });
});

test('funny tries: the jelly wobbles, the cloud sneezes, the ball lands on Lumi’s head', async ({ page }) => {
    await open(page, upTo(22), true);
    for (const [id, miss, mark] of [[22, 'tremble', '.briques-tremble'], [2, 'atchoum', '[data-miss="atchoum"] .briques-atchoum'], [2, 'tete', '[data-miss="tete"] .briques-tete']] as const) {
        await page.locator(`[data-briques-level="${id}"]`).click();
        await tapAt(page, await towards(page, miss));
        expect((await probe(page)).last!.miss, `scene ${id}`).toBe(miss);
        await expect(page.locator(mark)).not.toHaveCount(0);
        await page.locator('#back').click();
    }
});

test('a finger slides to aim with the dotted line, lets go on Lumi to cancel; arrows aim and Enter throws; three throws for nothing show the golden line, which costs a star', async ({ page }) => {
    await open(page, upTo(10), true);
    await page.locator('[data-briques-level="10"]').click();
    let p = await probe(page);
    const a = screenAt(p, -30, 30), b = screenAt(p, -30, 80);
    await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 4 });
    await expect(page.locator('[data-aim]')).toHaveAttribute('opacity', '1');
    expect((await probe(page)).aim).toBe(-30);
    await page.mouse.move(p.launch!.x, p.launch!.y, { steps: 3 }); await page.mouse.up();
    expect((await probe(page)).state!.shots).toBe(0);
    await page.locator('.briques-zone').focus();
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    expect((await probe(page)).aim).toBe(-6);
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await probe(page)).state!.shots).toBe(1);
    p = await probe(page);
    while (p.state!.dry < 3) { const s = p.state!, dull = aims.find(x => fire(s, x).shot!.miss); await tapAt(page, dull ?? goodAim(s)!); p = await probe(page); }
    expect(p.help).toBe(true);
    await expect(page.locator('path[data-help]')).toHaveAttribute('opacity', '1');
    await tapAt(page, p.good!);
    const after = (await probe(page)).state!; expect(after.helps).toBe(1); expect(after.dry).toBe(0);
});

test('a sweet brick gives Lumi two balls for the next throw, and both fly', async ({ page }) => {
    await open(page, upTo(12));
    await page.locator('[data-briques-level="13"]').click();
    let p = await probe(page);
    for (;;) {
        const s = p.state!, sweet = aims.find(x => fire(s, x).shot!.sweet);
        await tapAt(page, sweet ?? goodAim(s)!); p = await probe(page);
        if (sweet !== undefined) break;
    }
    expect(p.state!.balls).toBe(2);
    await expect(page.locator('[data-hand] > g')).toHaveCount(2);
    const to = screenAt(p, goodAim(p.state!)!, 60);
    await page.mouse.click(to.x, to.y);
    await expect(page.locator('[data-flight] [data-ball]')).toHaveCount(2);
    await expect.poll(async () => (await probe(page)).flying, { timeout: 15_000 }).toBe(false);
});

test('the board takes the height of a 390 × 844 phone with bricks of at least 44 px, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31), true);
    for (const id of [1, 9, 32]) {
        await page.locator(`[data-briques-level="${id}"]`).click();
        const zone = (await probe(page)).zone!, stage = (await page.locator('.briques-stage').boundingBox())!;
        const brick = (await page.locator('[data-brick] rect').first().boundingBox())!;
        expect(brick.width, `scene ${id}`).toBeGreaterThanOrEqual(44); expect(brick.height, `scene ${id}`).toBeGreaterThanOrEqual(44);
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.9);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(550);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        await page.locator('#back').click();
    }
    // The end of a scene shows its two buttons side by side: finish scene 1.
    await page.locator('[data-briques-level="1"]').click();
    let p = await probe(page);
    while (!p.state!.finished) { await tapAt(page, goodAim(p.state!)!); p = await probe(page); }
    await expect(page.locator('#briques-next')).toBeVisible();
    // A wide font, as on the CI runner (DejaVu Sans): the sentence and the two end buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        // Read as text so that a failure shows the sizes, not only « false ».
        // Compared with the width asked for: a mobile browser widens its layout to fit what overflows.
        await expect.poll(() => page.evaluate(w => {
            const d = document.documentElement, z = document.querySelector('.briques-zone')!.getBoundingClientRect(), buttons = [...document.querySelectorAll('.briques-reward button')].map(b => b.getBoundingClientRect());
            const inside = buttons.every(b => b.left >= z.left - 0.5 && b.right <= z.right + 0.5);
            return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && inside ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), board ${Math.round(z.left)}–${Math.round(z.right)}, buttons ${buttons.map(b => `${Math.round(b.left)}–${Math.round(b.right)}`).join(', ')}, sentence ${Math.round(document.querySelector('.briques-instruction')?.getBoundingClientRect().height ?? 0)} px`;
        }, width), { message: `width ${width}` }).toBe('fits');
    }
});

test('erasing the progress in the parents’ space also erases the brick stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.briques.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
