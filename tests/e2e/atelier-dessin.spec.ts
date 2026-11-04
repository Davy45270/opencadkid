import * as fs from 'node:fs';
import { test, expect } from './helpers';
import { prepareStudio, studioState } from './atelier-helpers';
import { drawings } from '../../src/engines/atelier';

const corner = async (page: import('@playwright/test').Page) => { const r = (await page.locator('.atelier-sheet').boundingBox())!; return { x: r.x + 8, y: r.y + r.height - 8 }; };

test('the background takes a colour, and the sheet in progress comes back after leaving and after a reload', async ({ page }) => {
    await prepareStudio(page);
    await page.locator('[data-color="#72b8ed"]').click();
    const c = await corner(page); await page.mouse.click(c.x, c.y);
    await expect(page.locator('[data-zone="fond"]')).toHaveAttribute('fill', '#72b8ed');
    await page.locator('[data-color="#f6d76d"]').click(); await page.locator('[data-zone="head"]').click();
    expect((await studioState(page)).zones).toEqual({ fond: '#72b8ed', head: '#f6d76d' });
    await page.locator('#back').click(); await page.locator('[data-game="atelier"]').click();
    expect((await studioState(page)).zones).toEqual({ fond: '#72b8ed', head: '#f6d76d' });
    await page.reload(); await page.locator('[data-game="atelier"]').click();
    expect((await studioState(page)).zones).toEqual({ fond: '#72b8ed', head: '#f6d76d' });
    await expect(page.locator('[data-zone="fond"]')).toHaveAttribute('fill', '#72b8ed');
    // A new sheet is still one tap away, and undoable.
    await page.locator('[data-tool="clear"]').click(); await page.locator('#atelier-yes').click();
    expect((await studioState(page)).zones).toEqual({});
    await page.reload(); await page.locator('[data-game="atelier"]').click();
    expect((await studioState(page)).zones).toEqual({});
});

test('the brush draws over the coloured model, which stays visible under the stroke', async ({ page }) => {
    await prepareStudio(page);
    await page.locator('[data-color="#ee737a"]').click(); await page.locator('[data-zone="body"]').click();
    await page.locator('[data-tool="draw"]').click();
    const zones = drawings.find(d => d.id === 'boubou')!.zones.length;
    await expect(page.locator('.atelier-sheet [data-paint]')).toHaveCount(zones);
    await expect(page.locator('[data-paint="body"]')).toHaveAttribute('fill', '#ee737a');
    await page.locator('[data-color="#727ed1"]').click();
    const r = (await page.locator('.atelier-sheet').boundingBox())!;
    await page.mouse.move(r.x + 30, r.y + 40); await page.mouse.down();
    for (let i = 1; i <= 30; i++) await page.mouse.move(r.x + 30 + i * 7, r.y + 40 + i * 5);
    await page.mouse.up();
    const s = await studioState(page);
    expect(s.strokeCount).toBe(1); expect(s.zones).toEqual({ body: '#ee737a' });
    await expect(page.locator('[data-stroke="0"]')).toHaveAttribute('stroke', '#727ed1');
    // A tap on a zone in brush mode is a dot of paint, never a fill.
    await page.locator('[data-paint="head"]').evaluate(el => el.getBoundingClientRect()).then(async b => { await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); });
    expect((await studioState(page)).zones).toEqual({ body: '#ee737a' });
    expect((await studioState(page)).strokeCount).toBe(2);
    // Back in colour mode the marks stay on top of the zones.
    await page.locator('[data-tool="color"]').click();
    await expect(page.locator('[data-stroke="0"]')).toHaveCount(1);
    await page.locator('#atelier-picture').selectOption('feuille');
    expect(await studioState(page)).toMatchObject({ drawing: 'feuille', tool: 'draw', zones: {}, strokeCount: 0 });
    await expect(page.locator('[data-tool="draw"]')).toHaveAttribute('aria-selected', 'true');
});

test('the animated model moves while keeping exactly the child’s colours, and stops on the next tap', async ({ page }) => {
    await prepareStudio(page);
    await page.locator('#atelier-picture').selectOption('papillon');
    const colours = ['#ee737a', '#f4a269', '#58ad87', '#ab83cc'];
    const zones = ['left-top', 'right-top', 'body', 'fond'];
    for (const [i, zone] of zones.entries()) {
        await page.locator(`[data-color="${colours[i]!}"]`).click();
        if (zone === 'fond') { const c = await corner(page); await page.mouse.click(c.x, c.y); } else await page.locator(`[data-zone="${zone}"]`).click();
    }
    await page.locator('[data-tool="play"]').click();
    await expect(page.locator('[data-tool="play"]')).toHaveAttribute('aria-pressed', 'true');
    const playing = page.locator('svg.atelier-playing');
    await expect(playing).toHaveCount(1);
    for (const [i, zone] of zones.slice(0, 3).entries()) await expect(page.locator(`[data-paint="${zone}"]`)).toHaveAttribute('fill', colours[i]!);
    await expect(playing.locator('rect').first()).toHaveAttribute('fill', '#ab83cc');
    // The SVG document clock is set explicitly: two instants, two different wing widths.
    const widths = await playing.evaluate(svg => {
        const s = svg as SVGSVGElement, wing = s.querySelector('[data-paint="left-top"]') as SVGGraphicsElement; s.pauseAnimations();
        const at = (t: number) => { s.setCurrentTime(t); return wing.getBoundingClientRect().width; };
        return [at(0), at(0.25), at(0.5)];
    });
    expect(widths[1]!).toBeLessThan(widths[0]! * 0.8); expect(Math.abs(widths[2]! - widths[0]!)).toBeLessThan(1);
    expect((await studioState(page)).undoSize).toBeGreaterThan(0);
    const before = await studioState(page);
    await page.locator('.atelier-sheet').click();
    await expect(page.locator('svg.atelier-playing')).toHaveCount(0);
    expect(await studioState(page)).toEqual(before);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-tool="play"]').click();
    await expect(page.locator('svg.atelier-playing')).toHaveCount(1);
    await expect(page.locator('svg.atelier-playing animateTransform')).toHaveCount(0);
});

test('the picture is saved as a PNG file on this device, with no network request', async ({ page }) => {
    await prepareStudio(page);
    const requests: string[] = []; page.on('request', r => { if (!r.url().startsWith('blob:') && !r.url().startsWith('data:')) requests.push(r.url()); });
    await page.locator('[data-color="#58ad87"]').click(); const c = await corner(page); await page.mouse.click(c.x, c.y);
    const download = page.waitForEvent('download');
    await page.locator('[data-tool="export"]').click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^opencadkid-boubou-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.png$/);
    const bytes = fs.readFileSync((await file.path())!);
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // IHDR: 960 × 900 pixels.
    expect(bytes.readUInt32BE(16)).toBe(960); expect(bytes.readUInt32BE(20)).toBe(900);
    await expect(page.locator('#atelier-status')).toContainText(/enregistrée|saved/);
    expect(requests).toEqual([]);
});
