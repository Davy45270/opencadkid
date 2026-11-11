import type { Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { levels, type Fail, type State } from '../../src/engines/derapage';
import { KART_H, KART_W, STOP, W } from '../../src/games/derapage/geometry';

interface Rect { x: number; y: number; width: number; height: number }
interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; zone: Rect | null; shown: string | null; paused: boolean; fail: Fail | null; ending: boolean; funny: Fail[]; arrows: (Rect & { road: number })[]; hint: number[]; canDrift: boolean }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { derapage: Probe } } }).__kid.state().derapage);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.derapage.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="derapage"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const clear = (page: Page) => page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
/** Waits until the kart stops at a fork (the arrows show). */
async function atFork(page: Page, spot?: string): Promise<State> {
    await expect.poll(async () => { const p = await probe(page); return Boolean(p.state?.waiting && !p.paused && (!spot || p.state.spot === spot)); }, { timeout: 15_000 }).toBe(true);
    await expect(page.locator('.derapage-zone[data-waiting] [data-arrow]').first()).toBeVisible();
    return (await probe(page)).state!;
}
/** Touches the big arrow of road i, in the middle of the arrow as it is drawn. */
async function arrow(page: Page, road: number): Promise<State> {
    const s = await atFork(page), b = (await page.locator(`.derapage-zone [data-arrow="${road}"] circle`).first().boundingBox())!;
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await expect.poll(async () => (await probe(page)).state!.choices).toBe(s.choices + 1);
    return (await probe(page)).state!;
}
/** Waits for a funny try and checks it while it plays: the kart's animation, the thing's, the bubble. */
async function funny(page: Page, kind: Fail, kart: string, thing: string, word: string): Promise<void> {
    await expect.poll(async () => (await probe(page)).fail, { timeout: 15_000 }).toBe(kind);
    await expect(page.locator(`.derapage-zone .derapage-corps.${kart}`)).toHaveCount(1);
    await expect(page.locator(`.derapage-zone .${thing}`)).toHaveCount(1);
    await expect(page.locator('.derapage-bulle-mot text')).toHaveText(word);
    await expect.poll(async () => (await probe(page)).fail, { timeout: 6_000 }).toBeNull();
}

test('Pestouille says the scene, the kart stops at the fork, the bear’s arrow delivers the cake, and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-derapage-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-derapage-level]:not([disabled])')).toHaveCount(1);
    await clear(page);
    await page.locator('[data-derapage-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Le gâteau de l’ours', 'Le kart roule tout seul. À chaque croisement, regarde les panneaux et touche la grosse flèche du bon chemin.', 'L’ours attend son gâteau.']);
    // The kart rolls by itself: no arrow to touch until it stops at the fork.
    await expect(page.locator('[data-goal="ours"]:not([data-got])')).toHaveCount(1);
    await expect(page.locator('.derapage-zone [data-arrow="0"]')).toBeHidden();
    await expect(page.locator('.derapage-zone [data-sign="0"] [data-icon="ours"]')).toHaveCount(1);
    await expect(page.locator('.derapage-zone [data-sign="1"] [data-icon="boue"]')).toHaveCount(1);
    await arrow(page, 0);
    await expect.poll(async () => (await probe(page)).shown, { timeout: 10_000 }).toBe('ours');
    await expect(page.locator('.derapage-zone [data-house="ours"]')).toHaveCount(1);
    await expect.poll(async () => (await probe(page)).state!.finished, { timeout: 10_000 }).toBe(true);
    await expect(page.locator('.derapage-zone .derapage-cadeau')).toHaveCount(1);
    await expect(page.locator('.derapage-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    expect((await probe(page)).records).toEqual({ 1: 3 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.derapage.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#derapage-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-derapage-level]:not([disabled])')).toHaveCount(2);
});

test('the mud puddle is a funny try: Pestouille is muddy, washed, and back at the fork', async ({ page }) => {
    await open(page);
    await page.locator('[data-derapage-level="1"]').click();
    await arrow(page, 1);
    await clear(page);
    await funny(page, 'boue', 'derapage-kart-crotte', 'derapage-flaque-splash', 'Splatch !');
    expect((await media(page)).speech).toEqual(['Splatch ! Pestouille est tout crotté. Vite, la station de lavage à bulles !']);
    const s = await atFork(page, 'a');
    expect([s.tries, s.wrong, s.delivered, s.finished]).toEqual([1, 1, [], false]);
    expect((await probe(page)).funny).toEqual(['boue']);
});

