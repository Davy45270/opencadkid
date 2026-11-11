import type { Page } from '@playwright/test';
import { homedir } from 'node:os';
import { test, expect, media, passGate, prepare } from './helpers';
import { boardOf, fails, levels, next, slides, solve, start, step, type Fail, type Slide, type State } from '../../src/engines/eclosion';

interface Probe { screen: 'levels' | 'play'; state: State | null; records: Record<number, number>; busy: boolean; fail: Fail | null; funny: Fail[]; breezes: number; laid: number[]; hint: Slide | null; zone: { x: number; y: number; width: number; height: number } | null; geom: { w: number; h: number; cell: number; x0: number; y0: number } | null }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { eclosion: Probe } } }).__kid.state().eclosion);
async function open(page: Page, records?: Record<number, number>): Promise<void> {
    if (records) await page.addInitScript(r => localStorage.setItem('opencadkid.eclosion.v1', JSON.stringify(r)), records);
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="eclosion"]').click();
}
const upTo = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, 3]));
const still = async (page: Page): Promise<void> => { await expect.poll(async () => (await probe(page)).busy, { timeout: 10_000 }).toBe(false); };
const settled = async (page: Page, before: State): Promise<State> => {
    await expect.poll(async () => { const p = await probe(page); return !p.busy && p.state!.steps > before.steps; }, { timeout: 10_000 }).toBe(true);
    return (await probe(page)).state!;
};
/** A scene and a slide where, from the start, the engine says two different creatures (or a creature and a stone) block each
 * other. */
const find = (kind: Fail): [number, Slide] => { for (const l of levels) for (const d of slides) if (step(start(l.id), d)?.fail === kind) return [l.id, d]; throw new Error(kind); };
const DIR: Record<Slide, [number, number]> = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
/** A finger sliding on the nest, from its middle, `k` cells long, a little crooked as a child's finger is. */
async function swipe(page: Page, dx: number, dy: number): Promise<void> {
    const p = await probe(page), z = p.zone!, x = z.x + z.width / 2, y = z.y + z.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 6 }); await page.mouse.up();
}
async function slideTo(page: Page, d: Slide, how: 'finger' | 'arrow' = 'arrow'): Promise<State> {
    const before = (await probe(page)).state!;
    if (how === 'arrow') await page.locator(`[data-arrow="${d}"]`).click();
    else { const [dx, dy] = DIR[d], cell = (await probe(page)).geom!.cell; await swipe(page, dx * cell * 0.8 + dy * 12, dy * cell * 0.8 + dx * 12); }
    return settled(page, before);
}

test('Lumi says the scene, a finger slide brings the eggs together, a chick hatches and the stars are saved', async ({ page }) => {
    await open(page);
    await expect(page.locator('[data-eclosion-level]')).toHaveCount(levels.length);
    await expect(page.locator('[data-eclosion-level]:not([disabled])')).toHaveCount(1);
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('[data-eclosion-level="1"]').click();
    expect((await media(page)).speech).toEqual(['Deux œufs', 'Glisse ton doigt sur le nid, ou touche une flèche : tout glisse, et deux pareils qui se touchent éclosent !', 'Fais éclore un poussin.']);
    await expect(page.locator('[data-arrow]')).toHaveCount(4);
    await expect(page.locator('.eclosion-zone [data-tile][data-stage="0"]')).toHaveCount(2);
    const s = await slideTo(page, 'gauche', 'finger');
    expect(s.finished).toBe(true); expect(s.board).toBe('...1.....');
    await expect(page.locator('.eclosion-reward .stars')).toHaveText('★★★', { timeout: 10_000 });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.eclosion.v1')!) as object)).toEqual({ 1: 3 });
    await expect(page.locator('.eclosion-zone [data-tile][data-stage="1"]')).toHaveCount(1);
    await page.locator('#eclosion-next').click(); expect((await probe(page)).state!.level).toBe(2);
    await page.locator('#back').click(); expect((await probe(page)).screen).toBe('levels');
    await expect(page.locator('[data-eclosion-level]:not([disabled])')).toHaveCount(2);
});

