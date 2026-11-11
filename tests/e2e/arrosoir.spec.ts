import type { CDPSession, Page } from '@playwright/test';
import { test, expect, media, passGate, prepare } from './helpers';
import { BASE, fire, hint, levels, start, type Miss, type Shot, type State } from '../../src/engines/arrosoir';
import { pullOf } from '../../src/games/arrosoir/interaction';

interface Pt { x: number; y: number }
interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; zone: { x: number; y: number; width: number; height: number } | null; scale: number; launch: Pt | null; flowers: Pt[]; hint: Shot | null; busy: boolean; funny: Miss[]; aim: Shot | null; last: { miss: Miss | null; drank: number[] } | null }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { arrosoir: Probe } } }).__kid.state().arrosoir);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.arrosoir.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="arrosoir"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const settled = async (page: Page, turn: number): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.turn > turn; }, { timeout: 15_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** Where a finger starting at `from` goes to pull for `shot`. */
const target = (p: Probe, from: Pt, shot: Shot): Pt => { const d = pullOf(shot); return { x: from.x + d.x * p.scale, y: from.y + d.y * p.scale }; };
/** A pull with the mouse: down somewhere on the meadow, back the other way, the dotted line shows, let go. */
async function pull(page: Page, shot: Shot, from?: Pt): Promise<Probe> {
    const p = await probe(page), z = p.zone!, at = from ?? { x: z.x + z.width * .5, y: z.y + z.height * .3 }, to = target(p, at, shot);
    await page.mouse.move(at.x, at.y); await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 5 });
    await expect(page.locator('[data-dots] circle').first()).toBeVisible();
    await page.mouse.up();
    return p;
}
const shoot = async (page: Page, shot: Shot, from?: Pt): Promise<State> => { const p = await pull(page, shot, from); return settled(page, p.state!.turn); };
/** A shot of the scene that ends in the funny try `want`, among the robust ones. */
function findMiss(s: State, want: Miss): Shot {
    for (let angle = 20; angle <= 160; angle += 2) for (let power = 20; power <= 100; power += 4) {
        const ok = [[0, 0], [-1, -1], [1, 1], [-1, 1], [1, -1]].every(([da, dp]) => fire(s, { angle: angle + da!, power: power + dp! }).miss === want);
        if (ok) return { angle, power };
    }
    throw new Error(`no ${want}`);
}
const best = (s: State): Shot => { const g = { ...s, dry: 3 }; return hint(g)!; };
async function frame(page: Page): Promise<void> { await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); }
async function finger(cdp: CDPSession, page: Page, points: Pt[]): Promise<void> {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...points[0]! }] }); await frame(page);
    for (const p of points.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...p }] }); await frame(page); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await frame(page);
}

test('CaliRoux says the scene, a pull shows the dotted line and throws when let go; the flower opens and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-arrosoir-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-arrosoir-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-arrosoir-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Une fleur toute proche', 'Tire en arrière avec ton doigt, comme un lance-pierre, puis lâche : plus tu tires, plus le ballon va loin !', 'Arrose toutes les fleurs qui ont soif.']);
    await expect(page.locator('[data-flower]:not([data-open])')).toHaveCount(1);
    // While the finger pulls, the whole flight is dotted on the first scenes, and nothing is thrown yet.
    const shot = best(start(1)), p = await probe(page), z = p.zone!, from = { x: z.x + z.width * .7, y: z.y + z.height * .2 }, to = target(p, from, shot);
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 5 });
    const aim = (await probe(page)).aim!;
    expect(Math.abs(aim.angle - shot.angle)).toBeLessThanOrEqual(2); expect(Math.abs(aim.power - shot.power)).toBeLessThanOrEqual(2);
    expect(await page.locator('[data-dots] circle').count()).toBeGreaterThan(8);
    expect((await probe(page)).state!.turn).toBe(0);
    await page.mouse.up();
    const s = await settled(page, 0);
    expect(s.finished).toBe(true); expect(s.open).toEqual([true]);
    expect((await probe(page)).records).toEqual({ 1: 3 });
    await expect(page.locator('.arrosoir-reward .stars')).toHaveText('★★★');
    await expect(page.locator('[data-rainbow] path')).toHaveCount(6);
    await expect(page.locator('.arrosoir-papillon')).toHaveCount(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.arrosoir.v1')!) as object)).toEqual({ 1: 3 });
    await page.locator('#arrosoir-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-arrosoir-level]:not([disabled])')).toHaveCount(2);
});

