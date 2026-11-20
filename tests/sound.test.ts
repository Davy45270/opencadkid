import { afterEach, beforeEach, expect, it, vi } from 'vitest';

// A recording stand-in for the browser's AudioContext: every start, stop, resume and suspend is kept, along with each
// connection and each gain ramp, so the tests can follow a note to the speakers and read how loud it gets.
interface Played { frequency: number; start: number; stop: number; output: unknown }
let played: Played[], resumes: number, suspends: number, connections: [unknown, unknown][], peaks: Map<unknown, number[]>;
class FakeAudioContext {
    currentTime = 5; destination = { speakers: true };
    resume(): Promise<void> { resumes++; return Promise.resolve(); }
    suspend(): Promise<void> { suspends++; return Promise.resolve(); }
    createOscillator(): unknown {
        const note: Played = { frequency: 0, start: NaN, stop: NaN, output: undefined };
        const frequency = { set value(v: number) { note.frequency = v; }, get value() { return note.frequency; } };
        return { frequency, type: 'sine', connect(to: unknown) { note.output = to; connections.push([note, to]); }, start(t: number) { note.start = t; played.push(note); }, stop(t: number) { note.stop = t; } };
    }
    createGain(): unknown {
        const node = { gain: { setValueAtTime() {}, linearRampToValueAtTime(v: number) { peaks.get(node)!.push(v); }, exponentialRampToValueAtTime() {} }, connect(to: unknown) { connections.push([node, to]); } };
        peaks.set(node, []);
        return node;
    }
}
/** The loudest value each note's gain ramps up to, and whether that gain reaches the speakers. */
function heard(note: Played): { peak: number; toSpeakers: boolean } {
    const gain = note.output;
    return { peak: Math.max(...(peaks.get(gain) ?? [])), toSpeakers: connections.some(([from, to]) => from === gain && (to as { speakers?: boolean }).speakers === true) };
}
beforeEach(() => { played = []; resumes = 0; suspends = 0; connections = []; peaks = new Map(); vi.resetModules(); vi.stubGlobal('AudioContext', FakeAudioContext); });
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
        expect(note.stop - note.start).toBeGreaterThanOrEqual(0.2);
        expect(note.stop - note.start).toBeLessThanOrEqual(0.3);
    }
});

it('the chime reaches the speakers, softly: each note goes through its own gain to the output and peaks at 0.045', async () => {
    const { unlockSound, chime } = await sound();
    unlockSound(); chime(true);
    expect(played).toHaveLength(3);
    for (const note of played) {
        const { peak, toSpeakers } = heard(note);
        expect(toSpeakers).toBe(true);
        expect(peak).toBeCloseTo(0.045, 4);
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

it('a drum note reaches the speakers and peaks at the specified 0.055', async () => {
    const { unlockSound, drumNote } = await sound();
    unlockSound(); drumNote(true, 392);
    const { peak, toSpeakers } = heard(played[0]!);
    expect(toSpeakers).toBe(true);
    expect(peak).toBeCloseTo(0.055, 4);
});
