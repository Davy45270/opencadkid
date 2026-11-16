import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { test, expect, media, prepare } from './helpers';
import type { Evaluation, Feed, Grade, Word } from '../../src/engines/dictee';

interface Rect { x: number; y: number; width: number; height: number }
interface Probe { screen: string; grade: Grade | null; feed: Feed | null; typed: string; tiles: string[]; evaluation: Evaluation | null; played: { path: string; rate: number }[]; card: Rect | null; keys: (Rect & { key: string })[] }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { dictee: Probe } } }).__kid.state().dictee);
const shipped = JSON.parse(readFileSync('public/dictee/catalogue.json', 'utf8')) as { words: Word[] };
const byId = new Map(shipped.words.map(w => [w.id, w]));
// The service worker would serve the precached catalogue past the test's route.
test.use({ serviceWorkers: 'block' });

/** The shipped catalogue holds drafts only: the child sees none. To play, the test serves it with some words marked
 * reviewed, as an adult would after reading them. */
async function reviewed(page: Page, pick: (w: Word) => boolean): Promise<void> {
    await page.route('**/dictee/catalogue.json', route => route.fulfill({ contentType: 'application/json',
        body: JSON.stringify({ ...shipped, words: shipped.words.map(w => pick(w) && (!w.homophones.length || w.contextSentence) ? { ...w, contentStatus: 'reviewed', validatedBy: 'relecture de test' } : w) }) }));
}
async function open(page: Page): Promise<void> {
    await prepare(page); await page.locator('#back').click();
    await page.locator('[data-game="dictee"]').click();
    await expect(page.locator('[data-dictee-profile]')).toHaveCount(5);
}
async function feed(page: Page, grade: Grade, n: number): Promise<void> {
    await open(page);
    await page.locator('[data-dictee-profile="licorne"]').click();
    await page.locator(`[data-dictee-grade="${grade}"]`).click();
    await page.locator(`[data-dictee-length="${n}"]`).click();
    await expect(page.locator('.dictee-card')).toHaveCount(1);
}
const word = async (page: Page): Promise<Word> => { const p = await probe(page); return byId.get(p.feed!.cards[p.feed!.index]!.id)!; };
async function typeOnScreen(page: Page, text: string): Promise<void> { for (const c of text) await page.locator(`[data-key="${c}"]`).click(); }

test('the shipped drafts never reach the child: every class waits for an adult review', async ({ page }) => {
    await open(page);
    await page.locator('[data-dictee-profile="dragon"]').click();
    await expect(page.locator('[data-dictee-grade]')).toHaveCount(5);
    await expect(page.locator('[data-dictee-grade]:not([disabled])')).toHaveCount(0);
    await expect(page.locator('#dictee-empty')).toBeVisible();
    await expect(page.locator('.dictee-drafts')).toHaveCount(0);
});