test('a balloon thrown straight up falls back on CaliRoux: a funny try, nothing opens', async ({ page }) => {
    await open(page);
    await page.locator('[data-arrosoir-level="1"]').click();
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await pull(page, { angle: 90, power: 50 });
    await expect(page.locator('.arrosoir-ebroue')).toHaveCount(1);
    await expect(page.locator('.arrosoir-bulle text')).toHaveText('Ploc !');
    expect((await probe(page)).funny).toEqual(['court']);
    expect((await media(page)).speech).toEqual(['Ploc ! Trop court, le ballon revient sur moi. Je m’ébroue !']);
    const s = await settled(page, 0);
    expect([s.open, s.tries, s.dry, s.finished]).toEqual([[false], 1, 1, false]);
    await expect(page.locator('.arrosoir-ebroue')).toHaveCount(0);
});

test('the cow says meuh and the apple tree drops an apple on CaliRoux’s head; a balloon over the side goes plouf far away', async ({ page }) => {
    await open(page, upTo(7));
    await page.locator('[data-arrosoir-level="8"]').click();
    await pull(page, findMiss(start(8), 'vache'));
    await expect(page.locator('.arrosoir-meuh')).toHaveCount(1);
    await expect(page.locator('.arrosoir-bulle text')).toHaveText('Meuh !');
    await settled(page, 0);
    await page.locator('#back').click();
    await page.locator('[data-arrosoir-level="7"]').click();
    await pull(page, findMiss(start(7), 'arbre'));
    await expect(page.locator('.arrosoir-pomme')).toHaveCount(1);
    expect((await probe(page)).funny).toEqual(['arbre']);
    let s = await settled(page, 0);
    await pull(page, findMiss(s, 'loin'));
    await expect(page.locator('.arrosoir-poisson')).toHaveCount(1);
    s = await settled(page, s.turn);
    expect(s.tries).toBe(2);
});

test('after three balloons that water nothing a ghost hand shows the good pull; watering with it costs one star', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page, upTo(2));
    await page.locator('[data-arrosoir-level="3"]').click();
    let s: State = (await probe(page)).state!;
    for (let k = 0; k < 3; k++) { await expect(page.locator('.arrosoir-main')).toHaveCount(0); s = await shoot(page, { angle: 90, power: 40 }); }
    await expect(page.locator('.arrosoir-main')).toHaveCount(1);
    await expect(page.locator('[data-help] circle').first()).toBeVisible();
    const p = await probe(page);
    expect(p.hint).not.toBeNull();
    while (!s.finished) s = await shoot(page, (await probe(page)).hint ?? best(s));
    expect(s.helps).toBe(1);
    await expect(page.locator('.arrosoir-reward .stars')).toHaveText('★★☆');
});

test('a real finger pulls from anywhere on the meadow, even from its bottom corner', async ({ page, context, isMobile }) => {
    test.skip(!isMobile, 'Mobile touch only');
    await open(page, upTo(2));
    await page.locator('[data-arrosoir-level="3"]').tap();
    const cdp = await context.newCDPSession(page);
    try {
        for (const corner of [{ fx: .9, fy: .12 }, { fx: .15, fy: .55 }]) {
            const p = await probe(page), s = p.state!, z = p.zone!, shot = best(s), from = { x: z.x + z.width * corner.fx, y: z.y + z.height * corner.fy }, to = target(p, from, shot);
            await finger(cdp, page, [from, ...[.25, .5, .75, 1].map(k => ({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }))]);
            const after = await settled(page, s.turn);
            expect(after.open.filter(Boolean).length, `from ${corner.fx},${corner.fy}`).toBe(s.open.filter(Boolean).length + 1);
        }
        expect((await probe(page)).state!.finished).toBe(true);
        // A tap is not a throw: CaliRoux says the gesture again.
        await page.locator('#arrosoir-again').tap();
        const p = await probe(page), z = p.zone!;
        await finger(cdp, page, [{ x: z.x + z.width / 2, y: z.y + z.height / 2 }]);
        await page.waitForTimeout(300);
        expect((await probe(page)).state!.turn).toBe(0);
    } finally { await cdp.detach(); }
});

