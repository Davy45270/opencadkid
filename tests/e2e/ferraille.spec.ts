import type { Page } from '@playwright/test';
import { homedir } from 'node:os';
import { test, expect, media, passGate, prepare } from './helpers';
import { levels, type Fail, type State } from '../../src/engines/ferraille';

interface Rect { x: number; y: number; width: number; height: number }
interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; now: number; moving: boolean; fail: Fail | null; ending: boolean; funny: Fail[]; zone: Rect | null; hint: string[]; reach: string[]; plats: (Rect & { id: string })[]; parts: (Rect & { id: string })[]; robot: Rect | null; boubou: Rect | null; drawn?: { boubou: number } }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => {
    const p = (window as unknown as { __kid: { state: () => { ferraille: Probe } } }).__kid.state().ferraille;
    // Boubou's drawing has margins inside its box: his drawn height is the union of what is painted in it.
    const svg = document.querySelector<SVGSVGElement>('.ferraille-zone [data-mover] svg');
    if (svg) { const rs = [...svg.querySelectorAll<SVGGraphicsElement>('path, circle, ellipse, rect')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0); p.drawn = { boubou: rs.length ? Math.max(...rs.map(r => r.bottom)) - Math.min(...rs.map(r => r.top)) : 0 }; }
    return p;
});
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.ferraille.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="ferraille"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const clear = (page: Page) => page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
/** Waits until Boubou stands still (and the robot's dance is over). */
async function still(page: Page): Promise<Probe> {
    await expect.poll(async () => { const p = await probe(page); return Boolean(p.state && !p.moving && !p.ending); }, { timeout: 15_000 }).toBe(true);
    return probe(page);
}
/** Touches a platform (near the top of what is drawn) or the robot, as a finger does; with `when`, waits until it is reachable. */
async function touch(page: Page, id: string, when = false): Promise<State> {
    let p = await still(page);
    if (when) { await expect.poll(async () => (await probe(page)).reach.includes(id), { timeout: 15_000 }).toBe(true); p = await probe(page); }
    const r = id === 'robot' ? p.robot! : p.plats.find(x => x.id === id)!, lift = await page.locator(`.ferraille-zone [data-plat="${id}"][data-kind="ascenseur"]`).count();
    // The lift's rails run the whole height: its floor is at the bottom of what is drawn.
    await page.mouse.click(r.x + r.width / 2, id === 'robot' ? r.y + r.height / 2 : lift ? r.y + r.height - 6 : r.y + Math.min(8, r.height / 2));
    await expect.poll(async () => (await probe(page)).state!.moves).toBe(p.state!.moves + 1);
    return (await probe(page)).state!;
}
/** Checks a funny try while it plays: Boubou's animation, the thing's, the sound word. */
async function funny(page: Page, kind: Fail, boubou: string, thing: string, word: string): Promise<void> {
    await expect.poll(async () => (await probe(page)).fail, { timeout: 5_000 }).toBe(kind);
    await expect(page.locator(`.ferraille-zone .ferraille-corps.${boubou}`)).toHaveCount(1);
    await expect(page.locator(`.ferraille-zone .${thing}`)).toHaveCount(1);
    await expect(page.locator('.ferraille-bulle-mot text')).toHaveText(word);
    await still(page);
}

test('Boubou says the scene, jumps from the floor to the crate and up the shelves, the robot is mended and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-ferraille-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-ferraille-level]:not([disabled])')).toHaveCount(1);
    await clear(page);
    await page.locator('[data-ferraille-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Trois sauts', 'Touche une caisse ou une étagère : Boubou saute dessus.', 'Ramasse la pièce du robot.']);
    await expect(page.locator('[data-goal="c"]:not([data-carried]):not([data-got])')).toHaveCount(1);
    expect((await touch(page, 'a')).at).toBe('a');
    await touch(page, 'b');
    const s = await touch(page, 'c');
    expect(s.finished).toBe(true);
    await expect(page.locator('.ferraille-zone [data-robot].ferraille-repare')).toHaveCount(1);
    await expect(page.locator('.ferraille-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.ferraille.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#ferraille-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-ferraille-level]:not([disabled])')).toHaveCount(2);
});

