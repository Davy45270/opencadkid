import { afterEach, expect, it, vi } from 'vitest';
import { advance, generateRound, hit, levels, sequence, stars, start, type Level, type Session } from '../src/engines/tambours';
import { gameView, instruction, levelView } from '../src/games/tambours/view';
import { messages } from '../src/shell/i18n';
import { fresh } from '../src/shell/storage';
afterEach(() => vi.unstubAllGlobals());

// Literal copy of the eight levels shipped before the doubling: children's records are keyed by these ids.
const before = [
    { id: 1, mode: 'repeter', drums: 4, min: 2, max: 3 },
    { id: 2, mode: 'repeter', drums: 4, min: 2, max: 4 },
    { id: 3, mode: 'repeter', drums: 5, min: 3, max: 5 },
    { id: 4, mode: 'repeter', drums: 6, min: 3, max: 6 },
    { id: 5, mode: 'rythme', drums: 4, min: 3, max: 3 },
    { id: 6, mode: 'rythme', drums: 5, min: 4, max: 4 },
    { id: 7, mode: 'rythme', drums: 6, min: 6, max: 6 },
    { id: 8, mode: 'libre', drums: 6, min: 8, max: 8 }
];
const SEEDS = 200;
const timedMode = (mode: string): boolean => mode === 'rythme' || mode === 'melodie';
/**
 * Difficulty indicator: what a question checks at its longest. Repetition checks each drum (max); a rhythm checks
 * its one drum and every spacing (1 + max − 1); a melody checks every drum and every spacing (2 × max − 1);
 * a revision round is as hard as its hardest question (it always holds a melody).
 */
const checks = (l: Level): number => l.mode === 'repeter' || l.mode === 'rythme' ? l.max : l.mode === 'libre' ? 0 : 2 * l.max - 1;

/** Plays the expected drums at exactly the demonstrated spacing (any spacing would do for a repetition). */
function solve(s: Session): Session {
    let t = 100;
    while (!s.solved) {
        if (s.cursor) t += s.tempo * s.questions[s.index]!.intervals[s.cursor - 1]!;
        const r = hit(s, sequence(s)[s.cursor]!, t); expect(r.correct).toBe(true); s = r.state;
    }
    return s;
}

