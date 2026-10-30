import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { manifest } from '../pwa-manifest';

it('ships three PNG icons with the declared sizes', () => {
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toHaveLength(3);
    for (const icon of manifest.icons ?? []) {
        const bytes = readFileSync('public/' + icon.src);
        expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        const size = Number(icon.sizes?.split('x')[0]);
        expect(bytes.readUInt32BE(16)).toBe(size);
        expect(bytes.readUInt32BE(20)).toBe(size);
    }
});
it('uses a relative complete precache without runtime network caching', () => {
    const config = readFileSync('vite.config.ts', 'utf8');
    expect(config).toContain("base: './'"); expect(config).toContain("strategies: 'generateSW'");
    expect(config).toContain('html,js,css,png,webmanifest'); expect(config).toContain('runtimeCaching: []');
});
