import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { it, expect } from 'vitest';
const forbidden = [['metal', ' slug'], ['gala', 'ga'], ['wor', 'ms'], ['lemm', 'ings'], ['puzzle', ' bobble'], ['bust', '-a-move'], ['zu', 'ma'], ['bomber', 'man'], ['arka', 'noid'], ['break', 'out'], ['space', ' invaders'], ['pac', '-man'], ['tet', 'ris'], ['soko', 'ban'], ['frog', 'ger']].map(parts => parts.join(''));
const brand = new RegExp(`\\b(?:${forbidden.join('|')})\\b`, 'i');
const ticket = /\b[A-Z]{2,10}-\d+\b/;
it('public text has no commercial names or internal ticket identifiers', () => {
    const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(file => file && file !== 'package-lock.json' && !file.endsWith('.png') && existsSync(file));
    const violations = files.flatMap(file => readFileSync(file, 'utf8').split('\n').flatMap((line, i) => brand.test(line) || ticket.test(line) ? [`${file}:${i + 1}`] : []));
    expect(violations).toEqual([]);
});
it('the guard matches separated commercial names and uppercase ticket shapes only', () => {
    for (const name of forbidden) { expect(brand.test(`(${name.toUpperCase()})`)).toBe(true); expect(brand.test(`prefix${name}suffix`)).toBe(false); }
    expect(ticket.test(['AB', '123'].join('-'))).toBe(true); expect(ticket.test('ordinary-123')).toBe(false);
});
