import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { test, expect, media, passGate, prepare } from './helpers';
import { grades, type Evaluation, type Feed, type Grade, type Word } from '../../src/engines/dictee';

interface Rect { x: number; y: number; width: number; height: number }
interface Probe { screen: string; grade: Grade | null; feed: Feed | null; typed: string; tiles: string[]; evaluation: Evaluation | null; played: { path: string; rate: number; at: number }[]; heard: { path: string; at: number }[]; card: Rect | null; keys: (Rect & { key: string })[] }
const probe = (page: Page): Promise<Probe> => page.evaluate(() => (window as unknown as { __kid: { state: () => { dictee: Probe } } }).__kid.state().dictee);
const shipped = JSON.parse(readFileSync('public/dictee/catalogue.json', 'utf8')) as { words: Word[] };
const byId = new Map(shipped.words.map(w => [w.id, w]));
// The service worker would serve the precached catalogue past the test's route.
test.use({ serviceWorkers: 'block' });

/** The test serves the shipped catalogue with the chosen words approved (the four reviews, a named reviewer) and
 * every other word back to « waiting for review », so that it knows exactly which words may be drawn. */
async function reviewed(page: Page, pick: (w: Word) => boolean, strip = false): Promise<void> {
    const approved = { orthography: 'approved', pedagogy: 'approved', context: 'approved', audio: 'approved' };
    await page.route('**/dictee/catalogue.json', route => route.fulfill({ contentType: 'application/json',
        body: JSON.stringify({ ...shipped, words: shipped.words.map(w => pick(w) && (!w.homophones.length || w.contextSentence)
            ? { ...w, status: 'approved', review: approved, validatedBy: 'relecture de test', audio: { ...w.audio, mode: w.audio.mode === 'audio_manual_review' ? 'word_only' : w.audio.mode } }
            : { ...w, status: 'needs_review', review: { ...approved, audio: 'pending' }, validatedBy: null })
            .map(w => strip ? { ...w, audio: { ...w.audio, wordSha256: undefined, contextSha256: undefined } } : w) }) }));
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
    // The word's own reviewed tip, as the catalogue has it (spec: « the word’s own reviewed tip »).
    if (first.explanation) await expect(page.locator('.dictee-tip')).toContainText(first.explanation);
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

test('the word is heard even when the voice is off in the parents\u2019 space (2026-11-17)', async ({ page }) => {
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

test('an audio file kept from an older catalogue is fetched again when its version changed, never replayed (2026-11-20)', async ({ page }) => {
    // Codex review of 2026-11-20: the 13 regenerated sentences kept their file names; a device that had kept the old file
    // would play it again after the word is approved anew. The kept copy is tied to the version the catalogue names.
    const pool = shipped.words.filter(w => w.grade === 'CE1' && plain(w) && w.audio.wordVersion).slice(0, 6);
    await reviewed(page, w => pool.some(p => p.id === w.id));
    await open(page);
    await page.evaluate(async paths => {
        const c = await caches.open('opencadkid-dictee-audio');
        for (const p of paths) await c.put(p, new Response('old bytes', { headers: { 'content-type': 'audio/ogg' } }));
    }, pool.map(w => w.pronunciationAsset));
    const asked: string[] = [];
    page.on('request', r => { if (r.url().includes('/dictee/audio/')) asked.push(r.url()); });
    await page.locator('[data-dictee-profile="licorne"]').click();
    await page.locator('[data-dictee-grade="CE1"]').click();
    await page.locator('[data-dictee-length="5"]').click();
    await expect(page.locator('.dictee-card')).toHaveCount(1);
    const fed = (await probe(page)).feed!.cards.map(c => byId.get(c.id)!);
    for (const w of fed)
        await expect.poll(() => asked.some(u => u.endsWith(`${w.pronunciationAsset}?v=${w.audio.wordVersion}`)), w.id).toBe(true);
    // Each of them is kept in the browser cache under its version, for offline play: the old copy no longer answers.
    const kept = (paths: string[]) => page.evaluate(async ps => { const c = await caches.open('opencadkid-dictee-audio'); return Promise.all(ps.map(async p => !!await c.match(p))); }, paths);
    await expect.poll(() => kept(fed.map(w => `${w.pronunciationAsset}?v=${encodeURIComponent(w.audio.wordVersion!)}`))).toEqual(fed.map(() => true));
});

test('in reduced motion, the sentence of a word heard in context still waits for the word (Codex review of 2026-11-20)', async ({ page }) => {
    // The word's recording is refused here (wrong bytes): only the 3.5 s safety brings the sentence, counted from the word's
    // turn, never the 30 ms that reduced motion gives to animations, nor a shorter wait.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/dictee/audio/*.ogg*', route => route.request().url().includes('-phrase.ogg') ? route.continue() : route.fulfill({ contentType: 'audio/ogg', body: 'OggS other bytes' }));
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'context_required' && w.expectedForm !== 'un').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CP', 5);
    const w = await word(page);
    await expect.poll(async () => (await probe(page)).played.map(p => p.path), { timeout: 8000 }).toEqual([w.pronunciationAsset, w.contextAsset]);
    const p = await probe(page);
    expect(p.played[1]!.at - p.played[0]!.at).toBeGreaterThanOrEqual(3400);
    await expect.poll(async () => (await probe(page)).heard.map(h => h.path)).toEqual([w.contextAsset]);
});

test('a slow word is never overtaken by its sentence (Codex review of 2026-11-20)', async ({ page }) => {
    // The word's file takes 5 s to arrive, the sentence's is at hand: the child hears the word first, then the sentence.
    await page.route('**/dictee/audio/*.ogg*', async route => {
        if (!route.request().url().includes('-phrase.ogg')) await new Promise(r => setTimeout(r, 5000));
        await route.continue();
    });
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'context_required' && w.expectedForm !== 'un').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CP', 5);
    const w = await word(page);
    await expect.poll(async () => (await probe(page)).heard.map(h => h.path), { timeout: 20_000 }).toEqual([w.pronunciationAsset, w.contextAsset]);
});

test('a recording whose bytes are not those of its catalogue version is never kept (Codex review of 2026-11-20)', async ({ page }) => {
    // Catalogue and recordings from two states of a deployment: the old bytes answer under the new version's address.
    const pool = shipped.words.filter(w => w.grade === 'CE1' && plain(w) && w.audio.wordVersion).slice(0, 6);
    await reviewed(page, w => pool.some(p => p.id === w.id));
    await page.route('**/dictee/audio/*.ogg*', route => route.fulfill({ contentType: 'audio/ogg', body: 'OggS old bytes' }));
    await open(page);
    await page.locator('[data-dictee-profile="licorne"]').click();
    await page.locator('[data-dictee-grade="CE1"]').click();
    await page.locator('[data-dictee-length="5"]').click();
    await expect(page.locator('.dictee-card')).toHaveCount(1);
    const fed = (await probe(page)).feed!.cards.map(c => byId.get(c.id)!);
    await page.waitForTimeout(2000);
    const kept = await page.evaluate(async () => (await (await caches.open('opencadkid-dictee-audio')).keys()).length);
    expect(kept, fed.map(w => w.id).join(',')).toBe(0);
    // Nor played: the child never hears bytes that are not the version the catalogue names.
    expect((await probe(page)).heard).toEqual([]);
});

test('a late replay of the previous card never plays over the current word (Codex review of 2026-11-20)', async ({ page }) => {
    // The replay of the first word takes 4 s to arrive; the child has moved on: only the second word is heard after it.
    let asked = 0, first = '';
    await page.route('**/dictee/audio/*.ogg*', async route => {
        const url = route.request().url();
        if (first && url.includes(first) && ++asked > 1) await new Promise(r => setTimeout(r, 4000));
        await route.continue();
    });
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'word_only').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await page.addInitScript(() => { try { void caches.delete('opencadkid-dictee-audio'); } catch { /* none */ } });
    await feed(page, 'CP', 5);
    const w1 = await word(page);
    first = w1.pronunciationAsset.split('/').pop()!;
    await expect.poll(async () => (await probe(page)).heard.map(h => h.path)).toContain(w1.pronunciationAsset);
    // The first file was fetched once already by the feed's keeping: the replay is the slow one only if it goes to the network.
    await page.evaluate(() => caches.delete('opencadkid-dictee-audio'));
    const card = (await probe(page)).card!;
    await page.mouse.click(card.x + card.width / 2, card.y + 40);
    await page.keyboard.type(w1.expectedForm); await page.keyboard.press('Enter');
    await page.locator('#dictee-next').click();
    await expect.poll(async () => (await probe(page)).feed!.index).toBe(1);
    const w2 = await word(page);
    await page.waitForTimeout(5000);
    const heard = (await probe(page)).heard.map(h => h.path);
    expect(heard[heard.length - 1]).toBe(w2.pronunciationAsset);
});

