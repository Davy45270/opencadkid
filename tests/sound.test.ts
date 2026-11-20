import { afterEach, beforeEach, expect, it, vi } from 'vitest';

// A recording stand-in for the browser's AudioContext: every start, stop, resume and suspend is kept.
interface Played { frequency: number; start: number; stop: number }
let played: Played[], resumes: number, suspends: number;
class FakeAudioContext {
    currentTime = 5; destination = {};
    resume(): Promise<void> { resumes++; return Promise.resolve(); }
    suspend(): Promise<void> { suspends++; return Promise.resolve(); }
    createOscillator(): unknown {
        const note: Played = { frequency: 0, start: NaN, stop: NaN };
        const frequency = { set value(v: number) { note.frequency = v; }, get value() { return note.frequency; } };
        return { frequency, type: 'sine', connect() {}, start(t: number) { note.start = t; played.push(note); }, stop(t: number) { note.stop = t; } };
    }
    createGain(): unknown { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
}
beforeEach(() => { played = []; resumes = 0; suspends = 0; vi.resetModules(); vi.stubGlobal('AudioContext', FakeAudioContext); });
afterEach(() => { vi.unstubAllGlobals(); });
const sound = (): Promise<typeof import('../src/shell/sound')> => import('../src/shell/sound');

it('the first gesture wakes the audio up, and muting suspends it', async () => {
    const { unlockSound, stopSound } = await sound();
    unlockSound();
    expect(resumes).toBe(1);
    stopSound();
    expect(suspends).toBe(1);
    unlockSound();
    expect(resumes).toBe(2);
});

it('the chime is short: three rising notes, each stopped a quarter of a second after it starts', async () => {
    const { unlockSound, chime } = await sound();
    unlockSound(); chime(true);
    expect(played.map(n => n.frequency)).toEqual([523.25, 659.25, 783.99]);
    for (const [i, note] of played.entries()) {
        expect(note.start).toBeCloseTo(5 + i * 0.09);
        expect(note.stop - note.start).toBeGreaterThan(0);
        expect(note.stop - note.start).toBeLessThanOrEqual(0.3);
    }
});

it('no chime and no drum note while sounds are off, nor before the first gesture', async () => {
    const { unlockSound, chime, drumNote } = await sound();
    chime(true); drumNote(true, 440);
    expect(played).toEqual([]);
    unlockSound(); chime(false); drumNote(false, 440);
    expect(played).toEqual([]);
});

it('a drum note is one short note at its own pitch', async () => {
    const { unlockSound, drumNote } = await sound();
    unlockSound(); drumNote(true, 392);
    expect(played).toHaveLength(1);
    expect(played[0]!.frequency).toBe(392);
    expect(played[0]!.stop - played[0]!.start).toBeGreaterThan(0);
    expect(played[0]!.stop - played[0]!.start).toBeLessThanOrEqual(0.3);
});
