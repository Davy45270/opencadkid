import type { Page } from '@playwright/test';
import { homedir } from 'node:os';
import { test, expect, media, passGate, prepare } from './helpers';
import { levels, type Fail, type State } from '../../src/engines/vis';

interface Rect { x: number; y: number; width: number; height: number }
type Named = Rect & { id: string };
interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; fail: Fail | null; ending: boolean; funny: Fail[]; flying: string[]; zone: Rect | null; hint: string[]; free: string[]; screws: Named[]; plates: Named[]; pots: Named[]; chest: Rect | null; pest: Rect | null; toy: Rect | null; drawn?: { pest: number } }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => {
    const p = (window as unknown as { __kid: { state: () => { vis: Probe } } }).__kid.state().vis;
    // Pestouille's drawing has margins inside its box: his drawn height is the union of what is painted in it.
    const svg = document.querySelector<SVGSVGElement>('.vis-zone [data-pest] svg');
    if (svg) { const rs = [...svg.querySelectorAll<SVGGraphicsElement>('path, circle, ellipse, rect')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0); p.drawn = { pest: rs.length ? Math.max(...rs.map(r => r.bottom)) - Math.min(...rs.map(r => r.top)) : 0 }; }
    return p;
});
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.vis.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="vis"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const clear = (page: Page) => page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
/** Waits until nothing flies and the toy's last show is over. */
async function still(page: Page): Promise<Probe> {
    await expect.poll(async () => { const p = await probe(page); return Boolean(p.state && !p.ending && p.flying.length === 0); }, { timeout: 15_000 }).toBe(true);
    return probe(page);
}
/** Clicks a point of the board, in board units (180 × 300). */
async function at(page: Page, x: number, y: number): Promise<void> {
    const z = (await probe(page)).zone!, k = z.width / 180;
    await page.mouse.click(z.x + x * k, z.y + y * k);
}
const middle = (r: Rect): [number, number] => [r.x + r.width / 2, r.y + r.height / 2];
/** Touches a screw, a pot (`pot-r`), the chest, Pestouille, as a finger does, and waits for the touch to count. */
async function touch(page: Page, id: string, settle = true): Promise<State> {
    const p = settle ? await still(page) : await probe(page);
    const r = id === 'coffre' ? p.chest! : id === 'pestouille' ? p.pest! : id.startsWith('pot-') ? p.pots.find(x => x.id === id.slice(4))! : p.screws.find(x => x.id === id)!;
    await page.mouse.click(...middle(r));
    await expect.poll(async () => (await probe(page)).state!.moves).toBe(p.state!.moves + 1);
    return (await probe(page)).state!;
}
/** Checks a funny try while it plays: Pestouille's animation, the thing's, the sound word. */
async function funny(page: Page, kind: Fail, pest: string, thing: string, word: string): Promise<void> {
    await expect.poll(async () => (await probe(page)).fail, { timeout: 5_000 }).toBe(kind);
    await expect(page.locator(`.vis-zone .vis-pest-corps.${pest}`)).toHaveCount(1);
    await expect(page.locator(`.vis-zone .${thing}`)).toHaveCount(1);
    await expect(page.locator('.vis-bulle-mot text')).toHaveText(word);
    await expect.poll(async () => (await probe(page)).fail, { timeout: 5_000 }).toBe(null);
}

test('Pestouille says the scene, the screw flies into its pot, the door falls into the chest, the car drives off and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-vis-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-vis-level]:not([disabled])')).toHaveCount(1);
    await clear(page);
    await page.locator('[data-vis-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Une vis', 'Touche une vis : elle tourne et saute dans son pot.', 'Dévisse la vis pour ranger le jouet.']);
    expect((await probe(page)).free).toEqual(['a1']);
    const s = await touch(page, 'a1');
    expect(s.finished).toBe(true);
    await expect(page.locator('.vis-zone [data-screw="a1"] .vis-envol')).toHaveCount(1);
    await expect(page.locator('.vis-zone [data-plate="a"].vis-tombe')).toHaveCount(1, { timeout: 3_000 });
    await expect(page.locator('.vis-zone [data-toy].vis-fini-voiture')).toHaveCount(1, { timeout: 5_000 });
    await expect(page.locator('.vis-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.vis.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#vis-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-vis-level]:not([disabled])')).toHaveCount(2);
});

test('a screw under a plate is a funny try: knock knock, the plate on top wriggles', async ({ page }) => {
    await open(page, upTo(2));
    await page.locator('[data-vis-level="3"]').click();
    await clear(page);
    await touch(page, 'a1');
    await funny(page, 'toc', 'vis-pest-penche', 'vis-plaque-toc', 'Toc toc !');
    await expect(page.locator('.vis-zone [data-plate="b"] .vis-plaque.vis-plaque-toc')).toHaveCount(0);
    expect((await media(page)).speech).toEqual(['Toc toc ! Une plaque cache cette vis : enlève d’abord celle du dessus.']);
    const s = (await probe(page)).state!;
    expect([s.out, s.tries, s.misses]).toEqual([[], 1, 1]);
    // The bar on top goes, the yellow screw comes out of hiding.
    await touch(page, 'b1');
    await expect.poll(async () => (await probe(page)).free).toEqual(['a1']);
    await expect(page.locator('.vis-zone [data-plate="b"][data-fallen]')).toHaveCount(1, { timeout: 5_000 });
    await expect(page.locator('.vis-zone [data-pot="r"] [data-inside] g')).toHaveCount(1);
});

