// Checks of scripts/e2e-impact.js on file lists taken from real commits (frozen here: CI clones may be shallow).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { CROSS_SPECS, GAME_SPECS, LIGHT_SPECS, SMOKE_TESTS, changedFiles, classify, manual, registryIds, select, testLine } from './e2e-impact.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const allSpecs = readdirSync(join(root, 'tests/e2e')).filter(f => f.endsWith('.spec.ts')).map(f => f.slice(0, -8));
const path = s => `tests/e2e/${s}.spec.ts`;
const light = LIGHT_SPECS.map(path);
const files = list => list.map(f => f.replace(/:\d+$/, ''));
const notFull = r => assert.ok(new Set(files(r.specs)).size < allSpecs.length, `${String(r.specs.length)} cibles : suite complète ?`);

// git diff --name-only ecf0b32 09b7347 minus documentation and package files: the painted puzzle scenes (1.3.0).
const PUZZLE = ['scripts/check-precache.js', 'src/engines/puzzle/index.ts', 'src/games/puzzle/painted/ardennes.webp', 'src/games/puzzle/painted/galaxy.webp',
    'src/games/puzzle/painted/islands.webp', 'src/games/puzzle/painted/valley.webp', 'src/games/puzzle/painted/volcano.webp', 'src/games/puzzle/painted/zen.webp',
    'src/games/puzzle/scenes.ts', 'tests/e2e/puzzle-peint.spec.ts', 'tests/illustration.test.ts', 'tests/puzzle.test.ts', 'tests/pwa.test.ts'];
// The same commit restricted to the game itself: only the puzzle is touched.
const PUZZLE_ONLY = PUZZLE.filter(f => /puzzle/.test(f));
// A shared module used by three games (static import graph): their specs in full.
const DRAG = ['src/shell/drag.ts'];
// A shared module used by every game: one short test per game, never their eleven spec sets.
const ILLUSTRATION = ['src/ui/illustration.ts'];
// ecf0b32 (parents' feedback link): a shell zone with its own cross-game specs.
const FEEDBACK = ['src/ui/feedback.ts'];
const DOC = ['CHANGELOG.md'];
const RELEASE = ['CHANGELOG.md', 'package-lock.json', 'package.json'];