test('a shelf too high is a funny try: bong, stars, and Boubou is back where he was', async ({ page }) => {
    await open(page);
    await page.locator('[data-ferraille-level="1"]').click();
    await clear(page);
    await touch(page, 'b');
    await funny(page, 'bong', 'ferraille-boubou-bong', 'ferraille-planche-tremble', 'Bong !');
    expect((await media(page)).speech).toEqual(['Bong ! C’est trop haut pour sauter.']);
    const s = (await probe(page)).state!;
    expect([s.at, s.tries, s.wrong, s.carried]).toEqual(['sol', 1, 1, []]);
});

test('the robot sneezes, the duck squeaks, the balls swallow Boubou, the cushion bounces him back, the belt runs the other way', async ({ page }) => {
    test.setTimeout(90_000);
    await open(page, upTo(24));
    await page.locator('[data-ferraille-level="1"]').click();
    await touch(page, 'robot');
    await funny(page, 'eternue', 'ferraille-boubou-sursaut', 'ferraille-robot-atchoum', 'Atchoum !');
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="4"]').click();
    await touch(page, 'd');
    await funny(page, 'canard', 'ferraille-boubou-couic', 'ferraille-canard-ecrase', 'Couic !');
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="5"]').click();
    await touch(page, 'k');
    await funny(page, 'balles', 'ferraille-boubou-plonge', 'ferraille-balles-giclent', 'Plouf !');
    expect((await probe(page)).state!.at).toBe('k');
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="11"]').click();
    await touch(page, 'a'); await touch(page, 'b'); await touch(page, 'c');
    await funny(page, 'coussin', 'ferraille-boubou-plouf', 'ferraille-coussin-creuse', 'Pouf !');
    expect((await probe(page)).state!.at).toBe('b');
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="25"]').click();
    await touch(page, 'a'); await touch(page, 'b'); await touch(page, 't');
    await touch(page, 't');
    await funny(page, 'surplace', 'ferraille-boubou-court', 'ferraille-tapis-file', 'Zzz zzz !');
    expect((await probe(page)).funny).toEqual(['surplace']);
});

test('after three touches that bring nothing nearer the good shelf shines; taking it costs one star', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await page.locator('[data-ferraille-level="1"]').click();
    await touch(page, 'b'); await touch(page, 'robot');
    await still(page);
    await expect(page.locator('.ferraille-zone [data-shine]')).toHaveCount(0);
    await touch(page, 'c');
    await still(page);
    expect((await probe(page)).hint).toEqual(['a']);
    await expect(page.locator('.ferraille-zone [data-plat="a"][data-shine]')).toHaveCount(1);
    await touch(page, 'a'); await touch(page, 'b'); await touch(page, 'c');
    await expect(page.locator('.ferraille-reward .stars')).toHaveText('★★☆', { timeout: 15_000 });
});

test('the lift glows when Boubou can jump on it, and carries him up to the shelves', async ({ page }) => {
    await open(page, upTo(9));
    await page.locator('[data-ferraille-level="10"]').click();
    await expect.poll(async () => (await probe(page)).reach.includes('l'), { timeout: 10_000 }).toBe(true);
    await expect(page.locator('.ferraille-zone [data-plat="l"][data-reach]')).toHaveCount(1);
    await touch(page, 'l', true);
    await touch(page, 'b', true);
    await still(page);
    expect((await probe(page)).state!.carried).toEqual(['b']);
});

test('a real finger touches a part on a crate, and the robot takes a battery with its magnet', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile touch only');
    await open(page, upTo(11));
    await page.locator('[data-ferraille-level="12"]').tap();
    const p = await still(page), part = p.parts.find(x => x.id === 'a')!;
    await page.touchscreen.tap(part.x + part.width / 2, part.y + part.height / 2);
    await expect.poll(async () => (await probe(page)).state?.carried).toEqual(['a']);
    await still(page);
    const r = (await probe(page)).robot!;
    await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    await expect.poll(async () => (await probe(page)).state?.delivered).toEqual(['a']);
    await expect(page.locator('[data-goal="a"][data-got]')).toHaveCount(1, { timeout: 5_000 });
});

