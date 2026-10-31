import { expectMotionFinished, expectReturned } from './motion-helpers';
import type { Page } from '@playwright/test';
import { expect, prepare } from './helpers';
export interface SoundsProbe { game: string; selection: number | null; index: number; question: { answer: number }; sons: { errors: number; solved: boolean; finished: boolean; firstTry: number; placed: number[] }; targets: { width: number; height: number }[] }
export const soundsState = (page: Page): Promise<SoundsProbe> => page.evaluate(() => (window as unknown as { __kid: { state: () => SoundsProbe } }).__kid.state());
export const sounds: Record<string, Record<string, string>> = {
    fr: { A: 'a', B: 'beu', C: 'keu', D: 'deu', E: 'é', F: 'fff', G: 'gueu', I: 'i', J: 'jjj', L: 'lll', M: 'mmm', N: 'nnn', O: 'o', P: 'peu', R: 'rrr', S: 'sss', T: 'teu', U: 'u', V: 'vvv', Z: 'zzz' },
    en: { B: 'buh', C: 'kuh', D: 'duh', F: 'fff', G: 'guh', H: 'huh', J: 'juh', K: 'kuh', L: 'lll', M: 'mmm', N: 'nnn', P: 'puh', Q: 'kwuh', R: 'rrr', S: 'sss', T: 'tuh', V: 'vvv', W: 'wuh', Y: 'yuh', Z: 'zzz' }
};
export async function prepareSounds(page: Page, level = 1, locale = 'fr'): Promise<void> {
    // Reuse the shell's exact local speech and WebAudio doubles.
    await prepare(page, 1);
    await page.evaluate(({ level, locale }) => {
        const save = JSON.parse(localStorage.getItem('opencadkid.v1')!) as { locale: string; sonsRecords: Record<number, number> };
        save.locale = locale; save.sonsRecords = {};
        for (let i = 1; i < level; i++) save.sonsRecords[i] = 1;
        localStorage.setItem('opencadkid.v1', JSON.stringify(save));
    }, { level, locale });
    await page.reload(); await page.locator('[data-game="sons"]').click();
    await page.evaluate(() => { const log = (window as unknown as { __media: { speech: string[]; rates: number[] } }).__media; log.speech = []; log.rates = []; });
    await page.locator(`[data-level="${level}"]`).click();
}
/** DOM initials and letters are the independent oracle. The hook only checks agreement. */
export async function soundAnswer(page: Page): Promise<number> {
    const cue = page.locator('.sons-prompt'), mode = await cue.getAttribute('data-mode');
    const initial = mode === 'image-lettre' ? await cue.locator('[data-initial]').getAttribute('data-initial') : mode === 'lettre-image' ? await cue.locator('[data-letter]').getAttribute('data-letter') : await cue.getAttribute('data-initial');
    const matches: number[] = [];
    for (const card of await page.locator('[data-answer]').all()) {
        const attr = mode === 'lettre-image' ? 'data-initial' : 'data-letter';
        if (await card.locator(`[${attr}]`).getAttribute(attr) === initial) matches.push(Number(await card.getAttribute('data-answer')));
    }
    expect(matches).toHaveLength(1); expect((await soundsState(page)).question.answer).toBe(matches[0]); return matches[0]!;
}
export async function dragSound(page: Page, piece: number, correct = true): Promise<void> {
    const from = page.locator(`[data-sound-piece="${piece}"]`), initial = await from.locator('svg').getAttribute('data-initial');
    const to = page.locator('[data-sound-box]').filter({ has: page.locator(`[data-letter="${initial!}"]`) });
    const box = correct ? to : page.locator('[data-sound-box]').filter({ hasNot: page.locator(`[data-letter="${initial!}"]`) });
    const a = (await from.boundingBox())!, b = (await box.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 }); await page.mouse.up();
    await expectMotionFinished(from);
    if (!await from.isDisabled()) await expectReturned(from, a);
}
export async function solveSoundQuestion(page: Page): Promise<void> {
    if (await page.locator('[data-sound-piece]').count()) for (let i = 0; i < 3; i++) await dragSound(page, i);
    else await page.locator(`[data-answer="${await soundAnswer(page)}"]`).click();
    await expect(page.locator('#continue')).toBeVisible(); await page.locator('#continue').click();
}
