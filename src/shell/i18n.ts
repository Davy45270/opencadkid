export type Locale = 'fr' | 'en';
export const messages = {
    fr: {
        drumsListen: "Regarde et écoute Tutu.", drumsTurn: "À toi ! Rejoue les frappes.", drumsFree: "Compose huit frappes, Tutu les rejoue !",
        patternsNext: "Qu’est-ce qui vient après ?", patternsHole: "Qu’est-ce qui manque ?", patternsTwo: "À toi de continuer ! Place les deux suivants.",
        pathInstruction: "Trace le chemin de Pestouille jusqu’à l’arrivée.", pathHelp: "Montre le chemin", pathMedal: "Toutes les étoiles du chemin !", pathAlone: "Sans ampoule cette fois !",
        puzzleInstruction: "Glisse les pièces pour refaire l’image.", puzzleModel: "Voir le modèle", puzzlePiece: "Pièce", puzzleHint: "Cette pièce va ici !",
        soundsFindLetter: 'Touche la lettre du premier son.', soundsFindImage: 'Touche l’image qui commence par ce son.', soundsSort: 'Glisse les images dans la boîte de leur premier son.',
        matchCards: 'Trouve les deux mêmes images.', matchShadows: 'Trouve chaque image et son ombre.', matchSilhouettes: 'Trouve les deux mêmes ombres.', previewCards: 'Regarde les images !', hiddenCard: 'Carte cachée', memoryHint: 'Ces deux cartes vont ensemble !', memoryEncourage: 'Lumi cherche avec toi !', rewardStar: 'étoile', rewardStars: 'étoiles',
        welcome: 'À toi de jouer !', parents: 'Parents', home: 'Accueil', listen: 'Écouter',
        levels: 'Choisis une pastille', again: 'Encore', next: 'Niveau suivant', continue: 'Continuer',
        tryAgain: 'Essaie encore !', bravo: 'Bravo !', finished: 'Bravo, tu as terminé !',
        combien: 'Combien y en a-t-il ?', remplir: 'Mets {n} {object} dans le panier.',
        more: 'Où y en a-t-il le plus ?', less: 'Où y en a-t-il le moins ?', combienOf: 'Combien de {object} y a-t-il ?',
        check: 'Valider', voice: 'Voix', sound: 'Sons', language: 'Langue', erase: 'Effacer la progression',
        confirm: 'Effacer toutes les étoiles ?', yes: 'Oui', no: 'Non', close: 'Fermer',
        adult: 'Pour les adultes', otherGames: 'Mes autres jeux', clock: 'Jouer avec TicTac', locked: 'Termine la pastille précédente',
        apple: 'pommes', pear: 'poires', berry: 'fraises', carrot: 'carottes', star: 'étoiles', fish: 'poissons', flower: 'fleurs', basket: 'Panier', reserve: 'Réserve', skill: 'Compter, remplir, comparer'
    },
    en: {
        drumsListen: "Watch and listen to Tutu.", drumsTurn: "Your turn! Play the beats again.", drumsFree: "Make eight beats, Tutu plays them back!",
        patternsNext: "What comes next?", patternsHole: "What is missing?", patternsTwo: "Your turn to continue! Place the next two.",
        pathInstruction: "Trace Pestouille’s path to the finish.", pathHelp: "Show the path", pathMedal: "Every path star collected!", pathAlone: "No bulb this time!",
        puzzleInstruction: "Slide the pieces to rebuild the picture.", puzzleModel: "Show the picture", puzzlePiece: "Piece", puzzleHint: "This piece goes here!",
        soundsFindLetter: 'Touch the letter for the first sound.', soundsFindImage: 'Touch the picture starting with this sound.', soundsSort: 'Slide each picture into the box for its first sound.',
        matchCards: 'Find the two matching pictures.', matchShadows: 'Find each picture and its shadow.', matchSilhouettes: 'Find the two matching shadows.', previewCards: 'Look at the pictures!', hiddenCard: 'Hidden card', memoryHint: 'These two cards go together!', memoryEncourage: 'Lumi is looking with you!', rewardStar: 'star', rewardStars: 'stars',
        welcome: 'Your turn to play!', parents: 'Parents', home: 'Home', listen: 'Listen',
        levels: 'Choose a dot', again: 'Again', next: 'Next level', continue: 'Continue',
        tryAgain: 'Try again!', bravo: 'Well done!', finished: 'Well done, you finished!',
        combien: 'How many are there?', remplir: 'Put {n} {object} in the basket.',
        more: 'Which basket has more?', less: 'Which basket has fewer?', combienOf: 'How many {object} are there?',
        check: 'Check', voice: 'Voice', sound: 'Sounds', language: 'Language', erase: 'Erase progress',
        confirm: 'Erase all the stars?', yes: 'Yes', no: 'No', close: 'Close',
        adult: 'For adults', otherGames: 'My other games', clock: 'Play with TicTac', locked: 'Finish the previous dot',
        apple: 'apples', pear: 'pears', berry: 'strawberries', carrot: 'carrots', star: 'stars', fish: 'fish', flower: 'flowers', basket: 'Basket', reserve: 'Reserve', skill: 'Count, fill, compare'
    }
} as const;
export type MessageKey = keyof typeof messages.fr;
export function detectLocale(language: string): Locale { return language.toLowerCase().startsWith('en') ? 'en' : 'fr'; }
export function text(locale: Locale, key: MessageKey): string { return messages[locale][key]; }
export function applyLocale(locale: Locale): void { document.documentElement.lang = locale; }

export function rewardLabel(count: number, locale: Locale): string {
    return `${count} ${text(locale, count === 1 ? 'rewardStar' : 'rewardStars')}`;
}
