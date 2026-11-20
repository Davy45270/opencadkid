import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { makeRng } from '../src/engines/rng';
import {
    answer, closeFeed, draw, missed, evaluate, freshProgress, grades, mainError, next, normalize, parseCatalogue, parseProgress, parseRecords, playable, sentenceOnArrival, wordsOf, MIXED, parseReports, addReport, reportsText,
    problems, publishable, startFeed, tiles, withProgress, progressOf, COME_BACK, type Progress, type Word,
} from '../src/engines/dictee';

/** Typical mistakes of children aged 6 to 11, and how the checker must name them. */
const corpus: [expected: string, answer: string, type: string][] = [
    // A letter forgotten.
    ['maison', 'mason', 'omission'], ['tortue', 'tortu', 'lettre-muette'], ['arbre', 'arbe', 'omission'], ['fleur', 'fleu', 'omission'],
    ['chemin', 'chmin', 'omission'], ['jardin', 'jadin', 'omission'],
    // Accents.
    ['école', 'ecole', 'accent'], ['étoile', 'etoile', 'accent'], ['fenêtre', 'fenetre', 'accent'], ['mère', 'mére', 'accent'], ['forêt', 'foret', 'accent'],
    ['élève', 'eleve', 'accent'],
    // The sound o written o, au or eau.
    ['bateau', 'bato', 'son'], ['château', 'chato', 'son'], ['gâteau', 'gato', 'son'], ['jaune', 'jone', 'son'], ['chaud', 'chod', 'son'],
    ['beaucoup', 'bocoup', 'son'],
    // Other sounds written another way.
    ['enfant', 'anfant', 'son'], ['photo', 'foto', 'son'], ['maison', 'mèson', 'son'], ['pain', 'pin', 'son'], ['quatre', 'katre', 'son'],
    // Double consonants.
    ['pomme', 'pome', 'double-consonne'], ['ballon', 'balon', 'double-consonne'], ['lettre', 'letre', 'double-consonne'], ['terre', 'tere', 'double-consonne'],
    ['personne', 'persone', 'double-consonne'], ['tapis', 'tappis', 'double-consonne'],
    // Silent letters at the end.
    ['chat', 'cha', 'lettre-muette'], ['loup', 'lou', 'lettre-muette'], ['souris', 'souri', 'lettre-muette'], ['nez', 'ne', 'lettre-muette'],
    // Agreement endings added to the word.
    ['chat', 'chats', 'accord'], ['cheval', 'chevale', 'accord'], ['grand', 'grande', 'accord'], ['joli', 'jolis', 'accord'],
    // Case.
    ['lune', 'Lune', 'casse'],
    // Plain substitutions.
    ['lapin', 'lapon', 'substitution'], ['robe', 'rope', 'substitution'],
];

describe('the spelling checker', () => {
    it('accepts the exact word, whatever the spaces and the Unicode form', () => {
        for (const [e, a] of [['école', ' école '], ['école', 'école'], ["aujourd'hui", 'aujourd’hui']] as const) {
            const r = evaluate(e, a);
            expect([r.exact, r.score, r.errors]).toEqual([true, 1, []]);
        }
        expect(normalize('  le   chat ')).toBe('le chat');
    });
    it.each(corpus)('%s written « %s » is a mistake of type %s', (expected, written, type) => {
        const r = evaluate(expected, written);
        expect(r.exact).toBe(false);
        expect(mainError(r)?.type).toBe(type);
        expect(r.marks).toHaveLength(Array.from(normalize(expected)).length);
        expect(r.marks).toContain('faux');
    });
    it('names a homophone of the word as a homophone, not as letters', () => {
        const r = evaluate('verre', 'vert', ['vers', 'vert', 'ver']);
        expect(r.errors.map(e => e.type)).toEqual(['homophone']);
        expect(r.marks.every(m => m === 'faux')).toBe(true);
        expect(mainError(evaluate('mer', 'mère', ['mère', 'maire']))?.type).toBe('homophone');
    });
    it('marks exactly the letters to look at', () => {
        expect(evaluate('pomme', 'pome').marks.filter(m => m === 'faux')).toHaveLength(1);
        expect(evaluate('école', 'ecole').marks).toEqual(['faux', 'ok', 'ok', 'ok', 'ok']);
        const r = evaluate('bateau', 'bato');
        expect(r.marks.slice(0, 3)).toEqual(['ok', 'ok', 'ok']);
    });
    it('scores reproducibly: accents and case weigh less than letters, content and form apart', () => {
        expect(evaluate('école', 'ecole')).toMatchObject({ score: .9, contentScore: 1, formScore: .9 });
        expect(evaluate('lune', 'Lune')).toMatchObject({ score: .94, contentScore: 1 });
        expect(evaluate('pomme', 'pome')).toMatchObject({ score: .8, contentScore: .8, formScore: 1 });
        expect(evaluate('chat', '').score).toBe(0);
        for (const [e, a] of corpus) expect(evaluate(e, a)).toEqual(evaluate(e, a));
    });
    it('counts the case: a capital letter is expected and a missing one is named', () => {
        const r = evaluate('Noël', 'noël');
        expect(r.exact).toBe(false);
        expect(r.errors[0]?.type).toBe('casse');
        expect(evaluate('Noël', 'Noël').exact).toBe(true);
    });
    it('gives one deterministic alignment for each answer', () => {
        const r = evaluate('bateau', 'bato');
        expect(r.errors).toEqual([{ type: 'son', start: 3, end: 6, expected: 'eau', got: 'o' }]);
    });
});