test('a stale recording kept under the current version is replaced by the right bytes, which then play offline (Codex review of 2026-11-20)', async ({ page, context }) => {
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'word_only').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    // Before the game: every file of the class is kept under its current key with other bytes (a stale copy).
    await page.goto('/');
    await page.evaluate(async (files: [string, string | null | undefined][]) => {
        const c = await caches.open('opencadkid-dictee-audio');
        for (const [path, v] of files) await c.put(`${path}${v ? `?v=${encodeURIComponent(v)}` : ''}`, new Response('OggS stale bytes', { headers: { 'content-type': 'audio/ogg' } }));
    }, pool.map(id => [byId.get(id)!.pronunciationAsset, byId.get(id)!.audio.wordVersion] as [string, string | null | undefined]));
    await feed(page, 'CP', 5);
    const w = await word(page);
    await expect.poll(async () => (await probe(page)).heard.map(h => h.path)).toContain(w.pronunciationAsset);
    // The kept copy is now the shipped one.
    await expect.poll(() => page.evaluate(async (k: string) => {
        const r = await (await caches.open('opencadkid-dictee-audio')).match(k);
        return r ? (await r.arrayBuffer()).byteLength : 0;
    }, `${w.pronunciationAsset}?v=${encodeURIComponent(w.audio.wordVersion ?? '')}`)).toBe(readFileSync(`public/${w.pronunciationAsset}`).length);
    await context.setOffline(true);
    const card = (await probe(page)).card!;
    const before = (await probe(page)).heard.length;
    await page.mouse.click(card.x + card.width / 2, card.y + 40);
    await expect.poll(async () => (await probe(page)).heard.length).toBe(before + 1);
    await context.setOffline(false);
});

