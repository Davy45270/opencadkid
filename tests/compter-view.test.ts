import { expect, it } from 'vitest';
import { rewardLabel } from '../src/shell/i18n';
import { dots } from '../src/ui/svg';
import { gameView, instruction } from '../src/games/compter/view';
import type { Question, Session } from '../src/engines/compter';

const question: Question = {
    mode: 'combien', object: 'apple', target: 5, choices: [4, 5, 6],
    left: 5, right: 3, answer: 5, reserve: 8, seed: 73
};
function session(q: Question): Session {
    return { level: 3, questions: [q], index: 0, errors: 0, firstTry: 0, solved: false, basket: 0, finished: false };
}
it('counting scene renders exactly the requested number of objects', () => {
    for (let n = 1; n <= 10; n++) {
        const html = gameView(session({ ...question, target: n }), 'fr', 'joie', false);
        expect([...html.matchAll(/data-object="\d+"/g)]).toHaveLength(n);
    }
});
it('every answer card renders its own complete dot constellation', () => {
    const html = gameView(session(question), 'fr', 'joie', false);
    const cards = [...html.matchAll(/<button data-answer="(\d+)"[^>]*>(.*?)<\/button>/g)];
    expect(cards).toHaveLength(3);
    expect(cards.map(card => Number(card[1]))).toEqual([4, 5, 6]);
    for (const card of cards) {
        const n = Number(card[1]);
        expect(card[2]).toContain(`<b>${n}</b>`);
        expect([...card[2]!.matchAll(/<circle /g)]).toHaveLength(n);
    }
});
it('fewer comparison has the exact independent displayed and spoken instructions', () => {
    const q: Question = { ...question, mode: 'plus', comparison: 'less', answer: 1 };
    expect(instruction(q, 'fr')).toBe('Où y en a-t-il le moins ?');
    expect(instruction(q, 'en')).toBe('Which basket has fewer?');
    expect(gameView(session(q), 'fr', 'joie', false)).toContain('<p>Où y en a-t-il le moins ?</p>');
    expect(gameView(session(q), 'en', 'joie', false)).toContain('<p>Which basket has fewer?</p>');
});

it('literal singular/plural nouns in displayed and spoken filling instructions', () => {
    const cases = [
        ['apple', 'pomme', 'pommes', 'une', 'apple', 'apples'],
        ['pear', 'poire', 'poires', 'une', 'pear', 'pears'],
        ['berry', 'fraise', 'fraises', 'une', 'strawberry', 'strawberries'],
        ['carrot', 'carotte', 'carottes', 'une', 'carrot', 'carrots'],
        ['star', 'étoile', 'étoiles', 'une', 'star', 'stars'],
        ['fish', 'poisson', 'poissons', 'un', 'fish', 'fish'],
        ['flower', 'fleur', 'fleurs', 'une', 'flower', 'flowers']
    ] as const;
    for (const [object, singular, plural, article, english, englishPlural] of cases) {
        const q: Question = { ...question, mode: 'remplir', object, target: 1 };
        expect(instruction(q, 'fr')).toBe(`Mets 1 ${singular} dans le panier.`);
        expect(instruction(q, 'fr', true)).toBe(`Mets ${article} ${singular} dans le panier.`);
        expect(instruction(q, 'en')).toBe(`Put 1 ${english} in the basket.`);
        expect(instruction(q, 'en', true)).toBe(`Put one ${english} in the basket.`);
        for (const target of [2, 5, 10]) {
            expect(instruction({ ...q, target }, 'fr')).toBe(`Mets ${target} ${plural} dans le panier.`);
            expect(instruction({ ...q, target }, 'en')).toBe(`Put ${target} ${englishPlural} in the basket.`);
            expect(instruction({ ...q, target }, 'fr', true)).toBe(`Mets ${target} ${plural} dans le panier.`);
            expect(instruction({ ...q, target }, 'en', true)).toBe(`Put ${target} ${englishPlural} in the basket.`);
        }
    }
});

it('one to six use literal dice faces; seven to ten use two separated rows', () => {
    const faces = [
        [[36, 24]], [[12, 8], [60, 40]], [[12, 8], [36, 24], [60, 40]],
        [[12, 8], [60, 8], [12, 40], [60, 40]],
        [[12, 8], [60, 8], [36, 24], [12, 40], [60, 40]],
        [[12, 8], [60, 8], [12, 24], [60, 24], [12, 40], [60, 40]]
    ];
    for (let n = 1; n <= 10; n++) {
        const points = [...dots(n).matchAll(/cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map(m => [Number(m[1]), Number(m[2]), Number(m[3])]);
        expect(points).toHaveLength(n);
        expect(points.every(p => p[2] === 5.5)).toBe(true);
        if (n <= 6) expect(points.map(p => p.slice(0, 2))).toEqual(faces[n - 1]);
        else { expect(points.filter(p => p[1] === 14)).toHaveLength(5); expect(points.filter(p => p[1] === 34)).toHaveLength(n - 5); }
    }
});

it('numbered rewards agree in both languages across games and home', () => {
    for (const [count, french, english] of [[0, '0 étoiles', '0 stars'], [1, '1 étoile', '1 star'], [2, '2 étoiles', '2 stars'], [3, '3 étoiles', '3 stars']] as const) {
        expect(rewardLabel(count, 'fr')).toBe(french); expect(rewardLabel(count, 'en')).toBe(english);
    }
});
