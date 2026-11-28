import { makeRng, shuffle } from '../rng';

const directions = {
    E: [0, 1], W: [0, -1], N: [-1, 0], S: [1, 0],
    NE: [-1, 1], NW: [-1, -1], SE: [1, 1], SW: [1, -1],
} as const;
export type Dir = keyof typeof directions;
type Language = 'fr' | 'en';
const allDirections = Object.keys(directions) as Dir[];

interface Level {
    id: number;
    name: Record<Language, string>;
    size: number;
    minWords: number;
    maxWords: number;
    dirs: readonly Dir[];
    crossing: boolean;
}

export const levels: readonly Level[] = [
    { id: 1, name: { fr: 'Découverte', en: 'Discovery' }, size: 4, minWords: 1, maxWords: 2, dirs: ['E'], crossing: false },
    { id: 2, name: { fr: 'Apprenti', en: 'Apprentice' }, size: 5, minWords: 2, maxWords: 3, dirs: ['E', 'S'], crossing: false },
    { id: 3, name: { fr: 'Explorateur', en: 'Explorer' }, size: 6, minWords: 3, maxWords: 4, dirs: ['E', 'S'], crossing: false },
];
export function levelOf(id: number): Level {
    const level = levels.find(item => item.id === id);
    if (!level) throw new RangeError(`Unknown level ${id}`);
    return level;
}

export type Records = Partial<Record<number, 1>>;
export const isUnlocked = (_records: Records, id: number): boolean => levels.some(level => level.id === id);
export function complete(records: Records, id: number): Records {
    return isUnlocked(records, id) ? { ...records, [id]: 1 } : records;
}
export function parseRecords(raw: string | null): Records {
    const records: Records = {};
    try {
        const saved: unknown = JSON.parse(raw ?? 'null');
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
            for (const { id } of levels) if (Object.hasOwn(saved, id) && (saved as Records)[id] === 1) records[id] = 1;
        }
    } catch { /* An unreadable save starts fresh. */ }
    return records;
}

const vocabulary = {
    fr: {
        animals: 'CHAT LION OURS LOUP LAPIN CHIEN ZÈBRE GIRAFE POULE CANARD',
        sky: 'LUNE MARS ÉTOILE SOLEIL CIEL COMÈTE',
        fruit: 'KIWI POIRE POMME FRAISE CITRON FIGUE',
        home: 'LIT BOL VERRE TABLE LAMPE PORTE CHAISE PAPA MAMAN',
        travel: 'BUS VÉLO TAXI TRAIN AVION BATEAU',
        nature: 'ÎLE ÉTÉ NEIGE GANT LUGE FLEUR ARBRE ROSE HERBE PLAGE',
    },
    en: {
        animals: 'CAT DOG BEAR WOLF LION TIGER ZEBRA RABBIT HEN DUCK',
        sky: 'MOON MARS STAR SUN SKY COMET',
        fruit: 'KIWI PEAR APPLE LEMON PLUM PEACH',
        home: 'BED BOWL CUP TABLE LAMP DOOR CHAIR MUM DAD',
        travel: 'BUS BIKE TAXI TRAIN PLANE BOAT',
        nature: 'ISLAND SUMMER SNOW GLOVE SLED FLOWER TREE ROSE LEAF BEACH',
    },
};
function entries(language: Language) {
    return Object.entries(vocabulary[language]).flatMap(([theme, words]) =>
        words.split(' ').map(word => ({ id: word.toLowerCase(), word, theme })));
}
export const dictionary = entries('fr');
const english = entries('en');
export const BLOCKED = ['CON', 'CUL', 'PUTE', 'MERDE', 'CONNE', 'PÈTE', 'CHIE', 'ZIZI', 'ASS', 'FUCK', 'SHIT', 'DICK'] as const;

export interface Placement { word: string; row: number; col: number; dir: Dir }
export interface Grid {
    size: number;
    letters: readonly string[];
    placements: readonly Placement[];
    seed: number;
    fallback: boolean;
    version: string;
}

