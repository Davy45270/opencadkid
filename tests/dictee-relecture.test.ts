import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/** Corrections of the spelling review of 2026-11-19 (two independent proofreaders, then arbitration): each one is pinned,
 * so that an old text never comes back. A word whose text changed waits for an adult again before a child sees it
 * (scripts/dictee/importer_validation.py --approuver shows the exact text approved). */
const words = new Map((JSON.parse(readFileSync('public/dictee/catalogue.json', 'utf8')) as { words: { id: string; contextSentence: string | null; explanation: string | null; homophones: string[]; status: string; validatedBy: string | null; provenance: { correction?: string } }[] }).words.map(w => [w.id, w]));
const texts: [id: string, field: 'contextSentence' | 'explanation', now: string, before: string][] = [
    ["fr-ami", "contextSentence", "Un ami vient jouer avec moi.", "Mon ami joue avec moi."],
    ["fr-lit", "contextSentence", "Je dors dans mon lit.", "Je lis une histoire dans mon lit."],
    ["fr-juge", "contextSentence", "Le juge écoute les témoins au tribunal.", "Le juge écoute les deux équipes."],
    ["fr-visage", "contextSentence", "Je me lave le visage.", "Je lave mon visage."],
    ["fr-affaire", "contextSentence", "Ce cartable pas cher est une bonne affaire.", "Mon cartable est une bonne affaire."],
    ["fr-fait", "contextSentence", "J'ai fait un beau dessin.", "C'est un fait : le soleil se lève."],
    ["fr-plus", "contextSentence", "Je veux encore plus de soupe.", "Je veux plus de soupe."],
    ["fr-fortune", "contextSentence", "Ce trésor vaut une fortune.", "Le pirate cherche une fortune."],
    ["fr-propre", "contextSentence", "Mon visage est propre.", "Mes mains sont propres et mon visage est propre."],
    ["fr-suite", "contextSentence", "Nous lirons la suite de l'histoire demain.", "La suite de l'histoire est demain."],
    ["fr-mauvais", "contextSentence", "Ce fruit a mauvais goût.", "Ce fruit a un goût mauvais."],
    ["fr-serrer", "contextSentence", "Je vais serrer la main de mon ami.", "Je vais serrer mon doudou."],
    ["fr-echapper", "contextSentence", "Le lapin a réussi à échapper au renard.", "Le lapin a réussi à s'échapper."],
    ["fr-huit", "explanation", "Un h au début, qu'on n'entend pas ; le t de la fin s'entend.", "Un h muet au début ; le t de la fin s'entend."],
    ["fr-maman", "explanation", "On écrit ma, puis man : à la fin, le son an s'écrit a-n.", "Deux fois ma ; à la fin, le son an s'écrit a-n."],
    ["fr-ecole", "explanation", "Accent aigu sur le premier e ; le son k s'écrit c.", "Accent aigu sur le e ; le son k s'écrit c."],
    ["fr-aile", "explanation", "Le son è s'écrit ai ; un e muet à la fin ; à ne pas confondre avec « elle » (elle joue).", "Le son è s'écrit ai ; un e muet à la fin ; « elle », c'est une fille."],
    ["fr-aimer", "explanation", "Le début s'écrit ai ; c'est un verbe en er : il finit par e-r.", "Le début s'écrit ai ; c'est un verbe : il finit par er."],
    ["fr-blanc", "explanation", "Un c muet à la fin : on le retrouve dans « blanche ».", "Un c muet à la fin : il s'entend dans « blanche »."],
    ["fr-lego", "explanation", "C'est un nom de marque : il prend une majuscule ; on entend « é », mais le e n'a pas d'accent.", "C'est un nom de marque : il prend une majuscule."],
    ["fr-pere", "explanation", "Accent grave sur le e ; une paire, c'est deux choses qui vont ensemble.", "Accent grave sur le e ; une paire, c'est deux choses."],
    ["fr-temps", "explanation", "Le son an s'écrit e-m ; deux lettres muettes à la fin : p et s ; « tant » veut dire « tellement ».", "Deux lettres muettes à la fin : p et s ; « tant » veut dire « autant »."],
    ["fr-rayon", "explanation", "Le y entre deux voyelles vaut deux i : « rai-ion ».", "Le y fait le son de deux i : « rai-ion »."],
    ["fr-voyage", "explanation", "Le y entre deux voyelles vaut deux i : « voi-iage ».", "Le y fait le son de deux i : « voi-iage »."],
    ["fr-arreter", "explanation", "Deux r et un accent circonflexe sur le premier e.", "Deux r et un accent circonflexe sur le e."],
    ["fr-fond", "explanation", "Un d muet à la fin : il s'entend dans « profonde ».", "Un d muet à la fin : il s'entend dans « fondu »."],
    ["fr-lever", "explanation", "Pas d'accent sur le e après le l ; verbe en er.", "Un seul e après le l, sans accent."],
    ["fr-lumiere", "explanation", "Accent grave sur le premier e.", "Accent grave sur le e."],
    ["fr-pensee", "explanation", "Le nom finit par é et un e muet, comme « journée » ; le verbe « penser » finit par e-r.", "C'est un nom : il finit par é et un e muet."],
    ["fr-repondre", "explanation", "Accent aigu sur le premier e ; le son on s'écrit o-n.", "Accent aigu sur le e ; le son on s'écrit o-n."],
    ["fr-action", "explanation", "Ici, le t devant i fait le son s : on écrit t-i-o-n.", "Ici, ti fait le son s : on écrit t-i-o-n."],
    ["fr-cependant", "explanation", "Le premier son an s'écrit en, le second an ; un t muet à la fin.", "Le son an s'écrit an ; un t muet à la fin."],
    ["fr-compte", "explanation", "Un p muet avant le t ; le comte est un noble, le conte est une histoire.", "Un p muet avant le t ; le comte est un noble."],
    ["fr-envoyer", "explanation", "Le y entre deux voyelles vaut deux i.", "Le y entre deux voyelles fait le son de deux i."],
    ["fr-espece", "explanation", "Accent grave sur le deuxième e ; le c devant e fait le son s.", "Accent grave ; le c devant e fait le son s."],
    ["fr-essayer", "explanation", "Deux s ; le y entre deux voyelles vaut deux i.", "Deux s ; le y fait le son de deux i."],
    ["fr-moyen", "explanation", "Le y entre deux voyelles vaut deux i : « moi-ien ».", "Le y fait le son de deux i : « moi-ien »."],
    ["fr-payer", "explanation", "Le y entre deux voyelles vaut deux i.", "Le y fait le son de deux i."],
    ["fr-travers", "explanation", "Un s muet à la fin, même pour un seul : « à travers ».", "Mot invariable : un s muet à la fin."],
    ["fr-vraiment", "explanation", "Le son è s'écrit ai ; pas de e entre « vrai » et « ment ».", "Le son è s'écrit ai ; un e qu'on n'entend pas avant ment."],
    ["fr-cours", "explanation", "Un s muet à la fin ; la cour, c'est le lieu où l'on joue à la récréation.", "Un s muet à la fin ; la cour, c'est la récréation."],
    ["fr-empecher", "explanation", "Devant p, on écrit em ; accent circonflexe sur le deuxième e.", "Devant p, on écrit em ; accent circonflexe sur le e."],
    ["fr-journee", "explanation", "Un é puis un e muet à la fin : -ée, comme dans « soirée ».", "Un é et un e muet à la fin : c'est un nom féminin."],
    ["fr-situation", "explanation", "Ici, le t devant i fait le son s : on écrit t-i-o-n.", "Ici, ti fait le son s : on écrit t-i-o-n."],
    ["fr-systeme", "explanation", "Le y fait le son i ; accent grave sur le premier e.", "Le y fait le son i ; accent grave sur le e."],
];
const homophones: [id: string, added: string[], removed: string[]][] = [
    ["fr-air", ["aire"], []],
    ["fr-cour", ["cours"], []],
    ["fr-mur", ["mûr", "mûre"], []],
    ["fr-verre", ["ver"], []],
    ["fr-vert", ["ver"], []],
    ["fr-fil", ["file"], []],
    ["fr-pain", ["pin"], []],
    ["fr-pere", ["pair"], []],
    ["fr-corps", ["cor"], []],
    ["fr-marcher", ["marché"], []],
    ["fr-trop", ["trot"], []],
    ["fr-compte", ["conte"], []],
    ["fr-compter", ["conter"], []],
    ["fr-plutot", ["plus tôt"], []],
    ["fr-signe", ["cygne"], []],
    ["fr-comme", [], ["com"]],
];
describe('the spelling review of 2026-11-19', () => {
    it('keeps every corrected sentence and tip, never the old one', () => {
        for (const [id, field, now, before] of texts) {
            const w = words.get(id);
            expect(w, id).toBeDefined();
            expect(w![field], id).toBe(now);
            expect(w![field], id).not.toBe(before);
            expect(w!.provenance.correction, id).toMatch(/relecture Codex et Google, 19\/11/);
            // The old approval was for the old text: the corrected word waits for an adult again, or a new approval names one.
            if (w!.status === 'approved') expect(w!.validatedBy, id).not.toBeNull();
            else expect(w!.status, id).toBe('needs_review');
        }
    });
    it('keeps the real homophones found, and drops the false one', () => {
        for (const [id, added, removed] of homophones) {
            const w = words.get(id)!;
            for (const h of added) expect(w.homophones, id).toContain(h);
            for (const h of removed) expect(w.homophones, id).not.toContain(h);
        }
    });
});
