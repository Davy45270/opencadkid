import { characterSvg } from '../../characters/svg';
import { characters } from '../../characters/model';
import { grades, LENGTHS, profiles, type Evaluation, type Grade, type Profile, type SpellingError, type Word } from '../../engines/dictee';
import type { Locale } from '../../shell/i18n';
import { icon, svg } from '../../ui/svg';

export const labels = {
    fr: { title: 'La dictée magique', who: 'Qui joue ?', grade: 'Choisis ta classe', soon: 'Bientôt', length: 'Combien de mots ?', words: 'mots',
        start: 'Écoute le mot, puis écris-le.', listen: 'Touche la carte pour réécouter. Appuie longtemps : plus lentement.', sentence: 'Dans une phrase',
        answer: 'Ta réponse', validate: 'Valider', erase: 'Effacer', capital: 'Majuscule', next: 'Mot suivant', swipe: 'Glisse vers le haut', back: 'Retour', home: 'Accueil',
        right: ['Bravo !', 'Super !', 'C’est juste !', 'Magnifique !', 'Exactement !'], look: 'Regarde bien le mot.', wrote: 'Tu as écrit :', tip: 'Astuce :',
        writeFirst: 'Écris d’abord le mot, puis valide.', end: 'Fini pour cette fois !', endSaid: (n: number): string => `Bravo, tu as écrit ${n} mots !`,
        firstTry: 'Justes du premier coup', again: 'On les reverra bientôt', more: 'Encore des mots', voiceOff: 'La voix est coupée dans l’espace parents.',
        empty: 'Les mots de cette classe arrivent bientôt : un adulte doit d’abord les relire.', loading: 'Un instant…', card: 'Carte', of: 'sur',
        keyboard: 'Clavier', letters: 'Lettres à remettre dans l’ordre', drafts: 'Brouillons visibles (développement)', age: '6 ans et +' },
    en: { title: 'The magic dictation', who: 'Who is playing?', grade: 'Choose your class', soon: 'Soon', length: 'How many words?', words: 'words',
        start: 'Listen to the word, then write it.', listen: 'Touch the card to listen again. Hold it: more slowly.', sentence: 'In a sentence',
        answer: 'Your answer', validate: 'Check', erase: 'Erase', capital: 'Capital letter', next: 'Next word', swipe: 'Swipe up', back: 'Back', home: 'Home',
        right: ['Well done!', 'Great!', 'That’s right!', 'Wonderful!', 'Exactly!'], look: 'Look at the word carefully.', wrote: 'You wrote:', tip: 'Tip:',
        writeFirst: 'Write the word first, then check.', end: 'That’s all for now!', endSaid: (n: number): string => `Well done, you wrote ${n} words!`,
        firstTry: 'Right the first time', again: 'We will see these again soon', more: 'More words', voiceOff: 'The voice is off in the parents’ space.',
        empty: 'The words of this class are coming soon: an adult must review them first.', loading: 'One moment…', card: 'Card', of: 'of',
        keyboard: 'Keyboard', letters: 'Letters to put in order', drafts: 'Drafts shown (development)', age: '6 and up' },
} as const;

/** One line for a child, from the kind of mistake. The words are French: the dictation is French. */
export function explain(e: SpellingError | null, word: string, locale: Locale): string {
    if (!e) return '';
    const q = (s: string): string => locale === 'fr' ? `« ${s} »` : `“${s}”`;
    const fr = locale === 'fr';
    switch (e.type) {
        case 'omission': return fr ? `Il manque ${q(e.expected)}.` : `${q(e.expected)} is missing.`;
        case 'ajout': return fr ? `Une lettre en trop : ${q(e.got)}.` : `One letter too many: ${q(e.got)}.`;
        case 'substitution': return fr ? `Ici, c’est ${q(e.expected)}, pas ${q(e.got)}.` : `Here it is ${q(e.expected)}, not ${q(e.got)}.`;
        case 'accent': return fr ? `Attention à l’accent : ${q(e.expected)}.` : `Mind the accent: ${q(e.expected)}.`;
        case 'casse': return e.expected !== e.expected.toLowerCase() ? (fr ? 'Il faut une majuscule.' : 'It needs a capital letter.') : (fr ? 'Pas de majuscule ici.' : 'No capital letter here.');
        case 'double-consonne': return e.expected.length > e.got.length
            ? (fr ? `Il y a deux ${q(e.expected)} : ${q(e.expected + e.expected)}.` : `There are two ${q(e.expected)}: ${q(e.expected + e.expected)}.`)
            : (fr ? `Une seule lettre ${q(e.got)} ici.` : `Only one ${q(e.got)} here.`);
        case 'lettre-muette': return fr ? `À la fin, une lettre qu’on n’entend pas : ${q(e.expected)}.` : `At the end, a letter you cannot hear: ${q(e.expected)}.`;
        case 'son': return fr ? `Ce son s’écrit ${q(e.expected)} dans ce mot.` : `This sound is written ${q(e.expected)} in this word.`;
        case 'homophone': return fr ? `${q(e.got)} s’entend pareil, mais ici on écrit ${q(word)}.` : `${q(e.got)} sounds the same, but here it is ${q(word)}.`;
        case 'accord': return fr ? `Le mot tout seul, sans ${q(e.got)} à la fin.` : `The word on its own, without ${q(e.got)} at the end.`;
    }
}