function path(size: number, row: number, col: number, dir: Dir, length: number): number[] | null {
    const [dr, dc] = directions[dir];
    const endRow = row + dr * (length - 1), endCol = col + dc * (length - 1);
    if ([row, col, endRow, endCol].some(n => n < 0 || n >= size)) return null;
    return Array.from({ length }, (_, i) => (row + i * dr) * size + col + i * dc);
}
export function placementCells(size: number, placement: Placement): number[] {
    return path(size, placement.row, placement.col, placement.dir, Array.from(placement.word).length) ?? [];
}

export function place(words: readonly string[], size: number, dirs: readonly Dir[], crossing: boolean, rng: () => number): Placement[] | null {
    const sorted = words.map(word => ({ word, letters: Array.from(word) })).sort((a, b) => b.letters.length - a.letters.length);
    if (sorted.some(item => item.letters.length > size)) throw new RangeError('Word longer than the grid');
    if (!crossing && sorted.reduce((sum, item) => sum + item.letters.length, 0) > size * size) return null;
    const board = Array<string | undefined>(size * size).fill(undefined);
    const placements: Placement[] = [];
    let remaining = 4096;
    const candidates = sorted.map(({ word, letters }) => {
        const choices: { placement: Placement; cells: number[] }[] = [];
        for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) for (const dir of dirs) {
            const cells = path(size, row, col, dir, letters.length);
            if (cells) choices.push({ placement: { word, row, col, dir }, cells });
        }
        return shuffle(choices, rng);
    });
    function search(index: number): boolean {
        if (index === sorted.length) return true;
        const { letters } = sorted[index]!;
        for (const { placement, cells } of candidates[index]!) {
            if (remaining-- <= 0) return false;
            if (cells.some((cell, i) => board[cell] !== undefined && (!crossing || board[cell] !== letters[i]))) continue;
            const before = cells.map(cell => board[cell]);
            cells.forEach((cell, i) => { board[cell] = letters[i]; });
            placements.push(placement);
            if (search(index + 1)) return true;
            placements.pop();
            cells.forEach((cell, i) => { board[cell] = before[i]; });
        }
        return false;
    }
    return search(0) ? placements : null;
}

function occurrences(grid: Grid, word: string): number {
    const { size, letters } = grid, target = Array.from(word), matches = new Set<string>();
    for (let cell = 0; cell < letters.length; cell++) {
        if (letters[cell] !== target[0]) continue;
        for (const dir of allDirections) {
            const cells = path(size, Math.floor(cell / size), cell % size, dir, target.length);
            if (cells && cells.every((c, i) => letters[c] === target[i])) {
                matches.add(cells[0]! <= cells.at(-1)! ? cells.join(',') : cells.reverse().join(','));
            }
        }
    }
    return matches.size;
}