test('the sheep cross, the hay wall says boing, the bear says it is not for him, the cave makes the eyes shine', async ({ page }) => {
    await open(page, upTo(4));
    await page.locator('[data-derapage-level="2"]').click();
    await arrow(page, 0);
    await funny(page, 'moutons', 'derapage-kart-attend', 'derapage-moutons-passent', 'Bêêê !');
    await page.locator('#back').click();
    await page.locator('[data-derapage-level="3"]').click();
    await arrow(page, 1);
    await funny(page, 'foin', 'derapage-kart-boing', 'derapage-foin-boing', 'Boing !');
    await atFork(page, 'a'); await arrow(page, 0);
    await atFork(page, 'b'); await arrow(page, 1);
    await funny(page, 'mauvais', 'derapage-kart-oups', 'derapage-ami-coucou', 'Coucou !');
    await expect(page.locator('#derapage-message')).toContainText('Ce n’est pas pour moi');
    await page.locator('#back').click();
    await page.locator('[data-derapage-level="5"]').click();
    await arrow(page, 0);
    await funny(page, 'grotte', 'derapage-kart-noir', 'derapage-grotte-noire', 'Hou hou !');
});

test('after two wrong roads the good arrow shines; taking it costs one star', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, upTo(2));
    await page.locator('[data-derapage-level="3"]').click();
    await arrow(page, 1);
    await atFork(page, 'a');
    await expect(page.locator('.derapage-zone [data-shine]')).toHaveCount(0);
    await arrow(page, 0);
    await atFork(page, 'b'); await arrow(page, 1);
    const s = await atFork(page, 'b');
    expect(s.wrong).toBe(2);
    await expect(page.locator('.derapage-zone [data-arrow="0"][data-shine]')).toHaveCount(1);
    expect((await probe(page)).hint).toEqual([0]);
    await arrow(page, 0);
    await expect(page.locator('.derapage-reward .stars')).toHaveText('★★☆', { timeout: 15_000 });
});

test('« Dérape ! » lights up in the starred bend: a slide, a bonus star, and the parcel still arrives', async ({ page }) => {
    await open(page, upTo(3));
    await page.locator('[data-derapage-level="4"]').click();
    const button = page.locator('#derapage-derape');
    await expect(button).toBeDisabled();
    await expect(page.locator('.derapage-zone [data-star-bend]')).toHaveCount(3);
    await expect(button).toBeEnabled({ timeout: 10_000 });
    await button.click();
    await expect(page.locator('.derapage-zone .derapage-corps.derapage-glisse')).toHaveCount(1);
    await expect(page.locator('.derapage-zone .derapage-etoile-bonus')).toHaveCount(1);
    expect((await probe(page)).state!.bonus).toBe(1);
    await expect(page.locator('.derapage-bonus')).toHaveText('★ 1');
    await expect(button).toBeDisabled();
    await arrow(page, 0);
    await expect(page.locator('.derapage-reward .stars')).toHaveText('★★★', { timeout: 15_000 });
});

test('a real finger touches a sign to pick its road; the one-way road cannot be picked', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile touch only');
    await open(page, upTo(8));
    await page.locator('[data-derapage-level="9"]').tap();
    await atFork(page, 'a');
    // The svg lets touches through to the road's screen: the finger lands on the sign's place.
    const tapOn = async (sel: string): Promise<void> => { const b = (await page.locator(sel).boundingBox())!; await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
    await tapOn('.derapage-zone [data-sign="1"]');
    await page.waitForTimeout(300);
    expect((await probe(page)).state!.choices).toBe(0);
    await expect(page.locator('.derapage-zone [data-ground-arrow]')).toHaveCount(2);
    await tapOn('.derapage-zone [data-sign="2"]');
    await expect.poll(async () => (await probe(page)).state!.choices).toBe(1);
    await expect(page.locator('.derapage-reward .stars')).toHaveText('★★★', { timeout: 15_000 });
});