test('every spec file belongs to exactly one game or cross-game group', () => {
    const owned = [...Object.values(GAME_SPECS).flat(), ...Object.values(CROSS_SPECS).flat()];
    assert.deepEqual([...owned].sort(), [...allSpecs].sort(), 'spec non inscrite dans un groupe de scripts/e2e-impact.js (ou groupe sans fichier)');
    assert.equal(new Set(owned).size, owned.length);
});
test('the game table matches src/registry.ts and every game has a short test', () => {
    assert.deepEqual(registryIds(root).sort(), Object.keys(GAME_SPECS).sort());
    for (const [id, [spec, title]] of Object.entries(SMOKE_TESTS)) {
        assert.ok(GAME_SPECS[id].includes(spec), `${id} : ${spec}`);
        assert.ok(testLine(root, spec, title) > 0);
    }
    assert.deepEqual(Object.keys(SMOKE_TESTS).sort(), Object.keys(GAME_SPECS).sort());
});
test('puzzle only: N1, the three puzzle specs and home, nothing of the ten other games', () => {
    const r = select(PUZZLE_ONLY, root);
    assert.equal(r.level, 'N1');
    assert.deepEqual(r.games, ['puzzle']);
    assert.deepEqual([...r.specs].sort(), [...light, ...GAME_SPECS.puzzle.map(path)].sort());
});
test('painted scenes 1.3.0 (ecf0b32..09b7347): the precache check adds the offline spec, as tooling of the PWA', () => {
    const r = select(PUZZLE, root);
    assert.equal(r.level, 'N3');
    assert.ok(r.specs.includes(path('offline')) && GAME_SPECS.puzzle.every(s => r.specs.includes(path(s))));
    notFull(r);
});
test('shared module used by three games: N2, their specs in full and home', () => {
    const r = select(DRAG, root);
    assert.equal(r.level, 'N2');
    assert.deepEqual(r.games, ['atelier', 'ranger', 'suites']);
    assert.deepEqual([...r.specs].sort(), [...light, ...['atelier', 'ranger', 'suites'].flatMap(id => GAME_SPECS[id]).map(path)].sort());
});
test('shared module used by every game: N2, one short test per game', () => {
    const r = select(ILLUSTRATION, root);
    assert.equal(r.level, 'N2');
    assert.equal(r.games.length, Object.keys(GAME_SPECS).length);
    assert.deepEqual(r.specs.filter(s => !/:\d+$/.test(s)), light);
    assert.equal(r.specs.filter(s => /:\d+$/.test(s)).length, Object.keys(SMOKE_TESTS).length);
    notFull(r);
});
test('shell zone (ecf0b32, feedback link): N2 with the feedback specs', () => {
    const r = select(FEEDBACK, root);
    assert.equal(r.level, 'N2');
    assert.deepEqual([...r.specs].sort(), [...light, path('avis'), path('layout-feedback')].sort());
});
test('documentation only: N0, no E2E', () => {
    const r = select(DOC, root);
    assert.equal(r.level, 'N0');
    assert.deepEqual(r.specs, []);
    assert.equal(select(['README.fr.md', 'docs/captures/puzzle-debut.png', 'tests/svg-oracles.ts'], root).level, 'N0');
});
test('release, router, unknown file, game missing from the table, no base: N3 smoke', () => {
    for (const f of [RELEASE, ['src/shell/router.ts'], ['src/main.ts'], ['Makefile'], ['src/games/nouveau-jeu/view.ts'], ['.github/workflows/ci.yml']]) {
        const r = select(f, root);
        assert.equal(r.level, 'N3', f.join(' '));
        assert.equal(r.specs.length, LIGHT_SPECS.length + Object.keys(SMOKE_TESTS).length, f.join(' '));
        notFull(r);
    }
    assert.equal(select(null, root).level, 'N3');
    assert.equal(changedFiles('', 'HEAD', root), null);
    assert.equal(changedFiles('0000000000000000000000000000000000000000', 'HEAD', root), null);
    assert.equal(changedFiles('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', 'HEAD', root), null);
});
test('no case selects the whole suite', () => {
    const everything = [...allSpecs.map(path), 'src/main.ts', 'package.json', ...Object.keys(GAME_SPECS).map(id => `src/games/${id}/view.ts`), 'tests/e2e/helpers.ts'];
    const r = select(everything, root);
    notFull(r);
    assert.throws(() => manual(allSpecs.map(path).join(' '), root), /toute la suite/);
    notFull(select(['tests/e2e/helpers.ts'], root));
});
test('single classifications', () => {
    assert.equal(classify('tests/e2e/puzzle-helpers.ts', root).games[0], 'puzzle');
    assert.equal(classify('tests/gouter.test.ts', root).games[0], 'gouter');
    assert.equal(classify('src/engines/tambours/index.ts', root).games[0], 'tambours');
    assert.equal(classify('tests/e2e/helpers.ts', root).level, 'N2');
    assert.equal(classify('tests/e2e/home.spec.ts', root).specs[0], 'home');
    assert.deepEqual(classify('src/shell/parental.ts', root).specs, ['parental']);
    assert.equal(classify('vite.config.ts', root).level, 'N3');
});
test('manual list is validated', () => {
    assert.deepEqual(manual('tests/e2e/home.spec.ts tests/e2e/puzzle.spec.ts:130', root).specs, ['tests/e2e/home.spec.ts', 'tests/e2e/puzzle.spec.ts:130']);
    assert.throws(() => manual('--grep .', root), /refusées/);
    assert.throws(() => manual('tests/e2e/absente.spec.ts', root), /refusées/);
});
test('Playwright lists exactly the selected files, for the puzzle and the N3 smoke', () => {
    for (const list of [PUZZLE_ONLY, RELEASE]) {
        const r = select(list, root);
        const out = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--list', '--reporter=json', ...r.specs], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
        assert.equal(out.status, 0, out.stderr);
        const listed = new Set();
        const walk = suite => { for (const spec of suite.specs ?? []) listed.add(`tests/e2e/${spec.file}`); for (const child of suite.suites ?? []) walk(child); };
        for (const suite of JSON.parse(out.stdout).suites) walk(suite);
        assert.deepEqual([...listed].sort(), [...new Set(files(r.specs))].sort());
    }
});
