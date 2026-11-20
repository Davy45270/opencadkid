import { answer, closeFeed, draw, evaluate, grades, next, parseCatalogue, parseRecords, parseReports, addReport, progressOf, wordsOf, MIXED, type Report, type ReportKind, sentenceOnArrival, startFeed, tiles, withProgress, missed, rightFirstTime,
    type Catalogue, type Choice, type Evaluation, type Feed, type Profile, type Records, type Word } from '../../engines/dictee';
import { makeRng } from '../../engines/rng';
import { bindAction, recordActivation } from '../../shell/activation';
import type { Locale } from '../../shell/i18n';
import { chime } from '../../shell/sound';
import type { StoragePort } from '../../shell/storage';
import { ACCENTS, LETTERS, cardView, reportPanel, endView, feedView, gradeView, keyboard, labels, lengthView, profileView, tileTray } from './view';

export const RECORDS_KEY = 'opencadkid.dictee.v1';
/** Words an adult reported as wrong while playing (word, sentence, tip, sound): kept on the device, listed in the
 * parents' space to export. Never sent anywhere. */
export const REPORTS_KEY = 'opencadkid.dictee.signalements.v1';
/** Adult mode, switched in the parents' space only (behind its gate): it shows the report flag. Off by default. */
export const ADULT_KEY = 'opencadkid.dictee.adulte.v1';
export function readAdult(storage?: StoragePort): boolean { try { return storage?.getItem(ADULT_KEY) === '1'; } catch { return false; } }
export function writeAdult(storage: StoragePort | undefined, on: boolean): void { try { storage?.setItem(ADULT_KEY, on ? '1' : '0'); } catch { /* Ignored. */ } }
export function readReports(storage?: StoragePort): Report[] { try { return parseReports(storage?.getItem(REPORTS_KEY) ?? null); } catch { return []; } }
export function writeReports(storage: StoragePort | undefined, reports: readonly Report[]): void { try { storage?.setItem(REPORTS_KEY, JSON.stringify(reports)); } catch { /* Play continues without storage. */ } }
export function readRecords(storage?: StoragePort): Records { try { return parseRecords(storage?.getItem(RECORDS_KEY) ?? null); } catch { return {}; } }
export function writeRecords(storage: StoragePort | undefined, records: Records): void { try { storage?.setItem(RECORDS_KEY, JSON.stringify(records)); } catch { /* Play continues without storage. */ } }

/** Drafts reach the screen only on a development server started on purpose with VITE_DICTEE_BROUILLONS=1; never in a build. */
export const SHOW_DRAFTS = import.meta.env.DEV && import.meta.env.VITE_DICTEE_BROUILLONS === '1';
/** How long a press must last to hear the word slowly, the slow rate, and the card leaving upwards. */
export const LONG_PRESS_MS = 550, SLOW_RATE = .75, LEAVE_MS = 260, SWIPE_PX = 70;

export type Screen = 'profils' | 'niveaux' | 'longueur' | 'fil' | 'bilan';
/** Survives a remount (page hidden then shown). */
export interface Session {
    screen: Screen; profile: Profile | null; grade: Choice | null; feed: Feed | null;
    typed: string; tiles: string[]; used: number[]; evaluation: Evaluation | null; praise: number; records: Records;
}
export const freshSession = (records: Records): Session => ({ screen: 'profils', profile: null, grade: null, feed: null, typed: '', tiles: [], used: [], evaluation: null, praise: 0, records });

let catalogue: Promise<Catalogue> | null = null;
/** The versioned catalogue next to the page (precached for offline play). */
export function loadCatalogue(): Promise<Catalogue> {
    catalogue ??= fetch('./dictee/catalogue.json').then(r => r.ok ? r.json() : null).then(parseCatalogue).catch(() => { catalogue = null; return parseCatalogue(null); });
    return catalogue;
}
const AUDIO_CACHE = 'opencadkid-dictee-audio';
/** The audio of a feed is fetched once when the feed starts and kept in the browser cache, so the words still play
 * offline afterwards. Same origin only. */
/** A regenerated recording keeps its file name: the kept copy is tied to the audio version the catalogue names
 * (`?v=`), so a device never replays an older recording than the one the adult approved (Codex review, 2026-11-20). */
const versions = new Map<string, string>();
/** The sha256 digest of the bytes the catalogue ships for each file: a response or a kept copy with other bytes (a catalogue
 * and recordings from two states of a deployment) is neither kept nor played, so it cannot pass for the version it was
 * asked under. */
