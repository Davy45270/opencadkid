import { it, expect } from 'vitest';
import { messages, detectLocale } from '../src/shell/i18n';
it('both languages define exactly the same nonempty messages', () => {
    expect(Object.keys(messages.fr).sort()).toEqual(Object.keys(messages.en).sort());
    for (const language of Object.values(messages)) for (const value of Object.values(language)) expect(value.trim().length).toBeGreaterThan(0);
    expect(detectLocale('en-US')).toBe('en'); expect(detectLocale('fr')).toBe('fr'); expect(detectLocale('de')).toBe('fr');
});