test('the workshop takes the height of a 390 × 844 phone, Boubou, the parts, the platforms and the robot are big, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 7, 13, 21, 32]) {
        await page.locator(`[data-ferraille-level="${id}"]`).click();
        const p = await still(page), zone = p.zone!, stage = (await page.locator('.ferraille-stage').boundingBox())!;
        expect(Math.max(zone.height / stage.height, zone.width / stage.width), `scene ${id}`).toBeGreaterThan(0.95);
        expect(zone.height, `scene ${id}`).toBeGreaterThan(520);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        const k = zone.width / 180;
        // A finger touches a platform from 34 units above its top to the bottom of the plank (12 units).
        expect((34 + 12) * k, 'the touch band of a plank').toBeGreaterThanOrEqual(44);
        expect(12 * k, 'a plank stays visible').toBeGreaterThanOrEqual(20);
        // The parts are seen, not touched (the finger touches their platform): a spring is the slimmest.
        for (const part of p.parts) expect(Math.min(part.width, part.height), `scene ${id} part ${part.id}`).toBeGreaterThanOrEqual(28);
        for (const plat of p.plats) expect(plat.width, `scene ${id} platform ${plat.id}`).toBeGreaterThanOrEqual(44);
        // Boubou is drawn at least 70 px high and a quarter taller than the tallest part.
        const tallest = Math.max(...p.parts.map(x => x.height), 0);
        expect(p.drawn!.boubou, `scene ${id} Boubou drawn`).toBeGreaterThanOrEqual(Math.max(70, 1.25 * tallest));
        // The whole robot, arms and magnet included, stays inside the workshop.
        expect([p.robot!.x >= zone.x - 0.5, p.robot!.x + p.robot!.width <= zone.x + zone.width + 0.5], `scene ${id} robot ${Math.round(p.robot!.x)}–${Math.round(p.robot!.x + p.robot!.width)} in ${Math.round(zone.x)}–${Math.round(zone.x + zone.width)}`).toEqual([true, true]);
        expect(Math.min(p.robot!.width, p.robot!.height), `scene ${id} robot`).toBeGreaterThanOrEqual(100);
        await page.locator('#back').click();
    }
    await page.locator('[data-ferraille-level="32"]').click();
    await still(page);
    // A wide font, as on the CI runner (DejaVu Sans): the sentence and the parts must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        // Read as text so that a failure shows the sizes; compared with the width asked for, since a mobile browser widens
        // its layout to fit what overflows.
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement, zone = document.querySelector('.ferraille-zone')?.getBoundingClientRect(), g = document.querySelector('.ferraille-goals')?.getBoundingClientRect(); return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && (zone?.right ?? 0) <= w && (g?.right ?? 0) <= w ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), workshop ${Math.round(zone?.left ?? 0)}–${Math.round(zone?.right ?? 0)} px, parts ${Math.round(g?.right ?? 0)} px, sentence ${Math.round(document.querySelector('.ferraille-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
    // The finish buttons side by side, with the wide font, at 320 px.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="1"]').click();
    await touch(page, 'a'); await touch(page, 'b'); await touch(page, 'c');
    await expect(page.locator('.ferraille-reward')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => page.evaluate(() => { const d = document.documentElement, r = document.querySelector('.ferraille-reward')?.getBoundingClientRect(), b = [...document.querySelectorAll('.ferraille-reward button')].map(e => e.getBoundingClientRect()); return d.scrollWidth <= 320 && r && b.every(x => x.left >= r.left - 1 && x.right <= r.right + 1) ? 'fits' : `page ${d.scrollWidth} px, reward ${Math.round(r?.left ?? 0)}–${Math.round(r?.right ?? 0)}, buttons ${b.map(x => `${Math.round(x.left)}–${Math.round(x.right)}`).join(', ')}`; })).toBe('fits');
});

test('on a 390 × 844 phone, in every scene, the action fills at least 60 % of the workshop and nothing covers anything else', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(levels.length - 1));
    for (const l of levels) {
        await page.locator(`[data-ferraille-level="${l.id}"]`).click();
        await still(page);
        // Read as text so that a failure names the scene and the things: every platform, the room above it where Boubou
        // stands and its part lies, the robot.
        const found = await page.evaluate(() => {
            const zone = document.querySelector('.ferraille-zone svg')!.getBoundingClientRect(), k = zone.width / 180, problems: string[] = [];
            const box = (what: string, r: { left: number; right: number; top: number; bottom: number }) => ({ what, x0: r.left, x1: r.right, y0: r.top, y1: r.bottom });
            const things = [box('robot', document.querySelector('.ferraille-zone [data-robot] .ferraille-robot > rect:nth-of-type(3)')!.getBoundingClientRect())];
            // The bridge still hidden is rolled up beside its button; once out, it is checked by the engine's overlap test.
            for (const g of document.querySelectorAll('.ferraille-zone [data-plat]:not([data-hidden])')) {
                const id = g.getAttribute('data-plat')!, kind = g.getAttribute('data-kind'), r = g.querySelector('.ferraille-plateforme')!.getBoundingClientRect();
                const top = kind === 'ascenseur' ? r.bottom - 12 * k : r.top + 1;
                things.push(box(`${id} body`, { left: r.left + 1, right: r.right - 1, top, bottom: kind === 'ascenseur' ? r.bottom : r.bottom - 1 }));
                if (kind !== 'canard') { const x = (r.left + r.right) / 2; things.push(box(`${id} room`, { left: x - 14 * k, right: x + 14 * k, top: top - 39 * k, bottom: top - 1 })); }
            }
            for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) {
                const a = things[i]!, b = things[j]!;
                if (a.what.split(' ')[0] === b.what.split(' ')[0]) continue;
                if (a.x0 < b.x1 - 2 && b.x0 < a.x1 - 2 && a.y0 < b.y1 - 2 && b.y0 < a.y1 - 2) problems.push(`${a.what} covers ${b.what}`);
            }
            const robot = document.querySelector('.ferraille-zone [data-robot] .ferraille-robot')!.getBoundingClientRect();
            if (robot.left < zone.left - 0.5 || robot.right > zone.right + 0.5) problems.push(`robot ${Math.round(robot.left)}–${Math.round(robot.right)} out of ${Math.round(zone.left)}–${Math.round(zone.right)}`);
            const top = Math.min(...things.map(t => t.y0)), share = (zone.bottom - top) / zone.height;
            if (share < 0.6) problems.push(`action ${Math.round(share * 100)} % of the workshop`);
            if (zone.height < 0.6 * (innerHeight - zone.top)) problems.push(`workshop ${Math.round(zone.height)} px`);
            return [...new Set(problems)];
        });
        expect(found, `scene ${l.id}`).toEqual([]);
        await page.locator('#back').click();
    }
});

