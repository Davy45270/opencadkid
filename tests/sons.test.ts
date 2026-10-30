import { expect, it } from 'vitest';
import { advance, answer, complete, drop, generateRound, isUnlocked, levels, lexicon, neighbours, phoneme, start, stars } from '../src/engines/sons';
import { drawings, motifSvg } from '../src/games/sons/motifs';
import { gameView, instruction, spoken } from '../src/games/sons/view';
import { fresh, readSave, writeSave } from '../src/shell/storage';
import { messages, type Locale } from '../src/shell/i18n';
const table = [
    ['image-lettre', 2, false], ['image-lettre', 3, false], ['image-lettre', 4, false], ['image-lettre', 4, true],
    ['lettre-image', 3, false], ['lettre-image', 3, true], ['son-lettre', 3, false], ['son-lettre', 4, true], ['trier', 2, false], ['trier', 2, true]
] as const;
// Authored separately: do not compute these expectations with production phoneme/compatibility.
const sounds: Record<Locale, Record<string, string>> = {
    fr: { A: 'a', B: 'beu', C: 'keu', D: 'deu', E: 'é', F: 'fff', G: 'gueu', I: 'i', J: 'jjj', L: 'lll', M: 'mmm', N: 'nnn', O: 'o', P: 'peu', R: 'rrr', S: 'sss', T: 'teu', U: 'u', V: 'vvv', Z: 'zzz' },
    en: { B: 'buh', C: 'kuh', D: 'duh', F: 'fff', G: 'guh', H: 'huh', J: 'juh', K: 'kuh', L: 'lll', M: 'mmm', N: 'nnn', P: 'puh', Q: 'kwuh', R: 'rrr', S: 'sss', T: 'tuh', V: 'vvv', W: 'wuh', Y: 'yuh', Z: 'zzz' }
};
const banned: Record<Locale, string[][]> = {
    fr: [['B', 'P'], ['D', 'T'], ['F', 'V'], ['M', 'N'], ['S', 'Z'], ['C', 'K'], ['C', 'Q'], ['K', 'Q'], ['G', 'C'], ['G', 'K'], ['G', 'Q'], ['J', 'G'], ['E', 'I'], ['O', 'U']],
    en: [['B', 'P'], ['D', 'T'], ['F', 'V'], ['M', 'N'], ['S', 'Z'], ['C', 'K'], ['C', 'Q'], ['K', 'Q'], ['G', 'C'], ['G', 'K'], ['G', 'Q'], ['J', 'G'], ['W', 'V'], ['Y', 'J']]
};
const normalize = (word: string): string => word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
it('native lexicons: twenty families of three unique, drawable words; conservative initial exclusions', () => {
    for (const locale of ['fr', 'en'] as const) {
        const words = lexicon[locale], initials = [...new Set(words.map(w => w.initial))].sort();
        expect(initials).toEqual(Object.keys(sounds[locale]).sort()); expect(initials.length).toBeGreaterThanOrEqual(20);
        expect(new Set(words.map(w => normalize(w.word))).size).toBe(words.length);
        expect(new Set(words.map(w => w.motif)).size).toBe(words.length);
        for (const initial of initials) expect(words.filter(w => w.initial === initial).length).toBeGreaterThanOrEqual(3);
        for (const word of words) {
            const normalized = normalize(word.word);
            expect(normalized.startsWith(word.initial)).toBe(true);
            expect(normalized).not.toMatch(locale === 'fr' ? /^(?:[HKWXY]|CH|PH|OU|ON|[AEIOU][NM](?:[^AEIOUY]|$))/ : /^(?:KN|WR|PH|TH|SH|CH|[AEIOU])/);
            expect(drawings[word.motif]).toBeTruthy();
            const svg = motifSvg(word);
            expect(svg).toContain(`data-word="${word.word}"`); expect(svg).toContain(`data-initial="${word.initial}"`);
            expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/); expect(svg).toMatch(/<\/svg>$/);
            expect(svg).not.toMatch(/NaN|undefined|Infinity|<text|<image|<script|href=/);
            // Well-nested, known SVG vocabulary; self-closing primitives have finite attributes.
            const stack: string[] = [];
            for (const match of svg.matchAll(/<(\/?)([a-z]+)\b[^>]*?(\/?)>/g)) {
                const [, close, tag, self] = match;
                expect(['svg', 'g', 'path', 'rect', 'circle']).toContain(tag);
                if (close) expect(stack.pop()).toBe(tag); else if (!self) stack.push(tag!);
            }
            expect(stack).toEqual([]);
        }
    }
    // Shared object, native spelling and a different initial. No translated-round fallback.
    expect(lexicon.fr.find(w => w.motif === 'moon')).toMatchObject({ word: 'lune', initial: 'L' });
    expect(lexicon.en.find(w => w.motif === 'moon')).toMatchObject({ word: 'moon', initial: 'M' });
    expect(lexicon.fr.find(w => w.motif === 'apple')).toMatchObject({ word: 'pomme', initial: 'P' });
    expect(lexicon.en.find(w => w.motif === 'pineapple')).toMatchObject({ word: 'pineapple', initial: 'P' });
    expect(lexicon.en.find(w => w.word === 'pomme')).toBeUndefined();
});
it('literal phoneme, neighbour and level tables including lowercase', () => {
    expect(levels.map(l => [l.mode, l.choices, l.lowercase])).toEqual(table); expect(neighbours).toEqual(banned);
    for (const locale of ['fr', 'en'] as const) for (const [letter, sound] of Object.entries(sounds[locale])) {
        expect(phoneme(letter, locale)).toBe(sound); expect(phoneme(letter.toLowerCase(), locale)).toBe(sound);
    }
    expect(() => phoneme('X', 'fr')).toThrow();
    for (const [level, count] of [[0, 6], [11, 6], [1, 0], [1, 1.5], [1, 100]]) expect(() => generateRound(level!, 3, 'fr', count)).toThrow();
});
for (const locale of ['fr', 'en'] as const) for (const [index, [mode, count, lowercase]] of table.entries()) it(`${locale} level ${index + 1}: 300 seeds, independent uniqueness, exclusions and position distribution`, () => {
    const failures: string[] = [], positions = Array<number>(count).fill(0);
    let rotations = 0;
    for (let seed = 0; seed < 300; seed++) {
        const round = generateRound(index + 1, seed, locale);
        expect(round).toEqual(generateRound(index + 1, seed, locale)); expect(round).toHaveLength(6);
        if (round.slice(1).every((q, i) => q.answer === (round[i]!.answer + 1) % count)) rotations++;
        const words: string[] = [];
        for (const [i, q] of round.entries()) {
            positions[q.answer]!++;
            if (q.mode !== mode || q.lowercase !== lowercase) failures.push('level');
            if (i > 1 && q.answer === round[i - 1]!.answer && q.answer === round[i - 2]!.answer) failures.push('triple');
            if (mode === 'trier') {
                if (q.boxes.length !== 2 || q.boxes[q.answer] !== q.target.initial || new Set(q.boxes).size !== 2) failures.push('boxes');
                for (const p of q.choices) if (q.boxes.filter(b => b === p.initial).length !== 1) failures.push('unique box');
            } else {
                const initials = mode === 'lettre-image' ? q.choices.map(w => w.initial) : q.letters;
                if (initials.length !== count || initials.filter(l => l === q.target.initial).length !== 1 || initials[q.answer] !== q.target.initial) failures.push('unique answer');
            }
            const distractors = mode === 'trier' ? q.boxes : q.letters;
            for (const letter of distractors.filter(l => l !== q.target.initial)) {
                if (banned[locale].some(pair => pair.includes(letter) && pair.includes(q.target.initial))) failures.push('neighbour');
            }
            if (q.choices.filter(w => w.initial === q.target.initial).length !== (mode === 'trier' ? 2 : 1)) failures.push('target count');
            words.push(...q.choices.map(w => w.word));
        }
        if (new Set(words).size !== words.length) failures.push('reused word');
    }
    expect(failures).toEqual([]);
    for (const n of positions) { expect(n / 1800).toBeGreaterThan(.65 / count); expect(n / 1800).toBeLessThan(1.35 / count); }
    if (count >= 3) expect(rotations / 300).toBeLessThan(.05);
    expect(generateRound(index + 1, 1, locale)).not.toEqual(generateRound(index + 1, 2, locale));
});
it('equal seeds select native objects independently instead of translating the French sequence', () => {
    let equal = 0;
    for (let seed = 0; seed < 300; seed++) if (generateRound(5, seed, 'fr').map(q => q.target.motif).join() === generateRound(5, seed, 'en').map(q => q.target.motif).join()) equal++;
    expect(equal).toBe(0);
});
it('pure answers, two-error hint, solved lock and advance; invalid inputs are ignored', () => {
    const initial = start(1, 8, 'fr'), before = structuredClone(initial), q = initial.questions[0]!;
    const wrong = (q.answer + 1) % 2, once = answer(initial, wrong), twice = answer(once.state, wrong);
    expect(initial).toEqual(before); expect(once.hint).toBe(false); expect(twice.hint).toBe(true); expect(answer(twice.state, wrong).hint).toBe(true);
    expect(advance(twice.state)).toBe(twice.state); expect(twice.state.index).toBe(0);
    const solved = answer(twice.state, q.answer).state;
    expect(solved.firstTry).toBe(0); expect(solved.solved).toBe(true); expect(answer(solved, q.answer).state).toBe(solved);
    expect(answer(initial, q.answer).state.firstTry).toBe(1); expect(advance(solved)).toMatchObject({ index: 1, errors: 0, solved: false, placed: [] });
    for (const invalid of [-1, 2, .5, NaN]) expect(answer(initial, invalid).state).toBe(initial);
});
it('sorting: one box per native initial, retry, hint, duplicate-drop guard and clean credit only on the last piece', () => {
    for (const locale of ['fr', 'en'] as const) {
        const initial = start(10, 7, locale), before = structuredClone(initial), q = initial.questions[0]!;
        const right = q.boxes.indexOf(q.choices[0]!.initial), wrong = (right + 1) % 2;
        const once = drop(initial, 0, wrong), twice = drop(once.state, 0, wrong);
        expect(initial).toEqual(before); expect(once.state.placed).toEqual([]); expect(once.hint).toBe(false); expect(twice.hint).toBe(true);
        let s = twice.state, clean = initial;
        for (const [i, w] of q.choices.entries()) {
            s = drop(s, i, q.boxes.indexOf(w.initial)).state; clean = drop(clean, i, q.boxes.indexOf(w.initial)).state;
            expect(drop(s, i, right).state).toBe(s); expect(clean.firstTry).toBe(i === 2 ? 1 : 0);
        }
        expect(s.solved).toBe(true); expect(s.firstTry).toBe(0); expect(s.placed).toHaveLength(3);
        expect(answer(initial, right).state).toBe(initial);
        for (const [piece, box] of [[99, 0], [-1, 0], [0, -1], [0, .5]]) expect(drop(initial, piece!, box!).state).toBe(initial);
    }
});
it('common reward boundaries, all-mode completion, unlock and best-score preservation', () => {
    expect(Array.from({ length: 7 }, (_, i) => stars(i))).toEqual([1, 1, 1, 2, 2, 3, 3]);
    for (const locale of ['fr', 'en'] as const) for (let level = 1; level <= 10; level++) for (const perfect of [false, true]) {
        let s = start(level, 3, locale); expect(complete({}, s)).toEqual({});
        for (let i = 0; i < 6; i++) {
            const q = s.questions[s.index]!;
            if (q.mode === 'trier') {
                if (!perfect) s = drop(s, 0, (q.boxes.indexOf(q.choices[0]!.initial) + 1) % 2).state;
                for (const [piece, w] of q.choices.entries()) s = drop(s, piece, q.boxes.indexOf(w.initial)).state;
            } else { if (!perfect) s = answer(s, (q.answer + 1) % q.letters.length).state; s = answer(s, q.answer).state; }
            s = advance(s);
        }
        expect(s.finished).toBe(true); expect(s.firstTry).toBe(perfect ? 6 : 0);
        expect(complete({}, s)[level]).toBe(perfect ? 3 : 1); expect(complete({ [level]: 3 }, s)[level]).toBe(3);
        expect(isUnlocked(level + 1, complete({}, s))).toBe(true); expect(advance(s)).toBe(s);
    }
});
it('i18n, spoken word then sound, sound-only cue, elongated hint and no printed words', () => {
    expect(Object.keys(messages.fr).sort()).toEqual(Object.keys(messages.en).sort());
    for (const locale of ['fr', 'en'] as const) for (let level = 1; level <= 10; level++) {
        const s = start(level, 1, locale), q = s.questions[0]!, html = gameView(s, locale, true);
        expect(instruction(q, locale).length).toBeGreaterThan(0);
        if (q.mode === 'image-lettre') expect(spoken(q, locale).slice(0, 2)).toEqual([q.target.word, sounds[locale][q.target.initial]]);
        if (q.mode === 'son-lettre') { expect(spoken(q, locale)[0]).toBe(sounds[locale][q.target.initial]); expect(html).not.toContain('data-word='); }
        expect(spoken(q, locale, true)[0]).toBe(`${sounds[locale][q.target.initial]!}… ${q.target.word}`);
        const visible = html.replace(/<[^>]*>/g, ' ');
        for (const w of lexicon[locale]) expect(visible).not.toMatch(new RegExp(`\\b${w.word}\\b`, 'i'));
        if (level === 4) expect(html).toContain(`data-letter="${q.target.initial}">${q.target.initial.toLowerCase()}</span>`);
    }
});
it('safe independent records: migration, filtering, roundtrip and erase', () => {
    let raw = JSON.stringify({ ...fresh(), records: { 1: 3 }, pairesRecords: { 2: 2 }, formesRecords: { 3: 1 }, sonsRecords: { 1: 1, 10: 3, 11: 2, 2: 0, 3: 1.5, 4: '3' } });
    const port = { getItem: () => raw, setItem: (_: string, value: string) => { raw = value; } };
    const s = readSave(port); expect(s.sonsRecords).toEqual({ 1: 1, 10: 3 }); expect(s.records).toEqual({ 1: 3 }); expect(s.pairesRecords).toEqual({ 2: 2 }); expect(s.formesRecords).toEqual({ 3: 1 });
    writeSave(port, s); expect(readSave(port)).toEqual(s);
    raw = JSON.stringify({ version: 1, locale: 'fr', voice: true, sound: true, records: { 1: 2 } }); expect(readSave(port).sonsRecords).toEqual({}); expect(fresh().sonsRecords).toEqual({});
});
it('feasible short and full rounds preserve length and distinct words over 300 seeds', () => {
    for (const locale of ['fr', 'en'] as const) for (const level of levels) {
        const maximum = level.mode === 'trier' ? 20 : Math.floor(60 / level.choices);
        for (const count of [1, 7, maximum - 1, maximum]) for (let seed = 0; seed < 300; seed++) {
            const round = generateRound(level.id, seed, locale, count);
            expect(round).toHaveLength(count);
            const words = round.flatMap(q => q.choices.map(w => w.word));
            expect(new Set(words).size).toBe(count * (level.mode === 'trier' ? 3 : level.choices));
            for (const q of round) {
                const alternatives = q.letters.filter(l => l !== q.target.initial);
                expect(q.letters[q.answer]).toBe(q.target.initial);
                for (const other of alternatives) expect(banned[locale].some(pair => pair.includes(other) && pair.includes(q.target.initial))).toBe(false);
                expect(q.choices.filter(w => w.initial === q.target.initial)).toHaveLength(level.mode === 'trier' ? 2 : 1);
            }
        }
    }
}, 120_000);
it('authored native word-to-picture oracle and visible drawing geometry', () => {
    const identities = {
        fr: 'abeille:bee arbre:tree avion:plane banane:banana bateau:boat ballon:ball carotte:carrot cadeau:gift cube:cube dé:dice domino:domino dauphin:dolphin écharpe:scarf échelle:ladder étoile:star fusée:rocket fleur:flower fourmi:ant gâteau:cake gomme:eraser gorille:gorilla île:island igloo:igloo iris:iris jaguar:jaguar jupe:skirt journal:newspaper lune:moon lapin:rabbit livre:book moto:motorcycle melon:melon mouton:sheep navire:ship nid:nest nuage:cloud olive:olive orange:orange oreiller:pillow pomme:apple poisson:fish papillon:butterfly robe:dress rat:rat robot:robot sac:bag savon:soap seau:bucket tortue:turtle tomate:tomato toupie:top usine:factory ustensile:spatula ukulélé:ukulele vache:cow vélo:bicycle voiture:car zèbre:zebra zéro:zero zoo:zoo',
        en: 'banana:banana boat:boat ball:ball cat:cat cup:cup cow:cow dog:dog dice:dice dolphin:dolphin fish:fish flower:flower fork:fork goat:goat goose:goose gorilla:gorilla hat:hat hen:hen horse:horse jam:jam jug:jug jellyfish:jellyfish kite:kite key:key kangaroo:kangaroo lion:lion leaf:leaf lemon:lemon moon:moon mouse:mouse monkey:monkey nest:nest net:net nut:nut pineapple:pineapple pig:pig panda:panda queen:queen quilt:quilt quill:quill rabbit:rabbit rat:rat robot:robot sun:sun sock:sock seal:seal turtle:turtle tomato:tomato tiger:tiger van:van vest:vest vase:vase web:web wig:wig wagon:wagon yarn:yarn yak:yak yoyo:yoyo zebra:zebra zip:zip zucchini:zucchini'
    };
    for (const locale of ['fr', 'en'] as const) {
        expect(lexicon[locale].map(w => `${w.word}:${w.motif}`).sort()).toEqual(identities[locale].split(' ').sort());
        for (const word of lexicon[locale]) {
            const drawing = drawings[word.motif]!;
            for (const [, d] of drawing.matchAll(/<path\b[^>]* d="([^"]*)"/g)) {
                expect(d!.trim()).not.toBe('');
                expect(d).toMatch(/[MLHVCAQ]/); expect(d).toMatch(/\d/);
            }
            for (const [, attribute, value] of drawing.matchAll(/\b(r|width|height)="([^"]*)"/g)) {
                expect(['r', 'width', 'height']).toContain(attribute);
                expect(Number(value)).toBeGreaterThan(0);
            }
        }
    }
    // Semantic landmarks: cat ears/body and the ladder's two rails/four rungs.
    expect(drawings.cat).toContain('M12 51Q4 37 14 24L12 6L28 17L39 16L54 5L52 26Q62 45 49 53Q30 63 12 51Z');
    expect(drawings.ladder).toContain('M15 4V60M49 4V60M15 12H49M15 25H49M15 38H49M15 51H49');
});
it('stretching is one slow onset before the native word, never two repetitions', () => {
    const q = { ...generateRound(1, 1, 'fr')[0]!, target: { word: 'sac', initial: 'S', motif: 'bag' } };
    expect(spoken(q, 'fr', true)).toEqual(['sss… sac', 'sss']);
    expect(spoken({ ...q, target: { word: 'sun', initial: 'S', motif: 'sun' } }, 'en', true)).toEqual(['sss… sun', 'sss']);
});
