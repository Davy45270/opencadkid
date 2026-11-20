import { afterAll, describe, it, expect } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
    it('generer_audio.py versions every recording it makes by its recipe AND its bytes: a recipe made again, even after another, never takes an older approval (sixth Codex review)', () => {
        const code = `import sys; sys.path.insert(0, 'scripts/dictee'); import generer_audio as g
print(g.version('k1', 'abcdef0123456789'))
print(g.version('k1', '0123456789abcdef'))`;
        const r = spawnSync('python3', ['-B', '-c', code], { encoding: 'utf8' });
        expect(r.status, r.stderr).toBe(0);
        expect(r.stdout.trim().split('\n')).toEqual(['k1.abcdef01', 'k1.01234567']);
    });
    it('a sentence corrected without recording it again is never approved with the old recording (sixth Codex review)', () => {
        const dir = copy();
        const w = words(dir).get('fr-huit')!;
        const phrases = json(dir, 'phrases.json') as { lemma: string; contextSentence: string }[];
        phrases.find(p => p.lemma === w.lemma)!.contextSentence = 'Il est huit heures et demie.';
        writeFileSync(join(dir, 'scripts/dictee/phrases.json'), JSON.stringify(phrases));
        expect(run(dir, 'assembler_catalogue.py').status).toBe(0);
        expect(words(dir).get('fr-huit')!.audio.mode).toBe('audio_manual_review');
        const relus = readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8');
        const r = run(dir, 'importer_validation.py', '--approuver', 'fr-huit', '--par', 'Test', '--note', 'essai', '--oui');
        expect(r.status).not.toBe(0);
        expect(readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8')).toBe(relus);
        expect(run(dir, 'assembler_catalogue.py').status).toBe(0);
        expect(words(dir).get('fr-huit')!.status).not.toBe('approved');
    });
    it('a word whose recordings were never made (a replacement after « Retirer ») does not stop the assembly: it waits in listening (seventh Codex review)', () => {
        const dir = copy();
        rmSync(join(dir, 'public/dictee/audio'));
        cpSync('public/dictee/audio', join(dir, 'public/dictee/audio'), { recursive: true });
        for (const f of ['fr-huit.ogg', 'fr-huit-phrase.ogg']) rmSync(join(dir, 'public/dictee/audio', f));
        for (const m of ['audio-octets.json', 'audio-empreintes.json']) {
            const o = json(dir, m) as Record<string, string>;
            delete o['dictee/audio/fr-huit.ogg']; delete o['dictee/audio/fr-huit-phrase.ogg'];
            writeFileSync(join(dir, 'scripts/dictee', m), JSON.stringify(o));
        }
        const r = run(dir, 'assembler_catalogue.py');
        expect(r.status, r.stderr).toBe(0);
        const w = words(dir).get('fr-huit')!;
        expect(w.audio.mode).toBe('audio_manual_review');
        expect(w.status).not.toBe('approved');
    });
    it('a version that does not name its bytes stops the assembly: other bytes never pass under an approved version (seventh Codex review)', () => {
        for (const [version, hint] of [[null, 'plain key of 2026-11-16, bytes of another file'], ['.deadbeef', 'recipe.bytes that are not these bytes']] as const) {
            const dir = copy();
            rmSync(join(dir, 'public/dictee/audio'));
            cpSync('public/dictee/audio', join(dir, 'public/dictee/audio'), { recursive: true });
            const other = readFileSync('public/dictee/audio/fr-nuit.ogg');
            writeFileSync(join(dir, 'public/dictee/audio/fr-huit.ogg'), other);
            const ecrits = json(dir, 'audio-octets.json') as Record<string, string>;
            ecrits['dictee/audio/fr-huit.ogg'] = ecrits['dictee/audio/fr-nuit.ogg']!;  // the manifest follows the bytes
            writeFileSync(join(dir, 'scripts/dictee/audio-octets.json'), JSON.stringify(ecrits));
            if (version) {
                const v = json(dir, 'audio-empreintes.json') as Record<string, string>;
                v['dictee/audio/fr-huit.ogg'] = v['dictee/audio/fr-huit.ogg']!.split('.')[0]! + version;
                writeFileSync(join(dir, 'scripts/dictee/audio-empreintes.json'), JSON.stringify(v));
            }
            const r = run(dir, 'assembler_catalogue.py');
            expect(r.status, hint).not.toBe(0);
            expect(r.stderr, hint).toContain('fr-huit.ogg');
        }
    });
    it('a review decision applies only to the text and recordings the adult saw: changed since, or exported without them, it is ignored (seventh Codex review)', () => {
        const dir = copy();
        const w = words(dir).get('fr-huit')! as unknown as { lemma: string; expectedForm: string; contextSentence: string; explanation: string; audio: Record<string, string | null> };
        const seen = { expectedForm: w.expectedForm, contextSentence: w.contextSentence, explanation: w.explanation, wordVersion: w.audio.wordVersion, contextVersion: w.audio.contextVersion, wordSha256: w.audio.wordSha256, contextSha256: w.audio.contextSha256 };
        const lot = (s: unknown) => JSON.stringify({ format: 'dictee-relecture', version: 1, reviewer: 'Test', decisions: { 'fr-huit': { action: 'valider', lemma: w.lemma, at: '2026-11-20T10:00:00Z', ...(s ? { seen: s } : {}) } } });
        const relus = readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8');
        for (const s of [null, { ...seen, contextVersion: 'autre' }, { ...seen, contextSentence: 'Une autre phrase.' }]) {
            writeFileSync(join(dir, 'lot.json'), lot(s));
            const r = run(dir, 'importer_validation.py', 'lot.json');
            expect(r.status, r.stderr).toBe(0);
            expect(r.stdout).toContain('ignoré : fr-huit');
            expect(readFileSync(join(dir, 'scripts/dictee/relectures.json'), 'utf8')).toBe(relus);
        }
        writeFileSync(join(dir, 'lot.json'), lot(seen));
        expect(run(dir, 'importer_validation.py', 'lot.json').stdout).toContain('1 validés');
        expect((json(dir, 'relectures.json') as Record<string, { by: string }>)[w.lemma]!.by).toBe('Test');
    });
    it('« Valider » lifts a required listening only if the page played the word and its sentence to the end (fourteenth Codex review)', () => {
        const w = words(process.cwd()).get('fr-air')! as unknown as { lemma: string; expectedForm: string; contextSentence: string; explanation: string; audio: Record<string, string | null> };
        const seen = { expectedForm: w.expectedForm, contextSentence: w.contextSentence, explanation: w.explanation, wordVersion: w.audio.wordVersion, contextVersion: w.audio.contextVersion, wordSha256: w.audio.wordSha256, contextSha256: w.audio.contextSha256 };
        const statut = (dir: string): string[] => (json(dir, 'audio-non-regression.json') as { cases: { id: string; listening: { status: string } }[] }).cases.filter(c => c.id === 'fr-air').map(c => c.listening.status);
        for (const heard of [false, true]) {
            const dir = copy();
            writeFileSync(join(dir, 'lot.json'), JSON.stringify({ format: 'dictee-relecture', version: 1, reviewer: 'Test', decisions: { 'fr-air': { action: 'valider', lemma: w.lemma, at: '2026-11-20T10:00:00Z', seen, heard } } }));
            const r = run(dir, 'importer_validation.py', 'lot.json');
            expect(r.status, r.stderr).toBe(0);
            expect(statut(dir).every(x => x === (heard ? 'ok' : 'pending'))).toBe(true);
            if (!heard) expect(r.stdout).toContain('écoute non faite : fr-air');
        }
    });
    it('--approuver-tout stops too while a corrected form waits for the reassembly (fifteenth Codex review)', () => {
        const dir = copy();
        const f = join(dir, 'scripts/dictee/relectures.json');
        const r = JSON.parse(readFileSync(f, 'utf8')) as Record<string, { expectedForm: string }>;
        r.huit!.expectedForm = 'huitt';
        writeFileSync(f, JSON.stringify(r));
        const before = readFileSync(f, 'utf8');
        const t = run(dir, 'importer_validation.py', '--approuver-tout', '--par', 'Test', '--note', 'essai');
        expect(t.status).not.toBe(0);
        expect(t.stderr).toContain('catalogue en retard');
        expect(readFileSync(f, 'utf8')).toBe(before);
    });
    it('the assembly never runs while the generator holds the audio lock, and stops before writing (fifteenth Codex review)', () => {
        const dir = copy();
        const catalogue = readFileSync(join(dir, 'public/dictee/catalogue.json'), 'utf8');
        // generer_audio.py running: it holds the lock; the assembler started meanwhile stops.
        const r = spawnSync('python3', ['-B', '-c', `
import subprocess, sys; sys.path.insert(0, 'scripts/dictee')
import generer_audio as G
v = G.prendre_verrou('generer_audio.py')
r = subprocess.run([sys.executable, '-B', 'scripts/dictee/assembler_catalogue.py'], capture_output=True, text=True)
print(r.returncode); print(r.stderr)
`], { cwd: dir, encoding: 'utf8' });
        expect(r.stdout.split('\n')[0]).not.toBe('0');
        expect(r.stdout).toContain('l\'autre script audio tourne');
        expect(readFileSync(join(dir, 'public/dictee/catalogue.json'), 'utf8')).toBe(catalogue);
        // And the other way round: the generator refuses to start while an assembly holds it.
        const g = spawnSync('python3', ['-B', '-c', `
import sys; sys.path.insert(0, 'scripts/dictee')
import generer_audio as G
v = G.prendre_verrou('assembler_catalogue.py')
try:
    G.prendre_verrou('generer_audio.py'); print('pris')
except SystemExit as e:
    print(e)
`], { cwd: dir, encoding: 'utf8' });
        expect(g.stdout).toContain('l\'autre script audio tourne');
    });
    it('a recording already made that disappears stops the assembly: its word never stays approved without bytes (fifteenth Codex review)', () => {
        const dir = copy();
        rmSync(join(dir, 'public/dictee/audio'));
        cpSync('public/dictee/audio', join(dir, 'public/dictee/audio'), { recursive: true });
        rmSync(join(dir, 'public/dictee/audio/fr-huit.ogg'));
        const o = json(dir, 'audio-octets.json') as Record<string, string>;
        delete o['dictee/audio/fr-huit.ogg'];
        writeFileSync(join(dir, 'scripts/dictee/audio-octets.json'), JSON.stringify(o));
        const r = run(dir, 'assembler_catalogue.py');
        expect(r.status).not.toBe(0);
        expect(r.stderr).toContain('fr-huit.ogg');
    });
    it('a stale « Retirer » never removes a word that changed since (eighth Codex review)', () => {
        const dir = copy();
        const w = words(dir).get('fr-huit')! as unknown as { lemma: string; expectedForm: string; contextSentence: string; explanation: string; audio: Record<string, string | null> };
        const seen = { expectedForm: w.expectedForm, contextSentence: 'Une ancienne phrase.', explanation: w.explanation, wordVersion: w.audio.wordVersion, contextVersion: w.audio.contextVersion, wordSha256: w.audio.wordSha256, contextSha256: w.audio.contextSha256 };
        writeFileSync(join(dir, 'lot.json'), JSON.stringify({ format: 'dictee-relecture', version: 1, reviewer: 'Test', decisions: { 'fr-huit': { action: 'retirer', lemma: w.lemma, at: '2026-11-20T10:00:00Z', seen } } }));
        const r = run(dir, 'importer_validation.py', 'lot.json');
        expect(r.stdout).toContain('ignoré : fr-huit');
        expect(JSON.parse(readFileSync(join(dir, 'scripts/dictee/mots-retires.json'), 'utf8'))).not.toContain(w.lemma);
    });
    it('the review server serves a recording only under the digest the page names: other bytes answer 409 (eighth Codex review)', async () => {
        const dir = copy();
        const out = join(dir, 'sortie');
        const port = 18000 + Math.floor(Math.random() * 2000);
        const server = spawn('python3', ['-B', 'scripts/dictee/servir_validation.py', '--ecoute', `127.0.0.1:${port}`, '--sortie', out], { cwd: dir, stdio: 'ignore' });
        try {
            const get = async (q: string): Promise<number> => {
                for (let i = 0; i < 50; i++) {
                    try { return (await fetch(`http://127.0.0.1:${port}/dictee/audio/fr-huit.ogg${q}`)).status; } catch { await new Promise(r => setTimeout(r, 100)); }
                }
                return 0;
            };
            const sha = createHash('sha256').update(readFileSync('public/dictee/audio/fr-huit.ogg')).digest('hex');
            expect(await get(`?sha=${sha}`)).toBe(200);
            expect(await get('?sha=' + '0'.repeat(64))).toBe(409);
            expect(await get('')).toBe(409);
        } finally { server.kill(); }
    });
    it('the review server listens only on a private address: a public one is refused', () => {
        const dir = copy();
        // 0.0.0.0 listens on every interface, public ones included: refused too (eleventh Codex review).
        for (const hote of ['8.8.8.8', '0.0.0.0', '::', '224.0.0.1']) {
            const r = run(dir, 'servir_validation.py', '--ecoute', `${hote}:18080`, '--sortie', join(dir, 'sortie'));
            expect(r.status, hote).not.toBe(0);
            expect(r.stderr).toContain('refus');
        }
    });
    it('a decision or an approval against a catalogue behind phrases.json stops: reassemble first (ninth Codex review)', () => {
        const dir = copy();
        const f = join(dir, 'scripts/dictee/phrases.json');
        const ph = JSON.parse(readFileSync(f, 'utf8')) as { id: string; contextSentence: string }[];
        ph.find(r => r.id === 'fr-huit')!.contextSentence = 'Une phrase corrigée, pas encore assemblée.';
        writeFileSync(f, JSON.stringify(ph));
        const w = words(dir).get('fr-huit')! as unknown as { lemma: string };
        writeFileSync(join(dir, 'lot.json'), JSON.stringify({ format: 'dictee-relecture', version: 1, reviewer: 'Test', decisions: { 'fr-huit': { action: 'retirer', lemma: w.lemma, at: '2026-11-20T10:00:00Z', seen: {} } } }));
        const r = run(dir, 'importer_validation.py', 'lot.json');
        expect(r.status).not.toBe(0);
        expect(r.stderr).toContain('catalogue en retard');
        const a = run(dir, 'importer_validation.py', '--approuver', 'fr-huit', '--par', 'Test', '--note', 'écoute', '--oui');
        expect(a.status).not.toBe(0);
        expect(a.stderr).toContain('catalogue en retard');
    });
    it('a word gone from phrases.json, or bytes regenerated since the catalogue, stop the import too (tenth Codex review)', () => {
        for (const change of ['retiree', 'octets'] as const) {
            const dir = copy();
            if (change === 'retiree') {
                const f = join(dir, 'scripts/dictee/phrases.json');
                writeFileSync(f, JSON.stringify((JSON.parse(readFileSync(f, 'utf8')) as { id: string }[]).filter(r => r.id !== 'fr-huit')));
            } else {
                // The catalogue still names the old bytes while the file on disk is another one.
                const f = join(dir, 'public/dictee/catalogue.json');
                const c = JSON.parse(readFileSync(f, 'utf8')) as { words: { id: string; audio: { wordSha256: string } }[] };
                c.words.find(w => w.id === 'fr-huit')!.audio.wordSha256 = '0'.repeat(64);
                writeFileSync(f, JSON.stringify(c));
            }
            writeFileSync(join(dir, 'lot.json'), JSON.stringify({ format: 'dictee-relecture', version: 1, reviewer: 'Test', decisions: { 'fr-huit': { action: 'retirer', lemma: 'huit', at: '2026-11-20T10:00:00Z', seen: {} } } }));
            const r = run(dir, 'importer_validation.py', 'lot.json');
            expect(r.status, change).not.toBe(0);
            expect(r.stderr).toContain('catalogue en retard');
            expect(r.stderr).toContain('fr-huit');
        }
    });
    it('a private IPv6 address it accepts, it really listens on (twelfth Codex review)', async () => {
        const dir = copy();
        const port = 18000 + Math.floor(Math.random() * 2000);
        const server = spawn('python3', ['-B', 'scripts/dictee/servir_validation.py', '--ecoute', `::1:${port}`, '--sortie', join(dir, 'sortie')], { cwd: dir, stdio: 'ignore' });
        try {
            let status = 0;
            for (let i = 0; i < 50 && !status; i++) {
                try { status = (await fetch(`http://[::1]:${port}/`)).status; } catch { await new Promise(r => setTimeout(r, 100)); }
            }
            expect(status).toBe(200);
        } finally { server.kill(); }
    });
    it('the tips that count letters count them right: appeler and rappeler take one l at the infinitive (eleventh Codex review)', () => {
        const ws = [...words(process.cwd()).values()] as unknown as { lemma: string; expectedForm: string; explanation: string | null }[];
        for (const lemma of ['appeler', 'rappeler']) {
            const w = ws.find(x => x.lemma === lemma)!;
            expect(w.explanation).toContain('un seul l');
            expect(w.expectedForm.split('l').length - 1).toBe(1);
            expect(w.expectedForm).toContain('pp');
        }
    });
    it('a form already corrected, or a word already removed, without reassembling, stops an older batch (thirteenth Codex review)', () => {
        for (const change of ['forme', 'retire'] as const) {
            const dir = copy();
            if (change === 'forme') {
                const f = join(dir, 'scripts/dictee/relectures.json');
                const r = JSON.parse(readFileSync(f, 'utf8')) as Record<string, { expectedForm: string }>;
                r.huit!.expectedForm = 'huitt';
                writeFileSync(f, JSON.stringify(r));
            } else writeFileSync(join(dir, 'scripts/dictee/mots-retires.json'), JSON.stringify(['huit']));
            writeFileSync(join(dir, 'lot.json'), JSON.stringify({ format: 'dictee-relecture', version: 1, reviewer: 'Test', decisions: { 'fr-huit': { action: 'valider', lemma: 'huit', at: '2026-11-20T10:00:00Z', seen: {} } } }));
            const r = run(dir, 'importer_validation.py', 'lot.json');
            expect(r.status, change).not.toBe(0);
            expect(r.stderr).toContain('catalogue en retard');
        }
    });
    it('the review server keeps every choice it confirmed: two phones, two words, both kept (ninth Codex review)', async () => {
        const dir = copy();
        const out = join(dir, 'sortie');
        const port = 18000 + Math.floor(Math.random() * 2000);
        const server = spawn('python3', ['-B', 'scripts/dictee/servir_validation.py', '--ecoute', `127.0.0.1:${port}`, '--sortie', out], { cwd: dir, stdio: 'ignore' });
        const post = async (decisions: object): Promise<number> => {
            const body = JSON.stringify({ format: 'dictee-relecture', version: 1, reviewer: 'Test', decisions });
            for (let i = 0; i < 50; i++) {
                try { return (await fetch(`http://127.0.0.1:${port}/decisions`, { method: 'POST', body })).status; } catch { await new Promise(r => setTimeout(r, 100)); }
            }
            return 0;
        };
        try {
            expect(await post({ 'fr-huit': { action: 'valider', lemma: 'huit', at: '2026-11-20T10:00:00Z' } })).toBe(200);
            expect(await post({ 'fr-air': { action: 'retirer', lemma: 'air', at: '2026-11-20T10:00:01Z' } })).toBe(200);
            // The last choice received wins, whatever the phones' clocks say (eleventh Codex review): an undo sent after a
            // validation stamped two minutes ahead still wins.
            expect(await post({ 'fr-huit': { action: 'valider', lemma: 'huit', at: '2026-11-20T10:02:00Z' } })).toBe(200);
            expect(await post({ 'fr-huit': { action: null, lemma: 'huit', at: '2026-11-20T10:01:00Z' } })).toBe(200);
            const kept = JSON.parse(readFileSync(join(out, 'dictee-relecture.json'), 'utf8')) as { decisions: Record<string, { action: string | null }> };
            expect(kept.decisions['fr-air']!.action).toBe('retirer');
            expect(kept.decisions['fr-huit']!.action).toBeNull();
        } finally { server.kill(); }
    });
    it('the review page records what the adult saw with each decision', () => {
        const page = readFileSync('scripts/dictee/validation/index.html', 'utf8');
        expect(page).toMatch(/const d = \{ action, lemma: m\.lemma, at: new Date\(\)\.toISOString\(\), seen: vu\(m\), heard: entendu\(m\) \};/);
        for (const k of ['expectedForm', 'contextSentence', 'explanation', 'wordVersion', 'contextVersion', 'wordSha256', 'contextSha256']) expect(page).toContain(`${k}: `);
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