const word = (id: string, extra: Partial<Word> = {}): Word => ({ id, lemma: id, expectedForm: id, grade: 'CP', tags: [], homophones: [], contextSentence: null, explanation: null,
    homophoneNotes: {}, pronunciationAsset: `dictee/audio/${id}.ogg`, contextAsset: null, audio: { mode: 'word_only' }, difficulty: 1, status: 'approved',
    review: { orthography: 'approved', pedagogy: 'approved', context: 'approved', audio: 'approved' }, validatedBy: 'adulte', version: 1, ...extra });

describe('the catalogue', () => {
    it('refuses a homophone without a context sentence: it is never publishable', () => {
        const w = word('verre', { homophones: ['vert', 'ver'] });
        expect(problems(w)).toContain('homophone sans phrase de contexte');
        // A hyphenated word holds its parts: « ce jour-là » holds « jour ».
        expect(problems(word('jour', { contextSentence: 'Il fait beau ce jour-là.', contextAsset: 'dictee/audio/jour-phrase.ogg' }))).toEqual([]);
        expect(publishable(w)).toBe(false);
        expect(publishable({ ...w, contextSentence: 'Je bois un verre de lait.', contextAsset: 'dictee/audio/verre-phrase.ogg' })).toBe(true);
    });
    it('shows the child reviewed words only; drafts only when asked on purpose', () => {
        const c = parseCatalogue({ schemaVersion: '1.1', version: 1, locale: 'fr-FR', words: [word('chat'), word('loup', { status: 'draft', validatedBy: null }), { id: 'cassé' }] });
        expect(c.words.map(w => w.id)).toEqual(['chat', 'loup']);
        expect(playable(c, 'CP').map(w => w.id)).toEqual(['chat']);
        expect(playable(c, 'CP', true).map(w => w.id)).toEqual(['chat', 'loup']);
        expect(publishable(word('x', { validatedBy: null }))).toBe(false);
        expect(parseCatalogue(null).words).toEqual([]);
        expect(parseCatalogue({ schemaVersion: '1.0', version: 1, locale: 'fr-FR', words: [word('chat')] }).words).toEqual([]);
    });
    it('never draws a word that is not approved: needs_review, draft, rejected, or a review still pending', () => {
        const pending = { orthography: 'approved', pedagogy: 'approved', context: 'approved', audio: 'pending' } as const;
        const c = parseCatalogue({ schemaVersion: '1.1', version: 1, locale: 'fr-FR', words: [word('chat'), word('loup', { status: 'needs_review', validatedBy: null }),
            word('lune', { status: 'rejected', validatedBy: null }), word('robe', { review: pending }), word('rose', { audio: { mode: 'audio_manual_review' } })] });
        expect(c.words).toHaveLength(5);
        expect(playable(c, 'CP').map(w => w.id)).toEqual(['chat']);
        for (let seed = 1; seed <= 50; seed++) expect(draw(playable(c, 'CP').map(w => w.id), freshProgress(), 5, makeRng(seed))).toEqual(['chat']);
        // A development server shows what waits for review, never a rejected word, an inconsistent approval, nor a recording waiting for an ear.
        expect(playable(c, 'CP', true).map(w => w.id)).toEqual(['chat', 'loup']);
        expect(problems(word('rose', { audio: { mode: 'audio_manual_review' } }))).toContain('audio à écouter par un adulte');
    });
    it('mixes every class without a duplicate and never a word that is not approved', () => {
        const ws = grades.flatMap(g => Array.from({ length: 6 }, (_, k) => word(`${g.toLowerCase()}-${k}`, { grade: g,
            ...(k === 5 ? { status: 'needs_review' as const, validatedBy: null } : k === 4 ? { audio: { mode: 'audio_manual_review' as const } } : {}) })));
        const c = parseCatalogue({ schemaVersion: '1.1', version: 1, locale: 'fr-FR', words: ws });
        const pool = wordsOf(c, MIXED);
        expect(pool).toHaveLength(20);
        expect(new Set(pool.map(w => w.grade))).toEqual(new Set(grades));
        expect(pool.every(w => publishable(w))).toBe(true);
        const approved = new Set(pool.map(w => w.id));
        for (let seed = 1; seed <= 40; seed++) for (const n of [5, 10, 15, 20]) {
            const d = draw(pool.map(w => w.id), freshProgress(), n, makeRng(seed));
            expect(d).toHaveLength(n);
            expect(new Set(d).size).toBe(n);
            expect(d.every(id => approved.has(id))).toBe(true);
        }
        // Fewer approved words than asked: all of them, once each, never a crash.
        const few = wordsOf(parseCatalogue({ schemaVersion: '1.1', version: 1, locale: 'fr-FR', words: ws.slice(0, 3) }), MIXED).map(w => w.id);
        expect(draw(few, freshProgress(), 20, makeRng(3)).sort()).toEqual([...few].sort());
        expect(draw([], freshProgress(), 5, makeRng(3))).toEqual([]);
        // The mixed mode keeps its own spaced review.
        const r = withProgress({}, 'panda', MIXED, { ...freshProgress(), session: 2 });
        expect(parseRecords(JSON.stringify(r)).panda?.mix?.session).toBe(2);
        expect(wordsOf(c, 'CE1').every(w => w.grade === 'CE1')).toBe(true);
    });
    it('says the sentence on arrival when the word alone is ambiguous, and requires it', () => {
        const verre = word('verre', { homophones: ['vert'], contextSentence: 'Je bois dans un verre.', contextAsset: 'dictee/audio/verre-phrase.ogg', audio: { mode: 'context_required' } });
        expect(sentenceOnArrival(verre)).toBe(true);
        expect(sentenceOnArrival({ ...verre, audio: { mode: 'word_only' } })).toBe(false);
        expect(problems({ ...verre, contextSentence: null, contextAsset: null })).toContain('phrase obligatoire absente');
    });
    it('the shipped catalogue keeps the contract: 100 words per grade, unique ids, every audio file present, all drafts for now', () => {
        const raw = JSON.parse(readFileSync('public/dictee/catalogue.json', 'utf8')) as { words: unknown[] };
        const c = parseCatalogue(raw);
        expect(c.words).toHaveLength(raw.words.length);
        expect(new Set(c.words.map(w => w.id)).size).toBe(c.words.length);
        for (const g of grades) expect(c.words.filter(w => w.grade === g)).toHaveLength(100);
        for (const w of c.words) {
            expect(existsSync(`public/${w.pronunciationAsset}`), w.pronunciationAsset).toBe(true);
            if (w.contextAsset) expect(existsSync(`public/${w.contextAsset}`), w.contextAsset).toBe(true);
            expect(w.expectedForm).toBe(w.expectedForm.normalize('NFC'));
            // Nothing is shown to a child until an adult has approved it; nobody but an adult approves.
            if (w.status === 'approved') expect(publishable(w)).toBe(true);
            else expect(w.validatedBy).toBeNull();
            if (w.homophones.some(h => !(h in w.homophoneNotes))) expect(['context_required', 'audio_manual_review']).toContain(w.audio.mode);
        }
    });
});

