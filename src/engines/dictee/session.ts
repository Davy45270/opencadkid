/** The finite feed of word cards and the spaced review (Leitner boxes), per child profile. Pure and seeded. */
import { shuffle } from '../rng';

export const LENGTHS = [5, 10, 15, 20] as const;
export type Length = typeof LENGTHS[number];
/** A word missed goes back to box 1; each right answer moves it up one box. Box b comes back after INTERVALS[b - 1] sessions. */
export const BOXES = 5;
export const INTERVALS = [1, 2, 4, 8, 16] as const;
/** About 30 % of a feed are words to review; the rest are new words of the grade. */
export const REVIEW_SHARE = .3;
/** A word missed comes back this many cards later in the same feed (once). */
export const COME_BACK = 3;
/** The last words seen, avoided when there is anything else to draw. */
export const RECENT = 60;

export interface WordProgress { box: number; seen: number; misses: number; last: number }
export interface Progress { session: number; words: Record<string, WordProgress>; recent: string[] }
export const freshProgress = (): Progress => ({ session: 0, words: {}, recent: [] });

/** The words of review due now: missed or still low, and their interval elapsed. */
export function due(p: Progress, ids: readonly string[]): string[] {
    return ids.filter(id => { const w = p.words[id]; return w !== undefined && w.box < BOXES && p.session + 1 - w.last >= INTERVALS[Math.max(0, w.box - 1)]! && (w.misses > 0 || w.box <= 2); })
        .sort((a, b) => p.words[a]!.box - p.words[b]!.box || p.words[b]!.misses - p.words[a]!.misses || p.words[a]!.last - p.words[b]!.last || (a < b ? -1 : 1));
}

/** Draws `n` distinct words: about 30 % due for review, the others new, then (if the grade runs short) the least
 * recently seen. Never the same word twice; the recent ones only when nothing else is left. */
export function draw(ids: readonly string[], p: Progress, n: number, rng: () => number): string[] {
    const want = Math.min(n, ids.length), recent = new Set(p.recent);
    const review = due(p, ids).slice(0, Math.round(want * REVIEW_SHARE));
    const chosen = new Set(review);
    const take = (pool: string[]): void => { for (const id of pool) { if (chosen.size >= want) return; chosen.add(id); } };
    take(shuffle(ids.filter(id => !p.words[id] && !recent.has(id)), rng));
    take(shuffle(ids.filter(id => !chosen.has(id) && !recent.has(id)), rng).sort((a, b) => (p.words[a]?.last ?? -1) - (p.words[b]?.last ?? -1)));
    take(ids.filter(id => !chosen.has(id)).sort((a, b) => p.recent.indexOf(a) - p.recent.indexOf(b)));
    return shuffle([...chosen], rng);
}

export interface Card { id: string; again: boolean }
export interface Feed { length: number; cards: Card[]; index: number; results: { id: string; again: boolean; exact: boolean }[]; finished: boolean }
export const startFeed = (ids: readonly string[]): Feed => ({ length: ids.length, cards: ids.map(id => ({ id, again: false })), index: 0, results: [], finished: ids.length === 0 });

/** The answer to the current card. A word missed the first time comes back COME_BACK cards later (sooner near the
 * end); the feed never grows: it is as long as the child chose. */
export function answer(f: Feed, exact: boolean): Feed {
    if (f.finished || f.results.length > f.index) return f;
    const card = f.cards[f.index]!, cards = [...f.cards];
    if (!exact && !card.again && !cards.some((c, k) => k > f.index && c.id === card.id)) {
        // The feed keeps its length: the last new card not yet seen makes room (it stays in the grade for another
        // time). When none is left, the word waits for the next session.
        let free = -1;
        for (let k = cards.length - 1; k > f.index; k--) if (!cards[k]!.again) { free = k; break; }
        if (free >= 0) {
            cards.splice(free, 1);
            cards.splice(Math.min(cards.length, f.index + 1 + COME_BACK), 0, { id: card.id, again: true });
        }
    }
    return { ...f, cards, results: [...f.results, { id: card.id, again: card.again, exact }] };
}
/** The next card, once the current one is answered; after the last, the feed is finished (no endless scrolling). */
export function next(f: Feed): Feed {
    if (f.finished || f.results.length <= f.index) return f;
    return f.index + 1 >= f.cards.length ? { ...f, finished: true } : { ...f, index: f.index + 1 };
}
/** The words to look at again: missed at their first appearance in this feed. */
export const missed = (f: Feed): string[] => f.results.filter(r => !r.again && !r.exact).map(r => r.id);
export const rightFirstTime = (f: Feed): string[] => f.results.filter(r => !r.again && r.exact).map(r => r.id);

/** Moves the boxes for the first answer of each word of a finished feed, and remembers what was seen. */
export function closeFeed(p: Progress, f: Feed): Progress {
    const session = p.session + 1, words = { ...p.words };
    for (const r of f.results) {
        if (r.again) continue;
        // A new word starts in box 1: right the first time, it goes to box 2.
        const w = words[r.id] ?? { box: 1, seen: 0, misses: 0, last: 0 };
        words[r.id] = { box: r.exact ? Math.min(BOXES, w.box + 1) : 1, seen: w.seen + 1, misses: w.misses + (r.exact ? 0 : 1), last: session };
    }
    const seen = [...new Set(f.results.map(r => r.id))];
    return { session, words, recent: [...seen, ...p.recent.filter(id => !seen.includes(id))].slice(0, RECENT) };
}

/** A word id of the catalogue (fr-air, fr-plutot, fr-c-est): the old pattern (fr-x-001) matched none of the 500 shipped
 * ids, so every reload lost the boxes, misses and recent words (ninth Codex review, 2026-11-20). */
const WORD_ID = /^fr-[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Reads a stored progress; anything malformed is dropped, never trusted. */
export function parseProgress(data: unknown): Progress {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return freshProgress();
    const v = data as Record<string, unknown>;
    const session = Number.isInteger(v.session) && (v.session as number) >= 0 ? v.session as number : 0;
    const words: Record<string, WordProgress> = {};
    if (v.words && typeof v.words === 'object' && !Array.isArray(v.words))
        for (const [id, raw] of Object.entries(v.words as Record<string, unknown>)) {
            if (!WORD_ID.test(id) || !raw || typeof raw !== 'object') continue;
            const w = raw as Record<string, unknown>;
            const ok = (x: unknown, max: number): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= max;
            if (ok(w.box, BOXES) && ok(w.seen, 1e6) && ok(w.misses, 1e6) && ok(w.last, session)) words[id] = { box: w.box, seen: w.seen, misses: w.misses, last: w.last };
        }
    const recent = Array.isArray(v.recent) ? [...new Set(v.recent.filter((x): x is string => typeof x === 'string' && WORD_ID.test(x)))].slice(0, RECENT) : [];
    return { session, words, recent };
}