export const pictogram = svg(`<rect x="4" y="4" width="56" height="56" rx="12" fill="#efe7fb"/><path d="M10 18Q21 13 32 19Q43 13 54 18V50Q43 45 32 51Q21 45 10 50Z" fill="#fffaf0" stroke="#5d4777" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 19V51" stroke="#5d4777" stroke-width="2"/><path d="M15 26H27M15 32H25M15 38H27M37 26H49M37 32H47" stroke="#9255d5" stroke-width="2.2" stroke-linecap="round"/><path d="M46 37L48 42L53 43L49 46L50 51L46 48L42 51L43 46L39 43L44 42Z" fill="#ffc94d" stroke="#5d4777" stroke-width="1.4" stroke-linejoin="round"/>`);

const header = (t: typeof labels[Locale], title: string, back: string = t.back): string =>
    `<header class="shapes-header dictee-header"><button id="back" class="round" aria-label="${back}">${icon('home')}</button><h1>${title}</h1></header>`;

export function profileView(locale: Locale): string {
    const t = labels[locale];
    return `<section class="dictee dictee-menu">${header(t, t.who, t.home)}<div class="dictee-choices dictee-profiles">${profiles.map(p => `<button data-dictee-profile="${p}" aria-label="${characters[p][locale]}">${characterSvg(p, 'joie', 'repos', 'reduce')}</button>`).join('')}</div></section>`;
}
export function gradeView(locale: Locale, profile: Profile, counts: Record<Grade, number>, drafts: boolean): string {
    const t = labels[locale];
    return `<section class="dictee dictee-menu">${header(t, t.grade)}<div class="dictee-guide">${characterSvg(profile, 'joie', 'repos', 'reduce')}</div>`
        + `<div class="dictee-choices dictee-grades">${grades.map(g => `<button data-dictee-grade="${g}" ${counts[g] ? '' : 'disabled'}><b>${g}</b><span>${counts[g] ? `${counts[g]} ${t.words}` : t.soon}</span></button>`).join('')}</div>`
        + (grades.every(g => !counts[g]) ? `<p class="dictee-note" id="dictee-empty">${t.empty}</p>` : '') + (drafts ? `<p class="dictee-note dictee-drafts">${t.drafts}</p>` : '') + `</section>`;
}
export function lengthView(locale: Locale, profile: Profile, grade: Grade, available: number): string {
    const t = labels[locale];
    return `<section class="dictee dictee-menu">${header(t, `${grade} · ${t.length}`)}<div class="dictee-guide">${characterSvg(profile, 'joie', 'repos', 'reduce')}</div>`
        + `<div class="dictee-choices dictee-lengths">${LENGTHS.map(n => `<button data-dictee-length="${n}" ${n <= Math.max(5, available) ? '' : 'disabled'}><b>${n}</b><span>${t.words}</span></button>`).join('')}</div></section>`;
}

/** The big keyboard: AZERTY letters in one list, a capital key for the next letter only (Noël), (the grid makes three rows on a wide screen, four on a phone so that
 * every key keeps 44 px), the accents always visible, and nothing that suggests a word. */
export const LETTERS = Array.from('azertyuiopqsdfghjklmwxcvbn');
export const ACCENTS = Array.from('éèêàâçùîôëï');
export function keyboard(t: typeof labels[Locale]): string {
    const key = (c: string): string => `<button type="button" class="dictee-key" data-key="${c}" aria-label="${c}">${c}</button>`;
    return `<div class="dictee-keyboard" role="group" aria-label="${t.keyboard}"><div class="dictee-accents">${ACCENTS.map(key).join('')}</div><div class="dictee-letters">${LETTERS.map(key).join('')}</div>`
        + `<div class="dictee-actions dictee-actions-maj"><button type="button" id="dictee-shift" class="dictee-key dictee-wide" aria-pressed="false" aria-label="${t.capital}">⇧</button><button type="button" id="dictee-erase" class="dictee-key dictee-wide" aria-label="${t.erase}">⌫</button><button type="button" id="dictee-validate" class="dictee-key dictee-ok">${icon('check')}<span>${t.validate}</span></button></div></div>`;
}
/** First grade: the word's letters, shuffled, to put back in order. */
export function tileTray(t: typeof labels[Locale], letters: readonly string[], used: readonly number[]): string {
    return `<div class="dictee-keyboard dictee-tiles" role="group" aria-label="${t.letters}"><div class="dictee-tile-row">${letters.map((c, k) => `<button type="button" class="dictee-key dictee-tile" data-tile="${k}" ${used.includes(k) ? 'disabled' : ''}>${c}</button>`).join('')}</div>`
        + `<div class="dictee-actions"><button type="button" id="dictee-erase" class="dictee-key dictee-wide" aria-label="${t.erase}">⌫</button><button type="button" id="dictee-validate" class="dictee-key dictee-ok">${icon('check')}<span>${t.validate}</span></button></div></div>`;
}
/** The answer field never opens the device keyboard and never suggests or corrects anything. */
export const answerField = (t: typeof labels[Locale]): string =>
    `<input id="dictee-answer" class="dictee-answer" type="text" inputmode="none" readonly autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" aria-label="${t.answer}" value="">`;

