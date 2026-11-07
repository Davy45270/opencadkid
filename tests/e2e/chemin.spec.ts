import { test, expect, media, clearSpeech, state } from './helpers';
import { cellPoint, cheminState, head, mazeDom, mazeRoute, prepareChemin, touchTrace, wallNeighbour } from './chemin-helpers';
for (const level of [1, 4, 8]) test(`chemin ${level}: finger DOM oracle, wall, retreat, help, speech and persisted progress`, async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await prepareChemin(page, level);
    expect((await media(page)).speech).toContain('Trace le chemin de Pestouille jusqu’à l’arrivée.');
    await clearSpeech(page); await page.locator('#listen').click(); expect((await media(page)).speech).toEqual(['Trace le chemin de Pestouille jusqu’à l’arrivée.']);
    const path = await mazeRoute(page), before = await cheminState(page);
    expect(before.chemin.solution).toEqual(path);
    // Hook is a detached observation, never used to select a step.
    await page.evaluate(() => { const s = (window as unknown as { __kid: { state: () => { chemin: { trace: number[] } } } }).__kid.state(); s.chemin.trace.push(999); });
    expect((await cheminState(page)).chemin.trace).toEqual([path[0]]);
    await touchTrace(page, context, path.slice(0, 2)); expect(await head(page)).toBe(path[1]);
    await touchTrace(page, context, [path[1]!, path[0]!]); expect((await cheminState(page)).chemin.trace).toEqual([path[0]]);
    const dom = await mazeDom(page);
    const wallCell = path.slice(0, -1).find(c => {
        const x = c % dom.columns, y = Math.floor(c / dom.columns);
        return dom.edges[c]!.length < Number(x > 0) + Number(x < dom.columns - 1) + Number(y > 0) + Number(y < dom.rows - 1);
    })!;
    const approach = await mazeRoute(page, path[0], wallCell); await touchTrace(page, context, approach);
    const held = (await cheminState(page)).chemin.trace;
    await touchTrace(page, context, [wallCell, await wallNeighbour(page, wallCell)]); expect((await cheminState(page)).chemin.trace).toEqual(held);
    await page.locator('#help').click();
    const remaining = await mazeRoute(page, wallCell);
    await expect(page.locator('[data-hint]')).toHaveAttribute('data-hint', remaining.slice(1, 4).join(','));
    const sounds = (await media(page)).oscillators;
    await touchTrace(page, context, remaining); expect((await cheminState(page)).chemin.finished).toBe(true);
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles'); expect((await media(page)).oscillators).toBeGreaterThan(sounds);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.v1')!) as { cheminRecords: Record<number, number>; records: object });
    expect(saved.cheminRecords[level]).toBe(3); expect(saved.records).toEqual({});
    await page.reload(); await page.locator('[data-game="chemin"]').click(); await expect(page.locator(`[data-level="${level}"]`)).toContainText('★★★');
    if (level < 8) await expect(page.locator(`[data-level="${level + 1}"]`)).toBeEnabled();
});
test('keyboard arrows, English voice, available help and silent settings', async ({ page }) => {
    await prepareChemin(page, 8, 'en'); expect((await media(page)).speech).toContain('Trace Pestouille’s path to the finish.');
    await page.locator('#help').click(); await expect(page.locator('[data-hint]')).toHaveCount(1);
    const path = await mazeRoute(page), { columns } = await mazeDom(page);
    await page.locator('.chemin-zone').focus();
    for (let i = 1; i < path.length; i++) {
        const delta = path[i]! - path[i - 1]!;
        await page.keyboard.press(delta === 1 ? 'ArrowRight' : delta === -1 ? 'ArrowLeft' : delta === columns ? 'ArrowDown' : 'ArrowUp');
        expect(await head(page)).toBe(path[i]);
    }
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 stars'); await expect(page.locator('#next')).toHaveCount(1);
    await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { voice: boolean; sound: boolean }; s.voice = false; s.sound = false; localStorage.setItem('opencadkid.v1', JSON.stringify(s)); });
    await page.reload(); await page.locator('[data-game="chemin"]').click(); await page.locator('[data-level="1"]').click();
    await page.locator('#listen').click(); expect((await media(page)).speech).toEqual([]);
    const silent = await mazeRoute(page); await page.locator('.chemin-zone').focus();
    for (const cell of silent.slice(1)) { await page.keyboard.press('ArrowRight'); expect(await head(page)).toBe(cell); }
    expect((await media(page)).oscillators).toBe(0);
});
test('all levels: real cells, painted strokes, header targets, valid SVG and zero overflow 320–1280', async ({ page }) => {
    test.setTimeout(360_000);
    for (let level = 1; level <= 16; level++) {
        await prepareChemin(page, level);
        for (const width of [320, 360, 390, 480, 699, 700, 940, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            const cells = await page.locator('[data-cell]').evaluateAll(elements => elements.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
            const zone = (await page.locator('.chemin-zone').boundingBox())!;
            for (const r of cells) {
                expect(r.width).toBeCloseTo(r.height, 4);
                if (width === 390) { expect(r.width).toBeGreaterThanOrEqual(40); expect(r.height).toBeGreaterThanOrEqual(40); }
                expect(r.x).toBeGreaterThanOrEqual(zone.x - .1); expect(r.y).toBeGreaterThanOrEqual(zone.y - .1);
                expect(r.x + r.width).toBeLessThanOrEqual(zone.x + zone.width + .1); expect(r.y + r.height).toBeLessThanOrEqual(zone.y + zone.height + .1);
            }
            for (const r of (await state(page)).targets) { expect(r.width).toBeGreaterThanOrEqual(64); expect(r.height).toBeGreaterThanOrEqual(64); }
            const stroke = await page.locator('[data-walls]').evaluate(el => { const p = el as SVGGraphicsElement; return Number(getComputedStyle(el).strokeWidth.replace('px', '')) * p.getScreenCTM()!.a; });
            expect(stroke).toBeGreaterThanOrEqual(3);
            expect(await page.locator('.chemin-zone>svg').evaluate(el => !new DOMParser().parseFromString(el.outerHTML, 'image/svg+xml').querySelector('parsererror'))).toBe(true);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
        }
    }
});
test('grabbing earlier trace, cancellation and resumed pointer preserve the drawing', async ({ page, context }) => {
    await prepareChemin(page, 4);
    let path = await mazeRoute(page);
    const findWall = async (): Promise<number | undefined> => {
        const dom = await mazeDom(page);
        // Leave two later cells: grabbing this cell must grab an earlier trace,
        // and the initial drawing must remain unfinished.
        return path.slice(0, -2).find(cell => {
            const x = cell % dom.columns, y = Math.floor(cell / dom.columns);
            return dom.edges[cell]!.length < Number(x > 0) + Number(x + 1 < dom.columns) + Number(y > 0) + Number(y + 1 < dom.rows);
        });
    };
    let wallCell = await findWall();
    if (wallCell === undefined) {
        // Level 4, seed 18 has an interior wall on an earlier solution cell;
        // tests/chemin.test.ts locks down this fallback fixture.
        await prepareChemin(page, 4, 'fr', 18);
        path = await mazeRoute(page); wallCell = await findWall();
    }
    expect(wallCell).toBeDefined();
    const wallIndex = path.indexOf(wallCell!);
    await touchTrace(page, context, path.slice(0, Math.max(3, wallIndex + 2)));
    const longer = (await cheminState(page)).chemin.trace;
    await touchTrace(page, context, [wallCell!, await wallNeighbour(page, wallCell!)]);
    expect((await cheminState(page)).chemin.trace).toEqual(longer);
    await touchTrace(page, context, [...longer].reverse());
    expect((await cheminState(page)).chemin.trace).toEqual([path[0]]);
    await touchTrace(page, context, path.slice(0, 2));
    const original = (await cheminState(page)).chemin.trace;
    const p = await cellPoint(page, path[0]!);
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.up();
    expect((await cheminState(page)).chemin.trace).toEqual(original);
    const end = await cellPoint(page, path[1]!); await page.mouse.move(end.x, end.y); await page.mouse.down();
    await page.evaluate(() => document.querySelector('#app')!.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })));
    await page.mouse.up(); expect((await cheminState(page)).chemin.trace).toEqual(original);
    await touchTrace(page, context, path.slice(1)); await expect(page.locator('.stars')).toBeVisible();
});
test('optional chemin captures', async ({ page, context }, info) => {
    test.skip(process.env.CAPTURES !== '1' || info.project.name !== 'mobile', 'Optional mobile capture artifacts.');
    await page.setViewportSize({ width: 390, height: 844 }); await prepareChemin(page, 8);
    await page.screenshot({ path: 'docs/captures/chemin-debut.png' });
    await touchTrace(page, context, await mazeRoute(page));
    await page.screenshot({ path: 'docs/captures/chemin-fini.png' });
});

