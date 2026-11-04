import type { Locale } from '../shell/i18n';

/**
 * "Give feedback" opens the game's public feedback forms in a new tab. It sits in the parents' space,
 * behind the adult question like every way out of the app. It is a plain link: nothing is sent from
 * this page, and no counter or tracker is involved.
 */
export const FEEDBACK_URL = 'https://github.com/Davy45270/opencadkid/issues/new/choose';

const labels = { fr: ['Donner mon avis', '(nouvel onglet)'], en: ['Give feedback', '(new tab)'] } as const;

export const feedbackLabel = (locale: Locale): string => labels[locale][0];

export const feedbackLinkHtml = (locale: Locale): string =>
    `<a id="give-feedback" class="feedback-link" href="${FEEDBACK_URL}" target="_blank" rel="noopener noreferrer">${labels[locale][0]}<span class="visually-hidden"> ${labels[locale][1]}</span></a>`;
