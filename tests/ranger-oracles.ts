/** Authored language contract: no production labels or instruction builder. */
export function expectedInstruction(q: { rule: string; bins: string[]; category: string; color: string }, locale: 'fr' | 'en'): string {
    const words: Record<string, string> = locale === 'fr' ? {
        rouge: 'rouge', vert: 'vert', jaune: 'jaune', rond: 'rond', carre: 'carré', long: 'allongé', petit: 'petit', grand: 'grand',
        fruit: 'les fruits, ce qui se mange', jouet: 'les jouets', vetement: 'les vêtements, ce qui se met sur soi', animal: 'les animaux', cuisine: 'les ustensiles de cuisine'
    } : {
        rouge: 'red', vert: 'green', jaune: 'yellow', rond: 'round', carre: 'square', long: 'long', petit: 'small', grand: 'large',
        fruit: 'fruit, things to eat', jouet: 'toys', vetement: 'clothes, things to wear', animal: 'animals', cuisine: 'kitchen tools'
    };
    if (q.rule === 'intrus') return `${locale === 'fr' ? 'Touche l’objet qui ne va pas avec les autres.' : 'Touch the object that does not belong.'} ${words[q.category]!}.`;
    if (q.rule === 'two') return `${locale === 'fr' ? 'Range selon les deux indices.' : 'Sort using both clues.'} ${words[q.category]!}, ${words[q.color]!}. ${locale === 'fr' ? 'oui / non' : 'yes / no'}.`;
    const beginnings: Record<string, string> = locale === 'fr' ? {
        color: 'Range par couleur.', shape: 'Range par forme.', size: 'Range par taille : petit ou grand.', category: 'Range par famille.'
    } : { color: 'Sort by colour.', shape: 'Sort by shape.', size: 'Sort by size: small or large.', category: 'Sort by family.' };
    return `${beginnings[q.rule]!} ${q.bins.map(bin => words[bin]!).join(' ; ')}.`;
}