test('optional bonus detours earn a persistent medal; a replay preserves the best reward', async ({ page, context }) => {
    await prepareChemin(page, 4);
    const bonuses = await page.locator('[data-bonus]').evaluateAll(elements => elements.map(el => Number(el.getAttribute('data-bonus'))));
    expect(bonuses).toHaveLength(2);
    for (const cell of bonuses) {
        await touchTrace(page, context, await mazeRoute(page, await head(page), cell));
        await expect(page.locator(`[data-bonus="${cell}"]`)).toHaveAttribute('data-collected', 'true');
    }
    await touchTrace(page, context, await mazeRoute(page, await head(page)));
    await expect(page.locator('[data-medal]')).toBeVisible();
    await page.locator('#again').click();
    await touchTrace(page, context, await mazeRoute(page));
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles');
    await page.reload(); await page.locator('[data-game="chemin"]').click();
    await expect(page.locator('[data-level="4"]')).toContainText('★★★'); await expect(page.locator('[data-level="4"]')).toContainText('🏅');
});

test('visibilitychange cancels the held gesture and permits a fresh primary gesture', async ({ page }) => {
    await prepareChemin(page, 4);
    const path = await mazeRoute(page), start = await cellPoint(page, path[0]!), next = await cellPoint(page, path[1]!);
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
        Reflect.deleteProperty(document, 'hidden');
        document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.mouse.move(next.x, next.y);
    expect((await cheminState(page)).chemin.trace).toEqual([path[0]]);
    await page.mouse.up();
    expect((await cheminState(page)).chemin.trace).toEqual([path[0]]);
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(next.x, next.y); await page.mouse.up();
    expect((await cheminState(page)).chemin.trace).toEqual(path.slice(0, 2));
});

