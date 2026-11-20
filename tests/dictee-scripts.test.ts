import { afterAll, describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { sentenceOnArrival, type Word } from '../src/engines/dictee';

/** The offline scripts of the dictation run on a copy of their inputs (scripts/dictee and the shipped catalogue):
 * the repository is never written. */
interface W { id: string; lemma: string; status: string; validatedBy: string | null; homophones: string[]; contextSentence: string | null; audio: { mode: string }; provenance: Record<string, unknown> }
const made: string[] = [];
afterAll(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });
function copy(): string {
    const dir = mkdtempSync(join(tmpdir(), 'dictee-'));
    made.push(dir);
    cpSync('scripts/dictee', join(dir, 'scripts/dictee'), { recursive: true });
    mkdirSync(join(dir, 'public/dictee'), { recursive: true });
    cpSync('public/dictee/catalogue.json', join(dir, 'public/dictee/catalogue.json'));
    symlinkSync(resolve('public/dictee/audio'), join(dir, 'public/dictee/audio'));  // read only: the bytes' digests
    return dir;
}
const run = (dir: string, script: string, ...args: string[]) => spawnSync('python3', [`scripts/dictee/${script}`, ...args], { cwd: dir, encoding: 'utf8' });
const words = (dir: string): Map<string, W> => new Map((JSON.parse(readFileSync(join(dir, 'public/dictee/catalogue.json'), 'utf8')) as { words: W[] }).words.map(w => [w.id, w]));
const json = (dir: string, f: string): unknown => JSON.parse(readFileSync(join(dir, 'scripts/dictee', f), 'utf8'));
const shipped = readFileSync('public/dictee/catalogue.json', 'utf8');

