import type { Page } from '@playwright/test';
import { expect, prepare } from './helpers';
export interface PatternProbe { game: string; level: number; index: number; suites: { index: number; errors: number; firstTry: number; placed: number[]; solved: boolean; finished: boolean } }
export const patternState = (page: Page): Promise<PatternProbe> => page.evaluate(() => (window as unknown as { __kid: { state: () => PatternProbe } }).__kid.state());
export async function prepareSuites(page: Page, level = 1, locale = 'fr', options: { voice?: boolean; sound?: boolean } = {}): Promise<void> {
    await prepare(page, 1, options);
    await page.evaluate(({ level, locale }) => {
        const save = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { locale: string; suitesRecords: Record<number, number> };
        save.locale = locale; save.suitesRecords = {};
        for (let i = 1; i < level; i++) save.suitesRecords[i] = 3;
        localStorage.setItem('opencadkid.v1', JSON.stringify(save));
    }, { level, locale });
    await page.reload(); await page.locator('[data-game="suites"]').click(); await page.locator(`[data-level="${level}"]`).click();
}
export async function patternDom(page: Page): Promise<{ mode: string; slots: { item: string | null; dots: number; missing: boolean; label: string }[]; choices: { item: string; dots: number; choice: number }[] }> {
    return page.locator('.suites-zone').evaluate(zone => ({
        mode: zone.getAttribute('data-mode')!,
        slots: [...zone.querySelectorAll('[data-slot]')].map(el => ({ item: el.getAttribute('data-item'), dots: Number(el.getAttribute('data-dots')), missing: el.getAttribute('data-missing') === 'true', label: el.querySelector('svg')?.getAttribute('aria-label') ?? '' })),
        choices: [...zone.querySelectorAll('[data-pattern-choice]')].map(el => ({ item: el.getAttribute('data-item')!, dots: Number(el.getAttribute('data-dots')), choice: Number(el.getAttribute('data-pattern-choice')) }))
    }));
}
/** Exhaustive DOM-only base motifs. No pattern, target or answer from __kid. */
export async function patternAnswer(page: Page): Promise<number> {
    const attributes = await page.locator('.suites-zone [data-item]').evaluateAll(elements => elements.map(el => ({
        item: el.getAttribute('data-item'), shape: el.getAttribute('data-shape'), color: el.getAttribute('data-color'), dots: el.getAttribute('data-dots')
    })));
    for (const a of attributes) expect(a.item).toBe(`${a.shape}:${a.color}:${a.dots}`);
    const dom = await patternDom(page), slot = dom.slots.findIndex(s => s.item === null);
    expect(slot).toBeGreaterThanOrEqual(0);
    let matches: number[];
    if (dom.mode === 'croissant') {
        const visible = dom.slots.filter(s => s.item !== null);
        expect(visible.slice(1).every((s, i) => s.dots === visible[i]!.dots + 1)).toBe(true);
        matches = dom.choices.filter(c => c.dots === dom.slots[0]!.dots + slot).map(c => c.choice);
    } else {
        const alphabet = [...new Set([...dom.slots.flatMap(s => s.item ?? []), ...dom.choices.map(c => c.item)])];
        const candidates = new Set<string>();
        for (let period = 1; period <= 4; period++) {
            const enumerate = (base: string[]): void => {
                if (base.length === period) {
                    if (dom.slots.every((s, i) => s.item === null || s.item === base[i % period])) candidates.add(base[slot % period]!);
                } else for (const item of alphabet) enumerate([...base, item]);
            };
            enumerate([]);
        }
        matches = dom.choices.filter(c => candidates.has(c.item)).map(c => c.choice);
    }
    expect(matches).toHaveLength(1); return matches[0]!;
}
export async function solvePattern(page: Page): Promise<void> {
    while (await page.locator('.suites-empty').count()) await page.locator(`[data-pattern-choice="${await patternAnswer(page)}"]`).click();
    await expect(page.locator('#continue')).toBeVisible(); await page.locator('#continue').click();
}
