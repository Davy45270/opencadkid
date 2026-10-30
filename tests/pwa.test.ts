import { gzipSync } from 'node:zlib';
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

it('generated precache stays below 400 kB gzip and resolves every local asset', () => {
    // Run after the production build: inspect the actual generated Workbox manifest.
    const worker = readFileSync('dist/sw.js', 'utf8');
    const entries = [...worker.matchAll(/\burl:\s*"([^"]+)"/g)].map(m => m[1]!);
    expect(entries.length).toBeGreaterThan(5);
    const urls = [...new Set(entries)];
    expect(urls).toContain('index.html');
    expect(urls.some(url => /^assets\/.*\.js$/.test(url))).toBe(true);
    expect(urls.some(url => /^assets\/.*\.css$/.test(url))).toBe(true);
    let compressed = 0;
    for (const url of urls) {
        expect(url).not.toMatch(/^(?:https?:|\/)|\.\./);
        compressed += gzipSync(readFileSync(`dist/${url}`), { level: 9 }).byteLength;
    }
    expect(compressed).toBeLessThan(400_000);
});