test('the word_then_context word says its sentence after the word, without a touch', async ({ page }) => {
    const pool = shipped.words.filter(w => w.audio.mode === 'word_then_context').map(w => w.id);
    expect(pool).toEqual(['fr-pensee']);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, byId.get(pool[0]!)!.grade, 5);
    const w = await word(page);
    await expect.poll(async () => (await probe(page)).played.map(p => p.path), { timeout: 8000 }).toEqual([w.pronunciationAsset, w.contextAsset]);
});

test('a slow replay of the word is never cut by its sentence (fifth Codex review of 2026-11-20)', async ({ page }) => {
    // A player that never reports an end: only the sentence's safety decides, and it must count from the slow replay.
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); }; });
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'context_required' && w.expectedForm !== 'un').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CP', 5);
    const w = await word(page);
    await expect.poll(async () => (await probe(page)).heard.map(h => h.path)).toContain(w.pronunciationAsset);
    await page.waitForTimeout(1500);
    const card = (await probe(page)).card!;
    await page.mouse.move(card.x + card.width / 2, card.y + 40); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up();
    await expect.poll(async () => (await probe(page)).played.map(p => p.path), { timeout: 10_000 }).toContain(w.contextAsset);
    const played = (await probe(page)).played;
    const slow = played.find(p => p.rate === .75)!, sentence = played.find(p => p.path === w.contextAsset)!;
    expect(slow).toBeDefined();
    expect(sentence.at - slow.at).toBeGreaterThanOrEqual(3400);
});

test('the delayed replay of a wrong word never plays on the next card (fifth Codex review of 2026-11-20)', async ({ page }) => {
    const pool = shipped.words.filter(w => w.grade === 'CE1' && w.audio.mode === 'word_only').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);  // the big keyboard: CP's tiles would drop the wrong letter
    const w1 = await word(page);
    await page.keyboard.type(`${w1.expectedForm}x`);
    // Checked, then straight on with Enter: the card leaves before the wrong word's replay (700 ms) is due.
    const moved = await page.evaluate(() => { const t = performance.now(); for (let i = 0; i < 2; i++) document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return t; });
    await expect.poll(async () => (await probe(page)).feed!.index).toBe(1);
    await page.waitForTimeout(1500);
    const after = (await probe(page)).played.filter(p => p.at >= moved).map(p => p.path);
    expect(after).not.toContain(w1.pronunciationAsset);
});

test('a catalogue without the bytes\' digests gets nothing kept nor played (fifth Codex review of 2026-11-20)', async ({ page }) => {
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'word_only').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id), true);
    await feed(page, 'CP', 5);
    await page.waitForTimeout(2000);
    expect((await probe(page)).heard).toEqual([]);
    expect(await page.evaluate(async () => (await (await caches.open('opencadkid-dictee-audio')).keys()).length)).toBe(0);
});

test('a word replayed while its sentence waits keeps its turn: the sentence never starts before the replay is heard (sixth Codex review of 2026-11-20)', async ({ page }) => {
    // No end ever reported; the word's first file is refused (no copy in memory), its replay arrives 2 s late.
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); }; });
    const asked = new Map<string, number>();
    await page.route('**/dictee/audio/*.ogg*', async route => {
        const url = route.request().url();
        if (url.includes('-phrase.ogg')) { await route.continue(); return; }
        const file = new URL(url).pathname;
        asked.set(file, (asked.get(file) ?? 0) + 1);
        if (asked.get(file)! <= 2) { await route.fulfill({ contentType: 'audio/ogg', body: 'OggS other bytes' }); return; }  // keeping, then first turn
        await new Promise(r => setTimeout(r, 2000)); await route.continue();
    });
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'context_required' && w.expectedForm !== 'un').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CP', 5);
    const w = await word(page);
    await expect.poll(async () => (await probe(page)).played.length).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(2800);
    const card = (await probe(page)).card!;
    await page.mouse.click(card.x + card.width / 2, card.y + 40);
    await expect.poll(async () => (await probe(page)).played.map(p => p.path), { timeout: 15_000 }).toContain(w.contextAsset);
    const played = (await probe(page)).played;
    const replay = played.filter(p => p.path === w.pronunciationAsset)[1]!, sentence = played.find(p => p.path === w.contextAsset)!;
    expect(sentence.at - replay.at).toBeGreaterThanOrEqual(5000);
    expect((await probe(page)).heard.map(h => h.path)).toContain(w.pronunciationAsset);
});

test('leaving the feed silences it: a late file of its word never plays on the next screen (sixth Codex review of 2026-11-20)', async ({ page }) => {
    // Every file of the word takes 2.5 s: its replay after a wrong answer is still on its way when the child leaves.
    await page.route('**/dictee/audio/*.ogg*', async route => { await new Promise(r => setTimeout(r, 2500)); await route.continue(); });
    const pool = shipped.words.filter(w => w.grade === 'CE1' && w.audio.mode === 'word_only').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);
    const w = await word(page);
    await page.keyboard.type(`${w.expectedForm}x`); await page.keyboard.press('Enter');
    await page.waitForTimeout(900);
    const left = await page.evaluate(() => performance.now());
    await page.locator('#back').click();
    await expect(page.locator('[data-dictee-length]').first()).toBeVisible();
    await page.waitForTimeout(4000);
    expect((await probe(page)).heard.filter(h => h.at >= left)).toEqual([]);
});

