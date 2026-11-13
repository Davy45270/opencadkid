import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
// Kid renders with SVG and the DOM. Neither Phaser nor Phaser AE may enter its dependencies; the lint rule
// no-restricted-imports in .oxlintrc.json refuses the imports themselves.
const banned = (name: string): boolean => name === 'phaser' || name.startsWith('phaser/') || name.startsWith('@phaser-ae/');
const json = (file: string): Record<string, unknown> => JSON.parse(readFileSync(join(process.cwd(), file), 'utf8')) as Record<string, unknown>;
const keys = (value: unknown): string[] => (value && typeof value === 'object' ? Object.keys(value) : []);
export function phaserPackages(manifest: Record<string, unknown>, lock: Record<string, unknown>): string[] {
    const declared = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].flatMap(field => keys(manifest[field]));
    const installed = keys(lock.packages).map(path => path.replace(/^.*node_modules\//, ''));
    return [...new Set([...declared, ...installed])].filter(banned);
}
it('neither Phaser nor Phaser AE is a dependency', () => {
    expect(phaserPackages(json('package.json'), json('package-lock.json'))).toEqual([]);
});
it('the check catches Phaser and Phaser AE, nested or not', () => {
    const lock = { packages: { '': {}, 'node_modules/vite': {}, 'node_modules/a/node_modules/@phaser-ae/editor': {} } };
    expect(phaserPackages({ dependencies: { phaser: '4.2.1' }, devDependencies: { 'phaser-like': '1' } }, lock)).toEqual(['phaser', '@phaser-ae/editor']);
});
