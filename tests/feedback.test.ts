import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { FEEDBACK_URL, feedbackLabel, feedbackLinkHtml } from '../src/ui/feedback';

it('points at the public feedback forms of this game, with no tracking parameter', () => {
    expect(FEEDBACK_URL).toBe('https://github.com/Davy45270/opencadkid/issues/new/choose');
});

it('renders a new-tab link that cannot reach back into the game', () => {
    for (const locale of ['fr', 'en'] as const) {
        const html = feedbackLinkHtml(locale);
        expect(html).toMatch(/^<a id="give-feedback" class="feedback-link" href="https:\/\/github\.com\/Davy45270\/opencadkid\/issues\/new\/choose" target="_blank" rel="noopener noreferrer">/);
        expect(html).toContain(feedbackLabel(locale));
    }
    expect(feedbackLabel('fr')).toBe('Donner mon avis');
    expect(feedbackLinkHtml('fr')).toContain('(nouvel onglet)');
});

it('keeps the feedback address in one module that opens no network channel', () => {
    expect(readFileSync('src/ui/feedback.ts', 'utf8')).not.toMatch(/\bfetch\b|XMLHttpRequest|sendBeacon|window\.open|utm_/);
    expect(readFileSync('src/shell/router.ts', 'utf8')).not.toContain('github.com/');
});