const ids = Array.from({ length: 100 }, (_, i) => `fr-cp-${String(i + 1).padStart(3, '0')}`);
describe('the words reported by an adult while playing', () => {
    it('stores the word, the kind of problem, an optional note, the audio version and the day, nothing about the child', () => {
        const r = { id: 'fr-vert', form: 'vert', grade: 'CP', kind: 'audio' as const, note: '  on entend ver  ', audioVersion: 'abcd', at: '2026-11-16' };
        let list = addReport([], r);
        expect(list).toEqual([{ ...r, note: 'on entend ver' }]);
        list = addReport(list, { ...r, kind: 'phrase', note: '', audioVersion: null });
        list = addReport(list, { ...r, note: 'deux fois' });
        expect(list.map(x => `${x.kind}:${x.note}`)).toEqual(['phrase:', 'audio:deux fois']);
        const back = parseReports(JSON.stringify(list));
        expect(back).toEqual(list);
        expect(Object.keys(back[0]!).sort()).toEqual(['at', 'audioVersion', 'form', 'grade', 'id', 'kind', 'note']);
        expect(reportsText(back)).toBe('2026-11-16\tfr-vert\tvert\tCP\tphrase\t\t\n2026-11-16\tfr-vert\tvert\tCP\taudio\tabcd\tdeux fois');
        expect(parseReports('[{"id":"x"},{"id":"y","form":"y","grade":"CP","kind":"autre","at":"d"},null]')).toEqual([]);
        expect(parseReports('pas du json')).toEqual([]);
        expect(addReport([], { ...r, note: 'x'.repeat(500) })[0]!.note).toHaveLength(200);
    });
});

