import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// Inspect the generated manifest only after the production build.
const root = new URL('../dist/', import.meta.url);
const worker = readFileSync(new URL('sw.js', root), 'utf8');
const entries = [...worker.matchAll(/\burl:\s*"([^"]+)"/g)].map(match => match[1]);
assert(entries.length > 5, 'Precache manifest is incomplete');
const urls = [...new Set(entries)];
assert(urls.includes('index.html'), 'Missing precached entry point');
assert(urls.some(url => /^assets\/.*\.js$/.test(url)), 'Missing precached JavaScript');
assert(urls.some(url => /^assets\/.*\.css$/.test(url)), 'Missing precached CSS');
let compressed = 0;
for (const url of urls) {
    assert(!/^(?:[a-z]+:|\/)|\.\./i.test(url), `Nonlocal precache asset: ${url}`);
    compressed += gzipSync(readFileSync(new URL(url, root)), { level: 9 }).byteLength;
}
assert(compressed < 400_000, `Precache exceeds 400 kB gzip: ${compressed} bytes`);
// Paintings: six puzzle scenes and the path start sign, hashed WebP files, never precached, each within its 60 kB budget.
const assets = readdirSync(new URL('assets/', root)).filter(name => name.endsWith('.webp'));
assert.equal(assets.length, 7, `Expected six painted scenes and one start sign, found ${assets.length}`);
assert.equal(assets.filter(name => /^panneau-[\w-]+\.webp$/.test(name)).length, 1, 'Missing the path start sign');
assert(!urls.some(url => url.endsWith('.webp')), 'Paintings must not be precached');
for (const name of assets) assert(statSync(new URL(`assets/${name}`, root)).size <= 60_000, `Painting over 60 kB: ${name}`);
assert(/assets\\\/\[\\w-\]\+\\\.webp/.test(worker), 'Missing runtime cache route for painted scenes');