test('a finite feed: the word is heard, never shown before checking; right, wrong, again later, and the summary', async ({ page }) => {
    // Six words of one class are reviewed: a feed of five, so one missed word must come back inside the five cards.
    // Plain letters only: Playwright types an accented letter as inserted text, with no keydown, where a real AZERTY keyboard sends one.
    const pool = shipped.words.filter(w => w.grade === 'CE1' && !w.homophones.length && /^[a-z]+$/.test(w.expectedForm)).slice(0, 6).map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);
    const first = await word(page);
    await expect.poll(async () => (await probe(page)).played.map(p => p.path)).toContain(first.pronunciationAsset);
    // Nothing on the page spells the word before the answer is checked.
    expect(await page.locator('#app').innerText()).not.toContain(first.expectedForm);
    // The field never opens the device keyboard and never corrects.
    const field = page.locator('#dictee-answer');
    for (const [name, value] of [['inputmode', 'none'], ['autocomplete', 'off'], ['autocorrect', 'off'], ['autocapitalize', 'none'], ['spellcheck', 'false']] as const) await expect(field).toHaveAttribute(name, value);
    // Touch the card: again; hold it: slowly.
    const card = (await probe(page)).card!;
    const before = (await probe(page)).played.length;
    await page.mouse.click(card.x + card.width / 2, card.y + 40);
    await page.mouse.move(card.x + card.width / 2, card.y + 40); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up();
    await expect.poll(async () => (await probe(page)).played.slice(before).map(p => p.rate)).toEqual([1, .75]);
    // A wrong answer: the card turns over and shows the word, the letters to look at and one line.
    await typeOnScreen(page, first.expectedForm.slice(0, -1));
    await page.locator('#dictee-validate').click();
    await expect(page.locator('.dictee-card.retournee')).toHaveCount(1);
    await expect(page.locator('.dictee-back .dictee-word')).toHaveText(first.expectedForm);
    await expect(page.locator('.dictee-word .faux')).not.toHaveCount(0);
    await expect(page.locator('#dictee-explain')).not.toBeEmpty();
    // Swipe up: the next card.
    const c = (await probe(page)).card!;
    await page.mouse.move(c.x + c.width / 2, c.y + c.height * .6); await page.mouse.down();
    await page.mouse.move(c.x + c.width / 2, c.y + c.height * .6 - 120, { steps: 8 }); await page.mouse.up();
    await expect.poll(async () => (await probe(page)).feed!.index).toBe(1);
    // A right answer with the physical keyboard: the mascot's joy and the chime.
    const second = await word(page);
    const oscillators = (await media(page)).oscillators;
    await page.keyboard.type(second.expectedForm); await page.keyboard.press('Enter');
    await expect(page.locator('.dictee-card.juste')).toHaveCount(1);
    await expect.poll(async () => (await media(page)).oscillators).toBeGreaterThan(oscillators);
    await page.keyboard.press('ArrowUp');
    // The rest right; the missed word comes back once, three cards after it was missed, and the feed keeps five cards.
    const seen: string[] = [first.id, second.id];
    for (let k = 2; k < 5; k++) {
        await expect.poll(async () => (await probe(page)).feed!.index).toBe(k);
        const w = await word(page); seen.push(w.id);
        await typeOnScreen(page, w.expectedForm); await page.locator('#dictee-validate').click();
        await page.locator('#dictee-next').click();
    }
    expect(seen.filter(id => id === first.id)).toHaveLength(2);
    expect(seen.indexOf(first.id, 1)).toBe(4);
    await expect(page.locator('#dictee-end')).toBeVisible();
    await expect(page.locator('.dictee-list.liste-revoir li')).toHaveText([first.expectedForm]);
    await expect(page.locator('.dictee-list.liste-juste li')).toHaveCount(3);
    // Nothing chains on by itself: the summary waits.
    await page.waitForTimeout(1500);
    await expect(page.locator('#dictee-end')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.dictee.v1') ?? '{}') as { licorne: { CE1: { session: number; words: Record<string, object> } } });
    expect(stored.licorne.CE1.session).toBe(1);
    expect(stored.licorne.CE1.words[first.id]).toMatchObject({ box: 1, misses: 1 });
});

test('the context sentence plays on demand', async ({ page }) => {
    await reviewed(page, w => w.grade === 'CE2' && Boolean(w.contextSentence));
    test.skip(!shipped.words.some(w => w.grade === 'CE2' && w.contextSentence), 'No context sentence yet.');
    await feed(page, 'CE2', 5);
    const w = await word(page);
    await page.locator('#dictee-sentence').click();
    await expect.poll(async () => (await probe(page)).played.map(p => p.path)).toContain(w.contextAsset);
});