describe('the audio incidents of the automatic check, kept as non-regression cases', () => {
    const file = JSON.parse(readFileSync('scripts/dictee/audio-non-regression.json', 'utf8')) as { cases: { id: string; grade: string; kind: string; asset: string; observed: string; audioVersion: string; batch: string; listening: { status: string; audioVersion?: string } }[] };
    const first = file.cases.filter(c => c.batch.includes('32 signalements'));
    const shipped = new Map(parseCatalogue(JSON.parse(readFileSync('public/dictee/catalogue.json', 'utf8'))).words.map(w => [w.id, w]));
    const versions = JSON.parse(readFileSync('scripts/dictee/audio-empreintes.json', 'utf8')) as Record<string, string>;
    it('keeps the 32 cases of 2026-11-16, each traceable: id, text heard, audio version, human listening status', () => {
        expect(first).toHaveLength(32);
        const byGrade = Object.fromEntries(grades.map(g => [g, first.filter(c => c.grade === g).length]));
        expect(byGrade).toEqual({ CP: 13, CE1: 7, CE2: 5, CM1: 3, CM2: 4 });
        for (const c of file.cases) {
            expect(c.observed.length).toBeGreaterThan(0);
            expect(c.audioVersion).toMatch(/^[0-9a-f]{16}$/);
            expect(['pending', 'ok', 'failed', 'not_applicable']).toContain(c.listening.status);
        }
    });
    it('a case not heard right by an adult keeps its word away, unless the adult approved it knowingly without listening', () => {
        const raw = new Map((JSON.parse(readFileSync('public/dictee/catalogue.json', 'utf8')) as { words: { id: string; provenance: { validation?: string } }[] }).words.map(w => [w.id, w]));
        for (const c of file.cases) {
            const w = shipped.get(c.id);
            if (!w) { expect(c.listening.status).toBe('not_applicable'); continue; }
            const heard = c.listening.status === 'ok' && c.listening.audioVersion === versions[c.asset];
            if (heard) continue;
            // The case stays pending, for the record; it blocks the word unless the approval says it was not heard.
            expect(c.listening.status).toBe('pending');
            if (w.status === 'approved') expect(raw.get(c.id)!.provenance.validation).toMatch(/écoute audio non faite/);
            else { expect(w.audio.mode).toBe('audio_manual_review'); expect(publishable(w)).toBe(false); }
        }
    });
});

