/** « La dictée magique »: a finite vertical feed of word cards for readers (6 years and up). A word is heard, the
 * child writes it on a big keyboard (or puts letters in order at the first grade), and the card answers at once: a
 * mascot's joy, or the card turns over and shows the word with the letters to look at and one line of explanation.
 * The spelling is checked by a deterministic aligner, never by a language model; missed words come back a few cards
 * later and at the next sessions (Leitner boxes). No clock, no lives, no streak. */
export * from './correcteur';
export * from './catalogue';
export * from './session';
import { grades, playable, type Catalogue, type Grade, type Word } from './catalogue';
import { shuffle } from '../rng';
import { freshProgress, parseProgress, type Progress } from './session';

/** A child profile is one of the five guides: no name, nothing personal. */
export const profiles = ['panda', 'licorne', 'singe', 'pandaroux', 'dragon'] as const;
export type Profile = typeof profiles[number];
/** What the child plays: one class, or every class mixed (approved words of all grades). */
export const MIXED = 'mix' as const;
export type Choice = Grade | typeof MIXED;
export const choices: readonly Choice[] = [...grades, MIXED];
/** Stored per profile and per choice: the mixed mode keeps its own spaced review, apart from the classes. */
export type Records = Partial<Record<Profile, Partial<Record<Choice, Progress>>>>;

export function parseRecords(text: string | null): Records {
    try {
        const data: unknown = JSON.parse(text ?? 'null');
        if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
        const out: Records = {};
        for (const [who, byGrade] of Object.entries(data as Record<string, unknown>)) {
            if (!profiles.includes(who as Profile) || !byGrade || typeof byGrade !== 'object' || Array.isArray(byGrade)) continue;
            const g: Partial<Record<Choice, Progress>> = {};
            for (const [grade, p] of Object.entries(byGrade as Record<string, unknown>)) if (choices.includes(grade as Choice)) g[grade as Choice] = parseProgress(p);
            out[who as Profile] = g;
        }
        return out;
    } catch { return {}; }
}
export const progressOf = (r: Records, who: Profile, grade: Choice): Progress => r[who]?.[grade] ?? freshProgress();
export const withProgress = (r: Records, who: Profile, grade: Choice, p: Progress): Records => ({ ...r, [who]: { ...r[who], [grade]: p } });
/** The words a choice offers: one class, or every class at once (each word keeps its own grade). Approved words only,
 * as for a class: `playable` keeps the lock. */
export const wordsOf = (c: Catalogue, choice: Choice, drafts = false): Word[] => choice === MIXED ? grades.flatMap(g => playable(c, g, drafts)) : playable(c, choice, drafts);
/** A word an adult reported while playing: what is wrong (the word, its sentence, its tip or its sound), an
 * optional note, the audio version heard and the day. Nothing about the child; kept on the device only. */
export const reportKinds = ['mot', 'phrase', 'astuce', 'audio'] as const;
export type ReportKind = typeof reportKinds[number];
export interface Report { id: string; form: string; grade: string; kind: ReportKind; note: string; audioVersion: string | null; at: string }
const MAX_NOTE = 200, MAX_REPORTS = 500;
export function parseReports(text: string | null): Report[] {
    try {
        const data: unknown = JSON.parse(text ?? '[]');
        if (!Array.isArray(data)) return [];
        const out: Report[] = [];
        for (const raw of data) {
            if (!raw || typeof raw !== 'object') continue;
            const r = raw as Record<string, unknown>;
            if (typeof r.id !== 'string' || typeof r.form !== 'string' || typeof r.grade !== 'string' || typeof r.at !== 'string' || !reportKinds.includes(r.kind as ReportKind)) continue;
            out.push({ id: r.id, form: r.form, grade: r.grade, kind: r.kind as ReportKind, note: typeof r.note === 'string' ? r.note.slice(0, MAX_NOTE) : '',
                audioVersion: typeof r.audioVersion === 'string' ? r.audioVersion : null, at: r.at });
        }
        return out.slice(-MAX_REPORTS);
    } catch { return []; }
}
/** Adds a report; the same word and kind reported again replaces the older one. */
export const addReport = (list: readonly Report[], r: Report): Report[] =>
    [...list.filter(x => x.id !== r.id || x.kind !== r.kind), { ...r, note: r.note.trim().slice(0, MAX_NOTE) }].slice(-MAX_REPORTS);
/** The list as text to export: one line per report, tab-separated. */
export const reportsText = (list: readonly Report[]): string => list.map(r => [r.at, r.id, r.form, r.grade, r.kind, r.audioVersion ?? '', r.note].join('\t')).join('\n');
/** Letter tiles for the first grade: the word's letters, shuffled so that the order is never already right
 * (when the word has two different letters at least). */
export function tiles(word: string, rng: () => number): string[] {
    const letters = Array.from(word);
    if (new Set(letters).size < 2) return letters;
    for (let k = 0; k < 20; k++) { const t = shuffle(letters, rng); if (t.join('') !== word) return t; }
    return [...letters.slice(1), letters[0]!];
}