test('the sentence safety counts from the moment the word really starts playing (seventh Codex review of 2026-11-20)', async ({ page }) => {
    // A player that starts 1 s late and never reports an end.
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = function play() { return new Promise<void>(r => setTimeout(r, 1000)); }; });
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'context_required' && w.expectedForm !== 'un').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CP', 5);
    const w = await word(page);
    await expect.poll(async () => (await probe(page)).played.map(p => p.path), { timeout: 10_000 }).toEqual([w.pronunciationAsset, w.contextAsset]);
    const p = await probe(page);
    const heard = p.heard.find(h => h.path === w.pronunciationAsset)!;
    expect(p.played[1]!.at - heard.at).toBeGreaterThanOrEqual(4400);
});

test('the review page, for an adult on a phone: Validate, Correct, Remove, and each decision carries what the adult saw (seventh Codex review of 2026-11-20)', async ({ page }) => {
    // Served as servir_validation.py serves it: the page, the catalogue, the cases and a decisions endpoint.
    const posted: { decisions: Record<string, { action: string; seen?: Record<string, unknown> }> }[] = [];
    await page.route('http://relecture.test/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/' || path === '/index.html') await route.fulfill({ contentType: 'text/html', body: readFileSync('scripts/dictee/validation/index.html', 'utf8') });
        else if (path === '/dictee/catalogue.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('public/dictee/catalogue.json', 'utf8') });
        else if (path === '/audio-non-regression.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('scripts/dictee/audio-non-regression.json', 'utf8') });
        else if (path === '/decisions' && route.request().method() === 'POST') { posted.push(route.request().postDataJSON() as (typeof posted)[number]); await route.fulfill({ status: 200, body: '{}' }); }
        else if (path === '/decisions') await route.fulfill({ contentType: 'application/json', body: '{"decisions":{}}' });
        else if (path.startsWith('/dictee/audio/')) await route.fulfill({ contentType: 'audio/ogg', body: readFileSync(`public${path}`) });
        else await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });  // favicon
    });
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('http://relecture.test/');
    // A word without a required listening: « Valider » records at once (the listening case is the fourteenth review's test).
    const cases = new Set((JSON.parse(readFileSync('scripts/dictee/audio-non-regression.json', 'utf8')) as { cases: { id: string }[] }).cases.map(c => c.id));
    const first = shipped.words.find(w => w.grade === 'CP' && !cases.has(w.id))!;
    const card = page.locator(`article.mot#${first.id}`);
    await expect(card).toBeVisible();
    for (const action of ['valider', 'corriger', 'retirer']) {
        const b = (await card.locator(`[data-action="${action}"]`).boundingBox())!;
        expect(b.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await card.locator('[data-action="valider"]').click();
    await expect.poll(() => posted.length, { timeout: 5000 }).toBeGreaterThan(0);
    const d = posted[posted.length - 1]!.decisions[first.id]!;
    expect(d.action).toBe('valider');
    expect(d.seen).toEqual({ expectedForm: first.expectedForm, contextSentence: first.contextSentence ?? null, explanation: first.explanation ?? null,
        wordVersion: first.audio.wordVersion ?? null, contextVersion: first.audio.contextVersion ?? null, wordSha256: first.audio.wordSha256 ?? null, contextSha256: first.audio.contextSha256 ?? null });
});

test('back during a card\'s exit never breaks the game (eighth Codex review of 2026-11-20)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const pool = shipped.words.filter(w => w.grade === 'CE1' && w.audio.mode === 'word_only').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);
    const w = await word(page);
    await page.keyboard.type(w.expectedForm); await page.keyboard.press('Enter');
    await page.evaluate(() => { document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); (document.querySelector('#back') as HTMLElement).click(); });
    await page.waitForTimeout(800);
    expect(errors).toEqual([]);
    await expect(page.locator('[data-dictee-length]').first()).toBeVisible();
});

test('the sentence button while the sentence waits says it once, never twice (eighth Codex review of 2026-11-20)', async ({ page }) => {
    // A player that never reports an end: only the safety could say the sentence again.
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); }; });
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'context_required' && w.expectedForm !== 'un').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CP', 5);
    const w = await word(page);
    await expect.poll(async () => (await probe(page)).heard.map(h => h.path)).toContain(w.pronunciationAsset);
    await page.locator('#dictee-sentence').click();
    await page.waitForTimeout(5000);
    expect((await probe(page)).played.filter(p => p.path === w.contextAsset)).toHaveLength(1);
});

