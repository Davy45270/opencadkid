import type { Page } from '@playwright/test';
import { homedir } from 'node:os';
import { test, expect, media, passGate, prepare } from './helpers';
import { geometry, levels, type Fail, type State } from '../../src/engines/autobus';

interface Rect { x: number; y: number; width: number; height: number }
type Named = Rect & { id: string };
interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; fail: Fail | null; ending: boolean; funny: Fail[]; moving: string[]; zone: Rect | null; hint: string[]; vehicles: Named[]; cones: Named[]; children: Named[]; stop: Rect | null; cali: Rect | null; drawn?: { cali: number } }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => {
    const p = (window as unknown as { __kid: { state: () => { autobus: Probe } } }).__kid.state().autobus;
    // CaliRoux's drawing has margins inside its box: his drawn height is the union of what is painted in it.
    const svg = document.querySelector<SVGSVGElement>('.autobus-zone [data-cali] svg');
    if (svg) { const rs = [...svg.querySelectorAll<SVGGraphicsElement>('path, circle, ellipse, rect')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0); p.drawn = { cali: rs.length ? Math.max(...rs.map(r => r.bottom)) - Math.min(...rs.map(r => r.top)) : 0 }; }
    return p;
});
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.autobus.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="autobus"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const clear = (page: Page) => page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
/** Waits until nothing drives and the last show is over. */
async function still(page: Page): Promise<Probe> {
    await expect.poll(async () => { const p = await probe(page); return Boolean(p.state && !p.ending && p.moving.length === 0); }, { timeout: 15_000 }).toBe(true);
    return probe(page);
}
const middle = (r: Rect): [number, number] => [r.x + r.width / 2, r.y + r.height / 2];
/** Clicks a point of the board, in board units (180 × 300). */
async function at(page: Page, x: number, y: number): Promise<void> {
    const z = (await probe(page)).zone!, k = z.width / 180;
    await page.mouse.click(z.x + x * k, z.y + y * k);
}
/** Touches a vehicle, a cone (`plot-0`), the stop, CaliRoux, as a finger does, and waits for the touch to count. */
async function touch(page: Page, id: string): Promise<State> {
    const p = await still(page);
    const r = id === 'arret' ? p.stop! : id === 'caliroux' ? p.cali! : id.startsWith('plot-') ? p.cones.find(x => x.id === id)! : p.vehicles.find(x => x.id === id)!;
    await page.mouse.click(...middle(r));
    await expect.poll(async () => (await probe(page)).state!.moves).toBe(p.state!.moves + 1);
    return (await probe(page)).state!;
}
/** Checks a funny try while it plays: CaliRoux's animation, the thing's, the sound word. */
async function funny(page: Page, kind: Fail, cali: string, thing: string, word: string): Promise<void> {
    await expect.poll(async () => (await probe(page)).fail, { timeout: 5_000 }).toBe(kind);
    await expect(page.locator(`.autobus-zone .bus-cali-corps.${cali}`)).toHaveCount(1);
    await expect(page.locator(`.autobus-zone .${thing}`)).toHaveCount(1);
    await expect(page.locator('.bus-bulle-mot text')).toHaveText(word);
    await expect.poll(async () => (await probe(page)).fail, { timeout: 5_000 }).toBe(null);
}

test('CaliRoux says the scene, the bus drives up, the child gets on, the bus leaves and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-autobus-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-autobus-level]:not([disabled])')).toHaveCount(1);
    await clear(page);
    await page.locator('[data-autobus-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Le premier bus', 'Touche un bus : il roule tout droit, en avant, ou en arrière s’il ne peut pas avancer.', 'Emmène l’enfant dans le bus de sa couleur.']);
    await expect(page.locator('.autobus-zone [data-child]')).toHaveCount(1);
    const s = await touch(page, 'r');
    expect([s.finished, s.gone]).toEqual([true, ['r']]);
    await expect(page.locator('.autobus-zone [data-child="0"] .bus-monte')).toHaveCount(1);
    await expect(page.locator('.autobus-zone [data-vehicle="r"] .bus-part')).toHaveCount(1, { timeout: 3_000 });
    await expect(page.locator('.autobus-zone .bus-cali-joie')).toHaveCount(1, { timeout: 5_000 });
    await expect(page.locator('.autobus-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.autobus.v1')!) as object)).toEqual({ 1: 3 });
    expect((await media(page)).speech.at(-1)).toBe('Bravo ! Tous les enfants sont partis à l’école !');
    await page.locator('#autobus-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-autobus-level]:not([disabled])')).toHaveCount(2);
});

