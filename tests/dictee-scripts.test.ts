import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The offline scripts of the dictation run on a copy of their inputs (scripts/dictee and the shipped catalogue):
 * the repository is never written. */
interface W { id: string; lemma: string; status: string; validatedBy: string | null; homophones: string[]; contextSentence: string | null; audio: { mode: string }; provenance: Record<string, unknown> }
function copy(): string {
    const dir = mkdtempSync(join(tmpdir(), 'dictee-'));
    cpSync('scripts/dictee', join(dir, 'scripts/dictee'), { recursive: true });
    mkdirSync(join(dir, 'public/dictee'), { recursive: true });
    cpSync('public/dictee/catalogue.json', join(dir, 'public/dictee/catalogue.json'));
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
    it('a targeted approval shows the exact text and writes nothing without --oui', () => {
        const dir = copy();
        const relus = readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8');
        const r = run(dir, 'importer_validation.py', '--approuver', 'fr-huit', '--par', 'Test', '--note', 'essai');
        expect(r.status, r.stderr).toBe(0);
        expect(r.stdout).toContain("Un h au début, qu'on n'entend pas ; le t de la fin s'entend.");
        expect(r.stdout).toContain('RIEN écrit');
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
    it('the words waiting for an adult are exactly those whose text the spelling review of 2026-11-19 corrected', () => {
        // Spec 1.1.0: approved by David on 2026-11-16, then the 45 corrected words wait for an adult again.
        const all = [...words('.').values()];
        const waiting = all.filter(w => w.status !== 'approved');
        expect(waiting).toHaveLength(45);
        for (const w of waiting) expect(String(w.provenance.correction), w.id).toMatch(/relecture Codex et Google, 19\/11/);
        for (const w of all.filter(w => w.status === 'approved')) expect(w.validatedBy, w.id).toBe('David');
    });
    it('« sol » is heard in its sentence: « sole » sounds the same (2026-11-20)', () => {
        // Codex review of 2026-11-20: fr-sol was approved word_only, with no homophone, so a child could write « sole ».
        const w = words('.').get('fr-sol')!;
        expect(w.homophones).toContain('sole');
        expect(w.audio.mode).toBe('context_required');
        expect(w.contextSentence).toBeTruthy();
    });
});