test('first grade: the letters are shuffled tiles to put back in order', async ({ page }) => {
    await reviewed(page, w => w.grade === 'CP');
    await feed(page, 'CP', 5);
    const w = await word(page), p = await probe(page);
    expect([...p.tiles].sort()).toEqual(Array.from(w.expectedForm).sort());
    expect(p.tiles.join('')).not.toBe(w.expectedForm);
    await expect(page.locator('[data-key]')).toHaveCount(0);
    const used: number[] = [];
    for (const c of w.expectedForm) { const k = p.tiles.findIndex((x, i) => x === c && !used.includes(i)); used.push(k); await page.locator(`[data-tile="${k}"]`).click(); }
    await page.locator('#dictee-validate').click();
    await expect(page.locator('.dictee-card.juste')).toHaveCount(1);
});

test('big keys on a 360 px phone, the accents always visible, nothing overflows', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await reviewed(page, w => w.grade === 'CM1');
    await feed(page, 'CM1', 10);
    const p = await probe(page);
    const keys = p.keys.filter(k => k.key.length === 1);
    expect(keys).toHaveLength(26 + 11);
    for (const k of p.keys) { expect(k.width, k.key).toBeGreaterThanOrEqual(44); expect(k.height, k.key).toBeGreaterThanOrEqual(44); }
    for (const a of 'éèêàâçùîôëï') await expect(page.locator(`[data-key="${a}"]`)).toBeInViewport();
    await expect(page.locator('#dictee-validate')).toBeInViewport();
    expect(p.card!.height).toBeGreaterThan(180);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('captures for the review', async ({ page, isMobile }) => {
    test.skip(process.env.CAPTURES !== '1', 'Set CAPTURES=1 for the captures.');
    test.setTimeout(120_000);
    const dir = `${homedir()}/Projets/jeux/captures-kid-dictee`, tag = isMobile ? 'mobile' : 'bureau';
    if (isMobile) await page.setViewportSize({ width: 360, height: 740 });
    await reviewed(page, w => w.grade !== 'CM2');
    await open(page);
    await page.screenshot({ path: `${dir}/${tag}-01-qui-joue.png` });
    await page.locator('[data-dictee-profile="licorne"]').click();
    await page.screenshot({ path: `${dir}/${tag}-02-classes.png` });
    await page.locator('[data-dictee-grade="CE1"]').click();
    await page.screenshot({ path: `${dir}/${tag}-03-nombre.png` });
    await page.locator('[data-dictee-length="10"]').click();
    const w = await word(page);
    await typeOnScreen(page, w.expectedForm.slice(0, 2));
    await page.screenshot({ path: `${dir}/${tag}-04-carte.png` });
    await page.locator('#dictee-validate').click(); await page.waitForTimeout(700);
    await page.screenshot({ path: `${dir}/${tag}-05-retournee.png` });
    await page.locator('#dictee-next').click(); await expect.poll(async () => (await probe(page)).feed!.index).toBe(1);
    const w2 = await word(page); await typeOnScreen(page, w2.expectedForm); await page.locator('#dictee-validate').click(); await page.waitForTimeout(400);
    await page.screenshot({ path: `${dir}/${tag}-06-juste.png` });
    for (let k = 1; k < 10; k++) {
        if (k > 1) { await expect.poll(async () => (await probe(page)).feed!.index).toBe(k); const x = await word(page); await typeOnScreen(page, k % 3 ? x.expectedForm : `${x.expectedForm}s`); await page.locator('#dictee-validate').click(); }
        await page.locator('#dictee-next').click();
    }
    await expect(page.locator('#dictee-end')).toBeVisible();
    await page.screenshot({ path: `${dir}/${tag}-07-bilan.png` });
    await page.locator('#dictee-home').click();
    await page.locator('[data-game="dictee"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${dir}/${tag}-08-accueil.png` });
    await page.locator('[data-game="dictee"]').click(); await page.locator('[data-dictee-profile="panda"]').click(); await page.locator('[data-dictee-grade="CP"]').click(); await page.locator('[data-dictee-length="5"]').click();
    await page.screenshot({ path: `${dir}/${tag}-09-cp-lettres.png` });
});