describe('the feed and the spaced review', () => {
    it('draws distinct words, the same for the same seed', () => {
        for (const n of [5, 10, 15, 20]) {
            const d = draw(ids, freshProgress(), n, makeRng(n));
            expect(new Set(d).size).toBe(n);
            expect(draw(ids, freshProgress(), n, makeRng(n))).toEqual(d);
        }
        expect(draw(ids.slice(0, 3), freshProgress(), 10, makeRng(1))).toHaveLength(3);
    });
    it('mixes about 30 % of words to review with new words, and avoids the recent ones', () => {
        let p: Progress = freshProgress();
        const first = draw(ids, p, 20, makeRng(1));
        let f = startFeed(first);
        // Six words missed, the others right.
        for (let k = 0; !f.finished; k++) { f = answer(f, !(k < 6 && !f.cards[f.index]!.again) ); f = next(f); }
        p = closeFeed(p, f);
        const second = draw(ids, p, 20, makeRng(2));
        const missedBefore = missed(f);
        expect(missedBefore).toHaveLength(4);
        expect(second.filter(id => missedBefore.includes(id))).toHaveLength(4);
        // The words seen and right are recent: they wait. The words given back by the feed may come.
        const seen = f.results.map(r => r.id);
        expect(second.filter(id => seen.includes(id) && !missedBefore.includes(id))).toEqual([]);
        expect(new Set(second).size).toBe(20);
    });
    it('brings a missed word back a few cards later, once, and keeps the feed finite', () => {
        let f = startFeed(ids.slice(0, 10));
        f = answer(f, false);
        expect(f.cards).toHaveLength(10);
        expect(f.cards[1 + COME_BACK]).toEqual({ id: ids[0], again: true });
        f = next(f);
        let steps = 0;
        while (!f.finished) { f = next(answer(f, true)); steps++; }
        expect(steps).toBe(9);
        expect(f.results.filter(r => r.id === ids[0])).toHaveLength(2);
        // Missing every word never makes the feed longer than chosen.
        let h = startFeed(ids.slice(0, 5)), cards = 0;
        while (!h.finished) { h = next(answer(h, false)); cards++; }
        expect(cards).toBe(5);
        // Answering twice or moving on before answering changes nothing.
        const g = answer(startFeed(ids.slice(0, 5)), true);
        expect(answer(g, false)).toBe(g);
        expect(next(startFeed(ids.slice(0, 5))).index).toBe(0);
    });
    it('moves Leitner boxes on the first answer of each word only', () => {
        let f = startFeed(ids.slice(0, 6));
        f = next(answer(f, false)); f = next(answer(f, true));
        const p = closeFeed(freshProgress(), f);
        expect(p.words['fr-cp-001']).toEqual({ box: 1, seen: 1, misses: 1, last: 1 });
        expect(p.words['fr-cp-002']).toEqual({ box: 2, seen: 1, misses: 0, last: 1 });
        expect(p.session).toBe(1);
    });
    it('keeps the history of the real catalogue ids across a reload (ninth Codex review of 2026-11-20)', () => {
        const stored = { session: 1, words: { 'fr-air': { box: 2, seen: 1, misses: 0, last: 1 }, 'fr-c-est': { box: 1, seen: 1, misses: 1, last: 1 } }, recent: ['fr-air', 'fr-c-est'] };
        expect(parseProgress(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
        expect(parseProgress({ session: 1, words: { 'FR-AIR': { box: 1, seen: 1, misses: 0, last: 1 }, 'fr-': { box: 1, seen: 1, misses: 0, last: 1 } }, recent: ['fr-air-', '<x>'] }))
            .toEqual({ session: 1, words: {}, recent: [] });
    });
    it('reads stored progress safely and keeps profiles apart', () => {
        expect(parseProgress({ session: 2, words: { 'fr-cp-001': { box: 9, seen: 1, misses: 0, last: 1 }, 'fr-cp-002': { box: 2, seen: 1, misses: 0, last: 1 } }, recent: ['fr-cp-002', 3] }))
            .toEqual({ session: 2, words: { 'fr-cp-002': { box: 2, seen: 1, misses: 0, last: 1 } }, recent: ['fr-cp-002'] });
        expect(parseRecords('{oops')).toEqual({});
        const p = { ...freshProgress(), session: 3 };
        const r = parseRecords(JSON.stringify(withProgress({}, 'licorne', 'CE1', p)));
        expect(progressOf(r, 'licorne', 'CE1').session).toBe(3);
        expect(progressOf(r, 'panda', 'CE1').session).toBe(0);
        expect(parseRecords(JSON.stringify({ intrus: {}, panda: { CM3: {} } }))).toEqual({ panda: {} });
    });
    it('shuffles letter tiles so that they never start in the right order', () => {
        for (let s = 0; s < 50; s++) {
            const t = tiles('chat', makeRng(s));
            expect(t.join('')).not.toBe('chat');
            expect(Array.from(t).sort()).toEqual(Array.from('chat').sort());
        }
    });
});