export interface CardModel { word: Word; index: number; total: number; again: boolean; evaluation: Evaluation | null; praise: string; profile: Profile; showTip: boolean }
/** One card of the feed. The word itself is never in the page before the answer is checked. */
export function cardView(m: CardModel, locale: Locale, reduce: boolean): string {
    const t = labels[locale], e = m.evaluation;
    const front = `<div class="dictee-face dictee-front"><div class="dictee-mascot">${characterSvg(m.profile, e?.exact ? 'celebration' : e ? 'surprise' : 'joie', e?.exact ? 'saut' : 'repos', reduce ? 'reduce' : 'full')}</div>`
        + `<p class="dictee-hint">${icon('ear')}<span>${e?.exact ? m.praise : t.listen}</span></p>`
        + (e?.exact ? `<p class="dictee-word dictee-word-right" lang="fr">${m.word.expectedForm}</p>` : '') + `</div>`;
    const back = e && !e.exact ? `<div class="dictee-face dictee-back"><p class="dictee-word" lang="fr" aria-label="${m.word.expectedForm}">${Array.from(e.expected).map((c, k) => `<span class="${e.marks[k] === 'faux' ? 'faux' : ''}">${c}</span>`).join('')}</p>`
        + `<p class="dictee-wrote">${t.wrote} <span lang="fr">${e.answer || '…'}</span></p><p class="dictee-explain" id="dictee-explain">${explain(e.errors.find(x => x.type !== 'accent' && x.type !== 'casse') ?? e.errors[0] ?? null, m.word.expectedForm, locale)}</p>`
        + (m.showTip && m.word.explanation ? `<p class="dictee-tip">${t.tip} ${m.word.explanation}</p>` : '') + `</div>` : '';
    return `<article class="dictee-card${e ? (e.exact ? ' juste' : ' retournee') : ''}" data-card="${m.index}" data-word="${m.word.id}" aria-label="${t.card} ${m.index + 1} ${t.of} ${m.total}" tabindex="0">`
        + `<div class="dictee-inner">${front}${back}</div>`
        + `<div class="dictee-card-tools">${m.word.contextAsset && m.word.contextSentence ? `<button type="button" id="dictee-sentence" class="dictee-pill">${icon('ear')}<span>${t.sentence}</span></button>` : ''}`
        + (e ? `<button type="button" id="dictee-next" class="dictee-pill dictee-next">${icon('arrow')}<span>${t.next}</span></button>` : '') + `</div></article>`;
}
export function feedView(locale: Locale, grade: Grade, index: number, total: number, card: string, input: string): string {
    const t = labels[locale];
    const dots = Array.from({ length: total }, (_, k) => `<i class="${k < index ? 'fait' : k === index ? 'ici' : ''}"></i>`).join('');
    return `<section class="dictee dictee-feed"><header class="shapes-header dictee-header"><button id="back" class="round" aria-label="${t.back}">${icon('home')}</button><h1>${grade}</h1><div class="dictee-dots" aria-label="${t.card} ${index + 1} ${t.of} ${total}">${dots}</div></header>`
        + `<div class="dictee-stage">${card}</div><div class="dictee-input">${answerField(t)}${input}</div></section>`;
}
export function endView(locale: Locale, profile: Profile, right: readonly Word[], again: readonly Word[], total: number, reduce: boolean): string {
    const t = labels[locale];
    const list = (ws: readonly Word[], cls: string): string => `<ul class="dictee-list ${cls}" lang="fr">${ws.map(w => `<li>${w.expectedForm}</li>`).join('')}</ul>`;
    return `<section class="dictee dictee-feed"><header class="shapes-header dictee-header"><button id="back" class="round" aria-label="${t.back}">${icon('home')}</button><h1>${t.end}</h1></header>`
        + `<div class="dictee-stage"><article class="dictee-card dictee-end" id="dictee-end"><div class="dictee-mascot">${characterSvg(profile, 'celebration', 'celebration', reduce ? 'reduce' : 'full')}</div>`
        + `<p class="dictee-endsaid">${t.endSaid(total)}</p>${right.length ? `<h2>${t.firstTry}</h2>${list(right, 'liste-juste')}` : ''}${again.length ? `<h2>${t.again}</h2>${list(again, 'liste-revoir')}` : ''}`
        + `<div class="finish-actions"><button id="dictee-more">${icon('replay')}<span>${t.more}</span></button><button id="dictee-home">${icon('home')}<span>${t.home}</span></button></div></article></div></section>`;
}
export { grades };
