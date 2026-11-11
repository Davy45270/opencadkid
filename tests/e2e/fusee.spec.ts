import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { levels, type Event, type State } from '../../src/engines/fusee';

interface Point { x: number; y: number }
interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; last: Event | null; zone: { x: number; y: number; width: number; height: number } | null; rocket: Point | null; pads: Point[]; help: boolean; carrying: boolean; bouncing: boolean; pressing: boolean; side: number }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { fusee: Probe } } }).__kid.state().fusee);
/** Opens the game. `still` asks for reduced motion. */
async function open(page: Page, records?: Record<number, number>, still = false): Promise<void> {
    if (still) await page.emulateMedia({ reducedMotion: 'reduce' });
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.fusee.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="fusee"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const clearSpeech = (page: Page) => page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
/** Waits until the rocket has touched something (a funny try or a landing) since `tries`/`visited`. */
async function touched(page: Page, before: State, timeout = 25_000): Promise<Probe> {
    await expect.poll(async () => { const s = (await probe(page)).state!; return s.tries !== before.tries || s.visited !== before.visited || s.finished; }, { timeout }).toBe(true);
    return probe(page);
}
/** Flies with the keyboard, as a child would with the buttons: sideways until above `x` (board units), puffing so as
 * to come down gently, until the rocket touches something. */
async function flyTo(page: Page, x: number, gentle = true): Promise<Probe> {
    await page.locator('.fusee-zone').focus();
    const before = (await probe(page)).state!;
    let puff = false, side = '';
    const set = async (p: boolean, k: string): Promise<void> => {
        if (p !== puff) { if (p) await page.keyboard.down('ArrowUp'); else await page.keyboard.up('ArrowUp'); puff = p; }
        if (k !== side) { if (side) await page.keyboard.up(side); if (k) await page.keyboard.down(k); side = k; }
    };
    for (let k = 0; k < 2000; k++) {
        const p = await probe(page), s = p.state!;
        if (s.tries !== before.tries || s.visited !== before.visited || s.finished) { await set(false, ''); return p; }
        const dx = x - s.x, aligned = Math.abs(dx) < 4;
        await set(gentle ? s.vy > 0.3 || (!aligned && s.y > 150) : false, aligned ? '' : dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        await page.waitForTimeout(20);
    }
    throw new Error('the rocket never touched anything');
}

test('Boubou says the scene, puffing holds the rocket up, a gentle landing on the runway ends the scene and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-fusee-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-fusee-level]:not([disabled])')).toHaveCount(1);
    await clearSpeech(page);
    await page.locator('[data-fusee-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Bonjour, la Lune !', 'Appuie pour souffler et monter, lâche pour descendre. Glisse ton doigt pour aller de côté !', 'Pose la fusée tout doucement sur la piste étoilée.']);
    // Coming down by itself, slowly.
    await expect.poll(async () => (await probe(page)).state!.y, { timeout: 5_000 }).toBeGreaterThan(55);
    // The big button puffs: the flame shows and the rocket goes back up.
    const puff = (await page.locator('#fusee-puff').boundingBox())!;
    await page.mouse.move(puff.x + puff.width / 2, puff.y + puff.height / 2); await page.mouse.down();
    await expect(page.locator('[data-rocket][data-puff]')).toHaveCount(1);
    const low = (await probe(page)).state!.y;
    await expect.poll(async () => (await probe(page)).state!.vy, { timeout: 5_000 }).toBeLessThan(0);
    await expect.poll(async () => (await probe(page)).state!.y, { timeout: 5_000 }).toBeLessThan(low);
    await page.mouse.up();
    await expect(page.locator('[data-rocket][data-puff]')).toHaveCount(0);
    const p = await flyTo(page, 75);
    expect(p.state!.finished).toBe(true); expect(p.state!.tries).toBe(0);
    expect(p.records).toEqual({ 1: 3 });
    await expect(page.locator('.fusee-reward .stars')).toHaveText('★★★');
    await expect(page.locator('.fusee-controls')).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.fusee.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#fusee-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-fusee-level]:not([disabled])')).toHaveCount(2);
});

test('touching nothing, the rocket comes down slowly and bounces like a ball on the runway: boing, then it rises a little by itself', async ({ page }) => {
    await open(page);
    await page.locator('[data-fusee-level="1"]').click();
    const before = (await probe(page)).state!;
    await clearSpeech(page);
    const p = await touched(page, before);
    expect(p.last).toMatchObject({ kind: 'miss', miss: 'boing' });
    await expect(page.locator('.fusee-boing')).not.toHaveCount(0);
    expect(p.bouncing).toBe(true);
    expect((await media(page)).speech).toEqual(['Boing ! Trop vite, je rebondis comme une balle.']);
    expect([p.state!.visited, p.state!.dry, p.state!.finished]).toEqual([0, 1, false]);
    const last = p.last as Extract<Event, { kind: 'miss' }>;
    expect(last.to.y).toBeLessThan(last.at.y - 40);
    await expect.poll(async () => (await probe(page)).bouncing, { timeout: 4_000 }).toBe(false);
    await expect(page.locator('.fusee-boing')).toHaveCount(0, { timeout: 4_000 });
});