test('non-primary pointer cannot own a gesture while a primary pointer can', async ({ page }) => {
    await prepareChemin(page, 4);
    const path = await mazeRoute(page), start = await cellPoint(page, path[0]!), next = await cellPoint(page, path[1]!);
    // Hold a real mouse pointer outside the board, so capture is available to
    // the synthetic non-primary down without starting a board gesture first.
    const outside = (await page.locator('.chemin-instruction').boundingBox())!;
    await page.mouse.move(outside.x + outside.width / 2, outside.y + outside.height / 2); await page.mouse.down();
    await page.locator('.chemin-zone').dispatchEvent('pointerdown', {
        pointerId: 1, pointerType: 'mouse', isPrimary: false, button: 0, buttons: 1, clientX: start.x, clientY: start.y
    });
    await page.mouse.move(next.x, next.y);
    expect((await cheminState(page)).chemin.trace).toEqual([path[0]]);
    await page.mouse.up();
    expect((await cheminState(page)).chemin.trace).toEqual([path[0]]);
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(next.x, next.y); await page.mouse.up();
    expect((await cheminState(page)).chemin.trace).toEqual(path.slice(0, 2));
});

test('a fast pointer release beyond the board applies the corridor to its destination', async ({ page }) => {
    await prepareChemin(page, 1);
    const path = await mazeRoute(page), start = await cellPoint(page, path[0]!);
    const zone = (await page.locator('.chemin-zone').boundingBox())!;
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(zone.x + zone.width + 40, start.y); await page.mouse.up();
    expect((await cheminState(page)).chemin.trace).toEqual(path);
    await expect(page.locator('.stars')).toBeVisible();
});
test('chemin 16: no bulb, a long serpentine traced to the end, no next level; the sixteen-level list fits a phone', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await prepareChemin(page, 16);
    await expect(page.locator('#help')).toHaveCount(0);
    await expect(page.locator('.chemin-instruction p')).toContainText('Sans ampoule');
    const path = await mazeRoute(page); expect(path.length).toBeGreaterThanOrEqual(51);
    await touchTrace(page, context, path); expect((await cheminState(page)).chemin.finished).toBe(true);
    await expect(page.locator('.stars')).toHaveAttribute('aria-label', '3 étoiles'); await expect(page.locator('#next')).toHaveCount(0);
    await page.reload(); await page.locator('[data-game="chemin"]').click();
    await expect(page.locator('[data-level]')).toHaveCount(16); await expect(page.locator('[data-level="16"]')).toContainText('★★★');
    const boxes = await page.locator('[data-level]').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; }));
    for (const r of boxes) { expect(r.left).toBeGreaterThanOrEqual(0); expect(r.right).toBeLessThanOrEqual(390); expect(r.width).toBeGreaterThanOrEqual(64); expect(r.height).toBeGreaterThanOrEqual(64); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
