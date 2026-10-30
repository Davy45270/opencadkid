import { makeRng, shuffle } from '../engines/rng';
export function parentalQuestion(seed: number): { a: number; b: number; choices: number[]; answer: number } {
    const rng = makeRng(seed);
    const a = 3 + Math.floor(rng() * 7), b = 3 + Math.floor(rng() * 7);
    const answer = a * b;
    return { a, b, answer, choices: shuffle([answer, answer + a, answer - b], rng) };
}
export function checkParental(question: ReturnType<typeof parentalQuestion>, choice: number): boolean { return question.answer === choice; }
