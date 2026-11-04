import type { Locale } from '../shell/i18n';

/**
 * The author's other games, listed in the parents' space (behind the adult question, like every way out).
 * A plain link opens a game in the same tab: this page makes no request, and the icons are local files
 * cached with the rest of the app.
 */
export interface OtherGame { id: string; name: string; url: string; icon: string; fr: string; en: string }

export const GAMES: readonly OtherGame[] = [
    { id: 'opencade', name: 'Opencade', url: 'https://davy45270.github.io/Opencade/', icon: './autres-jeux/opencade.png', fr: 'Des jeux d’arcade originaux, au doigt, à la souris ou au clavier.', en: 'Original arcade games for touch, mouse or keyboard.' },
    { id: 'opencadkid', name: 'Opencadkid', url: 'https://davy45270.github.io/opencadkid/', icon: './autres-jeux/opencadkid.png', fr: 'Des petits jeux doux pour les tout-petits, avec Boubou et ses amis.', en: 'Gentle little games for young children, with Boubou and friends.' },
    { id: 'tictac', name: 'TicTac', url: 'https://davy45270.github.io/tictac/', icon: './autres-jeux/tictac.png', fr: 'Apprendre à lire l’heure en jouant, à son rythme.', en: 'Learn to tell the time by playing, at your own pace.' },
    { id: 'petit-astronome', name: 'Petit Astronome', url: 'https://davy45270.github.io/petit-astronome/', icon: './autres-jeux/petit-astronome.png', fr: 'Découvrir le Soleil, les planètes, la Lune et les étoiles en jouant.', en: 'Discover the Sun, the planets, the Moon and the stars by playing.' }
];

export const SELF = 'opencadkid';
export const otherGames = (self = SELF): OtherGame[] => GAMES.filter(game => game.id !== self);

export function otherGamesList(locale: Locale): string {
    return `<ul class="other-games">${otherGames().map(game => `<li><a class="other-game" href="${game.url}" data-game="${game.id}"><img src="${game.icon}" alt="" width="64" height="64"><span><strong>${game.name}</strong><span>${game[locale]}</span></span></a></li>`).join('')}</ul>`;
}
