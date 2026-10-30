import type { BrowserContext, Page } from '@playwright/test';
import { expect, prepare } from './helpers';
export interface CheminProbe { game: string; level: number; chemin: { columns: number; rows: number; grid: string[][]; trace: number[]; solution: number[]; bonuses: number[]; collected: number[]; finished: boolean } }
export const cheminState = (page: Page): Promise<CheminProbe> => page.evaluate(() => (window as unknown as { __kid: { state: () => CheminProbe } }).__kid.state());
export async function prepareChemin(page: Page, level = 1, locale = 'fr'): Promise<void> {
    await prepare(page);
    await page.evaluate(({ level, locale }) => {
        const save = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { locale: string; cheminRecords: Record<number, number> };
        save.locale = locale; save.cheminRecords = {};
        for (let i = 1; i < level; i++) save.cheminRecords[i] = 3;
        localStorage.setItem('opencadkid.v1', JSON.stringify(save));
    }, { level, locale });
    await page.reload(); await page.locator('[data-game="chemin"]').click(); await page.locator(`[data-level="${level}"]`).click();
}
export async function mazeDom(page: Page): Promise<{ columns: number; rows: number; start: number; goal: number; edges: Record<number, number[]> }> {
    return page.locator('.chemin-zone>svg').evaluate(svg => {
        const [, , columns, rows] = svg.getAttribute('viewBox')!.split(' ').map(Number) as [number, number, number, number];
        const edges: Record<number, number[]> = {};
        for (const cell of svg.querySelectorAll('[data-cell]')) {
            const id = Number(cell.getAttribute('data-cell'));
            edges[id] = (cell.getAttribute('data-open')!.match(/[NESW]/g) ?? []).map(d => id + (d === 'E' ? 1 : d === 'W' ? -1 : d === 'S' ? columns : -columns));
        }
        return { columns, rows, start: Number(svg.querySelector('[data-start]')!.getAttribute('data-cell')), goal: Number(svg.querySelector('[data-goal]')!.getAttribute('data-cell')), edges };
    });
}
/** Breadth-first DOM-only oracle, with no engine import and no solution hook access. */
export async function mazeRoute(page: Page, start?: number, goal?: number): Promise<number[]> {
    const dom = await mazeDom(page); start ??= dom.start; goal ??= dom.goal;
    const parents = new Map<number, number>([[start, -1]]), queue = [start];
    for (let i = 0; i < queue.length; i++) for (const n of dom.edges[queue[i]!]!) if (!parents.has(n)) { parents.set(n, queue[i]!); queue.push(n); }
    expect(parents.size).toBe(dom.columns * dom.rows);
    const path = [goal]; while (path[0] !== start) { const p = parents.get(path[0]!); if (p === undefined) throw new Error('Disconnected maze'); path.unshift(p); }
    return path;
}
export async function cellPoint(page: Page, cell: number): Promise<{ x: number; y: number }> {
    const r = (await page.locator(`[data-cell="${cell}"]`).boundingBox())!;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}
export async function touchTrace(page: Page, context: BrowserContext, cells: number[]): Promise<void> {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...await cellPoint(page, cells[0]!) }] });
    for (const cell of cells.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...await cellPoint(page, cell) }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
}
export async function head(page: Page): Promise<number> { return Number(await page.locator('[data-head="true"]').getAttribute('data-cell')); }
export async function wallNeighbour(page: Page, cell: number): Promise<number> {
    const dom = await mazeDom(page), x = cell % dom.columns, y = Math.floor(cell / dom.columns);
    const neighbours = [x > 0 ? cell - 1 : -1, x + 1 < dom.columns ? cell + 1 : -1, y > 0 ? cell - dom.columns : -1, y + 1 < dom.rows ? cell + dom.columns : -1];
    const blocked = neighbours.find(c => c >= 0 && !dom.edges[cell]!.includes(c));
    if (blocked === undefined) throw new Error('No interior wall at chosen cell');
    return blocked;
}
