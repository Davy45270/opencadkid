import { afterEach, expect, it, vi } from 'vitest';
import { advance, BASE_TEMPO, complete, generateRound, hit, isUnlocked, levels, MAX_TEMPO, notes, sequence, stars, start, type Session } from '../src/engines/tambours';
import { drumName, drumSvg, gameView, instruction, levelView, shapes } from '../src/games/tambours/view';
import { messages } from '../src/shell/i18n';
import { fresh, readSave, writeSave } from '../src/shell/storage';
import { drumNote, unlockSound } from '../src/shell/sound';
import { bindBeat, activationEvents } from '../src/shell/activation';
import { validSvg } from './svg-oracles';
afterEach(() => vi.unstubAllGlobals());
const table = [
    ['repeter', 4, 2, 3], ['repeter', 4, 2, 4], ['repeter', 5, 3, 5], ['repeter', 6, 3, 6],
    ['rythme', 4, 3, 3], ['rythme', 5, 4, 4], ['rythme', 6, 6, 6], ['libre', 6, 8, 8]
];
it('eight independently specified levels and invalid inputs', () => {
    expect(levels.slice(0, 8).map(l => [l.mode, l.drums, l.min, l.max])).toEqual(table);
    for (const l of [0, 17, 1.5, NaN]) expect(() => generateRound(l, 0)).toThrow();
    for (const n of [0, -1, 1.5, NaN, 17]) expect(() => generateRound(1, 0, n)).toThrow();
    expect(generateRound(1, 0, 2)).toHaveLength(2);
});
for (let level = 1; level <= 8; level++) it(`level ${level}: deterministic distinct sequences over 300 seeds`, () => {
    const [mode, drums, min, max] = table[level - 1]!;
    for (let seed = 0; seed < 300; seed++) {
        const round = generateRound(level, seed);
        expect(round).toEqual(generateRound(level, seed)); expect(round).toHaveLength(5);
        const signatures: string[] = [], prefixes: string[] = [];
        for (const q of round) {
            expect(q.mode).toBe(mode); expect(q.sequence).toHaveLength(Number(max));
            expect(q.sequence.every(d => Number.isInteger(d) && d >= 0 && d < Number(drums))).toBe(true);
            expect(q.intervals).toHaveLength(Number(max) - 1); expect(q.intervals.every(n => n === 1 || n === 2)).toBe(true);
            if (mode === 'rythme') { expect(new Set(q.sequence).size).toBe(1); signatures.push(JSON.stringify([q.sequence[0], q.intervals])); }
            else {
                for (let i = 2; i < q.sequence.length; i++) expect(q.sequence[i] === q.sequence[i - 1] && q.sequence[i] === q.sequence[i - 2]).toBe(false);
                signatures.push(q.sequence.join(','));
                prefixes.push(q.sequence.slice(0, Number(min)).join(','));
            }
        }
        expect(new Set(signatures).size).toBe(5);
        if (mode !== 'rythme') expect(new Set(prefixes).size).toBe(5);
    }
});
function solve(s: Session): Session {
    let t = 100;
    while (!s.solved) {
        if (s.cursor) t += s.tempo * s.questions[s.index]!.intervals[s.cursor - 1]!;
        s = hit(s, levels[s.level - 1]!.mode === 'libre' ? s.cursor % 6 : sequence(s)[s.cursor]!, t).state;
    }
    return s;
}
it('pure hits, invalid input, slow bounded replay, two-error hint and adaptation', () => {
    const initial = start(2, 3), copy = structuredClone(initial);
    const wrong = (sequence(initial)[0]! + 1) % 4;
    const once = hit(initial, wrong, 0), twice = hit(once.state, wrong, 0);
    expect(initial).toEqual(copy); expect(once).toMatchObject({ correct: false, replay: true });
    expect(once.state).toMatchObject({ errors: 1, cursor: 0, hint: false, tempo: 650 * 1.3 });
    expect(twice.state).toMatchObject({ errors: 2, cursor: 0, hint: true, length: 2 });
    let s = twice.state;
    for (let i = 0; i < 30; i++) s = hit(s, wrong, 0).state;
    expect(s.tempo).toBe(1600); expect(s.length).toBe(2);
    for (const drum of [-1, 6, 1.5, NaN]) expect(hit(initial, drum, 0).state).toBe(initial);
    expect(hit(initial, 0, NaN).state).toBe(initial);
    expect(advance(initial)).toBe(initial);
    s = advance(solve(initial)); expect(s.length).toBe(3); expect(s.tempo).toBe(BASE_TEMPO);
    s = advance(solve(s)); expect(s.length).toBe(4);
    const w = (sequence(s)[0]! + 1) % 4;
    s = hit(hit(s, w, 0).state, w, 0).state; expect(s.length).toBe(3);
    s = solve(s); expect(hit(s, 0, 999).state).toBe(s);
    expect(MAX_TEMPO).toBe(1600);
});
for (const sign of [-1, 1]) for (const fraction of [.34, .35, .36]) it(`rhythm tolerance ${sign * fraction * 100}% with synthetic milliseconds`, () => {
    let s = start(5, 7), t = 100;
    s = hit(s, sequence(s)[0]!, t).state;
    const interval = s.questions[0]!.intervals[0]! * 650;
    t += interval * (1 + sign * fraction);
    const result = hit(s, sequence(s)[1]!, t);
    expect(result.correct).toBe(fraction <= .35);
    expect(result.replay).toBe(fraction > .35);
    expect(result.state.cursor).toBe(fraction <= .35 ? 2 : 0);
});
it('all modes finish, reward and unlock without subtracting progress; free always three stars', () => {
    for (let level = 1; level <= 8; level++) for (const errors of [false, true]) {
        let s = start(level, 9); expect(complete({}, s)).toEqual({});
        for (let i = 0; i < 5; i++) {
            if (errors && level !== 8) s = hit(s, (sequence(s)[0]! + 1) % levels[level - 1]!.drums, 0).state;
            s = advance(solve(s));
        }
        expect(s.finished).toBe(true); expect(stars(s)).toBe(level === 8 || !errors ? 3 : 1);
        const saved = complete({}, s); expect(isUnlocked(level + 1, saved)).toBe(true);
        expect(complete({ [level]: 3 }, s)[level]).toBe(3);
        expect(advance(s)).toBe(s);
    }
    expect([0, 1, 2, 3, 4, 5].map(firstTry => stars({ ...start(1, 1), firstTry }))).toEqual([1, 1, 1, 2, 2, 3]);
});
it('bilingual instructions, distinct shapes and finite valid shaded SVG', () => {
    expect(Object.keys(messages.fr).sort()).toEqual(Object.keys(messages.en).sort());
    expect(new Set(shapes).size).toBe(6);
    for (const locale of ['fr', 'en'] as const) {
        expect(levelView(fresh(locale))).toContain('data-level="8"');
        for (let d = 0; d < 6; d++) { const drawing = drumSvg(d); expect(validSvg(drawing)).toBe(true); expect(drawing).not.toMatch(/NaN|undefined|Infinity/); expect(drumName(d, locale)).toBeTruthy(); }
        for (let l = 1; l <= 8; l++) {
            const s = start(l, 0); expect(instruction(s, locale)).toBeTruthy();
            expect(gameView(s, locale)).not.toMatch(/NaN|undefined|Infinity/);
            expect(gameView(s, locale)).toContain('data-note="261.63"');
        }
    }
});
it('optional records migrate, filter, round-trip and preserve other games', () => {
    let raw = JSON.stringify({ ...fresh(), records: { 1: 2 }, tamboursRecords: { 1: 3, 8: 1, 16: 2, 17: 3, 2: 0, 3: 1.5 } });
    const port = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
    const s = readSave(port); expect(s.tamboursRecords).toEqual({ 1: 3, 8: 1, 16: 2 }); expect(s.records).toEqual({ 1: 2 });
    writeSave(port, s); expect(readSave(port)).toEqual(s);
    raw = JSON.stringify({ version: 1, locale: 'fr', voice: true, sound: true, records: {} }); expect(readSave(port).tamboursRecords).toEqual({});
});
it('synthesis sends six distinct pentatonic frequencies to a quiet fake AudioContext', () => {
    const frequencies: number[] = [], peaks: number[] = [], stops: number[] = [];
    class FakeAudioContext {
        currentTime = 0; destination = {};
        resume(): Promise<void> { return Promise.resolve(); }
        createOscillator() { const frequency = { value: 0 }; return { frequency, type: '', connect() {}, start() { frequencies.push(frequency.value); }, stop(t: number) { stops.push(t); } }; }
        createGain() { return { connect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime(value: number) { peaks.push(value); }, exponentialRampToValueAtTime() {} } }; }
    }
    vi.stubGlobal('AudioContext', FakeAudioContext); unlockSound();
    for (const frequency of notes) drumNote(true, frequency);
    expect(frequencies).toEqual([261.63, 293.66, 329.63, 392, 440, 523.25]); expect(new Set(frequencies).size).toBe(6);
    expect(peaks.every(p => p <= .06)).toBe(true); expect(stops).toEqual(Array(6).fill(.26));
    drumNote(false, 261.63); expect(frequencies).toHaveLength(6);
});
it('beat activation accepts rapid and secondary pointerdown, rejects compatibility click', () => {
    class Button extends EventTarget {
        onclick: ((event: Event & { detail: number }) => void) | null = null;
        getBoundingClientRect() { return { x: 0, y: 0, width: 100, height: 100 }; }
    }
    const button = new Button(); let calls = 0;
    bindBeat(button as unknown as HTMLElement, () => calls++, 'tambours-test');
    for (let id = 1; id <= 3; id++) button.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerId: id, isPrimary: id === 1, button: 0, clientX: 50, clientY: 50 }));
    expect(calls).toBe(3); button.onclick?.(Object.assign(new Event('click'), { detail: 1 })); expect(calls).toBe(3);
    button.onclick?.(Object.assign(new Event('click'), { detail: 0 })); expect(calls).toBe(4);
    expect(activationEvents().filter(e => e.target === 'tambours-test' && e.reason === 'musical-beat')).toHaveLength(3);
});

it('a backwards timestamp is ignored in every mode without altering progress', () => {
    for (const level of [1, 5, 8]) {
        const initial = start(level, 12);
        const s = hit(initial, sequence(initial)[0]!, 1000).state;
        expect(s.cursor).toBe(1);
        expect(hit(s, level === 8 ? 2 : sequence(s)[1]!, 999)).toEqual({ state: s, correct: false, replay: false });
        expect(hit(s, 0, 999).state).toBe(s);
    }
});
