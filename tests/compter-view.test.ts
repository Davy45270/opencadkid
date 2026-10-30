import { expect, it } from 'vitest';
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