test('the review page asks each recording under the digest of its decision (eighth Codex review of 2026-11-20)', async ({ page }) => {
    const asked: string[] = [];
    await page.route('http://relecture.test/**', async route => {
        const u = new URL(route.request().url());
        if (u.pathname === '/') await route.fulfill({ contentType: 'text/html', body: readFileSync('scripts/dictee/validation/index.html', 'utf8') });
        else if (u.pathname === '/dictee/catalogue.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('public/dictee/catalogue.json', 'utf8') });
        else if (u.pathname === '/audio-non-regression.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('scripts/dictee/audio-non-regression.json', 'utf8') });
        else if (u.pathname === '/decisions') await route.fulfill({ contentType: 'application/json', body: '{"decisions":{}}' });
        else if (u.pathname.startsWith('/dictee/audio/')) { asked.push(`${u.pathname}${u.search}`); await route.fulfill({ contentType: 'audio/ogg', body: readFileSync(`public${u.pathname}`) }); }
        else await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    });
    await page.goto('http://relecture.test/');
    const first = shipped.words.find(w => w.grade === 'CP')!;
    const card = page.locator(`article.mot#${first.id}`);
    await card.getByRole('button', { name: '▶ Le mot' }).click();
    await card.getByRole('button', { name: '▶ La phrase' }).click();
    await expect.poll(() => asked).toEqual([`/${first.pronunciationAsset}?sha=${first.audio.wordSha256}`, `/${first.contextAsset}?sha=${first.audio.contextSha256}`]);
});

test('a slow replay held at once is never cut by the announcement (ninth Codex review of 2026-11-20)', async ({ page }) => {
    // A player that never ends: the word asked slowly at 300 ms is still playing when the announcement comes (1.6 s).
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); }; });
    const pool = shipped.words.filter(w => w.grade === 'CE1' && w.audio.mode === 'word_only').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);
    const w = await word(page);
    const box = (await page.locator('.dictee-card').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 20); await page.mouse.down();
    await page.waitForTimeout(900); await page.mouse.up();
    await page.waitForTimeout(1500);
    const plays = (await probe(page)).played.filter(p => p.path === w.pronunciationAsset);
    expect(plays.length).toBeGreaterThan(0);
    expect(plays.every(p => p.rate < 1)).toBe(true);
});

test('a card\'s exit left behind never moves a new feed (ninth Codex review of 2026-11-20)', async ({ page }) => {
    const pool = shipped.words.filter(w => w.grade === 'CE1' && w.audio.mode === 'word_only').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);
    const w = await word(page);
    await page.keyboard.type(w.expectedForm); await page.keyboard.press('Enter');
    await page.evaluate(async () => {
        document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        (document.querySelector('#back') as HTMLElement).click();
        for (let i = 0; i < 100 && !document.querySelector('[data-dictee-length]'); i++) await new Promise(r => setTimeout(r, 1));
        (document.querySelector('[data-dictee-length]') as HTMLElement).click();
    });
    // The new feed announces its first word at 1.6 s, never earlier: an old exit timer would start it at once.
    const before = (await probe(page)).played.length;
    await page.waitForTimeout(800);
    const p = await probe(page);
    expect(p.feed!.index).toBe(0);
    expect(p.played.length).toBe(before);
});

test('a word asked before the announcement and already ended gets its sentence at the announcement, never 3.5 s later (tenth Codex review of 2026-11-20)', async ({ page }) => {
    // A player that ends each sound 200 ms after it starts.
    await page.addInitScript(() => {
        HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) { window.setTimeout(() => this.dispatchEvent(new Event('ended')), 200); return Promise.resolve(); };
    });
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'context_required' && w.expectedForm !== 'un').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CP', 5);
    const w = await word(page);
    const card = (await probe(page)).card!;
    await page.mouse.click(card.x + card.width / 2, card.y + 40);
    await expect.poll(async () => (await probe(page)).heard.map(h => h.path)).toContain(w.pronunciationAsset);
    const asked = (await probe(page)).heard.find(h => h.path === w.pronunciationAsset)!.at;
    await expect.poll(async () => (await probe(page)).played.map(p => p.path), { timeout: 10_000 }).toContain(w.contextAsset);
    const p = await probe(page);
    expect(p.played.filter(x => x.path === w.pronunciationAsset)).toHaveLength(1);
    expect(p.played.find(x => x.path === w.contextAsset)!.at - asked).toBeLessThan(2500);
});

test('a word asked before the announcement whose bytes come late is never cut by its sentence (tenth Codex review of 2026-11-20)', async ({ page }) => {
    // The word's file takes 4 s; the player then ends the word 2 s after it starts.
    await page.addInitScript(() => {
        HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) { window.setTimeout(() => this.dispatchEvent(new Event('ended')), 2000); return Promise.resolve(); };
    });
    await page.route('**/dictee/audio/*.ogg*', async route => {
        if (!route.request().url().includes('-phrase.ogg')) await new Promise(r => setTimeout(r, 4000));
        await route.continue();
    });
    const pool = shipped.words.filter(w => w.grade === 'CP' && w.audio.mode === 'context_required' && w.expectedForm !== 'un').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CP', 5);
    const w = await word(page);
    const card = (await probe(page)).card!;
    await page.mouse.click(card.x + card.width / 2, card.y + 40);
    await expect.poll(async () => (await probe(page)).played.map(p => p.path), { timeout: 15_000 }).toContain(w.contextAsset);
    const p = await probe(page);
    const heard = p.heard.find(h => h.path === w.pronunciationAsset)!;
    expect(p.played.find(x => x.path === w.contextAsset)!.at - heard.at).toBeGreaterThanOrEqual(1900);
});