test('a bus whose child is not first is a funny try: the children shake their heads, and nothing moves', async ({ page }) => {
    await open(page, upTo(9));
    await page.locator('[data-autobus-level="10"]').click();
    await clear(page);
    // Where the red bus stands in the board (the sentence above may change the board's place on the page).
    const inBoard = (p: Probe) => { const v = p.vehicles.find(x => x.id === 'r')!; return [Math.round(v.x - p.zone!.x), Math.round(v.y - p.zone!.y)]; };
    const before = inBoard(await still(page));
    await touch(page, 'r');
    await funny(page, 'pasmoi', 'bus-cali-penche', 'bus-non', 'Non non !');
    expect((await media(page)).speech).toEqual(['Non non ! C’est au tour du bus bleu.']);
    const s = (await probe(page)).state!;
    expect([s.gone, s.tries, s.misses]).toEqual([[], 1, 1]);
    expect(inBoard(await probe(page))).toEqual(before);
    // Blue first, then red.
    await touch(page, 'b');
    await expect(page.locator('.autobus-zone [data-vehicle="b"][data-gone]')).toHaveCount(1, { timeout: 5_000 });
    await expect(page.locator('.autobus-zone [data-child]')).toHaveCount(1);
    await touch(page, 'r');
    await expect(page.locator('.autobus-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
});

test('the stuck bus honks, the cone wobbles, the children wave, a pigeon walks in, CaliRoux rolls over', async ({ page }) => {
    test.setTimeout(90_000);
    await open(page, upTo(3));
    await page.locator('[data-autobus-level="2"]').click();
    await touch(page, 'r');
    await funny(page, 'klaxon', 'bus-cali-sursaut', 'bus-klaxon', 'Pouêt pouêt !');
    await touch(page, 'arret');
    await funny(page, 'coucou', 'bus-cali-salue', 'bus-coucou', 'Coucou !');
    await touch(page, 'caliroux');
    await funny(page, 'roulade', 'bus-cali-roule', 'bus-panneau-tourne', 'Hop !');
    // An empty cell of the yard, top left.
    const g = geometry(levels[1]!);
    await still(page); await at(page, g.x0 + g.cell / 2, g.y0 + g.cell / 2);
    await funny(page, 'pigeon', 'bus-cali-regarde', 'bus-pigeon-saute', 'Rou rou !');
    await page.locator('#back').click(); await page.locator('[data-autobus-level="4"]').click();
    await touch(page, 'plot-0');
    await funny(page, 'plot', 'bus-cali-rit', 'bus-plot-bong', 'Bong !');
    expect((await probe(page)).funny).toEqual(['plot']);
    // The grey car drives the wrong way first, then back against the cone: the yellow bus can go.
    await touch(page, 'w'); await touch(page, 'w');
    expect((await probe(page)).state!.pos).toEqual([2, 2]);
    await touch(page, 'j');
    await expect(page.locator('.autobus-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
});

test('after three funny tries the vehicle to touch shines; taking it costs one star', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, upTo(7));
    await page.locator('[data-autobus-level="8"]').click();
    await touch(page, 'r'); await touch(page, 'arret');
    await expect(page.locator('.autobus-zone [data-shine]')).toHaveCount(0);
    await touch(page, 'caliroux');
    expect((await probe(page)).hint).toEqual(['w']);
    await expect(page.locator('.autobus-zone [data-vehicle="w"][data-shine]')).toHaveCount(1);
    for (const id of ['w', 'x', 'r']) {
        expect((await still(page)).hint).toEqual([id]);
        await touch(page, id);
    }
    await expect(page.locator('.autobus-reward .stars')).toHaveText('★★☆', { timeout: 15_000 });
});

test('a real finger on the grey car and the bus clears the way', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile touch only');
    await open(page, upTo(8));
    await page.locator('[data-autobus-level="9"]').tap();
    for (const [id, gone] of [['y', 0], ['r', 1]] as const) {
        const r = (await still(page)).vehicles.find(x => x.id === id)!;
        // The lorry is touched near its tail, far from its middle.
        await page.touchscreen.tap(id === 'y' ? r.x + 8 : r.x + r.width / 2, r.y + r.height / 2);
        await expect.poll(async () => (await probe(page)).state?.gone.length).toBe(gone);
        await expect.poll(async () => (await probe(page)).state?.moves).toBe(id === 'y' ? 1 : 2);
    }
    await expect(page.locator('.autobus-reward .stars')).toHaveText('★★★', { timeout: 15_000 });
});

test('the board takes the height of a 390 × 844 phone, cells and CaliRoux are big, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 11, 23, 32]) {
        await page.locator(`[data-autobus-level="${id}"]`).click();
        const p = await still(page), zone = p.zone!, stage = (await page.locator('.autobus-stage').boundingBox())!;
        expect(Math.max(zone.height / stage.height, zone.width / stage.width), `scene ${id}`).toBeGreaterThan(0.95);
        expect(zone.height, `scene ${id}`).toBeGreaterThan(520);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        const k = zone.width / 180, cell = geometry(levels[id - 1]!).cell * k;
        expect(cell, `scene ${id}: a cell`).toBeGreaterThanOrEqual(48);
        for (const v of p.vehicles) expect(Math.min(v.width, v.height), `scene ${id} ${v.id}`).toBeGreaterThanOrEqual(0.8 * cell);
        expect(p.drawn!.cali, `scene ${id} CaliRoux drawn`).toBeGreaterThanOrEqual(70);
        for (const c of p.children) expect(c.height, `scene ${id} child ${c.id}`).toBeGreaterThanOrEqual(40);
        await page.locator('#back').click();
    }
    await page.locator('[data-autobus-level="32"]').click();
    await still(page);
    // A wide font, as on the CI runner (DejaVu Sans): the sentence and the board must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement, zone = document.querySelector('.autobus-zone')?.getBoundingClientRect(); return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && (zone?.right ?? 0) <= w ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), board ${Math.round(zone?.left ?? 0)}–${Math.round(zone?.right ?? 0)} px, sentence ${Math.round(document.querySelector('.autobus-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
    // The finish buttons side by side, with the wide font, at 320 px.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator('#back').click(); await page.locator('[data-autobus-level="1"]').click();
    await touch(page, 'r');
    await expect(page.locator('.autobus-reward')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => page.evaluate(() => { const d = document.documentElement, r = document.querySelector('.autobus-reward')?.getBoundingClientRect(), b = [...document.querySelectorAll('.autobus-reward button')].map(e => e.getBoundingClientRect()); return d.scrollWidth <= 320 && r && b.every(x => x.left >= r.left - 1 && x.right <= r.right + 1) ? 'fits' : `page ${d.scrollWidth} px, reward ${Math.round(r?.left ?? 0)}–${Math.round(r?.right ?? 0)}, buttons ${b.map(x => `${Math.round(x.left)}–${Math.round(x.right)}`).join(', ')}`; })).toBe('fits');
});

