/** The spelling checker of the word dictation: pure, deterministic, no language model.
 * The child's answer and the expected word are normalised (Unicode NFC, apostrophes, spaces) without erasing what
 * matters for spelling (accents, case, letters), aligned letter by letter by dynamic programming, then each difference
 * is classified so that the explanation fits the mistake: a missing letter, an accent, a double consonant, a sound
 * written another way, a silent letter, an agreement ending, a homophone… */

export type ErrorType = 'omission' | 'ajout' | 'substitution' | 'accent' | 'casse' | 'double-consonne' | 'lettre-muette' | 'son' | 'homophone' | 'accord';
export interface SpellingError {
    type: ErrorType;
    /** Where in the expected word, as `[start, end)` letter indices (an insertion has `start === end`). */
    start: number; end: number;
    expected: string; got: string;
}
/** One letter of the expected word, as shown on the turned card: right, or to look at. */
export type Mark = 'ok' | 'faux';
export interface Evaluation {
    exact: boolean;
    answer: string; expected: string;
    errors: SpellingError[];
    marks: Mark[];
    /** 1 for a perfect word, down to 0; accents and case weigh half and a quarter of a letter. Two decimals. */
    score: number;
    /** The letters only (accents and case ignored), and the form only (accents and case). */
    contentScore: number; formScore: number;
}

/** NFC, typographic apostrophes, every run of spaces as one space, no space at the ends. */
export function normalize(text: string): string {
    return text.normalize('NFC').replace(/[’ʼ‘]/g, "'").replace(/\s+/g, ' ').trim();
}
/** A letter without its accent (é → e, ç → c), case kept. */
export function base(ch: string): string { return ch.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
const VOWELS = 'aeiouy';

type Op = { kind: 'egal' | 'sub' | 'manque' | 'ajout'; i: number; j: number };
const subCost = (e: string, a: string): number => e === a ? 0 : e.toLowerCase() === a.toLowerCase() ? .25 : base(e).toLowerCase() === base(a).toLowerCase() ? .5 : 1;

/** Letter alignment by dynamic programming (weighted edit distance). Ties prefer, in order: a substitution or a
 * match, a missing letter, an extra letter, so that the same answer always gives the same alignment. */
export function align(expected: string, answer: string): { ops: Op[]; cost: number } {
    const E = Array.from(expected), A = Array.from(answer), n = E.length, m = A.length;
    const d: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
        d[i]![j] = Math.min(d[i - 1]![j - 1]! + subCost(E[i - 1]!, A[j - 1]!), d[i - 1]![j]! + 1, d[i]![j - 1]! + 1);
    const ops: Op[] = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && d[i]![j] === d[i - 1]![j - 1]! + subCost(E[i - 1]!, A[j - 1]!)) { ops.push({ kind: E[i - 1] === A[j - 1] ? 'egal' : 'sub', i: i - 1, j: j - 1 }); i--; j--; }
        else if (i > 0 && d[i]![j] === d[i - 1]![j]! + 1) { ops.push({ kind: 'manque', i: i - 1, j }); i--; }
        else { ops.push({ kind: 'ajout', i, j: j - 1 }); j--; }
    }
    return { ops: ops.reverse(), cost: d[n]![m]! };
}

/** Spellings of the same sound, the classic traps of French dictation. */
export const SOUND_GROUPS: readonly (readonly string[])[] = [
    ['o', 'au', 'eau', 'ô', 'ot', 'aux', 'eaux'], ['an', 'en', 'am', 'em'], ['in', 'ain', 'ein', 'im', 'un', 'aim'],
    ['s', 'ss', 'c', 'ç', 'sc', 't'], ['k', 'c', 'qu', 'ck', 'q'], ['f', 'ph'], ['é', 'er', 'ez', 'ai', 'et', 'ée', 'es'],
    ['è', 'ai', 'ei', 'ê', 'e', 'et'], ['g', 'gu'], ['j', 'g', 'ge'], ['z', 's'], ['ill', 'y', 'il', 'ille'], ['oi', 'oy', 'oie'],
    ['eu', 'œu', 'oeu'], ['on', 'om'], ['gn', 'ni'], ['ou', 'oo'], ['x', 'cs', 'ks'],
];
const sameSound = (e: string, g: string): boolean => e !== g && SOUND_GROUPS.some(group => group.includes(e) && group.includes(g));

