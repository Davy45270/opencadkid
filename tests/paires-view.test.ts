import { it, expect } from 'vitest';
import { endPreview, newBoard } from '../src/engines/paires';
import { gameView } from '../src/games/paires/view';
it('shadow level renders the actual silhouette fill on each shadow card face', () => {
    const state = endPreview(newBoard(7, 71));
    const html = gameView(state, 'fr');
    const cards = [...html.matchAll(/<button data-card="(\d+)"[^>]*>(.*?)<\/button>/g)];
    expect(cards).toHaveLength(12);
    for (const card of cards) {
        const model = state.cards[Number(card[1])]!;
        const face = card[2]!.split('class="memory-card-face"')[1]!;
        expect(face).toContain(`data-motif="${model.motif}"`);
        if (model.shadow) expect(face).toContain('fill="#354e41"');
        else expect(face).not.toContain('fill="#354e41"');
    }
});