test('a slide against the edge is a funny try: boing, and nothing in the nest changes', async ({ page }) => {
    await open(page, upTo(13));
    await page.locator('[data-eclosion-level="14"]').click();
    const before = (await probe(page)).state!;
    await page.evaluate(() => { (window as unknown as { __media: { speech: string[] } }).__media.speech = []; });
    await page.locator('.eclosion-zone').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.eclosion-boing')).toHaveCount(1);
    await expect(page.locator('.eclosion-mot')).toHaveText('Boing !');
    expect((await media(page)).speech).toEqual(['Boing ! Tout est déjà contre le bord.']);
    const after = await settled(page, before);
    expect([after.board, after.tries, after.helps]).toEqual([before.board, 1, 0]);
    await expect(page.locator('.eclosion-boing')).toHaveCount(0);
    expect((await probe(page)).laid).toEqual([]);
});

test('the six other funny tries: sulking, the stone, a diagonal, a shake, Lumi and the target, each with its animation', async ({ page }) => {
    await open(page, upTo(31));
    const seen: Fail[] = [];
    for (const [kind, cls, word] of [['tete', 'eclosion-boude', 'Hmpf !'], ['pierre', 'eclosion-bosse', 'Aïe !']] as const) {
        const [id, d] = find(kind);
        await page.locator(`[data-eclosion-level="${id}"]`).click();
        const before = (await probe(page)).state!;
        await page.locator(`[data-arrow="${d}"]`).click();
        await expect(page.locator(`.${cls}`).first()).toBeVisible();
        await expect(page.locator('.eclosion-mot')).toHaveText(word);
        expect((await settled(page, before)).board).toBe(before.board);
        seen.push(kind);
        await page.locator('#back').click();
    }
    await page.locator('[data-eclosion-level="3"]').click();
    let s = (await probe(page)).state!;
    // A finger going off at 45°: the creatures lean one way, then the other.
    await swipe(page, 60, 58);
    await expect(page.locator('.eclosion-hesite').first()).toBeVisible();
    s = await settled(page, s); expect(s.board).toBe(boardOf(levels[2]!));
    await page.locator('#eclosion-lumi').click();
    await expect(page.locator('#eclosion-lumi .eclosion-saut')).toHaveCount(1);
    s = await settled(page, s);
    await page.locator('#eclosion-cible').click();
    await expect(page.locator('#eclosion-cible.eclosion-coucou')).toHaveCount(1);
    await expect(page.locator('.eclosion-mot')).toHaveText('Coucou !');
    await settled(page, s);
    // Two quick slides one way then the other: everyone is dizzy.
    await page.locator('[data-arrow="droite"]').click(); await page.locator('[data-arrow="gauche"]').click();
    await expect(page.locator('.eclosion-tournis').first()).toBeVisible({ timeout: 5_000 });
    await still(page);
    const p = await probe(page);
    expect(p.funny).toEqual(['hesite', 'saut', 'coucou', 'tournis']);
    expect(p.state!.tries).toBe(4);
    expect([...seen, ...p.funny, 'mur'].sort()).toEqual([...fails].sort());
});

test('three funny tries make the right arrow shine; taking it costs one star', async ({ page }) => {
    await open(page, upTo(2));
    await page.locator('[data-eclosion-level="3"]').click();
    let s = (await probe(page)).state!;
    for (let k = 0; k < 3; k++) { await swipe(page, -50, 50); s = await settled(page, s); }
    const p = await probe(page);
    expect(p.hint).toBe(solve(levels[2]!, s.board)![0]);
    await expect(page.locator(`[data-arrow="${p.hint!}"][data-shine]`)).toHaveCount(1);
    await expect(page.locator('[data-arrow][data-shine]')).toHaveCount(1);
    s = await slideTo(page, p.hint!);
    expect(s.helps).toBe(1); expect(s.dry).toBe(0);
    await expect(page.locator('[data-arrow][data-shine]')).toHaveCount(0);
    while (!s.finished) s = await slideTo(page, solve(levels[2]!, s.board)![0]!);
    await expect(page.locator('.eclosion-reward .stars')).toHaveText('★★☆', { timeout: 10_000 });
});

