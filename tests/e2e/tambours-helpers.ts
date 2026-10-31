import type { Page } from '@playwright/test';
import { expect, prepare } from './helpers';
import type { Session } from '../../src/engines/tambours';
export interface Beat { drum: number; t: number }
export const drumsState = (page: Page): Promise<Session> => page.evaluate(() => (window as unknown as { __kid: { state(): { tambours: Session } } }).__kid.state().tambours);
export async function prepareDrums(page: Page, level = 1, options: { sound?: boolean; voice?: boolean; locale?: string; unavailable?: boolean } = {}): Promise<void> {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await prepare(page, 1, options);
    await page.evaluate(({ level, locale }) => {
        const save = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { tamboursRecords: Record<number, number>; locale: string };
        save.tamboursRecords = {}; save.locale = locale;
        for (let i = 1; i < level; i++) save.tamboursRecords[i] = 3;
        localStorage.setItem('opencadkid.v1', JSON.stringify(save));
    }, { level, locale: options.locale ?? 'fr' });
    if (options.unavailable) await page.addInitScript(() => {
        Object.defineProperty(window, 'AudioContext', { configurable: true, value: function unavailableAudio(): never { throw new Error('Audio unavailable'); } });
    });
    await page.reload();
    await page.evaluate(() => {
        const log: Beat[] = [];
        Object.defineProperty(window, '__drumLights', { value: log });
        new MutationObserver(records => {
            for (const r of records) {
                const el = r.target as HTMLElement;
                if (el.matches('[data-drum][data-lit="true"]')) log.push({ drum: Number(el.dataset.drum), t: performance.now() });
            }
        }).observe(document.querySelector('#app')!, { subtree: true, attributes: true, attributeFilter: ['data-lit'] });
    });
    await page.locator('[data-game="tambours"]').click(); await page.locator(`[data-level="${level}"]`).click();
}
/** Observe illuminated instruments, never read generated questions as an answer oracle. */
export async function demonstration(page: Page): Promise<Beat[]> {
    await expect(page.locator('.tambours-zone')).toHaveAttribute('data-phase', 'listening');
    await page.clock.runFor(20_000);
    await expect(page.locator('.tambours-zone')).toHaveAttribute('data-phase', 'playing');
    const beats = await page.evaluate(() => {
        const log = (window as unknown as { __drumLights: Beat[] }).__drumLights;
        return log.splice(0);
    });
    expect(beats.length).toBeGreaterThanOrEqual(2);
    return beats;
}
export async function clearLights(page: Page): Promise<void> { await page.evaluate(() => { (window as unknown as { __drumLights: Beat[] }).__drumLights.length = 0; }); }
export async function playBeats(page: Page, beats: Beat[], rhythm = false): Promise<void> {
    for (const [i, b] of beats.entries()) {
        if (rhythm && i) await page.clock.runFor(b.t - beats[i - 1]!.t);
        await page.locator(`[data-drum="${b.drum}"]`).click();
    }
}
