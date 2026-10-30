export type Locale = 'fr' | 'en';
export const messages = {
    fr: {
        soundsFindLetter: 'Touche la lettre du premier son.', soundsFindImage: 'Touche l’image qui commence par ce son.', soundsSort: 'Glisse les images dans la boîte de leur premier son.',
        matchCards: 'Trouve les deux mêmes images.', matchShadows: 'Trouve chaque image et son ombre.', previewCards: 'Regarde les images !', hiddenCard: 'Carte cachée', memoryHint: 'Ces deux cartes vont ensemble !', memoryEncourage: 'Lumi cherche avec toi !', rewardStars: 'étoiles',
        welcome: 'À toi de jouer !', parents: 'Parents', home: 'Accueil', listen: 'Écouter',
        levels: 'Choisis une pastille', again: 'Encore', next: 'Niveau suivant', continue: 'Continuer',
        tryAgain: 'Essaie encore !', bravo: 'Bravo !', finished: 'Bravo, tu as terminé !',
        combien: 'Combien y en a-t-il ?', remplir: 'Mets {n} {object} dans le panier.',
        more: 'Où y en a-t-il le plus ?', less: 'Où y en a-t-il le moins ?',
        check: 'Valider', voice: 'Voix', sound: 'Sons', language: 'Langue', erase: 'Effacer la progression',
        confirm: 'Effacer toutes les étoiles ?', yes: 'Oui', no: 'Non', close: 'Fermer',
        adult: 'Pour les adultes', clock: 'Jouer avec TicTac', locked: 'Termine la pastille précédente',
        apple: 'pommes', pear: 'poires', berry: 'fraises', carrot: 'carottes', star: 'étoiles', fish: 'poissons', flower: 'fleurs', basket: 'Panier', reserve: 'Réserve', skill: 'Compter, remplir, comparer'
    },
    en: {
        soundsFindLetter: 'Touch the letter for the first sound.', soundsFindImage: 'Touch the picture starting with this sound.', soundsSort: 'Slide each picture into the box for its first sound.',
        matchCards: 'Find the two matching pictures.', matchShadows: 'Find each picture and its shadow.', previewCards: 'Look at the pictures!', hiddenCard: 'Hidden card', memoryHint: 'These two cards go together!', memoryEncourage: 'Lumi is looking with you!', rewardStars: 'stars',
        welcome: 'Your turn to play!', parents: 'Parents', home: 'Home', listen: 'Listen',
        levels: 'Choose a dot', again: 'Again', next: 'Next level', continue: 'Continue',
        tryAgain: 'Try again!', bravo: 'Well done!', finished: 'Well done, you finished!',
        combien: 'How many are there?', remplir: 'Put {n} {object} in the basket.',
        more: 'Which basket has more?', less: 'Which basket has fewer?',
        check: 'Check', voice: 'Voice', sound: 'Sounds', language: 'Language', erase: 'Erase progress',
        confirm: 'Erase all the stars?', yes: 'Yes', no: 'No', close: 'Close',
        adult: 'For adults', clock: 'Play with TicTac', locked: 'Finish the previous dot',
        apple: 'apples', pear: 'pears', berry: 'strawberries', carrot: 'carrots', star: 'stars', fish: 'fish', flower: 'flowers', basket: 'Basket', reserve: 'Reserve', skill: 'Count, fill, compare'
    }
} as const;
export type MessageKey = keyof typeof messages.fr;
export function detectLocale(language: string): Locale { return language.toLowerCase().startsWith('en') ? 'en' : 'fr'; }
export function text(locale: Locale, key: MessageKey): string { return messages[locale][key]; }
export function applyLocale(locale: Locale): void { document.documentElement.lang = locale; }