test('Lumi lays an egg behind after each slide, and the breeze empties a nest that can no longer slide', async ({ page }) => {
    await open(page, upTo(19));
    await page.locator('[data-eclosion-level="13"]').click();
    await slideTo(page, 'gauche');
    expect((await probe(page)).laid).toEqual([5]);
    await expect(page.locator('.eclosion-zone [data-tile="5"][data-stage="0"]')).toHaveCount(1);
    let s = await slideTo(page, 'gauche');
    expect(s.finished).toBe(true);
    await page.locator('#back').click();
    // Scene 20: the shortest way, from the start, to a nest the breeze has to empty.
    const l = levels[19]!, from = new Map<string, { prev: string | null; d: Slide | null }>([[boardOf(l), { prev: null, d: null }]]), queue = [boardOf(l)];
    let way: Slide[] | null = null;
    for (let i = 0; i < queue.length && !way; i++) for (const d of slides) {
        const r = next(l, queue[i]!, d); if (!r || r.finished || from.has(r.board)) continue;
        from.set(r.board, { prev: queue[i]!, d });
        if (r.gone.length) { way = []; for (let at = r.board; ;) { const f = from.get(at)!; if (!f.d || f.prev === null) break; way.unshift(f.d); at = f.prev; } break; }
        queue.push(r.board);
    }
    expect(way).not.toBeNull();
    await page.locator('[data-eclosion-level="20"]').click();
    for (const d of way!.slice(0, -1)) await slideTo(page, d);
    const before = (await probe(page)).state!;
    await page.locator(`[data-arrow="${way!.at(-1)!}"]`).click();
    await expect(page.locator('.eclosion-envole').first()).toBeVisible();
    await expect(page.locator('.eclosion-vent')).toHaveCount(1);
    s = await settled(page, before);
    expect((await probe(page)).breezes).toBe(1);
    expect(s.board.split('').filter(c => c !== '.').length).toBeLessThan(9);
});

test('on a 390 × 844 phone, in every scene, the nest fills the stage, cells and arrows are big, nothing covers anything else', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(levels.length - 1));
    for (const l of levels) {
        await page.locator(`[data-eclosion-level="${l.id}"]`).click();
        const found = await page.evaluate(() => {
            const r = (s: string) => document.querySelector(s)!.getBoundingClientRect(), problems: string[] = [];
            const zone = r('.eclosion-zone'), stage = r('.eclosion-stage'), parts = [['header', r('.eclosion-play > header')], ['instruction', r('.eclosion-instruction')], ['chain', r('.eclosion-chaine')], ['nest', zone], ['pad', r('.eclosion-pad')]] as const;
            for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { const [na, a] = parts[i]!, [nb, b] = parts[j]!; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) problems.push(`${na} covers ${nb}`); }
            if (zone.height < 0.6 * stage.height && zone.width < 0.95 * stage.width) problems.push(`nest ${Math.round(zone.height)} of ${Math.round(stage.height)} px`);
            if (zone.bottom > innerHeight || r('.eclosion-pad').bottom > innerHeight) problems.push('below the screen');
            for (const b of document.querySelectorAll('[data-arrow]')) { const x = b.getBoundingClientRect(); if (x.width < 56 || x.height < 56) problems.push(`arrow ${Math.round(x.width)} px`); }
            for (const b of ['#eclosion-lumi', '#eclosion-cible']) { const x = r(b); if (x.width < 44 || x.height < 44) problems.push(`${b} ${Math.round(x.width)} px`); }
            // The nest itself, not only the stage around it, fills most of the height or of the width.
            if (Math.max(zone.height / stage.height, zone.width / stage.width) < 0.95) problems.push('nest too small for its stage');
            return problems;
        });
        expect(found, `scene ${l.id}`).toEqual([]);
        const g = (await probe(page)).geom!;
        expect(g.cell, `scene ${l.id}`).toBeGreaterThanOrEqual(70);
        await page.locator('#back').click();
    }
    await page.locator(`[data-eclosion-level="${levels.length}"]`).click();
    // A wide font, as on the CI runner (DejaVu Sans): nothing may overflow at 320, 390 and 1280 px.
    await page.addStyleTag({ content: '*{font-family:"DejaVu Sans",Verdana,sans-serif !important}' });
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await expect.poll(() => page.evaluate(w => { const d = document.documentElement, c = document.querySelector('.eclosion-chaine')!.getBoundingClientRect(), z = document.querySelector('.eclosion-zone')!.getBoundingClientRect(); return d.scrollWidth <= w && innerWidth <= w && d.scrollHeight <= innerHeight && c.right <= w && z.right <= w ? 'fits' : `${d.scrollWidth}×${d.scrollHeight} in ${innerWidth}×${innerHeight} (asked ${w}), chain ${Math.round(c.left)}–${Math.round(c.right)}, nest ${Math.round(z.right)}, sentence ${Math.round(document.querySelector('.eclosion-instruction')?.getBoundingClientRect().height ?? 0)} px`; }, width), { message: `width ${width}` }).toBe('fits');
    }
});