test('the review page never takes back a decision made on another version of the word, and sends only what changed (eleventh Codex review of 2026-11-20)', async ({ page }) => {
    const posted: { decisions: Record<string, unknown> }[] = [];
    await page.route('http://relecture.test/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/') await route.fulfill({ contentType: 'text/html', body: readFileSync('scripts/dictee/validation/index.html', 'utf8') });
        else if (path === '/dictee/catalogue.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('public/dictee/catalogue.json', 'utf8') });
        else if (path === '/audio-non-regression.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('scripts/dictee/audio-non-regression.json', 'utf8') });
        else if (path === '/decisions' && route.request().method() === 'POST') { posted.push(route.request().postDataJSON() as (typeof posted)[number]); await route.fulfill({ status: 200, body: '{}' }); }
        else if (path === '/decisions') await route.fulfill({ contentType: 'application/json', body: '{"decisions":{}}' });
        else await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    });
    const seen = (w: Word) => ({ expectedForm: w.expectedForm, contextSentence: w.contextSentence ?? null, explanation: w.explanation ?? null,
        wordVersion: w.audio.wordVersion ?? null, contextVersion: w.audio.contextVersion ?? null, wordSha256: w.audio.wordSha256 ?? null, contextSha256: w.audio.contextSha256 ?? null });
    const [a, b, c] = shipped.words.filter(w => w.grade === 'CP' && w.contextSentence) as [Word, Word, Word];
    // A correction made on an older sentence of a, and a choice on b already sent to the server.
    const old = { action: 'corriger', lemma: a.lemma, at: '2026-11-20T09:00:00.000Z', expectedForm: a.expectedForm, contextSentence: 'Une ancienne phrase.', explanation: '', seen: { ...seen(a), contextSentence: 'Une ancienne phrase.' } };
    const sent = { action: 'valider', lemma: b.lemma, at: '2026-11-20T09:01:00.000Z', seen: seen(b) };
    await page.addInitScript(([o, s, ia, ib]) => {
        localStorage.setItem('dictee-relecture-v1', JSON.stringify({ [ia]: o, [ib]: s }));
        localStorage.setItem('dictee-relecture-v1.envoyes', JSON.stringify({ [ib]: JSON.stringify(s) }));
    }, [old, sent, a.id, b.id] as const);
    await page.goto('http://relecture.test/');
    const ca = page.locator(`article.mot#${a.id}`);
    await expect(ca).toBeVisible();
    await expect(ca).not.toHaveAttribute('data-etat', 'corriger');
    expect(await ca.locator('[name=phrase]').inputValue()).not.toBe('Une ancienne phrase.');
    await page.locator(`article.mot#${c.id} [data-action="valider"]`).click();
    await expect.poll(() => posted.length, { timeout: 5000 }).toBeGreaterThan(0);
    expect(Object.keys(posted[0]!.decisions)).toEqual([c.id]);
});

test('a second « next » during a card\'s exit never clears the next card (eleventh Codex review of 2026-11-20)', async ({ page }) => {
    const pool = shipped.words.filter(w => w.grade === 'CE1' && w.audio.mode === 'word_only').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);
    const w = await word(page);
    await page.keyboard.type(w.expectedForm); await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await probe(page)).feed!.index).toBe(1);
    const next = await word(page);
    await page.keyboard.type(next.expectedForm.slice(0, 1));
    await page.waitForTimeout(500);
    const p = await probe(page);
    expect(p.feed!.index).toBe(1);
    expect(p.typed).toBe(next.expectedForm.slice(0, 1));
});

test('a correction typed while its sending is on its way is sent after it, never lost (twelfth Codex review of 2026-11-20)', async ({ page }) => {
    const posted: { decisions: Record<string, { contextSentence?: string }> }[] = [];
    let first = true;
    let inFlight: () => void = () => {};
    const started = new Promise<void>(r => { inFlight = r; });
    await page.route('http://relecture.test/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/') await route.fulfill({ contentType: 'text/html', body: readFileSync('scripts/dictee/validation/index.html', 'utf8') });
        else if (path === '/dictee/catalogue.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('public/dictee/catalogue.json', 'utf8') });
        else if (path === '/audio-non-regression.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('scripts/dictee/audio-non-regression.json', 'utf8') });
        else if (path === '/decisions' && route.request().method() === 'POST') {
            posted.push(route.request().postDataJSON() as (typeof posted)[number]);
            // The first sending takes 3 s: the adult types meanwhile.
            if (first) { first = false; inFlight(); await new Promise(r => setTimeout(r, 3000)); }
            await route.fulfill({ status: 200, body: '{}' });
        }
        else if (path === '/decisions') await route.fulfill({ contentType: 'application/json', body: '{"decisions":{}}' });
        else await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    });
    await page.goto('http://relecture.test/');
    const w = shipped.words.find(x => x.grade === 'CP' && x.contextSentence)!;
    const card = page.locator(`article.mot#${w.id}`);
    await card.locator('[data-action="corriger"]').click();
    await started;
    await page.waitForTimeout(2000);
    await card.locator('[name=phrase]').fill('Une phrase tapée pendant l\'envoi.');
    await expect.poll(() => posted.map(p => p.decisions[w.id]?.contextSentence), { timeout: 10_000 }).toContain('Une phrase tapée pendant l\'envoi.');
});

test('a hold begun on a card never replays the next one (twelfth Codex review of 2026-11-20)', async ({ page }) => {
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); }; });
    const pool = shipped.words.filter(w => w.grade === 'CE1' && w.audio.mode === 'word_only').map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);
    const w = await word(page);
    await page.keyboard.type(w.expectedForm); await page.keyboard.press('Enter');
    const card = (await probe(page)).card!;
    await page.mouse.move(card.x + card.width / 2, card.y + 20); await page.mouse.down();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(900);
    await page.mouse.up();
    const p = await probe(page);
    expect(p.feed!.index).toBe(1);
    expect(p.played.filter(x => x.rate < 1)).toEqual([]);
});

