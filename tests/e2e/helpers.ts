import { test as base, expect, type Page } from '@playwright/test';
import type { Question } from '../../src/engines/compter';
export interface Target { id: string; x: number; y: number; width: number; height: number }
export interface State { screen: string; game: string | null; level: number | null; index: number; question: Question | null; basket: number; targets: Target[] }
export const state = (page: Page): Promise<State> => page.evaluate(() => (window as unknown as { __kid: { state: () => State } }).__kid.state());
export const test = base.extend<{ consoleGuard: boolean }>({
    consoleGuard: [async ({ page }, use) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        await use(true); expect(errors).toEqual([]);
    }, { auto: true }]
});
export { expect };
export interface MediaLog { speech: string[]; oscillators: number }
export const media = (page: Page): Promise<MediaLog> => page.evaluate(() => (window as unknown as { __media: MediaLog }).__media);
export async function clearSpeech(page: Page): Promise<void> {
    await page.evaluate(() => { (window as unknown as { __media: MediaLog }).__media.speech = []; });
}
export async function prepare(page: Page, level = 1, options: { voice?: boolean; sound?: boolean } = {}): Promise<void> {
    await page.addInitScript(({ level, voice, sound }) => {
        const log = { speech: [] as string[], oscillators: 0 };
        Object.defineProperty(window, '__media', { value: log });
        class Utterance {
            text: string; onend: (() => void) | null = null;
            constructor(text: string) { this.text = text; }
        }
        Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
        Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
            cancel() {}, getVoices: () => [{ localService: true, lang: 'fr-FR' }],
            addEventListener() {}, removeEventListener() {},
            speak(utterance: Utterance) { log.speech.push(utterance.text); queueMicrotask(() => utterance.onend?.()); }
        } });
        class FakeAudioContext {
            currentTime = 0; destination = {};
            resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); }
            createOscillator() { return { frequency: { value: 0 }, type: 'sine', connect() {}, start() { log.oscillators++; }, stop() {} }; }
            createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
        }
        Object.defineProperty(window, 'AudioContext', { value: FakeAudioContext, configurable: true });
        const records: Record<number, number> = {};
        for (let i = 1; i < level; i++) records[i] = 1;
        if (!localStorage.getItem('opencadkid.v1')) localStorage.setItem('opencadkid.v1', JSON.stringify({ version: 1, locale: 'fr', voice, sound, records }));
    }, { level, voice: options.voice ?? true, sound: options.sound ?? true });
    await page.goto('/');
    expect((await media(page)).speech).toEqual([]);
    await page.locator('[data-game="compter"]').click();
    await page.locator(`[data-level="${level}"]`).click();
}
/** The scene and constellations are the oracle; the hook only checks agreement. */
export async function visibleAnswer(page: Page): Promise<number> {
    const current = await state(page), q = current.question!;
    if (q.mode === 'combien') {
        const n = await page.locator('.objects [data-object]').count();
        expect(n).toBe(q.target);
        const cards = page.locator('.answers button');
        const matches: number[] = [];
        for (let i = 0; i < await cards.count(); i++) {
            const card = cards.nth(i), dots = await card.locator('svg circle').count();
            expect(Number(await card.locator('b').innerText())).toBe(dots);
            if (dots === n) matches.push(Number(await card.getAttribute('data-answer')));
        }
        expect(matches).toHaveLength(1);
        expect(matches[0]).toBe(q.answer);
        return matches[0]!;
    }
    const counts = await page.locator('.comparison').evaluateAll(cards => cards.map(card => card.querySelectorAll('[data-object]').length));
    const less = (await page.locator('.instruction p').innerText()).includes('le moins');
    const answer = less ? (counts[0]! < counts[1]! ? 0 : 1) : (counts[0]! > counts[1]! ? 0 : 1);
    expect(answer).toBe(q.answer);
    return answer;
}
export async function solveQuestion(page: Page): Promise<void> {
    const current = await state(page), q = current.question!;
    if (q.mode === 'remplir') {
        for (let i = current.basket; i < q.target; i++) { await page.locator('[data-reserve]').first().click(); await page.waitForTimeout(205); }
        for (let i = current.basket; i > q.target; i--) { await page.locator('[data-basket]').first().click(); await page.waitForTimeout(205); }
        await page.locator('#check').click();
    } else await page.locator(`[data-answer="${await visibleAnswer(page)}"]`).click();
    await expect(page.locator('#continue')).toBeVisible();
    await page.locator('#continue').click();
}
export async function solveRound(page: Page): Promise<void> {
    for (let i = (await state(page)).index; i < 6; i++) await solveQuestion(page);
    await expect(page.locator('.stars')).toBeVisible();
}
export async function passGate(page: Page): Promise<void> {
    const numbers = (await page.locator('.calculation').innerText()).match(/\d+/g)!.map(Number);
    await page.locator(`[data-parent="${numbers[0]! * numbers[1]!}"]`).click();
}