test('the screw spins like a top, the pot burps, the car honks, the jack pops out of the chest, Pestouille gets a hat', async ({ page }) => {
    test.setTimeout(90_000);
    await open(page, upTo(1));
    await page.locator('[data-vis-level="2"]').click();
    const p = await still(page), a1 = middle(p.screws.find(x => x.id === 'a1')!);
    // Touched again while it flies to its pot.
    await page.mouse.click(...a1); await page.waitForTimeout(150); await page.mouse.click(...a1);
    await funny(page, 'toupie', 'vis-pest-tourne', 'vis-toupie', 'Vrrr !');
    await touch(page, 'pot-b');
    await funny(page, 'rot', 'vis-pest-rit', 'vis-pot-rot', 'Burp !');
    await touch(page, 'coffre');
    await funny(page, 'ressort', 'vis-pest-recule', 'vis-diable-sort', 'Boing !');
    await touch(page, 'pestouille');
    await funny(page, 'chapeau', 'vis-pest-ecrase', 'vis-chapeau-tombe', 'Hop !');
    await page.locator('#back').click(); await page.locator('[data-vis-level="1"]').click();
    // The car's back wheel: the toy itself.
    await still(page); await at(page, 50, 210);
    await funny(page, 'klaxon', 'vis-pest-sursaut', 'vis-jouet-klaxon', 'Tut tut !');
    expect((await probe(page)).funny).toEqual(['klaxon']);
    expect((await probe(page)).state!.out).toEqual([]);
});

test('after three touches that take no screw out the good screw shines; taking it costs one star', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, upTo(2));
    await page.locator('[data-vis-level="3"]').click();
    await touch(page, 'a1'); await touch(page, 'coffre');
    await expect(page.locator('.vis-zone [data-shine]')).toHaveCount(0);
    await touch(page, 'pot-j');
    expect((await probe(page)).hint).toEqual(['b1']);
    await expect(page.locator('.vis-zone [data-screw="b1"][data-shine]')).toHaveCount(1);
    await touch(page, 'b1'); await touch(page, 'a1');
    await expect(page.locator('.vis-reward .stars')).toHaveText('★★☆', { timeout: 15_000 });
});

test('a real finger on a plate takes out its screw, and a pile three deep comes apart from the top', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile touch only');
    await open(page, upTo(13));
    await page.locator('[data-vis-level="14"]').tap();
    const p = await still(page), c = p.plates.find(x => x.id === 'c')!, k = p.zone!.width / 180;
    // On the long bar on top, far from its screw.
    await page.touchscreen.tap(p.zone!.x + 50 * k, p.zone!.y + 196 * k);
    await expect.poll(async () => (await probe(page)).state?.out).toEqual(['c1']);
    expect(c.width).toBeGreaterThan(100);
    await still(page);
    for (const id of ['b1', 'a1']) { const r = (await still(page)).screws.find(x => x.id === id)!; await page.touchscreen.tap(...middle(r)); await expect.poll(async () => (await probe(page)).state?.out.at(-1)).toBe(id); }
    await expect(page.locator('.vis-reward .stars')).toHaveText('★★★', { timeout: 15_000 });
});

test('the board takes the height of a 390 × 844 phone, screws, pots and Pestouille are big, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 9, 21, 28, 32]) {
        await page.locator(`[data-vis-level="${id}"]`).click();
        const p = await still(page), zone = p.zone!, stage = (await page.locator('.vis-stage').boundingBox())!;
        expect(Math.max(zone.height / stage.height, zone.width / stage.width), `scene ${id}`).toBeGreaterThan(0.95);
        expect(zone.height, `scene ${id}`).toBeGreaterThan(520);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        const k = zone.width / 180;
        // A finger touches a screw within 14 units of its centre: 28 units across.
        expect(28 * k, 'the touch circle of a screw').toBeGreaterThanOrEqual(48);
        for (const s of p.screws) expect(Math.min(s.width, s.height), `scene ${id} screw ${s.id}`).toBeGreaterThanOrEqual(32);
        for (const pot of p.pots) { expect(pot.width, `scene ${id} pot ${pot.id}`).toBeGreaterThanOrEqual(44); expect(pot.height).toBeGreaterThanOrEqual(80); }
        expect(p.drawn!.pest, `scene ${id} Pestouille drawn`).toBeGreaterThanOrEqual(90);
        expect(p.chest!.width, `scene ${id} chest`).toBeGreaterThanOrEqual(100);
        await page.locator('#back').click();
    }
    await page.locator('[data-vis-level="32"]').click();
    await still(page);
    // A wide font, as on the CI runner (DejaVu Sans): the sentence and the board must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement, zone = document.querySelector('.vis-zone')?.getBoundingClientRect(); return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && (zone?.right ?? 0) <= w ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), board ${Math.round(zone?.left ?? 0)}–${Math.round(zone?.right ?? 0)} px, sentence ${Math.round(document.querySelector('.vis-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
    // The finish buttons side by side, with the wide font, at 320 px.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator('#back').click(); await page.locator('[data-vis-level="1"]').click();
    await touch(page, 'a1');
    await expect(page.locator('.vis-reward')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => page.evaluate(() => { const d = document.documentElement, r = document.querySelector('.vis-reward')?.getBoundingClientRect(), b = [...document.querySelectorAll('.vis-reward button')].map(e => e.getBoundingClientRect()); return d.scrollWidth <= 320 && r && b.every(x => x.left >= r.left - 1 && x.right <= r.right + 1) ? 'fits' : `page ${d.scrollWidth} px, reward ${Math.round(r?.left ?? 0)}–${Math.round(r?.right ?? 0)}, buttons ${b.map(x => `${Math.round(x.left)}–${Math.round(x.right)}`).join(', ')}`; })).toBe('fits');
});

