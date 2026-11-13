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
// 400 kB until game 13 of 17 (Boubou's trip) took it to 407 kB; 480 kB covered the 17 games of the Kid programme
// (469 kB at 1.26.0). 550 kB covers the five Kid versions of Opencade's new puzzles at about 13 kB each
// (469 + 5 × 13 ≈ 535 kB). At 1.31.0 a fresh build measured 529 kB for 35 games, one or two games short of the
// ceiling. Raised to 800 kB rather than splitting the code: splitting alone would not shrink the precache (every
// game would still be precached for offline play), and each game adds about 13 kB, so this leaves room for about
// twenty more. The check still fails beyond.
assert(compressed < 800_000, `Precache exceeds 800 kB gzip: ${compressed} bytes`);
// Paintings: six puzzle scenes and the path start sign, hashed WebP files, never precached, each within its 60 kB budget.
const webp = readdirSync(new URL('assets/', root)).filter(name => name.endsWith('.webp'));
const props = webp.filter(name => name.startsWith('cherche-')), assets = webp.filter(name => !name.startsWith('cherche-'));
assert.equal(assets.length, 7, `Expected six painted scenes and one start sign, found ${assets.length}`);
assert.equal(assets.filter(name => /^panneau-[\w-]+\.webp$/.test(name)).length, 1, 'Missing the path start sign');
assert(!urls.some(url => url.endsWith('.webp') && !/^assets\/cherche-/.test(url)), 'Paintings must not be precached');
for (const name of assets) assert(statSync(new URL(`assets/${name}`, root)).size <= 60_000, `Painting over 60 kB: ${name}`);
// Hide-and-seek props: twenty small WebP files, all precached so a scene is never empty offline, each within 20 kB.
assert.equal(props.length, 20, `Expected twenty hide-and-seek props, found ${props.length}`);
for (const name of props) { assert(urls.includes(`assets/${name}`), `Prop not precached: ${name}`); assert(statSync(new URL(`assets/${name}`, root)).size <= 20_000, `Prop over 20 kB: ${name}`); }
assert(/assets\\\/\[\\w-\]\+\\\.webp/.test(worker), 'Missing runtime cache route for painted scenes');