/** Classifies a run of differences `expected[i0, i1)` written as `got`. */
function classify(E: string[], i0: number, i1: number, got: string, A: string[], j0: number, j1: number): ErrorType {
    const exp = E.slice(i0, i1).join('');
    if (exp.length === got.length && exp.length > 0) {
        if (exp.toLowerCase() === got.toLowerCase()) return 'casse';
        if (Array.from(exp).every((c, k) => base(c).toLowerCase() === base(got[k]!).toLowerCase())) return 'accent';
    }
    const lo = exp.toLowerCase(), go = got.toLowerCase();
    // A doubled consonant written once, or a single one written twice.
    if (go === '' && lo.length === 1 && !VOWELS.includes(lo) && (E[i0 - 1]?.toLowerCase() === lo || E[i1]?.toLowerCase() === lo)) return 'double-consonne';
    if (lo === '' && go.length === 1 && !VOWELS.includes(go) && (A[j0 - 1]?.toLowerCase() === go || A[j1]?.toLowerCase() === go)) return 'double-consonne';
    // A sound written another way: the run, widened by up to two shared letters on each side.
    for (let l = 0; l <= 2; l++) for (let r = 0; r <= 2; r++) {
        if (i0 - l < 0 || i1 + r > E.length || j0 - l < 0 || j1 + r > A.length) continue;
        const e = E.slice(i0 - l, i1 + r).join('').toLowerCase(), g = A.slice(j0 - l, j1 + r).join('').toLowerCase();
        if (E.slice(i0 - l, i0).join('').toLowerCase() !== A.slice(j0 - l, j0).join('').toLowerCase()) continue;
        if (E.slice(i1, i1 + r).join('').toLowerCase() !== A.slice(j1, j1 + r).join('').toLowerCase()) continue;
        if (sameSound(e, g)) return 'son';
    }
    // A letter at the very end that is not heard.
    if (go === '' && i1 === E.length && j1 === A.length && /^[tdspxzeh]+$/.test(lo) && lo.length <= 2) return 'lettre-muette';
    return go === '' ? 'omission' : lo === '' ? 'ajout' : 'substitution';
}

const round2 = (x: number): number => Math.round(Math.max(0, Math.min(1, x)) * 100) / 100;
const FORM: readonly ErrorType[] = ['accent', 'casse'];

/** Compares the child's answer with the expected word. `homophones` are the other words heard the same way. */
export function evaluate(expectedRaw: string, answerRaw: string, homophones: readonly string[] = []): Evaluation {
    const expected = normalize(expectedRaw), answer = normalize(answerRaw);
    const E = Array.from(expected), A = Array.from(answer);
    const result = (errors: SpellingError[], marks: Mark[], cost: number, formCost: number): Evaluation => ({
        exact: errors.length === 0, answer, expected, errors, marks,
        score: round2(1 - cost / Math.max(1, E.length)), contentScore: round2(1 - (cost - formCost) / Math.max(1, E.length)), formScore: round2(1 - formCost / Math.max(1, E.length)),
    });
    if (answer === expected) return result([], E.map(() => 'ok'), 0, 0);
    const { ops, cost } = align(expected, answer);
    const marks: Mark[] = E.map(() => 'ok');
    for (const op of ops) if (op.kind !== 'egal') marks[Math.min(op.i, E.length - 1)] = 'faux';
    const lower = answer.toLowerCase();
    // Whole-word mistakes: another word heard the same, or an agreement ending added to the word.
    if (homophones.some(h => normalize(h).toLowerCase() === lower))
        return result([{ type: 'homophone', start: 0, end: E.length, expected, got: answer }], E.map(() => 'faux'), cost, 0);
    if (lower.startsWith(expected.toLowerCase()) && /^(?:s|x|e|es|ent)$/.test(lower.slice(expected.length)))
        return result([{ type: 'accord', start: E.length, end: E.length, expected: '', got: answer.slice(expected.length) }], marks, cost, 0);
    const errors: SpellingError[] = [];
    let formCost = 0;
    for (let k = 0; k < ops.length;) {
        if (ops[k]!.kind === 'egal') { k++; continue; }
        let end = k;
        while (end < ops.length && ops[end]!.kind !== 'egal') end++;
        const run = ops.slice(k, end);
        const iList = run.filter(o => o.kind !== 'ajout').map(o => o.i), jList = run.filter(o => o.kind !== 'manque').map(o => o.j);
        const i0 = iList.length ? Math.min(...iList) : run[0]!.i, i1 = iList.length ? Math.max(...iList) + 1 : i0;
        const j0 = jList.length ? Math.min(...jList) : run[0]!.j, j1 = jList.length ? Math.max(...jList) + 1 : j0;
        const got = A.slice(j0, j1).join('');
        const type = classify(E, i0, i1, got, A, j0, j1);
        if (FORM.includes(type)) formCost += run.reduce((s, o) => s + subCost(E[o.i]!, A[o.j]!), 0);
        errors.push({ type, start: i0, end: i1, expected: E.slice(i0, i1).join(''), got });
        k = end;
    }
    return result(errors, marks, cost, formCost);
}
/** The mistake the explanation talks about: the first that is not only a matter of form, else the first. */
export function mainError(e: Evaluation): SpellingError | null {
    return e.errors.find(x => !FORM.includes(x.type)) ?? e.errors[0] ?? null;
}
