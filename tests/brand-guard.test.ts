import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publicLines } from '../scripts/public-files';
import { it, expect } from 'vitest';
const forbidden = [['metal', ' slug'], ['gala', 'ga'], ['wor', 'ms'], ['lemm', 'ings'], ['puzzle', ' bobble'], ['bust', '-a-move'], ['zu', 'ma'], ['bomber', 'man'], ['arka', 'noid'], ['break', 'out'], ['space', ' invaders'], ['pac', '-man'], ['tet', 'ris'], ['soko', 'ban'], ['frog', 'ger'], ['cut', ' the rope'], ['om', ' nom'], ['boulder', ' dash'], ['lunar', ' lander']].map(parts => parts.join(''));
const brand = new RegExp(`\\b(?:${forbidden.join('|')})\\b`, 'i');
const ticket = /\b[A-Z]{2,10}-\d+\b/;
it('public text has no commercial names or internal ticket identifiers', () => {
    const violations = publicLines(process.cwd()).filter(({ line }) => brand.test(line) || ticket.test(line)).map(({ file, number }) => `${file}:${number}`);
    expect(violations).toEqual([]);
});
it('the guard matches separated commercial names and uppercase ticket shapes only', () => {
    for (const name of forbidden) { expect(brand.test(`(${name.toUpperCase()})`)).toBe(true); expect(brand.test(`prefix${name}suffix`)).toBe(false); }
    expect(ticket.test(['AB', '123'].join('-'))).toBe(true); expect(ticket.test('ordinary-123')).toBe(false);
});

it('ignored and untracked files are never read, including without git', () => {
    const root = mkdtempSync(join(tmpdir(), 'public-text-'));
    try {
        mkdirSync(join(root, 'src'));
        writeFileSync(join(root, 'src', 'visible.ts'), 'source');
        writeFileSync(join(root, 'untracked.txt'), 'untracked');
        const ignored = ['.home/.npm/_cacache', '.cache', 'node_modules', 'dist', 'test-results', 'src/.hidden'];
        for (const folder of ignored) {
            mkdirSync(join(root, folder), { recursive: true });
            // Invalid UTF encoding would pollute the result if these files were read.
            writeFileSync(join(root, folder, 'private.txt'), Buffer.from([255]));
        }
        const tracked = () => ['src/visible.ts', ...ignored.map(folder => `${folder}/private.txt`)];
        const reads: string[] = [];
        const read = (file: string): string => { reads.push(file); return readFileSync(file, 'utf8'); };
        expect(publicLines(root, tracked, read)).toEqual([{ file: 'src/visible.ts', line: 'source', number: 1 }]);
        const fallback = publicLines(root, () => { throw new Error('git unavailable'); }, read);
        expect(fallback.map(entry => entry.line).sort()).toEqual(['source', 'untracked']);
        expect(reads).toEqual([join(root, 'src/visible.ts'), join(root, 'src/visible.ts'), join(root, 'untracked.txt')]);
    } finally { rmSync(root, { recursive: true, force: true }); }
});
