import { it, expect } from 'vitest';
import { games } from '../src/registry';
import { ids, expressions, drawList } from '../src/characters/model';
import { characterSvg } from '../src/characters/svg';
it('only playable games are registered with complete bilingual metadata', () => {
    expect(games.map(g => g.id)).toEqual(['compter', 'paires', 'formes', 'sons', 'puzzle', 'chemin', 'suites', 'ranger', 'tambours', 'gouter', 'cherche', 'promenade', 'bulles', 'bonbons', 'traverse', 'caisses', 'chenille', 'collier', 'briques', 'fusee', 'pepites', 'dedale', 'empilo', 'orbite', 'essaim', 'cartons', 'arrosoir', 'derapage', 'atelier']);
    for (const game of games) {
        expect(ids).toContain(game.guide);
        for (const name of Object.values(game.names)) expect(name.length).toBeGreaterThan(0);
        for (const skill of Object.values(game.skill)) expect(skill.length).toBeGreaterThan(0);
        expect(game.pictogram).toMatch(/^<svg\s[^>]*xmlns=/); expect(game.pictogram).toMatch(/<\/svg>$/); expect(game.pictogram).not.toMatch(/NaN|undefined/);
    }
});
it('every character and expression renders finite SVG, including reduced motion', () => {
    for (const id of ids) for (const expression of expressions) for (const motion of ['full', 'reduce'] as const) {
        const svg = characterSvg(id, expression, 'celebration', motion);
        expect(svg).toMatch(/^<svg\s/); expect(svg).toMatch(/<\/svg>$/); expect(svg).not.toMatch(/NaN|undefined|Infinity/);
        expect(drawList(id, 'face', expression, 'special', 800, 'reduce')).toEqual(drawList(id, 'face', expression, 'special', 0, 'reduce'));
    }
});