export function problems(grid: Grid, level: Level): string[] {
    const issues: string[] = [];
    if (grid.size !== level.size || grid.letters.length !== level.size ** 2) issues.push('size');
    if (grid.letters.some(letter => !/^\p{Lu}$/u.test(letter) || letter !== letter.normalize('NFC'))) issues.push('letters');
    if (grid.placements.length < level.minWords || grid.placements.length > level.maxWords) issues.push('word count');
    const words = new Set<string>(), used = new Set<number>();
    for (const placement of grid.placements) {
        const { word, dir } = placement;
        if (!level.dirs.includes(dir)) issues.push(`${word}: direction`);
        if (words.has(word)) issues.push(`${word}: duplicate`);
        words.add(word);
        const cells = placementCells(grid.size, placement), letters = Array.from(word);
        if (!cells.length || cells.some((cell, i) => grid.letters[cell] !== letters[i])) issues.push(`${word}: placement`);
        if (!level.crossing && cells.some(cell => used.has(cell))) issues.push(`${word}: crossing`);
        cells.forEach(cell => used.add(cell));
        if (occurrences(grid, word) !== 1) issues.push(`${word}: occurrences`);
    }
    for (const word of BLOCKED) if (occurrences(grid, word)) issues.push(`${word}: blocked`);
    return issues;
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const version = '1';
function buildGrid(level: Level, seed: number, placements: Placement[], fill: () => string, fallback: boolean): Grid {
    const letters = Array.from({ length: level.size ** 2 }, fill);
    for (const placement of placements) {
        const word = Array.from(placement.word);
        placementCells(level.size, placement).forEach((cell, i) => { letters[cell] = word[i]!; });
    }
    return { size: level.size, letters, placements, seed, fallback, version };
}

export function generate(levelId: number, seed: number, language: Language = 'fr'): Grid {
    const level = levelOf(levelId);
    const pool = (language === 'fr' ? dictionary : english).filter(entry => Array.from(entry.word).length <= level.size);
    for (let attempt = 0; attempt < 16; attempt++) {
        const rng = makeRng(seed + Math.imul(attempt, 0x9e3779b9));
        const count = level.minWords + Math.floor(rng() * (level.maxWords - level.minWords + 1));
        const words = shuffle(pool, rng).slice(0, count).map(entry => entry.word);
        const placements = place(words, level.size, level.dirs, level.crossing, rng);
        if (!placements) continue;
        const grid = buildGrid(level, seed, placements, () => alphabet[Math.floor(rng() * alphabet.length)]!, false);
        if (!problems(grid, level).length) return grid;
    }
    const words = language === 'fr' ? ['CHAT', 'LUNE', 'ROSE'] : ['BEAR', 'MOON', 'TREE'];
    const placements = words.slice(0, level.minWords).map((word, row): Placement => ({ word, row, col: 0, dir: 'E' }));
    const grid = buildGrid(level, seed, placements, () => 'Z', true);
    if (problems(grid, level).length) throw new Error('Invalid word-search fallback');
    return grid;
}

export function line(size: number, from: number, to: number): number[] | null {
    if (![from, to].every(cell => Number.isInteger(cell) && cell >= 0 && cell < size * size)) return null;
    if (from === to) return [from];
    const row = Math.floor(from / size), col = from % size;
    const dr = Math.floor(to / size) - row, dc = to % size - col;
    const dir = allDirections.find(d => directions[d][0] === Math.sign(dr) && directions[d][1] === Math.sign(dc));
    if (!dir || (dr && dc && Math.abs(dr) !== Math.abs(dc))) return null;
    return path(size, row, col, dir, Math.max(Math.abs(dr), Math.abs(dc)) + 1);
}

export interface State { level: number; grid: Grid; found: readonly string[]; finished: boolean }
type Event = { kind: 'trouve'; word: string; cells: number[] }
    | { kind: 'deja'; word: string }
    | { kind: 'rate'; cells: number[] | null }
    | { kind: 'fini' };

export function start(level: number, seed: number, language: Language = 'fr'): State {
    return { level, grid: generate(level, seed, language), found: [], finished: false };
}
export function select(state: State, from: number, to: number): { state: State; events: Event[] } {
    if (state.finished) return { state, events: [] };
    const cells = line(state.grid.size, from, to);
    const placement = cells && state.grid.placements.find(p => {
        const expected = placementCells(state.grid.size, p);
        return expected.length === cells.length &&
            ((expected[0] === from && expected.at(-1) === to) || (expected[0] === to && expected.at(-1) === from));
    });
    if (!placement) return { state, events: [{ kind: 'rate', cells }] };
    const { word } = placement;
    if (state.found.includes(word)) return { state, events: [{ kind: 'deja', word }] };
    const found = [...state.found, word], finished = found.length === state.grid.placements.length;
    const events: Event[] = [{ kind: 'trouve', word, cells: placementCells(state.grid.size, placement) }];
    if (finished) events.push({ kind: 'fini' });
    return { state: { ...state, found, finished }, events };
}