test('the road takes the height of a 390 × 844 phone, the arrows, the kart and the signs are big, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 5, 11, 22, 32]) {
        await page.locator(`[data-derapage-level="${id}"]`).click();
        const s = await atFork(page), p = await probe(page), zone = p.zone!, stage = (await page.locator('.derapage-stage').boundingBox())!;
        expect(Math.max(zone.height / stage.height, zone.width / stage.width), `scene ${id}`).toBeGreaterThan(0.95);
        expect(zone.height, `scene ${id}`).toBeGreaterThan(520);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        for (const a of await page.locator('.derapage-zone [data-arrow] circle').evaluateAll(els => els.map(e => e.getBoundingClientRect().width))) expect(a, `scene ${id} arrow`).toBeGreaterThanOrEqual(64);
        const kart = (await page.locator('.derapage-zone .derapage-chassis').boundingBox())!;
        expect(Math.min(kart.width, kart.height), `scene ${id} kart`).toBeGreaterThanOrEqual(64);
        for (const b of await page.locator('.derapage-zone [data-sign]').evaluateAll(els => els.map(e => e.getBoundingClientRect()))) expect(Math.min(b.width, b.height), `scene ${id} sign`).toBeGreaterThanOrEqual(90);
        for (const b of await page.locator('.derapage-zone [data-icon]').evaluateAll(els => els.map(e => e.getBoundingClientRect()))) expect(Math.max(b.width, b.height), `scene ${id} picture`).toBeGreaterThanOrEqual(36);
        expect(s.waiting).toBe(true);
        await page.locator('#back').click();
    }
    await page.locator('[data-derapage-level="32"]').click();
    await atFork(page);
    // A wide font, as on the CI runner (DejaVu Sans): the sentence, the parcels and the drift button must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        // Read as text so that a failure shows the sizes; compared with the width asked for, since a mobile browser widens
        // its layout to fit what overflows.
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement, zone = document.querySelector('.derapage-zone')?.getBoundingClientRect(), b = document.querySelector('#derapage-derape')?.getBoundingClientRect(); return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && (zone?.right ?? 0) <= w && (b?.bottom ?? 0) <= innerHeight ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), road ${Math.round(zone?.left ?? 0)}–${Math.round(zone?.right ?? 0)} px, drift button bottom ${Math.round(b?.bottom ?? 0)}, sentence ${Math.round(document.querySelector('.derapage-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
    // The finish buttons side by side, with the wide font, at 320 px.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator('#back').click(); await page.locator('[data-derapage-level="1"]').click();
    await arrow(page, 0);
    await expect(page.locator('.derapage-reward')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => page.evaluate(() => { const d = document.documentElement, r = document.querySelector('.derapage-reward')?.getBoundingClientRect(), b = [...document.querySelectorAll('.derapage-reward button')].map(e => e.getBoundingClientRect()); return d.scrollWidth <= 320 && r && b.every(x => x.right <= r.right + 1 && x.left >= r.left - 1) ? 'fits' : `${d.scrollWidth} px, reward ${Math.round(r?.left ?? 0)}–${Math.round(r?.right ?? 0)}, buttons ${b.map(x => `${Math.round(x.left)}–${Math.round(x.right)}`).join(' ')}`; }), { message: 'finish buttons at 320 px' }).toBe('fits');
});

test('on a 390 × 844 phone, in every scene, the action fills at least 60 % of the road’s screen and nothing covers anything else', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(levels.length - 1));
    for (const l of levels) {
        await page.locator(`[data-derapage-level="${l.id}"]`).click();
        await expect(page.locator('.derapage-zone [data-sign]')).not.toHaveCount(0);
        // Read as text so that a failure names the scene and the things. The kart's box is where it stops, at the fork.
        const found = await page.evaluate(({ W, STOP, KART_W, KART_H }) => {
            const zone = document.querySelector('.derapage-zone svg')!.getBoundingClientRect(), k = zone.width / W, problems: string[] = [];
            const box = (what: string, r: DOMRect | { left: number; right: number; top: number; bottom: number }) => ({ what, x0: r.left, x1: r.right, y0: r.top, y1: r.bottom });
            const things = [
                box('kart', { left: zone.left + (STOP.x - KART_W / 2) * k, right: zone.left + (STOP.x + KART_W / 2) * k, top: zone.top + (STOP.y - KART_H / 2) * k, bottom: zone.top + (STOP.y + KART_H / 2) * k }),
                ...[...document.querySelectorAll('.derapage-zone [data-sign]')].map(e => box(`sign ${e.getAttribute('data-sign')}`, e.getBoundingClientRect())),
                ...[...document.querySelectorAll('.derapage-zone [data-arrow] circle')].map(e => box(`arrow ${e.closest('[data-arrow]')!.getAttribute('data-arrow')}`, e.getBoundingClientRect())),
                ...[...document.querySelectorAll('.derapage-zone [data-friend], .derapage-zone [data-house], .derapage-zone [data-thing]')].map(e => box('friend or thing', e.getBoundingClientRect()))
            ];
            for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) {
                const a = things[i]!, b = things[j]!;
                if (a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1) problems.push(`${a.what} covers ${b.what}`);
            }
            // No road runs under a sign: the main road and every way out, read point by point from the drawn paths.
            const signs = things.filter(t => t.what.startsWith('sign'));
            for (const path of document.querySelectorAll<SVGPathElement>('.derapage-zone [data-road], .derapage-zone [data-way]')) {
                const len = path.getTotalLength(), way = path.getAttribute('data-way');
                for (let d = 0; d < len - 14; d += 4) {
                    const p = path.getPointAtLength(d), x = zone.left + p.x * k, y = zone.top + p.y * k;
                    for (const s of signs) if (x > s.x0 + 2 && x < s.x1 - 2 && y > s.y0 + 2 && y < s.y1 - 2) problems.push(`road ${way ?? 'main'} under ${s.what}`);
                }
            }
            const top = Math.min(...things.map(t => t.y0)), bottom = Math.max(...things.map(t => t.y1)), share = (bottom - top) / zone.height;
            if (share < 0.6) problems.push(`action ${Math.round(share * 100)} % of the screen`);
            if (zone.height < 0.6 * (innerHeight - zone.top)) problems.push(`road screen ${Math.round(zone.height)} px`);
            return [...new Set(problems)];
        }, { W, STOP, KART_W, KART_H });
        expect(found, `scene ${l.id}`).toEqual([]);
        await page.locator('#back').click();
    }
});

test('erasing the progress in the parents’ space also erases the kart stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.derapage.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