const digests = new Map<string, string>();
const versioned = (path: string): string => { const v = versions.get(path); return v ? `${path}?v=${encodeURIComponent(v)}` : path; };
function remember(w: Word): string[] {
    if (w.audio.wordVersion) versions.set(w.pronunciationAsset, w.audio.wordVersion);
    if (w.contextAsset && w.audio.contextVersion) versions.set(w.contextAsset, w.audio.contextVersion);
    if (w.audio.wordSha256) digests.set(w.pronunciationAsset, w.audio.wordSha256);
    if (w.contextAsset && w.audio.contextSha256) digests.set(w.contextAsset, w.audio.contextSha256);
    return [w.pronunciationAsset, ...(w.contextAsset ? [w.contextAsset] : [])];
}
async function keep(paths: readonly string[]): Promise<void> {
    try {
        if (typeof caches === 'undefined') return;
        const c = await caches.open(AUDIO_CACHE);
        await Promise.all(paths.map(async path => {
            const p = versioned(path);
            // A kept copy is trusted for its bytes only: a stale one under the current key is replaced (fourth Codex review).
            const kept = await c.match(p);
            if (kept && await shipped(path, kept)) return;
            const r = await fetch(p);
            if (r.ok && await shipped(path, r.clone())) await c.put(p, r);
        }));
    } catch { /* Audio stays available from the network. */ }
}
async function shipped(path: string, r: Response): Promise<boolean> {
    const want = digests.get(path);
    // No digest (an older or partial catalogue): the bytes cannot be checked, so they are neither kept nor played.
    if (!want) return false;
    if (typeof crypto === 'undefined' || typeof crypto.subtle === 'undefined') return false; // an insecure context has no SubtleCrypto: keep nothing
    const got = [...new Uint8Array(await crypto.subtle.digest('sha-256', await r.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
    return got === want;
}
const blobs = new Map<string, string>();
/** The bytes to play for a file, as an object URL, from the cache or else the network. Only bytes whose sha256 digest is the
 * catalogue's are ever played: a recording left over from a half-done deployment, served under the new version or kept
 * under it, is never heard (third Codex review, 2026-11-20). null: nothing may be played. */
async function source(path: string): Promise<string | null> {
    const key = versioned(path);
    const known = blobs.get(key); if (known) return known;
    let r: Response | undefined;
    try { if (typeof caches !== 'undefined') r = await (await caches.open(AUDIO_CACHE)).match(key); } catch { r = undefined; }
    try {
        if (!r || !await shipped(path, r.clone())) {
            r = await fetch(key);
            if (!r.ok || !await shipped(path, r.clone())) return null;
            // The right bytes replace a missing or stale kept copy, so they still play offline after a reload.
            try { if (typeof caches !== 'undefined') await (await caches.open(AUDIO_CACHE)).put(key, r.clone()); } catch { /* Played anyway. */ }
        }
        const url = URL.createObjectURL(await r.blob()); blobs.set(key, url); return url;
    } catch { return null; }
}

let observed: { played: { path: string; rate: number; at: number }[]; heard: { path: string; at: number }[]; words: Record<string, string> } = { played: [], heard: [], words: {} };
export function snapshot(session: Session, root: ParentNode): object {
    const rect = (el: Element | null): { x: number; y: number; width: number; height: number } | null => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return { ...session, played: Array.from(observed.played), heard: Array.from(observed.heard), card: rect(root.querySelector('.dictee-card')),
        keys: Array.from(root.querySelectorAll('.dictee-key')).map(el => ({ key: el.getAttribute('data-key') ?? el.getAttribute('data-tile') ?? el.id, ...rect(el)! })) };
}

export function mount(root: HTMLElement, session: Session, locale: Locale, storage: StoragePort | undefined, speak: (parts: string[]) => void, sound: () => boolean, _voice: () => boolean, home: () => void): () => void {
    const t = labels[locale];
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false, words: Word[] = [];
    const timers = new Set<number>();
    // Reduced motion shortens animations, never a wait for a sound (`exact`): the sentence's safety must not cut the word.
    const later = (ms: number, f: () => void, exact = false): number => { const id = window.setTimeout(() => { timers.delete(id); if (!disposed) f(); }, reduce && !exact ? Math.min(ms, 30) : ms); timers.add(id); return id; };
    const cancel = (id: number | null): void => { if (id !== null) { window.clearTimeout(id); timers.delete(id); } };
    const audio = typeof Audio === 'function' ? new Audio() : null;
    /** A sentence waiting for the word to end (a word heard only in context: verre, vert, vers). */
    let pending: string | null = null;
    /** The sentence's safety, re-armed each time the current word gets its turn (a slow replay is never cut). */
    let safety: number | null = null;
    const armSafety = (w: Word): void => {
        cancel(safety);
        safety = later(3500, () => { safety = null; if (pending === w.contextAsset && current()?.id === w.id) { const p = pending; pending = null; play(p); } }, true);
    };
    let turns = 0;
    /** `settled` runs once the file's turn has come: its bytes are in the player, or were refused. */
    const play = (path: string | null, rate = 1): void => {
        if (!path) return;
        const w = current();
        // Without sound (or if the word never reports its end) the sentence still follows, 3.5 s after the word's last
        // turn came: counted from its file's arrival or refusal, never from the request (third and fifth Codex reviews).
        const settled = pending && w && path === w.pronunciationAsset ? (): void => armSafety(w) : undefined;
        if (path !== pending && path !== current()?.pronunciationAsset) pending = null;
        // La Dictée parle toujours : sans le mot entendu, il n'y a pas de dictée (2026-11-17).
        if (!audio) { settled?.(); return; }
        // Recorded once the sound is really asked for, so a test sees a word that the settings would have silenced.
        observed.played.push({ path, rate, at: performance.now() });
        // Stopped now, not once the file arrives: the end of the previous sound must not release a waiting sentence.
        audio.pause();
        // Only the last request may reach the player: a late file (a replay of the previous card) is dropped.
        const turn = ++turns;
        void source(path).then(src => {
            if (disposed) return;
            // The sentence's safety still starts (it checks its card itself), but the player keeps the newer request.
            if (turn !== turns) { settled?.(); return; }
            if (src) {
                audio.pause(); audio.src = src; audio.playbackRate = rate; audio.preservesPitch = true;
                observed.heard.push({ path, at: performance.now() });
                void audio.play().catch(() => undefined);
            }
            settled?.();
        });
    };
    audio?.addEventListener('ended', () => { if (pending) { const p = pending; pending = null; play(p); } });
    /** A card arrives: its word is said; a word that needs its sentence gets it said right after, every time. */
    const arrive = (): void => {
        const w = current();
        if (!w) return;
        cancel(safety); safety = null;
        pending = sentenceOnArrival(w) ? w.contextAsset : null;
        play(w.pronunciationAsset);
    };
    const rng = makeRng(crypto.getRandomValues(new Uint32Array(1))[0]!);
    const wordOf = (id: string): Word => words.find(w => w.id === id)!;
    const current = (): Word | null => { const f = session.feed; return f && !f.finished ? wordOf(f.cards[f.index]!.id) : null; };

    const backTo = (f: () => void, key: string): void => bindAction(root.querySelector<HTMLElement>('#back')!, f, key);
    const profilesScreen = (): void => {
        session.screen = 'profils';
        root.innerHTML = profileView(locale);
        backTo(home, 'dictee:home');
        root.querySelectorAll<HTMLElement>('[data-dictee-profile]').forEach(el => bindAction(el, () => { session.profile = el.dataset.dicteeProfile as Profile; gradesScreen(true); }, () => `dictee:profile:${el.dataset.dicteeProfile!}`));
    };
    const gradesScreen = (aloud: boolean): void => {
        session.screen = 'niveaux';
        root.innerHTML = `<p class="dictee-note">${t.loading}</p>`;
        void loadCatalogue().then(c => {
            if (disposed || session.screen !== 'niveaux') return;
            const counts = Object.fromEntries([...grades, MIXED].map(g => [g, wordsOf(c, g, SHOW_DRAFTS).length])) as Record<Choice, number>;
            root.innerHTML = gradeView(locale, session.profile!, counts, SHOW_DRAFTS);
            backTo(profilesScreen, 'dictee:profiles');
            root.querySelectorAll<HTMLElement>('[data-dictee-grade]').forEach(el => bindAction(el, () => { session.grade = el.dataset.dicteeGrade as Choice; lengthScreen(true); }, () => `dictee:grade:${el.dataset.dicteeGrade!}`));
            if (aloud) speak(grades.every(g => !counts[g]) ? [t.grade, t.empty] : [t.grade]);
        });
    };
    const lengthScreen = (aloud: boolean): void => {
        session.screen = 'longueur'; session.feed = null;
        void loadCatalogue().then(c => {
            if (disposed || session.screen !== 'longueur') return;
            words = wordsOf(c, session.grade!, SHOW_DRAFTS);
            root.innerHTML = lengthView(locale, session.profile!, session.grade!, words.length);
            backTo(() => gradesScreen(false), 'dictee:grades');
            root.querySelectorAll<HTMLElement>('[data-dictee-length]').forEach(el => bindAction(el, () => begin(Number(el.dataset.dicteeLength)), () => `dictee:length:${el.dataset.dicteeLength!}`));
            // Fewer approved words than the longest game: the note is said too.
            if (aloud) speak(words.length && words.length < 20 ? [t.length, t.few(words.length)] : [t.length]);
        });
    };
    const begin = (n: number): void => {
        const p = progressOf(session.records, session.profile!, session.grade!);
        session.feed = startFeed(draw(words.map(w => w.id), p, n, rng));
        observed.words = {};
        void keep(session.feed.cards.flatMap(c => remember(wordOf(c.id))));
        session.screen = 'fil';
        fresh(); speak([t.start]);
        later(1600, arrive);
    };
    /** A new card: nothing typed, the letters of the first grade shuffled. */
    const fresh = (): void => {
        const w = current()!;
        session.typed = ''; session.used = []; session.evaluation = null;
        session.tiles = session.grade === 'CP' ? tiles(w.expectedForm, rng) : [];
        draw_();
    };
    const setTyped = (s: string): void => { session.typed = s; const input = root.querySelector<HTMLInputElement>('#dictee-answer'); if (input) input.value = s; };
    const type = (c: string): void => {
        if (session.evaluation || !current()) return;
        if (session.grade === 'CP') {
            const k = session.tiles.findIndex((x, i) => x === c && !session.used.includes(i)); if (k < 0) return;
            session.used = [...session.used, k];
            root.querySelector<HTMLButtonElement>(`[data-tile="${k}"]`)?.toggleAttribute('disabled', true);
        }
        if (Array.from(session.typed).length < 24) setTyped(session.typed + c);
    };
    const erase = (): void => {
        if (session.evaluation || !session.typed) return;
        if (session.grade === 'CP') { const k = session.used.at(-1); session.used = session.used.slice(0, -1); if (k !== undefined) root.querySelector<HTMLButtonElement>(`[data-tile="${k}"]`)?.toggleAttribute('disabled', false); }
        setTyped(Array.from(session.typed).slice(0, -1).join(''));
    };
    const validate = (): void => {
        const w = current(); if (!w || session.evaluation || !session.feed) return;
        if (!session.typed.trim()) { speak([t.writeFirst]); return; }
        const e = evaluate(w.expectedForm, session.typed, w.homophones);
        session.evaluation = e; session.feed = answer(session.feed, e.exact);
        session.praise = Math.floor(rng() * t.right.length);
        observed.words[w.id] = w.expectedForm;
        recordActivation(`dictee:answer:${e.exact ? 'juste' : e.errors[0]?.type ?? 'faux'}`, 'action', e.exact, w.id);
        draw_();
        if (e.exact) { chime(sound()); speak([t.right[session.praise]!]); }
        // Only on its own card: the child may have moved on before the replay is due (fifth Codex review).
        else later(reduce ? 0 : 700, () => { if (current()?.id === w.id && session.evaluation) play(w.pronunciationAsset); });
    };
    const goNext = (): void => {
        if (!session.feed || !session.evaluation) return;
        const card = root.querySelector('.dictee-card');
        card?.classList.add('dictee-sortie');
        later(LEAVE_MS, () => {
            session.feed = next(session.feed!);
            if (session.feed.finished) { end(); return; }
            fresh(); arrive();
        });
    };
    const end = (): void => {
        const f = session.feed!;
        session.records = withProgress(session.records, session.profile!, session.grade!, closeFeed(progressOf(session.records, session.profile!, session.grade!), f));
        writeRecords(storage, session.records);
        session.screen = 'bilan'; draw_(); chime(sound());
        speak([t.endSaid(f.results.length)]);
    };
    /** Touch the card: hear it again; hold it: more slowly; swipe it up: the next card, once answered. */
    const gestures = (card: HTMLElement): void => {
        let start: { x: number; y: number; id: number } | null = null, long = false, moved = false, timer = 0;
        card.addEventListener('pointerdown', e => {
            if (!e.isPrimary || (e.target as Element).closest('button')) return;
            start = { x: e.clientX, y: e.clientY, id: e.pointerId }; long = false; moved = false;
            try { card.setPointerCapture(e.pointerId); } catch { /* Synthetic pointers. */ }
            timer = window.setTimeout(() => { if (start && !moved) { long = true; play(current()?.pronunciationAsset ?? null, SLOW_RATE); recordActivation('dictee:slow', 'action', true, 'long-press'); } }, LONG_PRESS_MS);
        });
        card.addEventListener('pointermove', e => {
            if (!start || e.pointerId !== start.id) return;
            const dy = e.clientY - start.y;
            if (Math.hypot(e.clientX - start.x, dy) >= 12) { moved = true; clearTimeout(timer); }
            if (!reduce && dy < 0) card.style.transform = `translateY(${Math.max(dy, -160)}px)`;
        });
        const release = (e: PointerEvent, cancelled: boolean): void => {
            if (!start || e.pointerId !== start.id) return;
            clearTimeout(timer);
            const dy = e.clientY - start.y; start = null; card.style.transform = '';
            if (cancelled) return;
            if (dy <= -SWIPE_PX) { if (session.evaluation) { recordActivation('dictee:swipe', 'action', true, 'up'); goNext(); } else speak([t.writeFirst]); return; }
            if (!moved && !long) { play(current()?.pronunciationAsset ?? null); recordActivation('dictee:replay', 'action', true, 'tap'); }
        };
        card.addEventListener('pointerup', e => release(e, false));
        card.addEventListener('pointercancel', e => release(e, true));
    };
    function draw_(): void {
        if (session.screen === 'bilan') {
            const f = session.feed!;
            root.innerHTML = endView(locale, session.profile!, rightFirstTime(f).map(wordOf), missed(f).map(wordOf), f.results.length, reduce, session.grade === MIXED);
            backTo(() => lengthScreen(false), 'dictee:lengths');
            bindAction(root.querySelector<HTMLElement>('#dictee-more')!, () => lengthScreen(true), 'dictee:more');
            bindAction(root.querySelector<HTMLElement>('#dictee-home')!, home, 'dictee:home-end');
            return;
        }
        const f = session.feed!, w = current()!, card = f.cards[f.index]!;
        const input = session.grade === 'CP' ? tileTray(t, session.tiles, session.used) : keyboard(t);
        root.innerHTML = feedView(locale, session.grade!, f.index, f.cards.length,
            cardView({ word: w, index: f.index, total: f.cards.length, again: card.again, evaluation: session.evaluation, praise: t.right[session.praise]!, profile: session.profile!, showTip: true }, locale, reduce), input,
            session.evaluation && readAdult(storage) ? { reported: readReports(storage).some(r => r.id === w.id) } : null);
        setTyped(session.typed);
        // Once checked, the keyboard steps aside and the card takes the whole height, like the next card will.
        root.querySelector('.dictee-feed')?.classList.toggle('dictee-repondu', session.evaluation !== null);
        backTo(() => lengthScreen(false), 'dictee:lengths');
        gestures(root.querySelector<HTMLElement>('.dictee-card')!);
        const sentence = root.querySelector<HTMLElement>('#dictee-sentence');
        if (sentence) bindAction(sentence, () => play(current()?.contextAsset ?? null), 'dictee:sentence');
        // Report this word (once checked): what is wrong, an optional note; saved on the device with the audio version.
        const report = root.querySelector<HTMLElement>('#dictee-report');
        if (report) bindAction(report, () => {
            if (root.querySelector('#dictee-report-panel')) return;
            root.querySelector('.dictee-feed > header')!.insertAdjacentHTML('afterend', reportPanel(locale));
            const panel = root.querySelector<HTMLElement>('#dictee-report-panel')!, save = panel.querySelector<HTMLButtonElement>('#dictee-report-save')!;
            let kind: ReportKind | null = null;
            panel.querySelectorAll<HTMLElement>('[data-report-kind]').forEach(b => bindAction(b, () => {
                kind = b.dataset.reportKind as ReportKind;
                panel.querySelectorAll('[data-report-kind]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
                save.disabled = false;
            }, `dictee:report-kind:${b.dataset.reportKind!}`));
            bindAction(save, () => {
                const w = current(); if (!w || !kind) return;
                const r: Report = { id: w.id, form: w.expectedForm, grade: w.grade, kind, note: panel.querySelector<HTMLInputElement>('#dictee-report-note')!.value,
                    audioVersion: (kind === 'phrase' ? w.audio.contextVersion : w.audio.wordVersion) ?? null, at: new Date().toISOString().slice(0, 10) };
                writeReports(storage, addReport(readReports(storage), r));
                panel.remove(); report.setAttribute('aria-pressed', 'true'); report.lastElementChild!.textContent = t.flagged;
            }, 'dictee:report-save');
            bindAction(panel.querySelector<HTMLElement>('#dictee-report-cancel')!, () => panel.remove(), 'dictee:report-cancel');
        }, 'dictee:report');
        const nextButton = root.querySelector<HTMLElement>('#dictee-next');
        if (nextButton) { bindAction(nextButton, goNext, () => `dictee:next:${f.index}`); nextButton.focus({ preventScroll: true }); }
        // The capital key applies to the next letter only, then lets go.
        let upper = false;
        const shift = root.querySelector<HTMLElement>('#dictee-shift');
        const setUpper = (u: boolean): void => { upper = u; shift?.setAttribute('aria-pressed', String(u)); root.querySelector('.dictee-keyboard')?.classList.toggle('dictee-maj', u); };
        if (shift) bindAction(shift, () => setUpper(!upper), 'dictee:shift');
        root.querySelectorAll<HTMLElement>('[data-key]').forEach(el => bindAction(el, () => { type(upper ? el.dataset.key!.toUpperCase() : el.dataset.key!); setUpper(false); }, () => `dictee:key:${el.dataset.key!}:${Array.from(session.typed).length}`));
        root.querySelectorAll<HTMLElement>('[data-tile]').forEach(el => bindAction(el, () => type(session.tiles[Number(el.dataset.tile)]!), () => `dictee:tile:${el.dataset.tile!}`));
        bindAction(root.querySelector<HTMLElement>('#dictee-erase')!, erase, () => `dictee:erase:${Array.from(session.typed).length}`);
        bindAction(root.querySelector<HTMLElement>('#dictee-validate')!, validate, () => `dictee:validate:${f.index}`);
    }
    /** The physical keyboard: letters and accents type, Backspace erases, Enter checks; once checked, Enter or an
     * arrow key goes to the next card. Space hears the word again. */
    const keys = (e: KeyboardEvent): void => {
        if (session.screen !== 'fil' || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target instanceof Element && (e.target.closest('#back') || e.target.closest('#dictee-report-panel'))) return;
        const k = e.key;
        if (session.evaluation) {
            if (['Enter', 'ArrowUp', 'ArrowDown', 'PageDown', 'ArrowLeft', ' '].includes(k)) { e.preventDefault(); goNext(); }
            return;
        }
        if (k === 'Backspace') { e.preventDefault(); erase(); }
        else if (k === 'Enter') { e.preventDefault(); validate(); }
        else if (k === ' ') { e.preventDefault(); play(current()?.pronunciationAsset ?? null); }
        else if (k.length === 1 && (LETTERS.includes(k.toLowerCase()) || ACCENTS.includes(k.toLowerCase()) || /^[A-Z]$/.test(k))) { e.preventDefault(); type(k); }
    };
    document.addEventListener('keydown', keys);
    observed = { played: [], heard: [], words: {} };
    void loadCatalogue().then(c => {
        if (disposed) return;
        if (session.grade) words = wordsOf(c, session.grade, SHOW_DRAFTS);
        if ((session.screen === 'fil' && session.feed && !session.feed.finished && words.length) || (session.screen === 'bilan' && session.feed)) draw_();
        else if (session.screen === 'longueur' && session.grade) lengthScreen(false);
        else if (session.screen === 'niveaux' && session.profile) gradesScreen(false);
    });
    if (session.screen === 'profils' || !session.profile) profilesScreen();
    else root.innerHTML = `<p class="dictee-note">${t.loading}</p>`;
    return () => { disposed = true; for (const id of timers) clearTimeout(id); timers.clear(); document.removeEventListener('keydown', keys); audio?.pause(); };
}
