/** « La dictée magique »: a finite vertical feed of word cards for readers (6 years and up). A word is heard, the
 * child writes it on a big keyboard (or puts letters in order at the first grade), and the card answers at once: a
 * mascot's joy, or the card turns over and shows the word with the letters to look at and one line of explanation.
 * The spelling is checked by a deterministic aligner, never by a language model; missed words come back a few cards
 * later and at the next sessions (Leitner boxes). No clock, no lives, no streak. */
export * from './correcteur';
export * from './catalogue';
export * from './session';
import { grades, type Grade } from './catalogue';
import { shuffle } from '../rng';
import { freshProgress, parseProgress, type Progress } from './session';

/** A child profile is one of the five guides: no name, nothing personal. */
export const profiles = ['panda', 'licorne', 'singe', 'pandaroux', 'dragon'] as const;
export type Profile = typeof profiles[number];
/** Stored per profile and per grade. */
export type Records = Partial<Record<Profile, Partial<Record<Grade, Progress>>>>;

export function parseRecords(text: string | null): Records {
    try {
        const data: unknown = JSON.parse(text ?? 'null');
        if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
        const out: Records = {};
        for (const [who, byGrade] of Object.entries(data as Record<string, unknown>)) {
            if (!profiles.includes(who as Profile) || !byGrade || typeof byGrade !== 'object' || Array.isArray(byGrade)) continue;
            const g: Partial<Record<Grade, Progress>> = {};
            for (const [grade, p] of Object.entries(byGrade as Record<string, unknown>)) if (grades.includes(grade as Grade)) g[grade as Grade] = parseProgress(p);
            out[who as Profile] = g;
        }
        return out;
    } catch { return {}; }
}
export const progressOf = (r: Records, who: Profile, grade: Grade): Progress => r[who]?.[grade] ?? freshProgress();
export const withProgress = (r: Records, who: Profile, grade: Grade, p: Progress): Records => ({ ...r, [who]: { ...r[who], [grade]: p } });
/** Letter tiles for the first grade: the word's letters, shuffled so that the order is never already right
 * (when the word has two different letters at least). */
export function tiles(word: string, rng: () => number): string[] {
    const letters = Array.from(word);
    if (new Set(letters).size < 2) return letters;
    for (let k = 0; k < 20; k++) { const t = shuffle(letters, rng); if (t.join('') !== word) return t; }
    return [...letters.slice(1), letters[0]!];
}