test('one sending at a time from a phone: a correction typed meanwhile leaves after it (thirteenth Codex review of 2026-11-20)', async ({ page }) => {
    const posted: { decisions: Record<string, { contextSentence?: string }> }[] = [];
    let flying = 0, most = 0;
    await page.route('http://relecture.test/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/') await route.fulfill({ contentType: 'text/html', body: readFileSync('scripts/dictee/validation/index.html', 'utf8') });
        else if (path === '/dictee/catalogue.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('public/dictee/catalogue.json', 'utf8') });
        else if (path === '/audio-non-regression.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('scripts/dictee/audio-non-regression.json', 'utf8') });
        else if (path === '/decisions' && route.request().method() === 'POST') {
            flying++; most = Math.max(most, flying);
            posted.push(route.request().postDataJSON() as (typeof posted)[number]);
            await new Promise(r => setTimeout(r, 3000));
            flying--;
            await route.fulfill({ status: 200, body: '{}' });
        }
        else if (path === '/decisions') await route.fulfill({ contentType: 'application/json', body: '{"decisions":{}}' });
        else await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    });
    await page.goto('http://relecture.test/');
    const w = shipped.words.find(x => x.grade === 'CP' && x.contextSentence)!;
    const card = page.locator(`article.mot#${w.id}`);
    await card.locator('[data-action="corriger"]').click();
    await expect.poll(() => posted.length, { timeout: 5000 }).toBe(1);
    await page.waitForTimeout(300);
    await card.locator('[name=phrase]').fill('Une phrase tapée pendant l\'envoi.');
    await expect.poll(() => posted.map(p => p.decisions[w.id]?.contextSentence), { timeout: 12_000 }).toContain('Une phrase tapée pendant l\'envoi.');
    expect(most).toBe(1);
});

test('the replay of a missed word never plays on its second card (thirteenth Codex review of 2026-11-20)', async ({ page }) => {
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); }; });
    const pool = shipped.words.filter(w => w.grade === 'CE1' && w.audio.mode === 'word_only' && /^[a-z]+$/.test(w.expectedForm)).map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);
    for (let k = 0; k < 3; k++) {
        const w = await word(page);
        await page.keyboard.type(w.expectedForm); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown');
        await expect.poll(async () => (await probe(page)).feed!.index).toBe(k + 1);
    }
    // The fourth card is missed and left at once: its word comes back as the fifth card, answered before 700 ms.
    const w = await word(page);
    await page.keyboard.type(`${w.expectedForm}x`);
    await page.evaluate(() => {
        const key = (k: string): void => { document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); };
        key('Enter'); key('ArrowDown');
    });
    await expect.poll(async () => (await probe(page)).feed!.index, { timeout: 2000, intervals: [20] }).toBe(4);
    expect((await word(page)).id).toBe(w.id);
    await page.keyboard.type(w.expectedForm); await page.keyboard.press('Enter');
    const base = (await probe(page)).played.filter(p => p.path === w.pronunciationAsset).length;
    await page.waitForTimeout(1200);
    expect((await probe(page)).played.filter(p => p.path === w.pronunciationAsset)).toHaveLength(base);
});

test('a choice kept on the phone and never sent leaves after a reload; a required listening needs the recordings heard to the end (fourteenth Codex review of 2026-11-20)', async ({ page }) => {
    const posted: { decisions: Record<string, { action: string | null; heard?: boolean }> }[] = [];
    await page.route('http://relecture.test/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/') await route.fulfill({ contentType: 'text/html', body: readFileSync('scripts/dictee/validation/index.html', 'utf8') });
        else if (path === '/dictee/catalogue.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('public/dictee/catalogue.json', 'utf8') });
        else if (path === '/audio-non-regression.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('scripts/dictee/audio-non-regression.json', 'utf8') });
        else if (path === '/decisions' && route.request().method() === 'POST') { posted.push(route.request().postDataJSON() as (typeof posted)[number]); await route.fulfill({ status: 200, body: '{}' }); }
        else if (path === '/decisions') await route.fulfill({ contentType: 'application/json', body: '{"decisions":{}}' });
        else await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    });
    const seen = (w: Word) => ({ expectedForm: w.expectedForm, contextSentence: w.contextSentence ?? null, explanation: w.explanation ?? null,
        wordVersion: w.audio.wordVersion ?? null, contextVersion: w.audio.contextVersion ?? null, wordSha256: w.audio.wordSha256 ?? null, contextSha256: w.audio.contextSha256 ?? null });
    const kept = shipped.words.find(w => w.grade === 'CP' && w.id !== 'fr-air')!;
    const choice = { action: 'retirer', lemma: kept.lemma, at: '2026-11-20T09:00:00.000Z', seen: seen(kept) };
    await page.addInitScript(([c, id]) => { if (!sessionStorage.getItem('fait')) { sessionStorage.setItem('fait', '1'); localStorage.setItem('dictee-relecture-v1', JSON.stringify({ [id]: c })); } }, [choice, kept.id] as const);
    await page.goto('http://relecture.test/');
    await expect.poll(() => posted.flatMap(p => Object.keys(p.decisions)), { timeout: 5000 }).toContain(kept.id);
    // fr-air has listening cases: « Valider » without the recordings heard to the end records nothing.
    const air = page.locator('article.mot#fr-air');
    await air.locator('[data-action="valider"]').click();
    await expect(page.locator('#etat')).toContainText('jusqu\'au bout');
    await page.waitForTimeout(1500);
    expect(posted.flatMap(p => Object.keys(p.decisions))).not.toContain('fr-air');
});

