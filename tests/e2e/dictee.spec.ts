import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { test, expect, media, passGate, prepare } from './helpers';
import { grades, type Evaluation, type Feed, type Grade, type Word } from '../../src/engines/dictee';

interface Rect { x: number; y: number; width: number; height: number }
interface Probe { screen: string; grade: Grade | null; feed: Feed | null; typed: string; tiles: string[]; evaluation: Evaluation | null; played: { path: string; rate: number }[]; card: Rect | null; keys: (Rect & { key: string })[] }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { dictee: Probe } } }).__kid.state().dictee);
const shipped = JSON.parse(readFileSync('public/dictee/catalogue.json', 'utf8')) as { words: Word[] };
const byId = new Map(shipped.words.map(w => [w.id, w]));
// The service worker would serve the precached catalogue past the test's route.
test.use({ serviceWorkers: 'block' });

/** The test serves the shipped catalogue with the chosen words approved (the four reviews, a named reviewer) and
 * every other word back to « waiting for review », so that it knows exactly which words may be drawn. */
async function reviewed(page: Page, pick: (w: Word) => boolean): Promise<void> {
    const approved = { orthography: 'approved', pedagogy: 'approved', context: 'approved', audio: 'approved' };
    await page.route('**/dictee/catalogue.json', route => route.fulfill({ contentType: 'application/json',
        body: JSON.stringify({ ...shipped, words: shipped.words.map(w => pick(w) && (!w.homophones.length || w.contextSentence)
            ? { ...w, status: 'approved', review: approved, validatedBy: 'relecture de test', audio: { ...w.audio, mode: w.audio.mode === 'audio_manual_review' ? 'word_only' : w.audio.mode } }
            : { ...w, status: 'needs_review', review: { ...approved, audio: 'pending' }, validatedBy: null }) }) }));
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
async function typeOnScreen(page: Page, text: string): Promise<void> {
    for (const c of text) {
        // A capital letter: the capital key, then the letter.
        if (c !== c.toLowerCase()) await page.locator('#dictee-shift').click();
        await page.locator(`[data-key="${c.toLowerCase()}"]`).click();
    }
}

test('words waiting for review never reach the child: every class waits for an adult review', async ({ page }) => {
    await reviewed(page, () => false);
    await open(page);
    await page.locator('[data-dictee-profile="dragon"]').click();
    await expect(page.locator('[data-dictee-grade]')).toHaveCount(6);
    await expect(page.locator('[data-dictee-grade]:not([disabled])')).toHaveCount(0);
    await expect(page.locator('#dictee-empty')).toBeVisible();
    await expect(page.locator('.dictee-drafts')).toHaveCount(0);
});

test('a finite feed: the word is heard, never shown before checking; right, wrong, again later, and the summary', async ({ page }) => {
    // Six words of one class are reviewed: a feed of five, so one missed word must come back inside the five cards.
    // Plain letters only: Playwright types an accented letter as inserted text, with no keydown, where a real AZERTY keyboard sends one.
    const pool = shipped.words.filter(w => w.grade === 'CE1' && !w.homophones.length && w.audio.mode === 'word_only' && /^[a-z]+$/.test(w.expectedForm)).slice(0, 6).map(w => w.id);
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
        // Only approved words are drawn.
        expect(pool).toContain(w.id);
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

test('a word heard only in context: its sentence is said on arrival, never shown, and hearing again changes nothing', async ({ page }) => {
    // The colours and numbers that need their sentence (vert, sept, neuf, rose): "un" is left out, the interface says it too.
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'context_required' && w.expectedForm !== 'un').map(w => w.id);
    expect(pool.length).toBeGreaterThanOrEqual(3);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CP', 5);
    const w = await word(page);
    expect(pool).toContain(w.id);
    // The word, then its sentence, without a touch.
    await expect.poll(async () => (await probe(page)).played.map(p => p.path), { timeout: 8000 }).toEqual([w.pronunciationAsset, w.contextAsset]);
    // Neither the sentence nor the word is on the page before checking; the sentence button shows its label only.
    const text = await page.locator('#app').innerText();
    expect(text).not.toContain(w.contextSentence!);
    expect(text.toLowerCase().split(/[^\p{L}]+/u)).not.toContain(w.expectedForm.toLowerCase());
    const label = await page.locator('#dictee-sentence').innerText();
    expect(label).not.toContain(w.contextSentence!);
    expect(label.toLowerCase().split(/[^\p{L}]+/u)).not.toContain(w.expectedForm.toLowerCase());
    // Hearing again, word or sentence, keeps the letters typed and checks nothing.
    const used: number[] = [];
    const p0 = await probe(page);
    for (const c of w.expectedForm.slice(0, 2)) { const k = p0.tiles.findIndex((x, i) => x === c && !used.includes(i)); used.push(k); await page.locator(`[data-tile="${k}"]`).click(); }
    const typed = (await probe(page)).typed;
    const card = (await probe(page)).card!;
    await page.mouse.click(card.x + card.width / 2, card.y + 40);
    await page.locator('#dictee-sentence').click();
    const after = await probe(page);
    expect(after.typed).toBe(typed);
    expect(after.evaluation).toBeNull();
    // Once checked, hearing the sentence again leaves the score as it was.
    await page.locator('#dictee-validate').click();
    const score = (await probe(page)).evaluation;
    await page.locator('#dictee-sentence').click();
    expect((await probe(page)).evaluation).toEqual(score);
    expect((await probe(page)).typed).toBe(typed);
});

test('the capital key types one capital letter, then lets go', async ({ page }) => {
    await reviewed(page, w => w.grade === 'CE1' && w.expectedForm === 'Noël');
    await feed(page, 'CE1', 5);
    await page.locator('#dictee-shift').click();
    await expect(page.locator('#dictee-shift')).toHaveAttribute('aria-pressed', 'true');
    await typeOnScreen(page, 'noël');
    expect((await probe(page)).typed).toBe('Noël');
    await expect(page.locator('#dictee-shift')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#dictee-validate').click();
    await expect(page.locator('.dictee-card.juste')).toHaveCount(1);
});

/** Back to the home screen, whatever the dictation screen. */
async function home(page: Page): Promise<void> {
    for (let k = 0; k < 5 && !(await page.locator('#parents').isVisible()); k++) await page.locator('#back').click();
    await expect(page.locator('#parents')).toBeVisible();
}
/** Plain words, heard alone, without a capital: typed the same on the screen keyboard in every project. */
const plain = (w: Word): boolean => w.audio.mode === 'word_only' && /^[a-z]+$/.test(w.expectedForm);
const wrongAnswer = async (page: Page, w: Word): Promise<void> => {
    if (w.grade === 'CP' && (await probe(page)).grade === 'CP') {
        const p = await probe(page); await page.locator(`[data-tile="${p.tiles.indexOf(w.expectedForm[0]!)}"]`).click();
    } else await typeOnScreen(page, w.expectedForm.slice(0, 1));
    await page.locator('#dictee-validate').click();
    await expect(page.locator('#dictee-next')).toBeVisible();
};

test('all mixed: approved words of several classes, no duplicate, the class of each word in the summary', async ({ page }) => {
    // Two plain words of each class approved; everything else waits for review.
    const pool = grades.flatMap(g => shipped.words.filter(w => w.grade === g && plain(w)).slice(0, 2)).map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await open(page);
    await page.locator('[data-dictee-profile="licorne"]').click();
    await expect(page.locator('[data-dictee-grade="mix"]')).toContainText('10');
    await page.locator('[data-dictee-grade="mix"]').click();
    await page.locator('[data-dictee-length="5"]').click();
    await expect(page.locator('.dictee-card')).toHaveCount(1);
    const seen: string[] = [];
    for (let k = 0; k < 5; k++) {
        await expect.poll(async () => (await probe(page)).feed!.index).toBe(k);
        const w = await word(page); seen.push(w.id);
        expect(pool).toContain(w.id);
        // Every class is typed on the big keyboard, first grade words too.
        await expect(page.locator('[data-tile]')).toHaveCount(0);
        await typeOnScreen(page, w.expectedForm); await page.locator('#dictee-validate').click();
        await page.locator('#dictee-next').click();
    }
    expect(new Set(seen).size).toBe(5);
    await expect(page.locator('#dictee-end')).toBeVisible();
    const items = page.locator('.dictee-list li');
    await expect(items).toHaveCount(5);
    for (let k = 0; k < 5; k++) {
        const g = await items.nth(k).getAttribute('data-grade');
        await expect(items.nth(k).locator('.dictee-niveau')).toHaveText(g!);
    }
    expect(new Set(seen.map(id => byId.get(id)!.grade)).size).toBeGreaterThan(1);
    // Its own spaced review, apart from the classes.
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.dictee.v1') ?? '{}') as { licorne: Record<string, { session: number }> });
    expect(stored.licorne.mix?.session).toBe(1);
    expect(Object.keys(stored.licorne)).toEqual(['mix']);
});

test('fewer approved words than asked: a clear note, the longer games greyed, no crash', async ({ page }) => {
    const pool = shipped.words.filter(w => plain(w) && w.grade !== 'CP').slice(0, 3).map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await open(page);
    await page.locator('[data-dictee-profile="singe"]').click();
    await page.locator('[data-dictee-grade="mix"]').click();
    await expect(page.locator('#dictee-few')).toContainText('3');
    for (const n of [10, 15, 20]) await expect(page.locator(`[data-dictee-length="${n}"]`)).toBeDisabled();
    await page.locator('[data-dictee-length="5"]').click();
    await expect(page.locator('.dictee-card')).toHaveCount(1);
    expect((await probe(page)).feed!.cards).toHaveLength(3);
});

test('report a word: absent for a child, in adult mode far from « next », then found in the parents’ list', async ({ page, isMobile }) => {
    if (isMobile) await page.setViewportSize({ width: 360, height: 740 });
    const pool = shipped.words.filter(w => w.grade === 'CE1' && plain(w)).slice(0, 6).map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    // Child mode, the default: once checked, no report button in the page at all.
    await feed(page, 'CE1', 5);
    await wrongAnswer(page, await word(page));
    await expect(page.locator('#dictee-report')).toHaveCount(0);
    await expect(page.locator('#dictee-report-panel')).toHaveCount(0);
    // Adult mode is switched in the parents' space, behind its gate.
    await home(page);
    await page.locator('#parents').click(); await passGate(page);
    await page.locator('#dictee-adult').check();
    await page.locator('#close').click();
    await page.locator('[data-game="dictee"]').click();
    await page.locator('[data-dictee-profile="licorne"]').click();
    await page.locator('[data-dictee-grade="CE1"]').click();
    await page.locator('[data-dictee-length="5"]').click();
    await expect(page.locator('.dictee-card')).toHaveCount(1);
    // Not before the answer.
    await expect(page.locator('#dictee-report')).toHaveCount(0);
    const w = await word(page);
    await wrongAnswer(page, w);
    const flag = page.locator('#dictee-report');
    await expect(flag).toBeVisible();
    await expect(flag).toContainText('🚩');
    const a = (await flag.boundingBox())!, b = (await page.locator('#dictee-next').boundingBox())!;
    expect(a.width).toBeGreaterThanOrEqual(44); expect(a.height).toBeGreaterThanOrEqual(44);
    // The gap between the two boxes, at least 48 px (zero if they touch).
    const gap = Math.hypot(Math.max(0, b.x - (a.x + a.width), a.x - (b.x + b.width)), Math.max(0, b.y - (a.y + a.height), a.y - (b.y + b.height)));
    expect(gap).toBeGreaterThanOrEqual(48);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await flag.click();
    await expect(page.locator('#dictee-report-save')).toBeDisabled();
    await page.locator('[data-report-kind="audio"]').click();
    await page.locator('#dictee-report-note').fill('on entend mal la fin');
    await page.locator('#dictee-report-save').click();
    await expect(flag).toHaveAttribute('aria-pressed', 'true');
    // Typing the note never moved the feed on.
    expect((await probe(page)).feed!.index).toBe(0);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('opencadkid.dictee.signalements.v1') ?? '[]') as Record<string, unknown>[]);
    expect(stored).toEqual([{ id: w.id, form: w.expectedForm, grade: 'CE1', kind: 'audio', note: 'on entend mal la fin', audioVersion: w.audio.wordVersion, at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) as unknown }]);
    // Found in the parents' list, ready to export.
    await home(page);
    await page.locator('#parents').click(); await passGate(page);
    await expect(page.locator(`#dictee-reports [data-report="${w.id}"]`)).toContainText(w.expectedForm);
    expect(await page.locator('#dictee-reports-text').inputValue()).toContain(`${w.id}\t${w.expectedForm}\tCE1\taudio`);
    await expect(page.locator('#dictee-reports-export')).toBeVisible();
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

test('the word is heard even when the voice is off in the parents\u2019 space (HL-532, 2026-11-17)', async ({ page }) => {
    // A device whose save has the voice off, after the one-time « sound back on »: the parents' choice stands elsewhere,
    // but a dictation without the heard word is no dictation.
    await page.addInitScript(() => {
        localStorage.setItem('opencadkid-son-2026-11-17', '1');
        const raw = localStorage.getItem('opencadkid.v1');
        const save: Record<string, unknown> = raw ? JSON.parse(raw) as Record<string, unknown> : { version: 1, locale: 'fr', voice: false, sound: true, records: {} };
        localStorage.setItem('opencadkid.v1', JSON.stringify({ ...save, voice: false }));
    });
    const pool = shipped.words.filter(w => w.grade === 'CE1' && w.audio.mode === 'word_only').slice(0, 6).map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);
    const first = await word(page);
    await expect.poll(async () => (await probe(page)).played.map(p => p.path)).toContain(first.pronunciationAsset);
    await expect(page.locator('.dictee-note')).toHaveCount(0);
});
