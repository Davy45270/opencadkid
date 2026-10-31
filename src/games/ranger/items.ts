import type { ObjectItem, Question } from '../../engines/ranger';
import type { Locale } from '../../shell/i18n';
import { svg, icon } from '../../ui/svg';
import { volume } from '../../ui/illustration';
export const colors = { rouge: '#df6c66', vert: '#81b16b', jaune: '#edc350' };
export const categoryLabels: Record<Locale, Record<string, string>> = { fr: { fruit: 'fruits', jouet: 'jouets', vetement: 'vêtements', animal: 'animaux', cuisine: 'cuisine' }, en: { fruit: 'fruit', jouet: 'toys', vetement: 'clothes', animal: 'animals', cuisine: 'kitchen' } };
export const labels: Record<Locale, Record<string, string>> = {
    fr: { rouge: 'rouge', vert: 'vert', jaune: 'jaune', rond: 'rond', carre: 'carré', long: 'allongé', petit: 'petit', grand: 'grand', fruit: 'les fruits, ce qui se mange', jouet: 'les jouets', vetement: 'les vêtements, ce qui se met sur soi', animal: 'les animaux', cuisine: 'les ustensiles de cuisine', oui: 'oui', non: 'non', ensemble: 'ensemble', intrus: 'intrus', color: 'Range par couleur.', shape: 'Range par forme.', size: 'Range par taille : petit ou grand.', category: 'Range par famille.', two: 'Range selon les deux indices.', find: 'Touche l’objet qui ne va pas avec les autres.' },
    en: { rouge: 'red', vert: 'green', jaune: 'yellow', rond: 'round', carre: 'square', long: 'long', petit: 'small', grand: 'large', fruit: 'fruit, things to eat', jouet: 'toys', vetement: 'clothes, things to wear', animal: 'animals', cuisine: 'kitchen tools', oui: 'yes', non: 'no', ensemble: 'together', intrus: 'odd one out', color: 'Sort by colour.', shape: 'Sort by shape.', size: 'Sort by size: small or large.', category: 'Sort by family.', two: 'Sort using both clues.', find: 'Touch the object that does not belong.' }
};
const drawings: Record<string, string> = {
    citron: '<path d="M32 2Q60 14 54 38L40 62Q5 55 9 29Z"/><path d="M23 13L17 26M40 43L35 54" fill="none"/>',
    peche: '<path d="M32 9Q6 -2 3 28Q0 55 32 62Q64 55 61 28Q58 -2 32 9Z"/><path d="M32 9Q22 30 32 53M33 9Q37 0 53 3Q51 16 33 9" fill="none"/>',
    prune: '<path d="M32 7Q6 3 10 35Q11 58 32 62Q55 58 55 31Q56 4 32 7Z"/><path d="M32 9L36 2M34 14Q46 30 37 53" fill="none"/>',
    orange: '<circle cx="32" cy="33" r="29"/><path d="M31 6L34 2M35 8Q48 0 55 6Q47 17 35 8" fill="none"/><circle cx="19" cy="30" r="1"/><circle cx="39" cy="46" r="1"/>',
    voiture: '<path d="M2 29L12 24L21 8H43L53 26H62V49H2Z"/><path d="M22 13L16 26H48L40 13Z" fill="#fff5dc"/><circle cx="15" cy="50" r="10" fill="#58443b"/><circle cx="49" cy="50" r="10" fill="#58443b"/>',
    cerfvolant: '<path d="M32 2L62 27L32 57L2 27Z"/><path d="M32 2V62M2 27H62M32 57L40 62" fill="none"/>',
    tambour: '<path d="M3 17Q32 3 61 17V50Q32 66 3 50Z"/><ellipse cx="32" cy="17" rx="29" ry="12"/><path d="M5 27L15 52L27 30L41 55L59 27" fill="none"/>',
    toupie: '<path d="M27 2H37V17L60 29Q55 48 32 62Q9 48 4 29L27 17Z"/><path d="M4 29Q32 41 60 29M11 40Q32 49 53 40" fill="none"/>',
    bonnet: '<path d="M8 47V31Q8 6 32 6Q56 6 56 31V47H61V60H3V47Z"/><path d="M8 47H56M22 19L19 41M42 19L45 41" fill="none"/><circle cx="32" cy="7" r="5"/>',
    gant: '<path d="M20 62V43L4 29Q1 20 9 18L22 29V8Q22 1 29 3Q34 4 34 11V25L38 5Q42 0 46 6V26L50 12Q57 9 58 17V41L49 62Z"/><path d="M21 52H50" fill="none"/>',
    pantalon: '<path d="M9 2H55L61 60H37L32 29L27 60H3Z"/><path d="M10 11H54M32 11V26M14 12L12 23M50 12L52 23" fill="none"/>',
    echarpe: '<path d="M12 2H51V15H39V62H22V15H12Z"/><path d="M24 24H37M24 35H37M24 46H37M25 56V62M31 56V62M37 56V62" fill="none"/>',
    poisson: '<path d="M45 29L62 12V53L45 39Q22 64 2 34Q22 4 45 29Z"/><circle cx="18" cy="29" r="4" fill="#fff5dc"/><circle cx="18" cy="29" r="2" fill="#354e41"/><path d="M31 23Q42 34 31 45" fill="none"/>',
    lapin: '<path d="M19 31Q3 0 17 2Q28 4 28 27H36Q39 0 50 2Q62 9 45 32Q62 58 32 62Q1 58 19 31Z"/><circle cx="24" cy="42" r="2" fill="#354e41"/><circle cx="40" cy="42" r="2" fill="#354e41"/><path d="M28 51L32 55L36 51" fill="none"/>',
    tortue: '<path d="M13 21L5 12L1 18L10 29L2 49L9 54L18 46H46L55 54L62 48L54 29L62 17L55 11L47 21Z"/><ellipse cx="32" cy="34" rx="25" ry="22"/><circle cx="32" cy="9" r="7"/><path d="M32 14L19 25L21 43L32 55L45 43L46 25ZM8 33H20M45 33H56" fill="none"/>',
    bol: '<path d="M2 14H62Q61 52 32 60Q3 52 2 14Z"/><ellipse cx="32" cy="14" rx="30" ry="8" fill="#fff5dc"/><path d="M9 31Q32 39 55 31" fill="none"/>',
    cuillere: '<path d="M32 2C4 2 7 30 25 35V59Q32 65 39 59V35C57 30 60 2 32 2Z"/><path d="M21 11Q14 22 25 27" fill="none"/>',
    casserole: '<path d="M11 22H53V49Q32 66 11 49Z"/><path d="M11 27H2V42H11M53 27H62V42H53M8 20H56M25 13V7H39V13" fill="none"/>',
    pomme: '<path d="M32 17C4 2 0 57 25 59Q32 56 39 59C64 57 60 2 32 17Z"/><path d="M32 19L36 3M35 9Q50 0 52 8Q44 18 35 9" fill="none"/>',
    poire: '<path d="M26 5Q40 1 40 23C39 34 59 38 54 51Q47 64 17 57Q0 47 18 29Q25 22 26 5Z"/><path d="M31 9L36 1" fill="none"/>',
    ballon: '<circle cx="32" cy="32" r="29"/><path d="M10 13Q48 18 49 54M4 37Q31 13 57 28" fill="none"/>',
    cube: '<path d="M3 13L48 3L61 17V57L16 61L3 47Z"/><path d="M3 13L16 25L61 17M16 25V61" fill="none"/>',
    pull: '<path d="M21 4L3 14L5 35L16 31V60H49V31L59 35L61 14L43 4Q32 16 21 4Z"/><path d="M18 50H47" fill="none"/>',
    chaussette: '<path d="M24 3H50V39Q65 57 45 60H12Q-2 56 8 44L24 34Z"/><path d="M25 12H49M17 40L29 55" fill="none"/>',
    chat: '<path d="M5 5L22 15Q32 10 42 15L59 5V37Q59 61 32 61Q5 61 5 37Z"/><circle cx="21" cy="30" r="3" fill="#354e41"/><circle cx="43" cy="30" r="3" fill="#354e41"/><path d="M28 40L32 44L36 40M32 44V49M9 42H23M41 42H56" fill="none"/>',
    chien: '<path d="M20 4Q32 0 43 5L50 19V52Q43 63 25 60L14 47V23Z"/><path d="M20 6Q0 5 4 32Q15 40 21 20M43 6Q63 4 60 31Q52 39 43 20"/><circle cx="28" cy="24" r="2" fill="#354e41"/><circle cx="41" cy="24" r="2" fill="#354e41"/><path d="M27 40Q35 47 43 40" fill="none"/>',
    assiette: '<circle cx="32" cy="32" r="29"/><circle cx="32" cy="32" r="20" fill="none"/>',
    spatule: '<path d="M17 3H48V28L38 34V60H27V34L17 28Z"/><path d="M25 9V23M33 9V23M41 9V23" fill="none"/>',
    puzzle: '<path d="M2 2H62V62H2Z"/><path d="M2 32H22Q18 22 27 22Q36 22 32 32H62M32 2V15M32 32V62" fill="none"/>',
    serviette: '<path d="M3 3H61V61H3Z"/><path d="M10 10H54V54H10ZM12 12L52 52" fill="none"/>'
};
export function objectSvg(o: ObjectItem, locale: Locale): string {
    return svg(volume(`<g fill="${colors[o.color]}" stroke="#58443b" stroke-width="2" stroke-linejoin="round">${drawings[o.kind]!}</g>`)).replace('aria-hidden="true"', `role="img" aria-label="${o.names[locale]}, ${labels[locale][o.color]!}, ${labels[locale][o.size]!}"`);
}
export function pic(value: string): string {
    if (value in colors) return svg(`<path d="M8 8Q34 -2 56 12L60 44Q40 66 8 54Z" fill="${colors[value as keyof typeof colors]}"/>`);
    if (value === 'rond') return svg('<circle cx="32" cy="32" r="27" fill="#a8a2bd"/>');
    if (value === 'carre') return svg('<rect x="5" y="5" width="54" height="54" rx="4" fill="#a8a2bd"/>');
    if (value === 'long') return svg('<rect x="20" y="3" width="24" height="58" rx="10" fill="#a8a2bd"/>');
    if (value === 'petit' || value === 'grand') return svg(`<circle cx="32" cy="32" r="${value === 'petit' ? 14 : 28}" fill="#a8a2bd"/>`);
    if (value === 'oui') return icon('check');
    if (value === 'non' || value === 'intrus') return icon('close');
    const categoryKinds: Record<string, string> = { fruit: 'pomme', jouet: 'ballon', vetement: 'pull', animal: 'chat', cuisine: 'spatule' };
    const kind = categoryKinds[value];
    return kind ? svg(volume(`<g fill="#c2af91" stroke="#58443b" stroke-width="2">${drawings[kind]!}</g>`)) : icon('basket');
}
export function instruction(q: Question, locale: Locale): string {
    const l = labels[locale];
    if (q.rule === 'intrus') return `${l.find!} ${l[q.category]!}.`;
    if (q.rule === 'two') return `${l.two!} ${l[q.category]!}, ${l[q.color]!}. ${l.oui!} / ${l.non!}.`;
    return `${l[q.rule]!} ${q.bins.map(b => l[b]!).join(' ; ')}.`;
}
export const pictogram = svg('<path d="M2 28H29V59H2ZM35 28H62V59H35Z" fill="#cfbc9d"/><circle cx="15" cy="15" r="11" fill="#df6c66"/><path d="M37 4H59V25H37Z" fill="#81b16b"/>');
