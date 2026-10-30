import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { readFileSync } from 'node:fs';
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