it('doubled: sixteen levels, contiguous ids, the first eight unchanged', () => {
    expect(levels).toHaveLength(16);
    expect(levels.map(l => l.id)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(levels.slice(0, 8)).toEqual(before);
    expect(() => generateRound(17, 0)).toThrow(RangeError);
});

it('unique: no two levels share a configuration, and the questions they generate tell every level apart', () => {
    const configs = levels.map(l => JSON.stringify([l.mode, l.drums, l.min, l.max]));
    expect(new Set(configs).size).toBe(levels.length);
    // Fingerprint over 50 seeds: every question as first played (mode, drums at the starting length, spacing when
    // it is checked), the starting and longest lengths and the drums on offer.
    const prints = levels.map(l => {
        const questions = new Set<string>();
        for (let seed = 0; seed < 50; seed++) for (const q of generateRound(l.id, seed)) {
            questions.add(`${q.mode}:${q.sequence.slice(0, l.min).join('')}:${timedMode(q.mode) ? q.intervals.join('') : ''}`);
        }
        return JSON.stringify([l.min, l.max, l.drums, [...questions].sort()]);
    });
    for (let a = 0; a < prints.length; a++) for (let b = a + 1; b < prints.length; b++) expect(prints[a], `levels ${a + 1} and ${b + 1}`).not.toBe(prints[b]);
});

for (const l of levels.slice(8)) it(`level ${l.id} (${l.mode}): ${SEEDS} seeds give five distinct playable questions, played to three stars`, () => {
    for (let seed = 0; seed < SEEDS; seed++) {
        const round = generateRound(l.id, seed);
        expect(round).toEqual(generateRound(l.id, seed)); expect(round).toHaveLength(5);
        // Deterministic prefixes whatever the count, revision rounds included.
        expect(generateRound(l.id, seed, 3)).toEqual(round.slice(0, 3));
        const seen = new Set<string>();
        for (const q of round) {
            expect(q.sequence).toHaveLength(l.max); expect(q.intervals).toHaveLength(l.max - 1);
            expect(q.sequence.every(d => Number.isInteger(d) && d >= 0 && d < l.drums)).toBe(true);
            expect(q.intervals.every(n => n === 1 || n === 2)).toBe(true);
            if (l.mode !== 'mixte') expect(q.mode).toBe(l.mode);
            if (q.mode === 'rythme') expect(new Set(q.sequence).size).toBe(1);
            else {
                for (let i = 2; i < q.sequence.length; i++) expect(q.sequence[i] === q.sequence[i - 1] && q.sequence[i] === q.sequence[i - 2]).toBe(false);
                if (q.mode === 'melodie') expect(new Set(q.sequence).size).toBeGreaterThan(1);
            }
            seen.add(JSON.stringify([q.mode, q.mode === 'repeter' ? q.sequence.slice(0, l.min) : q.sequence, timedMode(q.mode) ? q.intervals : []]));
        }
        expect(seen.size).toBe(5);
        if (l.mode === 'mixte') expect(round.map(q => q.mode).sort()).toEqual(['melodie', 'melodie', 'repeter', 'rythme', 'rythme']);
        let s = start(l.id, seed);
        for (let i = 0; i < 5; i++) s = advance(solve(s));
        expect(s.finished).toBe(true); expect(stars(s)).toBe(3);
    }
});

it('a melody checks both the drums and the spacing; a revision round checks each question by its own mode', () => {
    for (const id of [10, 13, 15, 14, 16]) for (let seed = 0; seed < 50; seed++) {
        let s = start(id, seed);
        for (let i = 0; i < 5; i++) {
            const q = s.questions[s.index]!;
            const first = hit(s, sequence(s)[0]!, 1000).state, gap = first.tempo * q.intervals[0]!;
            // Right drum, 50 % late: refused when the spacing counts, accepted in a repetition.
            expect(hit(first, sequence(first)[1]!, 1000 + gap * 1.5).correct).toBe(!timedMode(q.mode));
            // Right spacing, wrong drum: refused in every mode.
            expect(hit(first, (sequence(first)[1]! + 1) % levels[id - 1]!.drums, 1000 + gap).correct).toBe(false);
            s = advance(solve(s));
        }
    }
});

it('progression: from level 9 on, what a question checks never decreases (and level 9 asks more than the old repetitions)', () => {
    expect(checks(levels[8]!)).toBeGreaterThan(Math.max(...levels.slice(0, 8).filter(l => l.mode === 'repeter').map(l => l.max)));
    for (let id = 10; id <= 16; id++) expect(checks(levels[id - 1]!), `level ${id}`).toBeGreaterThanOrEqual(checks(levels[id - 2]!));
    expect(checks(levels[15]!)).toBeGreaterThan(checks(levels[8]!));
});

it('view: the melody instruction in both languages, the current question mode on the zone, sixteen level buttons', () => {
    for (const locale of ['fr', 'en'] as const) {
        expect(messages[locale].drumsMelody.trim()).not.toBe('');
        for (const l of levels) for (const seed of [0, 1]) {
            const s = start(l.id, seed), q = s.questions[0]!;
            expect(instruction(s, locale)).toBe(messages[locale][l.mode === 'libre' ? 'drumsFree' : q.mode === 'melodie' ? 'drumsMelody' : 'drumsTurn']);
            const html = gameView(s, locale);
            expect(html).toContain(`data-mode="${q.mode}"`); expect(html).not.toMatch(/NaN|undefined|Infinity/);
            expect(html.match(/data-drum="/g)).toHaveLength(l.drums);
        }
    }
    expect(levelView(fresh()).match(/data-level="/g)).toHaveLength(16);
});