describe('the offline scripts of the dictation', { timeout: 30_000 }, () => {
    it('the shipped catalogue is exactly what assembler_catalogue.py writes from the versioned inputs', () => {
        const dir = copy();
        const r = run(dir, 'assembler_catalogue.py');
        expect(r.status, r.stderr).toBe(0);
        expect(readFileSync(join(dir, 'public/dictee/catalogue.json'), 'utf8')).toBe(shipped);
    });
    it('a word whose sentence changes after its approval goes back to needs_review, with no reviewer', () => {
        const dir = copy();
        const before = [...words(dir).values()].find(w => w.status === 'approved' && w.contextSentence)!;
        const phrases = json(dir, 'phrases.json') as { lemma: string; contextSentence: string }[];
        phrases.find(p => p.lemma === before.lemma)!.contextSentence += ' Encore.';
        writeFileSync(join(dir, 'scripts/dictee/phrases.json'), JSON.stringify(phrases));
        expect(run(dir, 'assembler_catalogue.py').status).toBe(0);
        const after = words(dir).get(before.id)!;
        expect(after.status).toBe('needs_review');
        expect(after.validatedBy).toBeNull();
    });
    it('a word whose tip changes after its approval goes back to needs_review, with no reviewer', () => {
        const dir = copy();
        const all = [...words(dir).values()];
        const before = all.find(w => w.status === 'approved' && (w as unknown as { explanation: string | null }).explanation)!;
        const phrases = json(dir, 'phrases.json') as { lemma: string; explanation: string }[];
        phrases.find(p => p.lemma === before.lemma)!.explanation += ' Encore.';
        writeFileSync(join(dir, 'scripts/dictee/phrases.json'), JSON.stringify(phrases));
        expect(run(dir, 'assembler_catalogue.py').status).toBe(0);
        const after = words(dir).get(before.id)!;
        expect(after.status).toBe('needs_review');
        expect(after.validatedBy).toBeNull();
    });
    it('a recording whose bytes are not those generer_audio.py wrote stops the assembly: an approval never passes to other bytes (Codex review of 2026-11-20)', () => {
        const dir = copy();
        rmSync(join(dir, 'public/dictee/audio'));
        cpSync('public/dictee/audio', join(dir, 'public/dictee/audio'), { recursive: true });
        // An older recording copied back under the same name: same text, same settings, other bytes.
        writeFileSync(join(dir, 'public/dictee/audio/fr-huit.ogg'), readFileSync('public/dictee/audio/fr-nuit.ogg'));
        const r = run(dir, 'assembler_catalogue.py');
        expect(r.status).not.toBe(0);
        expect(r.stderr).toContain('fr-huit.ogg');
        expect(readFileSync(join(dir, 'public/dictee/catalogue.json'), 'utf8')).toBe(shipped);
    });
    it('a recording missing from audio-octets.json stops the assembly too (fifth Codex review of 2026-11-20)', () => {
        const dir = copy();
        const ecrits = json(dir, 'audio-octets.json') as Record<string, string>;
        delete ecrits['dictee/audio/fr-huit-phrase.ogg'];
        writeFileSync(join(dir, 'scripts/dictee/audio-octets.json'), JSON.stringify(ecrits));
        const r = run(dir, 'assembler_catalogue.py');
        expect(r.status).not.toBe(0);
        expect(r.stderr).toContain('fr-huit-phrase.ogg');
    });
    it('generer_audio.py gives other bytes of an already made recipe a new version, so no approval passes to them (fifth Codex review)', () => {
        const code = `import sys; sys.path.insert(0, 'scripts/dictee'); import generer_audio as g
print(g.version('a.ogg', 'k1', {'a.ogg': 'k1'}, 'abcdef0123456789'))
print(g.version('a.ogg', 'k2', {'a.ogg': 'k1'}, 'abcdef0123456789'))
print(g.version('a.ogg', 'k1', {'a.ogg': 'k1.00000000'}, 'abcdef0123456789'))
print(g.version('b.ogg', 'k1', {}, 'abcdef0123456789'))`;
        const r = spawnSync('python3', ['-B', '-c', code], { encoding: 'utf8' });
        expect(r.status, r.stderr).toBe(0);
        expect(r.stdout.trim().split('\n')).toEqual(['k1.abcdef01', 'k2', 'k1.abcdef01', 'k1']);
    });
    it('a targeted approval shows the exact text and writes nothing without --oui', () => {
        const dir = copy();
        const relus = readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8');
        const r = run(dir, 'importer_validation.py', '--approuver', 'fr-huit', '--par', 'Test', '--note', 'essai');
        expect(r.status, r.stderr).toBe(0);
        expect(r.stdout).toContain("Un h au début, qu'on n'entend pas ; le t de la fin s'entend.");
        expect(r.stdout).toContain('RIEN écrit');
        const w = words(dir).get('fr-huit')! as unknown as { homophones: string[]; audio: { wordVersion: string; contextVersion: string | null } };
        expect(r.stdout).toContain(`phrase : ${(w as unknown as { contextSentence: string }).contextSentence}`);
        expect(r.stdout).toContain('fr-huit — « huit »');
        expect(r.stdout).toContain(`homophones : ${w.homophones.join(', ') || '-'}`);
        expect(r.stdout).toContain(`audio mot ${w.audio.wordVersion}, phrase ${w.audio.contextVersion}`);
        expect(readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8')).toBe(relus);
    });
    it('a targeted approval with --oui approves the text shown, named, with its note kept in provenance.validation', () => {
        const dir = copy();
        expect(words(dir).get('fr-huit')!.status).toBe('needs_review');
        expect(run(dir, 'importer_validation.py', '--approuver', 'fr-huit', '--par', 'Test', '--note', 'essai', '--oui').status).toBe(0);
        expect(run(dir, 'assembler_catalogue.py').status).toBe(0);
        const w = words(dir).get('fr-huit')!;
        expect(w.status).toBe('approved');
        expect(w.validatedBy).toBe('Test');
        expect(String(w.provenance.validation)).toMatch(/^essai ; écoute audio non faite mot à mot$/);
    });
    it('a targeted approval refuses a word whose recording still waits for an adult ear, and writes nothing (2026-11-20)', () => {
        // Codex review of 2026-11-20: --approuver set audioNonEcoute, which lifted the audio case with nobody listening.
        const dir = copy();
        expect(words(dir).get('fr-lit')!.audio.mode).toBe('audio_manual_review');
        const relus = readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8');
        const r = run(dir, 'importer_validation.py', '--approuver', 'fr-lit', '--par', 'Test', '--note', 'essai', '--oui');
        expect(r.status).not.toBe(0);
        expect(readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8')).toBe(relus);
        expect(run(dir, 'assembler_catalogue.py').status).toBe(0);
        expect(words(dir).get('fr-lit')!.audio.mode).toBe('audio_manual_review');
    });
    it('a targeted approval never lifts an audio case written after the last assembly (Codex review of 2026-11-20)', () => {
        // The catalogue still says word_only; a pending case was added since. Approving the word's text must leave it blocked.
        const dir = copy();
        const w = words(dir).get('fr-huit')!;
        expect(w.audio.mode).toBe('word_only');
        const cases = json(dir, 'audio-non-regression.json') as { cases: Record<string, unknown>[] };
        const versions = json(dir, 'audio-empreintes.json') as Record<string, string>;
        cases.cases.push({ id: 'fr-huit', lemma: 'huit', grade: w.id ? 'CP' : 'CP', kind: 'mot', asset: 'dictee/audio/fr-huit.ogg', text: 'Écris le mot : huit.', observed: 'Écris le mot nuit.',
            observedBy: 'test', audioVersion: versions['dictee/audio/fr-huit.ogg'], listening: { status: 'pending', by: null, date: null, note: null }, batch: 'test' });
        writeFileSync(join(dir, 'scripts/dictee/audio-non-regression.json'), JSON.stringify(cases));
        // Third Codex review: the refusal reads the cases themselves, not the last assembled catalogue; nothing is written.
        const relus = readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8');
        const r = run(dir, 'importer_validation.py', '--approuver', 'fr-huit', '--par', 'Test', '--note', 'essai', '--oui');
        expect(r.status).not.toBe(0);
        expect(r.stderr).toContain('fr-huit');
        expect(readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8')).toBe(relus);
        expect(run(dir, 'assembler_catalogue.py').status).toBe(0);
        const after = words(dir).get('fr-huit')!;
        expect(after.audio.mode).toBe('audio_manual_review');
        expect(after.status).not.toBe('approved');
    });
    it('« en-attente » approves the waiting words and leaves aside a word whose recording waits for an adult ear (Codex review of 2026-11-20)', () => {
        const dir = copy();
        // Words already flagged in the catalogue (audio_manual_review) are left aside too: only a clean recording is approved.
        const waiting = [...words(dir).values()].filter(w => w.status !== 'approved' && w.audio.mode !== 'audio_manual_review').map(w => w.id);
        const aside = waiting[0]!;
        const cases = json(dir, 'audio-non-regression.json') as { cases: Record<string, unknown>[] };
        const versions = json(dir, 'audio-empreintes.json') as Record<string, string>;
        cases.cases.push({ id: aside, lemma: aside.slice(3), grade: 'CP', kind: 'mot', asset: `dictee/audio/${aside}.ogg`, text: 'x', observed: 'y',
            observedBy: 'test', audioVersion: versions[`dictee/audio/${aside}.ogg`], listening: { status: 'pending', by: null, date: null, note: null }, batch: 'test' });
        writeFileSync(join(dir, 'scripts/dictee/audio-non-regression.json'), JSON.stringify(cases));
        const r = run(dir, 'importer_validation.py', '--approuver', 'en-attente', '--par', 'Test', '--note', 'essai', '--oui');
        expect(r.status, r.stderr).toBe(0);
        expect(r.stdout).not.toContain(` ${aside} — `);
        expect(run(dir, 'assembler_catalogue.py').status).toBe(0);
        const after = words(dir);
        expect(after.get(aside)!.status).not.toBe('approved');
        for (const id of waiting.slice(1)) expect(after.get(id)!.status, id).toBe('approved');
    });
    it('an adult listening « ok » to an older version of the recording blocks the targeted approval again (fifth Codex review)', () => {
        const dir = copy();
        const cases = json(dir, 'audio-non-regression.json') as { cases: Record<string, unknown>[] };
        cases.cases.push({ id: 'fr-huit', lemma: 'huit', grade: 'CP', kind: 'mot', asset: 'dictee/audio/fr-huit.ogg', text: 'x', observed: 'y', observedBy: 'test',
            audioVersion: 'ancienne', listening: { status: 'ok', by: 'Test', date: '2026-11-01', note: null, audioVersion: 'ancienne' }, batch: 'test' });
        writeFileSync(join(dir, 'scripts/dictee/audio-non-regression.json'), JSON.stringify(cases));
        const r = run(dir, 'importer_validation.py', '--approuver', 'fr-huit', '--par', 'Test', '--note', 'essai', '--oui');
        expect(r.status).not.toBe(0);
        expect(r.stderr).toContain('fr-huit');
    });
    it('« en-attente » is given alone: mixed with an id, nothing is shown nor written', () => {
        const dir = copy();
        const r = run(dir, 'importer_validation.py', '--approuver', 'en-attente', 'fr-huit', '--par', 'Test', '--note', 'essai', '--oui');
        expect(r.status).not.toBe(0);
        expect(r.stdout).toBe('');
    });
    it('--approuver-tout --par --note keeps the note in provenance.validation and approves without the audio cases blocking', () => {
        const dir = copy();
        expect(run(dir, 'importer_validation.py', '--approuver-tout', '--par', 'Test', '--note', 'bloc').status).toBe(0);
        expect(run(dir, 'assembler_catalogue.py').status).toBe(0);
        const all = [...words(dir).values()];
        expect(all.every(w => w.status === 'approved' && w.validatedBy === 'Test')).toBe(true);
        expect(all.every(w => String(w.provenance.validation).startsWith('bloc'))).toBe(true);
        const relus = json(dir, 'relectures.json') as Record<string, { audioNonEcoute?: boolean }>;
        expect(Object.values(relus).every(r => r.audioNonEcoute === true)).toBe(true);
    });
    it('the words waiting for an adult are exactly those whose text the spelling reviews of 2026-11-19 and 2026-11-20 corrected', () => {
        // Spec 1.1.0: approved by David on 2026-11-16, then the 45 words corrected on 19/11 and « plutôt » (20/11) wait again.
        const all = [...words('.').values()];
        const waiting = all.filter(w => w.status !== 'approved');
        expect(waiting).toHaveLength(46);
        for (const w of waiting) expect(String(w.provenance.correction), w.id).toMatch(/relecture Codex et Google, 19\/11|relecture Codex, 20\/11/);
        expect(waiting.filter(w => /relecture Codex, 20\/11/.test(String(w.provenance.correction))).map(w => w.id)).toEqual(['fr-plutot']);
        for (const w of all.filter(w => w.status === 'approved')) expect(w.validatedBy, w.id).toBe('David');
    });
    it('every context sentence holds its exact word and has 3 to 14 words', () => {
        for (const w of words('.').values()) {
            const raw = w as unknown as { expectedForm: string; contextSentence: string | null };
            if (!raw.contextSentence) continue;
            const n = raw.contextSentence.split(/\s+/).filter(Boolean).length;
            expect(n, w.id).toBeGreaterThanOrEqual(3); expect(n, w.id).toBeLessThanOrEqual(14);
            const form = raw.expectedForm.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            expect(raw.contextSentence.toLowerCase(), w.id).toMatch(new RegExp(`(?<![\\p{L}])${form}(?![\\p{L}])`, 'u'));
        }
    });
    it('the ambiguous words the spec names are heard in their sentence (context_required)', () => {
        const byLemma = new Map([...words('.').values()].map(w => [w.lemma, w]));
        for (const lemma of ['vert', 'verre', 'sept', 'un', 'rose', 'orange', 'marron', 'sol']) {
            const w = byLemma.get(lemma);
            expect(w, lemma).toBeDefined();
            expect(w!.audio.mode, lemma).toBe('context_required');
        }
    });
    it('every recording is an Ogg Opus mono file', () => {
        const all = [...words('.').values()].flatMap(w => { const r = w as unknown as { pronunciationAsset: string; contextAsset: string | null }; return [r.pronunciationAsset, ...(r.contextAsset ? [r.contextAsset] : [])]; });
        expect(all.length).toBe(1000);
        for (const f of all) {
            const b = readFileSync(join('public', f));
            expect(b.subarray(0, 4).toString('latin1'), f).toBe('OggS');
            expect(b.subarray(28, 36).toString('latin1'), f).toBe('OpusHead');
            expect(b[37], f).toBe(1);
        }
    });
    it('a word_then_context word says its sentence after the word, and its homophones are only nuances', () => {
        const all = [...words('.').values()].filter(w => w.audio.mode === 'word_then_context');
        expect(all.length).toBeGreaterThan(0);
        for (const w of all) {
            const raw = w as unknown as Word;
            expect(sentenceOnArrival(raw), w.id).toBe(true);
            expect(w.homophones.length, w.id).toBeGreaterThan(0);
            expect(w.homophones.every(h => h in raw.homophoneNotes), w.id).toBe(true);
        }
    });
    it('the sentence of « plutôt » leaves one answer: « plus tôt » cannot be read in it (Codex review of 2026-11-20)', () => {
        const w = words('.').get('fr-plutot')! as unknown as { contextSentence: string; contextAsset: string; audio: { contextVersion: string } };
        expect(w.contextSentence).toMatch(/plutôt que /);
        // Its recording is the one generated from this sentence (generer_audio.py records the text's fingerprint).
        const versions = JSON.parse(readFileSync('scripts/dictee/audio-empreintes.json', 'utf8')) as Record<string, string>;
        expect(w.audio.contextVersion).toBe(versions[w.contextAsset]);
        const recorded = JSON.parse(readFileSync('scripts/dictee/phrases.json', 'utf8')) as { lemma: string; contextSentence: string }[];
        expect(recorded.find(p => p.lemma === 'plutôt')!.contextSentence).toBe(w.contextSentence);
    });
    it('« sol » is heard in its sentence: « sole » sounds the same (2026-11-20)', () => {
        // Codex review of 2026-11-20: fr-sol was approved word_only, with no homophone, so a child could write « sole ».
        const w = words('.').get('fr-sol')!;
        expect(w.homophones).toContain('sole');
        expect(w.audio.mode).toBe('context_required');
        expect(w.contextSentence).toBeTruthy();
    });
});
