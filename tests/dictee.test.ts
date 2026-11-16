import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { makeRng } from '../src/engines/rng';
import {
    answer, closeFeed, draw, missed, evaluate, freshProgress, grades, mainError, next, normalize, parseCatalogue, parseProgress, parseRecords, playable,
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
    it('gives one deterministic alignment for each answer', () => {
        const r = evaluate('bateau', 'bato');
        expect(r.errors).toEqual([{ type: 'son', start: 3, end: 6, expected: 'eau', got: 'o' }]);
    });
});

const word = (id: string, extra: Partial<Word> = {}): Word => ({ id, lemma: id, expectedForm: id, grade: 'CP', tags: [], homophones: [], contextSentence: null, explanation: null,
    pronunciationAsset: `dictee/audio/${id}.ogg`, contextAsset: null, difficulty: 1, contentStatus: 'reviewed', validatedBy: 'adulte', version: 1, ...extra });

describe('the catalogue', () => {
    it('refuses a homophone without a context sentence: it is never publishable', () => {
        const w = word('verre', { homophones: ['vert', 'ver'] });
        expect(problems(w)).toContain('homophone sans phrase de contexte');
        expect(publishable(w)).toBe(false);
        expect(publishable({ ...w, contextSentence: 'Je bois un verre de lait.', contextAsset: 'dictee/audio/verre-phrase.ogg' })).toBe(true);
    });
    it('shows the child reviewed words only; drafts only when asked on purpose', () => {
        const c = parseCatalogue({ schemaVersion: '1.0', version: 1, locale: 'fr-FR', words: [word('chat'), word('loup', { contentStatus: 'draft', validatedBy: null }), { id: 'cassé' }] });
        expect(c.words.map(w => w.id)).toEqual(['chat', 'loup']);
        expect(playable(c, 'CP').map(w => w.id)).toEqual(['chat']);
        expect(playable(c, 'CP', true).map(w => w.id)).toEqual(['chat', 'loup']);
        expect(publishable(word('x', { validatedBy: null }))).toBe(false);
        expect(parseCatalogue(null).words).toEqual([]);
    });
    it('the shipped catalogue keeps the contract: 100 words per grade, unique ids, every audio file present, all drafts for now', () => {
        const c = parseCatalogue(JSON.parse(readFileSync('public/dictee/catalogue.json', 'utf8')));
        expect(new Set(c.words.map(w => w.id)).size).toBe(c.words.length);
        for (const g of grades) expect(c.words.filter(w => w.grade === g)).toHaveLength(100);
        for (const w of c.words) {
            expect(existsSync(`public/${w.pronunciationAsset}`), w.pronunciationAsset).toBe(true);
            if (w.contextAsset) expect(existsSync(`public/${w.contextAsset}`), w.contextAsset).toBe(true);
            expect(w.expectedForm).toBe(w.expectedForm.normalize('NFC'));
            // Nothing is shown to a child until an adult has reviewed it.
            if (w.contentStatus === 'reviewed') expect(problems(w)).toEqual([]);
            else expect(w.validatedBy).toBeNull();
        }
    });
});

const ids = Array.from({ length: 100 }, (_, i) => `fr-cp-${String(i + 1).padStart(3, '0')}`);
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
