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
it('uses a relative complete precache; only same-origin painted puzzle scenes are cached at runtime', () => {
    const config = readFileSync('vite.config.ts', 'utf8');
    expect(config).toContain("base: './'"); expect(config).toContain("strategies: 'generateSW'");
    expect(config).toContain("globPatterns: ['**/*.{html,js,css,png,webmanifest}']");
    // Exactly one runtime rule: relative hashed WebP assets, cache first, bounded. No other network caching.
    expect(config.match(/urlPattern:/g)).toHaveLength(1);
    expect(config).toContain("runtimeCaching: [{ urlPattern: /\\/assets\\/[\\w-]+\\.webp$/, handler: 'CacheFirst', options: { cacheName: 'opencadkid-scenes', expiration: { maxEntries: 12 } } }] }");
    const rule = /\/assets\/[\w-]+\.webp$/;
    expect(rule.test('https://example.org/opencadkid/assets/zen-Ab1_c.webp')).toBe(true);
    for (const other of ['assets/zen.png', 'assets/index-Ab1.js', 'assets/zen.webp?x', 'icons/zen.webp']) expect(rule.test(other)).toBe(false);
});
