import { objectSvg } from '../../ui/svg';
import { props, type Kind } from '../../engines/cherche';
import type { Locale } from '../../shell/i18n';
type Prop = typeof props[number];
/** Props from Petits Pompiers (Opencade), already published there: small hashed WebP files, precached for offline play.
 * `new URL(literal, import.meta.url)` lets Vite emit each file and lets Node-side tests load this module. */
export const propUrl: Record<Prop, string> = {
    borne: new URL('./props/cherche-borne.webp', import.meta.url).href,
    banc: new URL('./props/cherche-banc.webp', import.meta.url).href,
    caisse: new URL('./props/cherche-caisse.webp', import.meta.url).href,
    buisson_fleuri: new URL('./props/cherche-buisson_fleuri.webp', import.meta.url).href,
    chaton_heureux: new URL('./props/cherche-chaton_heureux.webp', import.meta.url).href,
    chien_face: new URL('./props/cherche-chien_face.webp', import.meta.url).href,
    lapin_face: new URL('./props/cherche-lapin_face.webp', import.meta.url).href,
    lampadaire: new URL('./props/cherche-lampadaire.webp', import.meta.url).href,
    outil_extincteur: new URL('./props/cherche-outil_extincteur.webp', import.meta.url).href,
    outil_megaphone: new URL('./props/cherche-outil_megaphone.webp', import.meta.url).href,
    outil_trousse: new URL('./props/cherche-outil_trousse.webp', import.meta.url).href,
    poubelle: new URL('./props/cherche-poubelle.webp', import.meta.url).href,
    jardiniere: new URL('./props/cherche-jardiniere.webp', import.meta.url).href,
    souche: new URL('./props/cherche-souche.webp', import.meta.url).href,
    sapin: new URL('./props/cherche-sapin.webp', import.meta.url).href,
    camion: new URL('./props/cherche-camion.webp', import.meta.url).href,
    pompier_panda_S: new URL('./props/cherche-pompier_panda_S.webp', import.meta.url).href,
    pompier_licorne_S: new URL('./props/cherche-pompier_licorne_S.webp', import.meta.url).href,
    pompier_dragon_S: new URL('./props/cherche-pompier_dragon_S.webp', import.meta.url).href,
    pompier_pandaroux_S: new URL('./props/cherche-pompier_pandaroux_S.webp', import.meta.url).href
};
export const names: Record<Locale, Record<Kind, string>> = {
    fr: {
        borne: 'la bouche d’incendie', banc: 'le banc', caisse: 'la caisse', buisson_fleuri: 'le buisson fleuri', chaton_heureux: 'le chaton', chien_face: 'le chien',
        lapin_face: 'le lapin', lampadaire: 'le lampadaire', outil_extincteur: 'l’extincteur', outil_megaphone: 'le mégaphone', outil_trousse: 'la trousse de secours',
        poubelle: 'la poubelle', jardiniere: 'la jardinière', souche: 'la souche', sapin: 'le sapin', camion: 'le camion de pompiers', pompier_panda_S: 'Boubou pompier',
        pompier_licorne_S: 'Lumi pompier', pompier_dragon_S: 'Pestouille pompier', pompier_pandaroux_S: 'CaliRoux pompier',
        apple: 'la pomme', pear: 'la poire', berry: 'la fraise', carrot: 'la carotte', star: 'l’étoile', fish: 'le poisson', flower: 'la fleur'
    },
    en: {
        borne: 'the fire hydrant', banc: 'the bench', caisse: 'the crate', buisson_fleuri: 'the flowering bush', chaton_heureux: 'the kitten', chien_face: 'the dog',
        lapin_face: 'the rabbit', lampadaire: 'the street lamp', outil_extincteur: 'the fire extinguisher', outil_megaphone: 'the megaphone', outil_trousse: 'the first-aid kit',
        poubelle: 'the bin', jardiniere: 'the flower box', souche: 'the tree stump', sapin: 'the fir tree', camion: 'the fire engine', pompier_panda_S: 'Boubou the firefighter',
        pompier_licorne_S: 'Lumi the firefighter', pompier_dragon_S: 'Pestouille the firefighter', pompier_pandaroux_S: 'CaliRoux the firefighter',
        apple: 'the apple', pear: 'the pear', berry: 'the strawberry', carrot: 'the carrot', star: 'the star', fish: 'the fish', flower: 'the flower'
    }
};
const isProp = (kind: Kind): kind is Prop => (props as readonly Kind[]).includes(kind);
/** Width over height of each prop picture, so its shadow is as wide as the object it lies under. */
const propAspect: Record<Prop, number> = {
    borne: 48 / 76, banc: 92 / 63, caisse: 91 / 87, buisson_fleuri: 94 / 81, chaton_heureux: 70 / 77, chien_face: 54 / 78, lapin_face: 37 / 90, lampadaire: 54 / 139,
    outil_extincteur: 56 / 64, outil_megaphone: 62 / 56, outil_trousse: 64 / 55, poubelle: 48 / 65, jardiniere: 78 / 70, souche: 90 / 60, sapin: 121 / 216, camion: 174 / 102,
    pompier_panda_S: 81 / 113, pompier_licorne_S: 77 / 126, pompier_dragon_S: 96 / 111, pompier_pandaroux_S: 99 / 110
};
/** Drawn width of an object in a size × size box: props fit the box by their longer side, the drawn fruits fill about 4/5 of it. */
export const artWidth = (kind: Kind, size: number): number => isProp(kind) ? size * Math.min(1, propAspect[kind]) : size * .8;
/** Drawn height of the same object: a wide prop is shorter than its box, the drawn fruits fill about 7/8 of it. */
export const artHeight = (kind: Kind, size: number): number => isProp(kind) ? size * Math.min(1, 1 / propAspect[kind]) : size * .86;
/** The object drawn in a size × size box centred on (x, y). A prop stands on the bottom of its box, where its shadow lies. */
export function itemArt(kind: Kind, x: number, y: number, size: number): string {
    const box = `x="${(x - size / 2).toFixed(1)}" y="${(y - size / 2).toFixed(1)}" width="${size}" height="${size}"`;
    if (isProp(kind)) return `<image href="${propUrl[kind]}" ${box} preserveAspectRatio="xMidYMax meet"/>`;
    return objectSvg(kind).replace('<svg ', `<svg ${box} `);
}