const reviewServer = async (page: Page, served: { decisions: Record<string, unknown> }, posted: { decisions: Record<string, { contextSentence?: string }> }[]): Promise<void> => {
    await page.route('http://relecture.test/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/') await route.fulfill({ contentType: 'text/html', body: readFileSync('scripts/dictee/validation/index.html', 'utf8') });
        else if (path === '/dictee/catalogue.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('public/dictee/catalogue.json', 'utf8') });
        else if (path === '/audio-non-regression.json') await route.fulfill({ contentType: 'application/json', body: readFileSync('scripts/dictee/audio-non-regression.json', 'utf8') });
        else if (path === '/decisions' && route.request().method() === 'POST') {
            posted.push(route.request().postDataJSON() as (typeof posted)[number]);
            await route.fulfill({ status: 200, body: '{}' });
        }
        else if (path === '/decisions') await route.fulfill({ contentType: 'application/json', body: JSON.stringify(served) });
        else await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    });
};
const seenOf = (w: Word) => ({ expectedForm: w.expectedForm, contextSentence: w.contextSentence ?? null, explanation: w.explanation ?? null,
    wordVersion: w.audio.wordVersion ?? null, contextVersion: w.audio.contextVersion ?? null, wordSha256: w.audio.wordSha256 ?? null, contextSha256: w.audio.contextSha256 ?? null });

test('a choice received from the server is never sent back after a reload (fifteenth Codex review of 2026-11-20)', async ({ page }) => {
    const cases = new Set((JSON.parse(readFileSync('scripts/dictee/audio-non-regression.json', 'utf8')) as { cases: { id: string }[] }).cases.map(c => c.id));
    const [a, b] = shipped.words.filter(w => w.grade === 'CP' && !cases.has(w.id)) as [Word, Word];
    const served = { decisions: { [a.id]: { action: 'valider', lemma: a.lemma, at: '2026-11-20T09:00:00.000Z', seen: seenOf(a), heard: false } } as Record<string, unknown> };
    const posted: { decisions: Record<string, { contextSentence?: string }> }[] = [];
    await reviewServer(page, served, posted);
    await page.goto('http://relecture.test/');
    await page.locator(`article.mot#${b.id} [data-action="valider"]`).click();
    // Reloaded before its sending; meanwhile another phone removed a.
    served.decisions[a.id] = { action: 'retirer', lemma: a.lemma, at: '2026-11-20T09:05:00.000Z', seen: seenOf(a) };
    await page.reload();
    await expect.poll(() => posted.flatMap(p => Object.keys(p.decisions)), { timeout: 5000 }).toContain(b.id);
    await page.waitForTimeout(1500);
    expect(posted.flatMap(p => Object.keys(p.decisions))).not.toContain(a.id);
});

test('a correction typed during a sending that fails leaves after it (fifteenth Codex review of 2026-11-20)', async ({ page }) => {
    // The first sending hangs 3 s then fails (no network): the console stays clean, the page sees a refusal.
    await page.addInitScript(() => {
        const real = window.fetch.bind(window);
        let first = true;
        (window as unknown as { __failed: number }).__failed = 0;
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            if (init?.method === 'POST' && first) {
                first = false;
                await new Promise(r => setTimeout(r, 3000));
                (window as unknown as { __failed: number }).__failed++;
                throw new TypeError('network down');
            }
            return real(input, init);
        };
    });
    const posted: { decisions: Record<string, { contextSentence?: string }> }[] = [];
    await reviewServer(page, { decisions: {} }, posted);
    await page.goto('http://relecture.test/');
    const w = shipped.words.find(x => x.grade === 'CP' && x.contextSentence)!;
    const card = page.locator(`article.mot#${w.id}`);
    await card.locator('[data-action="corriger"]').click();
    await page.waitForTimeout(1500);
    await card.locator('[name=phrase]').fill('Une phrase tapée pendant un envoi qui échoue.');
    await expect.poll(() => page.evaluate(() => (window as unknown as { __failed: number }).__failed), { timeout: 6000 }).toBe(1);
    await expect.poll(() => posted.map(p => p.decisions[w.id]?.contextSentence), { timeout: 8000 }).toContain('Une phrase tapée pendant un envoi qui échoue.');
});

test('the opening announcement never restarts the second card (fifteenth Codex review of 2026-11-20)', async ({ page }) => {
    await page.addInitScript(() => { HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); }; });
    const pool = shipped.words.filter(w => w.grade === 'CE1' && w.audio.mode === 'word_only' && /^[a-z]+$/.test(w.expectedForm)).map(w => w.id);
    await reviewed(page, w => pool.includes(w.id));
    await feed(page, 'CE1', 5);
    const first = await word(page);
    await page.keyboard.type(first.expectedForm); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await probe(page)).feed!.index, { intervals: [20] }).toBe(1);
    const second = await word(page);
    await page.waitForTimeout(2000);
    expect((await probe(page)).played.filter(p => p.path === second.pronunciationAsset)).toHaveLength(1);
});