test('erasing the progress in the parents’ space also erases the egg stars', async ({ page }) => {
    await open(page, { 1: 3, 2: 2 });
    await page.locator('#back').click(); await page.locator('#parents').click(); await passGate(page);
    const stored = () => page.evaluate(() => localStorage.getItem('opencadkid.eclosion.v1'));
    await page.locator('#erase').click(); await page.locator('#no').click();
    expect(await stored()).toBe('{"1":3,"2":2}');
    await page.locator('#erase').click(); await page.locator('#yes').click();
    expect(await stored()).toBe('{}');
});

test('phone captures of the nest', async ({ page, isMobile }) => {
    test.skip(process.env.CAPTURES !== '1' || !isMobile, 'Set CAPTURES=1 for the phone captures.');
    test.setTimeout(120_000);
    const dir = `${homedir()}/Projets/jeux/captures-kid-eclosion`;
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, upTo(31));
    await page.screenshot({ path: `${dir}/01-niveaux.png` });
    await page.locator('[data-eclosion-level="1"]').click(); await still(page);
    await page.screenshot({ path: `${dir}/02-deux-oeufs.png` });
    await page.locator('[data-arrow="gauche"]').click(); await page.waitForTimeout(230);
    await page.screenshot({ path: `${dir}/03-eclosion.png` });
    const [sulky, way] = find('tete');
    await page.locator('#back').click(); await page.locator(`[data-eclosion-level="${sulky}"]`).click(); await still(page);
    await page.locator(`[data-arrow="${way}"]`).click(); await page.waitForTimeout(300);
    await page.screenshot({ path: `${dir}/04-essai-boude.png` });
    await page.locator('#back').click(); await page.locator('[data-eclosion-level="14"]').click(); await still(page);
    await page.locator('[data-arrow="gauche"]').click(); await page.waitForTimeout(180);
    await page.screenshot({ path: `${dir}/05-essai-boing.png` });
    await page.locator('#back').click(); await page.locator('[data-eclosion-level="3"]').click(); await still(page);
    await page.locator('[data-arrow="droite"]').click(); await page.locator('[data-arrow="gauche"]').click(); await page.waitForTimeout(650);
    await page.screenshot({ path: `${dir}/06-essai-tournis.png` });
    await page.locator('#back').click(); await page.locator('[data-eclosion-level="29"]').click(); await still(page);
    await page.screenshot({ path: `${dir}/07-pierres-et-ponte.png` });
    await page.locator('#back').click(); await page.locator('[data-eclosion-level="32"]').click(); await still(page);
    await page.screenshot({ path: `${dir}/08-grande-eclosion.png` });
    await page.locator('#back').click(); await page.locator('[data-eclosion-level="16"]').click(); await still(page);
    await page.locator('[data-arrow="gauche"]').click(); await still(page); await page.locator('[data-arrow="haut"]').click();
    await page.waitForTimeout(900); await page.screenshot({ path: `${dir}/09-petit-dragon.png` });
});
