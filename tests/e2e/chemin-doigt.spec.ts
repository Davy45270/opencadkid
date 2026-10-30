import { test, expect, expectTouch, touchFrame } from './helpers';
import { cellPoint, cheminState, head, mazeDom, mazeRoute, prepareChemin, touchTrace, wallNeighbour } from './chemin-helpers';
for (const level of [1, 4, 8]) test(`mobile noisy chemin ${level}: irregular fast steps, lifted finger, wall and no scrolling`, async ({ page, context }, info) => {
    test.skip(info.project.name !== 'mobile', 'Real mobile touch input only.'); test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 }); await prepareChemin(page, level);
    const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY })), path = await mazeRoute(page), dom = await mazeDom(page);
    const cdp = await context.newCDPSession(page);
    let seed = 9387;
    const random = (): number => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const noisy = async (cell: number): Promise<{ id: number; x: number; y: number }> => {
        const p = await cellPoint(page, cell); return { id: 1, x: p.x + random() * 12 - 6, y: p.y + random() * 12 - 6 };
    };
    const unchangedScroll = async (): Promise<void> => { expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual(scroll); };
    // Exercise a mid-path lift and a real wall even on the three-cell introduction.
    const wallCell = path.slice(0, -1).find(c => {
        const x = c % dom.columns, y = Math.floor(c / dom.columns);
        return dom.edges[c]!.length < Number(x > 0) + Number(x < dom.columns - 1) + Number(y > 0) + Number(y < dom.rows - 1);
    })!;
    const approach = await mazeRoute(page, path[0], wallCell);
    await touchTrace(page, context, approach);
    const held = (await cheminState(page)).chemin.trace;
    await touchTrace(page, context, [wallCell, await wallNeighbour(page, wallCell)]);
    expect((await cheminState(page)).chemin.trace).toEqual(held);
    await touchTrace(page, context, [...approach].reverse());
    await touchTrace(page, context, path.slice(0, 2)); // release at the middle of the intro
    await touchTrace(page, context, [path[1]!, path[0]!]); // resume and retrace
    await unchangedScroll();
    let point = await noisy(path[0]!);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
    let lifted = false, hitWall = false, skipped = false;
    for (let i = 1; i < path.length;) {
        const current = path[i - 1]!;
        // A fast step may skip two collinear cells, never a bend in the corridor.
        let target = i;
        if (i + 1 < path.length && path[i]! - current === path[i + 1]! - path[i]! && (!skipped || random() < .6)) { target = i + 1; skipped = true; }
        const end = await noisy(path[target]!);
        const steps = target > i ? 1 : 1 + Math.floor(random() * 4);
        const start = point;
        for (let k = 1; k <= steps; k++) {
            point = { id: 1, x: start.x + (end.x - start.x) * k / steps, y: start.y + (end.y - start.y) * k / steps };
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
            await touchFrame(page); await unchangedScroll();
        }
        await expectTouch(page, `chemin ${level}, cellule ${current} → ${path[target]!}`, async () => await head(page) === path[target]);
        const trace = (await cheminState(page)).chemin.trace; expect(trace).toEqual(path.slice(0, target + 1));
        if (target < path.length - 1) {
            const cell = path[target]!, x = cell % dom.columns, y = Math.floor(cell / dom.columns);
            const physical = (x > 0 ? 1 : 0) + (x < dom.columns - 1 ? 1 : 0) + (y > 0 ? 1 : 0) + (y < dom.rows - 1 ? 1 : 0);
            if (!hitWall && dom.edges[cell]!.length < physical) {
                const blocked = await noisy(await wallNeighbour(page, cell));
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [blocked] });
                await touchFrame(page);
                expect((await cheminState(page)).chemin.trace).toEqual(trace);
                point = await noisy(cell); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] }); hitWall = true;
            }
            if (!lifted && target >= Math.floor(path.length / 2)) {
                await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
                await touchFrame(page);
                expect((await cheminState(page)).chemin.trace).toEqual(trace);
                point = await noisy(cell); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] }); lifted = true;
            }
        }
        i = target + 1;
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    if (level === 1) expect(skipped).toBe(true);
    if (path.length > 4) expect(lifted).toBe(true);
    await expect(page.locator('.stars')).toBeVisible(); expect((await cheminState(page)).chemin.finished).toBe(true);
    await unchangedScroll();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
    await cdp.detach();
});