test('on a 390 × 844 phone, in every scene, the yard fills the board and nothing covers anything else', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(levels.length - 1));
    for (const l of levels) {
        await page.locator(`[data-autobus-level="${l.id}"]`).click();
        const p = await still(page);
        // Read as text so that a failure names the scene and the things.
        const z = p.zone!, problems: string[] = [];
        const box = (what: string, r: Rect) => ({ what, x0: r.x, x1: r.x + r.width, y0: r.y, y1: r.y + r.height });
        const yard = (await page.locator('.autobus-zone [data-yard]').boundingBox())!;
        const things = [...p.vehicles.map(v => box(`vehicle ${v.id}`, v)), ...p.cones.map(c => box(`cone ${c.id}`, c)), ...p.children.map(c => box(`child ${c.id}`, c))];
        for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) {
            const a = things[i]!, b = things[j]!;
            if (a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1) problems.push(`${a.what} covers ${b.what}`);
        }
        // The yard between the stop and CaliRoux, inside the board, and the children inside the stop.
        if (yard.y < p.stop!.y + p.stop!.height - 1) problems.push('the yard under the stop');
        if (yard.y + yard.height > p.cali!.y + 8) problems.push('the yard over CaliRoux');
        if (yard.x < z.x - 0.5 || yard.x + yard.width > z.x + z.width + 0.5) problems.push('the yard out of the board');
        for (const c of p.children) if (c.x + c.width > p.stop!.x + p.stop!.width + 1) problems.push(`child ${c.id} out of the stop`);
        if (yard.height < 0.45 * z.height) problems.push(`yard ${Math.round(yard.height)} px high`);
        expect(problems, `scene ${l.id}`).toEqual([]);
        await page.locator('#back').click();
    }
});

test('erasing the progress in the parents’ space also erases the bus stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.autobus.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});

test('phone captures of the yard', async ({ page, isMobile }) => {
    test.skip(process.env.CAPTURES !== '1' || !isMobile, 'Set CAPTURES=1 for the phone captures.');
    test.setTimeout(120_000);
    const dir = `${homedir()}/Projets/jeux/captures-kid-autobus`;
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    await page.screenshot({ path: `${dir}/01-niveaux.png` });
    await page.locator('[data-autobus-level="1"]').click(); await still(page);
    await page.screenshot({ path: `${dir}/02-premier-bus.png` });
    await touch(page, 'r'); await page.waitForTimeout(700);
    await page.screenshot({ path: `${dir}/03-depart.png` });
    await page.locator('#back').click(); await page.locator('[data-autobus-level="10"]').click(); await touch(page, 'r'); await page.waitForTimeout(500);
    await page.screenshot({ path: `${dir}/04-essai-pas-nous.png` });
    for (const [id, name] of [[11, '05-detour'], [17, '06-car-du-coin'], [23, '07-grand-parking'], [32, '08-pagaille']] as const) {
        await page.locator('#back').click(); await page.locator(`[data-autobus-level="${id}"]`).click(); await still(page);
        await page.screenshot({ path: `${dir}/${name}.png` });
    }
});
