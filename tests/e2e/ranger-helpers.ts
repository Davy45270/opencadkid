import type { Page } from '@playwright/test';
import type { Session } from '../../src/engines/ranger';
import { expect, prepare } from './helpers';
export const rangerState = (page: Page): Promise<{ ranger: Session; selection: string | null; index: number }> => page.evaluate(() => (window as unknown as { __kid: { state: () => { ranger: Session; selection: string | null; index: number } } }).__kid.state());
export async function prepareRanger(page: Page, level = 1, locale = 'fr', options: { voice?: boolean; sound?: boolean } = {}): Promise<void> {
    await prepare(page, 1, options);
    await page.evaluate(({ level, locale }) => {
        const save = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { locale: string; rangerRecords: Record<number, number> };
        save.locale = locale; save.rangerRecords = {}; for (let i = 1; i < level; i++) save.rangerRecords[i] = 3;
        localStorage.setItem('opencadkid.v1', JSON.stringify(save));
    }, { level, locale });
    await page.reload(); await page.locator('[data-game="ranger"]').click(); await page.locator(`[data-level="${level}"]`).click();
}
export interface DomObject { id: string; color: string; shape: string; size: string; category: string; placed: boolean }
export interface SortingDom { rule: string; color: string; category: string; bins: string[]; objects: DomObject[] }
export async function rangerDom(page: Page): Promise<SortingDom> {
    return page.locator('.ranger-zone').evaluate(zone => ({
        rule: zone.getAttribute('data-rule')!, color: zone.getAttribute('data-rule-color')!, category: zone.getAttribute('data-rule-category')!,
        bins: [...zone.querySelectorAll('[data-bin]')].map(el => el.getAttribute('data-bin')!),
        objects: [...zone.querySelectorAll('[data-object]')].map(el => ({ id: el.getAttribute('data-object')!, color: el.getAttribute('data-color')!, shape: el.getAttribute('data-shape')!, size: el.getAttribute('data-size')!, category: el.getAttribute('data-category')!, placed: el.hasAttribute('disabled') }))
    }));
}
/** DOM-only sorting predicate; no engine or hook determines the answer. */
export function binFor(dom: SortingDom, o: DomObject): string {
    if (dom.rule === 'two') return o.color === dom.color && o.category === dom.category ? 'oui' : 'non';
    if (dom.rule === 'intrus') return o.category !== dom.category ? 'intrus' : 'ensemble';
    const key = dom.rule as 'color' | 'shape' | 'size' | 'category';
    const matches = dom.bins.filter(b => b === o[key]); expect(matches).toHaveLength(1); return matches[0]!;
}
export async function solveSorting(page: Page): Promise<void> {
    const dom = await rangerDom(page);
    for (const o of dom.objects) {
        if (o.placed || dom.rule === 'intrus' && binFor(dom, o) !== 'intrus') continue;
        await page.locator(`[data-object="${o.id}"]`).click();
        if (dom.rule !== 'intrus') await page.locator(`[data-bin="${binFor(dom, o)}"]`).click();
    }
    await expect(page.locator('#continue')).toBeVisible(); await page.locator('#continue').click();
}