test('on a 390 × 844 phone, in every scene, the action fills at least 60 % of the board and nothing covers anything else', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(levels.length - 1));
    for (const l of levels) {
        await page.locator(`[data-vis-level="${l.id}"]`).click();
        const p = await still(page);
        // Read as text so that a failure names the scene and the things.
        const z = p.zone!, problems: string[] = [];
        const box = (what: string, r: Rect) => ({ what, x0: r.x, x1: r.x + r.width, y0: r.y, y1: r.y + r.height });
        const toyBody = await page.locator('.vis-zone .vis-jouet').boundingBox();
        const things = [...p.screws.map(s => box(`screw ${s.id}`, s)), ...p.pots.map(s => box(`pot ${s.id}`, s)), box('chest', p.chest!), box('pest', p.pest!)];
        for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) {
            const a = things[i]!, b = things[j]!;
            if (a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1) problems.push(`${a.what} covers ${b.what}`);
        }
        // The toy stays between the pots and the chest, inside the board.
        const top = Math.max(...p.pots.map(x => x.y + x.height)), bottom = Math.min(p.chest!.y, p.pest!.y + 4);
        if (toyBody!.y < top - 1 || toyBody!.y + toyBody!.height > bottom + 1) problems.push(`toy ${Math.round(toyBody!.y)}–${Math.round(toyBody!.y + toyBody!.height)} out of ${Math.round(top)}–${Math.round(bottom)}`);
        if (toyBody!.x < z.x - 0.5 || toyBody!.x + toyBody!.width > z.x + z.width + 0.5) problems.push('toy out of the board');
        const used = (z.y + z.height - Math.min(...things.map(t => t.y0))) / z.height;
        if (used < 0.6) problems.push(`action ${Math.round(used * 100)} % of the board`);
        if (toyBody!.height < 0.4 * z.height) problems.push(`toy ${Math.round(toyBody!.height)} px high`);
        expect(problems, `scene ${l.id}`).toEqual([]);
        await page.locator('#back').click();
    }
});

test('erasing the progress in the parents’ space also erases the screw stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.vis.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});

test('phone captures of the toys', async ({ page, isMobile }) => {
    test.skip(process.env.CAPTURES !== '1' || !isMobile, 'Set CAPTURES=1 for the phone captures.');
    test.setTimeout(120_000);
    const dir = `${homedir()}/Projets/jeux/captures-kid-vis`;
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    await page.screenshot({ path: `${dir}/01-niveaux.png` });
    await page.locator('[data-vis-level="1"]').click(); await still(page);
    await page.screenshot({ path: `${dir}/02-une-vis.png` });
    await page.locator('#back').click(); await page.locator('[data-vis-level="3"]').click(); await still(page);
    await page.screenshot({ path: `${dir}/03-cachee-dessous.png` });
    await touch(page, 'a1'); await page.waitForTimeout(450);
    await page.screenshot({ path: `${dir}/04-essai-toc.png` });
    await still(page); await touch(page, 'b1'); await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/05-envol-et-chute.png` });
    await page.locator('#back').click(); await page.locator('[data-vis-level="2"]').click(); await touch(page, 'pestouille'); await page.waitForTimeout(700);
    await page.screenshot({ path: `${dir}/06-essai-chapeau.png` });
    await page.waitForTimeout(1500); await touch(page, 'coffre'); await page.waitForTimeout(450);
    await page.screenshot({ path: `${dir}/07-essai-ressort.png` });
    for (const [id, name] of [[13, '08-ailerons'], [21, '09-huit-fenetres'], [24, '10-grand-toit'], [29, '11-chateau'], [32, '12-grand-rangement']] as const) {
        await page.locator('#back').click(); await page.locator(`[data-vis-level="${id}"]`).click(); await still(page);
        await page.screenshot({ path: `${dir}/${name}.png` });
    }
    await page.locator('#back').click(); await page.locator('[data-vis-level="5"]').click();
    for (const id of ['a1', 'b1']) await touch(page, id);
    await page.waitForTimeout(2600); await page.screenshot({ path: `${dir}/13-bateau-remonte.png` });
});