test('the meadow takes the height of a 390 × 844 phone, CaliRoux, flowers and the balloon are big, and nothing overflows from 320 to 1280 px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    for (const id of [1, 9, 22, 29, 32]) {
        await page.locator(`[data-arrosoir-level="${id}"]`).click();
        const p = await probe(page), zone = p.zone!, stage = (await page.locator('.arrosoir-stage').boundingBox())!;
        expect(Math.max(zone.height / stage.height, zone.width / stage.width), `scene ${id}`).toBeGreaterThan(0.95);
        expect(zone.height, `scene ${id}`).toBeGreaterThan(560);
        expect(zone.y + zone.height, `scene ${id}`).toBeLessThanOrEqual(844);
        for (const sel of ['[data-flower]', '[data-caliroux]']) for (const box of await page.locator(sel).evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }))) {
            expect(Math.max(box.w, box.h), `scene ${id} ${sel}`).toBeGreaterThanOrEqual(44); expect(Math.min(box.w, box.h), `scene ${id} ${sel}`).toBeGreaterThanOrEqual(36);
        }
        const ball = (await page.locator('[data-balloon]').boundingBox())!;
        expect(ball.width, `scene ${id}`).toBeGreaterThanOrEqual(26);
        await page.locator('#back').click();
    }
    await page.locator('[data-arrosoir-level="32"]').click();
    await shoot(page, { angle: 90, power: 40 });
    // A wide font, as on the CI runner (DejaVu Sans): the sentence and the finish buttons must still fit 320 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        // Read as text so that a failure shows the sizes; compared with the width asked for, since a mobile browser widens
        // its layout to fit what overflows.
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement, zone = document.querySelector('.arrosoir-zone')?.getBoundingClientRect(); return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && (zone?.right ?? 0) <= w ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), meadow ${Math.round(zone?.left ?? 0)}–${Math.round(zone?.right ?? 0)} px, sentence ${Math.round(document.querySelector('.arrosoir-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
    // The finish buttons side by side, with the wide font, at 320 px.
    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator('#back').click(); await page.locator('[data-arrosoir-level="1"]').click();
    await shoot(page, best(start(1)));
    await expect.poll(() => page.evaluate(() => { const d = document.documentElement, r = document.querySelector('.arrosoir-reward')?.getBoundingClientRect(), b = [...document.querySelectorAll('.arrosoir-reward button')].map(e => e.getBoundingClientRect()); return d.scrollWidth <= 320 && r && b.every(x => x.right <= r.right + 1 && x.left >= r.left - 1) ? 'fits' : `${d.scrollWidth} px, reward ${Math.round(r?.left ?? 0)}–${Math.round(r?.right ?? 0)}, buttons ${b.map(x => `${Math.round(x.left)}–${Math.round(x.right)}`).join(' ')}`; }), { message: 'finish buttons at 320 px' }).toBe('fits');
});

test('on a 390 × 844 phone, in every scene, the action fills at least 60 % of the meadow, nothing covers anything else, and a thirsty flower is at least half as tall as CaliRoux', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(levels.length - 1));
    for (const l of levels) {
        await page.locator(`[data-arrosoir-level="${l.id}"]`).click();
        await expect(page.locator('[data-flower]')).toHaveCount(l.flowers.length);
        // Read as text so that a failure names the scene and the things.
        const found = await page.evaluate(base => {
            const zone = document.querySelector('.arrosoir-zone svg')!.getBoundingClientRect(), k = zone.width / 160, problems: string[] = [];
            const box = (what: string, el: Element) => { const r = el.getBoundingClientRect(); return { what, x0: r.left, x1: r.right, y0: r.top, y1: r.bottom }; };
            const things = [
                box('CaliRoux', document.querySelector('[data-caliroux]')!),
                ...[...document.querySelectorAll('[data-flower]')].map(e => box(`flower ${e.getAttribute('data-flower')}`, e)),
                ...[...document.querySelectorAll('[data-tree]')].flatMap(e => [box(`trunk ${e.getAttribute('data-tree')}`, e.querySelector(':scope > path')!), box(`crown ${e.getAttribute('data-tree')}`, e.querySelector('.arrosoir-couronne')!)]),
                ...[...document.querySelectorAll('[data-cow]')].map(e => box(`cow ${e.getAttribute('data-cow')}`, e)),
                ...[...document.querySelectorAll('[data-can]')].map(e => box('can', e)),
                ...[...document.querySelectorAll('[data-pond]')].map(e => box('pond', e)),
                ...[...document.querySelectorAll('[data-sand]')].map((e, i) => box(`sand ${i}`, e))
            ];
            for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) {
                const a = things[i]!, b = things[j]!;
                if (a.what.split(' ')[1] === b.what.split(' ')[1] && /^(trunk|crown)/.test(a.what) && /^(trunk|crown)/.test(b.what)) continue;
                if (a.x0 < b.x1 - 1 && b.x0 < a.x1 - 1 && a.y0 < b.y1 - 1 && b.y0 < a.y1 - 1) problems.push(`${a.what} covers ${b.what}`);
            }
            const ground = zone.top + base * k, top = Math.min(...things.filter(t => !/^(pond|sand)/.test(t.what)).map(t => t.y0)), share = (ground - top) / zone.height;
            if (share < 0.6) problems.push(`action ${Math.round(share * 100)} % of the meadow`);
            const tall = things[0]!.y1 - things[0]!.y0;
            for (const f of document.querySelectorAll('[data-flower]:not([data-open])')) { const r = f.getBoundingClientRect(); if (r.height < tall / 2) problems.push(`thirsty flower ${Math.round(r.height)} px for CaliRoux ${Math.round(tall)} px`); }
            return problems;
        }, BASE);
        expect(found, `scene ${l.id}`).toEqual([]);
        await page.locator('#back').click();
    }
});

test('erasing the progress in the parents’ space also erases the watering stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.arrosoir.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});
