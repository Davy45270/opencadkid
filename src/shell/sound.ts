let context: AudioContext | undefined;
export function unlockSound(): void {
    try { context ??= new AudioContext(); void context.resume().catch(() => undefined); } catch { /* Audio is optional. */ }
}
export function stopSound(): void { try { void context?.suspend().catch(() => undefined); } catch { /* Audio is optional. */ } }
export function chime(enabled: boolean): void {
    if (!enabled || !context) return;
    try {
        const now = context.currentTime;
        for (const [i, frequency] of [523.25, 659.25, 783.99].entries()) {
            const oscillator = context.createOscillator(), volume = context.createGain();
            oscillator.type = 'sine'; oscillator.frequency.value = frequency;
            volume.gain.setValueAtTime(0, now + i * 0.09);
            volume.gain.linearRampToValueAtTime(0.045, now + i * 0.09 + 0.02);
            volume.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.22);
            oscillator.connect(volume); volume.connect(context.destination);
            oscillator.start(now + i * 0.09); oscillator.stop(now + i * 0.09 + 0.24);
        }
    } catch { /* A disabled audio device never blocks playing. */ }
}

/** One quiet sine voice, stopped after its short envelope. */
export function drumNote(enabled: boolean, frequency: number): void {
    if (!enabled || !context) return;
    try {
        const now = context.currentTime, oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(.055, now + .012);
        gain.gain.exponentialRampToValueAtTime(.001, now + .24);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(now); oscillator.stop(now + .26);
    } catch { /* Light remains available without an audio device. */ }
}
