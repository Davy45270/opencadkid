import type { Locale } from './i18n';
let unlocked = false;
let generation = 0;
let removeVoiceListener: (() => void) | undefined;
export function unlockSpeech(): void { unlocked = true; }
export function stopSpeech(): void {
    generation++;
    removeVoiceListener?.(); removeVoiceListener = undefined;
    try { window.speechSynthesis.cancel(); } catch { /* Optional browser capability. */ }
}
export function say(parts: string[], locale: Locale, enabled: boolean, onPart?: (index: number) => void, rate = 0.82): void {
    stopSpeech();
    if (!enabled || !unlocked) return;
    const token = generation;
    const next = (index: number): void => {
        if (token !== generation || index >= parts.length) return;
        onPart?.(index);
        try {
            if (!('speechSynthesis' in window)) return;
            const synthesis = window.speechSynthesis;
            const voices = synthesis.getVoices();
            if (!voices.length) {
                const loaded = (): void => { removeVoiceListener?.(); removeVoiceListener = undefined; if (synthesis.getVoices().length) next(index); };
                synthesis.addEventListener('voiceschanged', loaded, { once: true });
                removeVoiceListener = () => synthesis.removeEventListener('voiceschanged', loaded);
                return;
            }
            // Speak only through an installed local voice; no remote fallback.
            const voice = voices.find(v => v.localService && v.lang.startsWith(locale));
            if (!voice) return;
            const utterance = new SpeechSynthesisUtterance(parts[index]);
            utterance.lang = locale === 'fr' ? 'fr-FR' : 'en-GB';
            utterance.rate = rate; utterance.voice = voice;
            utterance.onend = () => next(index + 1);
            synthesis.speak(utterance);
        } catch { /* Silent devices still show the instruction pictogram. */ }
    };
    next(0);
}