test('funny tries: a rock says toc, a crater goes pouf, an alien laughs, a friend waves coucou', async ({ page }) => {
    await open(page, upTo(16), true);
    for (const [id, x, miss, mark] of [[6, null, 'toc', '.fusee-toc'], [2, 116, 'cratere', '.fusee-cratere'], [3, 134, 'rigole', '.fusee-rigole'], [16, 116, 'coucou', '.fusee-coucou']] as const) {
        await page.locator(`[data-fusee-level="${id}"]`).click();
        const p = x === null ? await touched(page, (await probe(page)).state!) : await flyTo(page, x, miss === 'coucou');
        expect(p.last, `scene ${id}`).toMatchObject({ kind: 'miss', miss });
        await expect(page.locator(mark)).not.toHaveCount(0);
        expect(p.state!.visited, `scene ${id}`).toBe(0);
        await page.locator('#back').click();
    }
});

test('a finger on the sky puffs and slides sideways; the arrow keys too; three funny tries show the golden arrow, which costs a star', async ({ page }) => {
    await open(page, upTo(3));
    await page.locator('[data-fusee-level="4"]').click();
    let p = await probe(page);
    const mid = { x: p.zone!.x + p.zone!.width / 2, y: p.zone!.y + p.zone!.height / 2 };
    await page.mouse.move(mid.x, mid.y); await page.mouse.down();
    await expect.poll(async () => (await probe(page)).pressing).toBe(true);
    await page.mouse.move(mid.x + 50, mid.y, { steps: 4 });
    await expect.poll(async () => (await probe(page)).side).toBe(1);
    const x0 = (await probe(page)).state!.x;
    await expect.poll(async () => (await probe(page)).state!.x).toBeGreaterThan(x0 + 3);
    await page.mouse.up();
    await expect.poll(async () => [(await probe(page)).pressing, (await probe(page)).side]).toEqual([false, 0]);
    await page.locator('.fusee-zone').focus();
    await page.keyboard.down('ArrowLeft');
    await expect.poll(async () => (await probe(page)).side).toBe(-1);
    await page.keyboard.up('ArrowLeft');
    // The right-hand button moves the rocket to the right while it is held.
    const right = (await page.locator('#fusee-right').boundingBox())!;
    await page.mouse.move(right.x + right.width / 2, right.y + right.height / 2); await page.mouse.down();
    await expect.poll(async () => (await probe(page)).side).toBe(1);
    await page.mouse.up();
    // Touching nothing: three funny tries beside the runway, then the golden arrow and a slower rocket.
    while ((await probe(page)).state!.dry < 3) await touched(page, (await probe(page)).state!);
    p = await probe(page);
    expect(p.help).toBe(true);
    await expect(page.locator('g[data-help]')).toHaveAttribute('opacity', '1');
    p = await flyTo(page, 116, false);
    expect(p.state!.finished).toBe(true); expect(p.state!.helps).toBe(1);
    await expect(page.locator('.fusee-reward .stars')).toHaveText('★★☆');
});

test('the board takes the height of a 390 × 844 phone with a rocket, runways and buttons of at least 44 px, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31), true);
    for (const id of [1, 21, 32]) {
        await page.locator(`[data-fusee-level="${id}"]`).click();
        const zone = (await probe(page)).zone!, stage = (await page.locator('.fusee-stage').boundingBox())!;
        const rocket = (await page.locator('[data-rocket] .fusee-rocket').boundingBox())!, pad = (await page.locator('[data-pad] rect').first().boundingBox())!;
        expect(rocket.width, `scene ${id}`).toBeGreaterThanOrEqual(44); expect(rocket.height, `scene ${id}`).toBeGreaterThanOrEqual(44);
        expect(pad.width, `scene ${id}`).toBeGreaterThanOrEqual(44);
        for (const b of ['#fusee-left', '#fusee-puff', '#fusee-right']) { const r = (await page.locator(b).boundingBox())!; expect(Math.min(r.width, r.height), b).toBeGreaterThanOrEqual(44); expect(r.y + r.height).toBeLessThanOrEqual(844); }
        expect(zone.height / stage.height, `scene ${id}`).toBeGreaterThan(0.9);
        expect(stage.height, `scene ${id}`).toBeGreaterThan(520);
        await page.locator('#back').click();
    }
    // The end of a scene shows its two buttons side by side: finish scene 1.
    await page.locator('[data-fusee-level="1"]').click();
    expect((await flyTo(page, 75)).state!.finished).toBe(true);
    await expect(page.locator('#fusee-next')).toBeVisible();
    // A wide font, as on the CI runner (DejaVu Sans): the sentence and the two end buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        // Read as text so that a failure shows the sizes, not only « false ».
        // Compared with the width asked for: a mobile browser widens its layout to fit what overflows.
        await expect.poll(() => page.evaluate(w => {
            const d = document.documentElement, z = document.querySelector('.fusee-zone')!.getBoundingClientRect(), buttons = [...document.querySelectorAll('.fusee-reward button')].map(b => b.getBoundingClientRect());
            const inside = buttons.every(b => b.left >= z.left - 0.5 && b.right <= z.right + 0.5);
            return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && inside ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), board ${Math.round(z.left)}–${Math.round(z.right)}, buttons ${buttons.map(b => `${Math.round(b.left)}–${Math.round(b.right)}`).join(', ')}, sentence ${Math.round(document.querySelector('.fusee-instruction')?.getBoundingClientRect().height ?? 0)} px`;
        }, width), { message: `width ${width}` }).toBe('fits');
    }
});

test('erasing the progress in the parents’ space also erases the rocket stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.fusee.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
