import { shapeSvg } from './games/formes/shapes';
import type { CharacterId } from './characters/model';
import { cardBack } from './games/paires/motifs';
import { icon } from './ui/svg';
export interface Game { id: string; names: { fr: string; en: string }; guide: CharacterId; pictogram: string; skill: { fr: string; en: string } }
export const games: readonly Game[] = [{ id: 'compter', names: { fr: 'Les paniers de Boubou', en: "Boubou's baskets" }, guide: 'panda', pictogram: icon('basket'), skill: { fr: 'Dénombrer, constituer, comparer', en: 'Count, build quantities, compare' } }, { id: 'paires', names: { fr: 'Les cartes de Lumi', en: "Lumi's cards" }, guide: 'licorne', pictogram: cardBack(), skill: { fr: 'Mémoire', en: 'Memory' } }, { id: 'formes', names: { fr: 'Les formes de CaliRoux', en: "CaliRoux's shapes" }, guide: 'pandaroux', pictogram: shapeSvg({ shape: 'triangle', color: 'bleu', size: 'grand' }), skill: { fr: 'Formes et couleurs', en: 'Shapes and colours' } }];