test('erasing the progress in the parents’ space also erases the workshop stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.ferraille.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});

test('phone captures of the workshop', async ({ page, isMobile }) => {
    test.skip(process.env.CAPTURES !== '1' || !isMobile, 'Set CAPTURES=1 for the phone captures.');
    test.setTimeout(120_000);
    const dir = `${homedir()}/Projets/jeux/captures-ferraille`;
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    await page.screenshot({ path: `${dir}/01-niveaux.png` });
    await page.locator('[data-ferraille-level="1"]').click(); await still(page);
    await page.screenshot({ path: `${dir}/02-trois-sauts.png` });
    await touch(page, 'a'); await still(page); await touch(page, 'b');
    await page.waitForTimeout(350); await page.screenshot({ path: `${dir}/03-en-plein-saut.png` });
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="1"]').click(); await touch(page, 'b');
    await expect.poll(async () => (await probe(page)).now - (await probe(page)).state!.t).toBeGreaterThanOrEqual(7);
    await page.screenshot({ path: `${dir}/04-essai-bong.png` });
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="5"]').click(); await touch(page, 'k');
    await page.waitForTimeout(1300); await page.screenshot({ path: `${dir}/05-essai-balles.png` });
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="13"]').click(); await still(page);
    await page.screenshot({ path: `${dir}/06-canard-geant.png` });
    await touch(page, 'd'); await page.waitForTimeout(950); await page.screenshot({ path: `${dir}/07-essai-canard.png` });
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="16"]').click(); await still(page);
    await page.screenshot({ path: `${dir}/08-bouton-et-tapis.png` });
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="30"]').click(); await still(page);
    await page.screenshot({ path: `${dir}/09-grande-machine.png` });
    await page.locator('#back').click(); await page.locator('[data-ferraille-level="1"]').click();
    await touch(page, 'a'); await touch(page, 'b'); await touch(page, 'c');
    await page.waitForTimeout(900); await page.screenshot({ path: `${dir}/10-robot-repare.png` });
});
