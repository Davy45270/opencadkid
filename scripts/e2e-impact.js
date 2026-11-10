// Targeted E2E selection: which Playwright specs a change needs, and never the whole suite.
// Same mechanism as Opencade (levels N0–N3, game table, cross-game groups, refusal of the whole suite).
//
//   node scripts/e2e-impact.js --base <rev> [--head <rev>]     diff base..head (merge base), human report
//   node scripts/e2e-impact.js --files a.ts b.ts                same, from an explicit file list
//   node scripts/e2e-impact.js --base <rev> --args              spec arguments only (empty for N0: then run nothing)
//   node scripts/e2e-impact.js ... --github                     writes level/specs/count to $GITHUB_OUTPUT
//   node scripts/e2e-impact.js --specs "tests/e2e/x.spec.ts"    explicit list (workflow_dispatch), validated
//
// Levels, from the lightest:
//   N0  documentation, unit-test-only files: no E2E.
//   N1  one game's files (src/games/<id>/, src/engines/<id>/, tests/<id>*, a spec or E2E helper of that game):
//       that game's specs + the light cross-game specs.
//   N2  a shared module (src/shell/, src/ui/, src/characters/, src/engines/rng.ts, src/registry.ts, shared E2E helpers):
//       the specs of every game whose code imports it (static import graph, transitively), the cross-game specs that
//       import it, the specs of its shell zone, and the light cross-game specs.
//   N3  what no import reaches or cannot be classified (src/main.ts, the router, style.css, index.html, dependencies,
//       tooling, CI): home + ONE short test per game.
// The full suite is never selected: more than MAX_FULL_GAMES games named fall back to their short test, and
// select() refuses a result that would cover every spec file.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

export const E2E_DIR = 'tests/e2e';
export const MAX_FULL_GAMES = 3;

/** Spec files of each game (ids of src/registry.ts). */
export const GAME_SPECS = {
    'compter': ['compter', 'compter-doigt', 'compter-oracles'],
    'paires': ['paires', 'paires-doigt'],
    'formes': ['formes', 'formes-doigt'],
    'sons': ['sons', 'sons-doigt'],
    'puzzle': ['puzzle', 'puzzle-doigt', 'puzzle-peint'],
    'chemin': ['chemin', 'chemin-doigt', 'chemin-panneau'],
    'suites': ['suites', 'suites-doigt'],
    'ranger': ['ranger', 'ranger-doigt'],
    'tambours': ['tambours', 'tambours-doigt', 'tambours-regressions'],
    'gouter': ['gouter', 'gouter-doigt'],
    'cherche': ['cherche'],
    'promenade': ['promenade'],
    'bulles': ['bulles'],
    'atelier': ['atelier', 'atelier-dessin', 'atelier-doigt', 'atelier-gomme'],
};
/** Cross-game specs, grouped by what they exercise. None is tied to a single game. */
export const CROSS_SPECS = {
    'accueil': ['home', 'home-stable', 'autres-jeux'],
    'coquille': ['layout-feedback', 'parental', 'avis'],
    'pwa': ['offline'],
    'captures': ['captures', 'captures-11'],
};
/** Light cross-game spec run with every N1, N2 and N3 selection: the catalogue loads every game module. */
export const LIGHT_SPECS = ['home'];
/**
 * A short test of each game whose title is written literally once in its spec (a title built in a loop cannot be
 * addressed alone). The line is found again at run time.
 */
export const SMOKE_TESTS = {
    'compter': ['compter', 'basket objects can be removed before checking'],
    'paires': ['paires', 'English voice says the English motif name'],
    'formes': ['formes', 'wrong box animates a gradual return to the original position'],
    'sons': ['sons', 'sorting captures an exterior drop within 24px, rejects one beyond it'],
    'puzzle': ['puzzle', 'held puzzle piece paints above another piece while crossing it'],
    'chemin': ['chemin', 'non-primary pointer cannot own a gesture while a primary pointer can'],
    'suites': ['suites', 'empty active slot breathes normally and stops with reduced motion'],
    'ranger': ['ranger', 'English rules and object labels, silent preferences and detached observation hook'],
    'tambours': ['tambours', 'an unavailable audio device still permits a light-observed round'],
    'gouter': ['gouter', 'a sweet that misses falls away gently and the same level starts again by itself'],
    'cherche': ['cherche', 'a miss is gentle, three in a row light up an object to find'],
    'promenade': ['promenade', 'a wrong job is a funny try, three make the right one shine and Lumi names it'],
    'bulles': ['bulles', 'a throw into the void goes boing, Boubou scratches his head, nothing else changes'],
    'atelier': ['atelier-dessin', 'the brush draws over the coloured model, which stays visible under the stroke'],
};
/** Shell zones: the cross-game specs that exercise that part of the shell, added to the selection. */
const ZONES = [
    [/^(src\/shell\/parental\.ts|src\/shell\/storage\.ts)$/, ['parental']],
    [/^src\/ui\/feedback\.ts$/, ['avis', 'layout-feedback']],
    [/^(src\/ui\/other-games\.ts|public\/autres-jeux\/.*)$/, ['autres-jeux']],
    [/^(src\/ui\/home\.ts|src\/ui\/backdrops\.ts)$/, ['home', 'home-stable']],
    [/^(pwa-manifest\.ts|public\/icons\/.*|scripts\/check-precache\.js)$/, CROSS_SPECS.pwa],
];
const SHARED = /^(src\/shell\/|src\/ui\/|src\/characters\/|src\/engines\/[^/]+\.ts$|src\/registry\.ts$|src\/main\.ts$|src\/style\.css$|src\/vite-env\.d\.ts$|index\.html$|pwa-manifest\.ts$|public\/)/;
const DOCS = /(\.md$|^docs\/|^LICENSE$|^\.github\/ISSUE_TEMPLATE\/)/;
const TOOLING = /^(package(-lock)?\.json$|playwright\.config\.|vite\.config\.|vitest\.config\.|tsconfig[^/]*$|eslint[^/]*$|\.oxlintrc\.json$|\.github\/|\.nvmrc$|\.editorconfig$|\.gitignore$|scripts\/)/;
const SPEC_ARG = /^tests\/e2e\/[A-Za-z0-9._-]+\.spec\.ts(:\d+)?$/;
const LEVELS = ['N0', 'N1', 'N2', 'N3'];

const specPath = name => `${E2E_DIR}/${name}.spec.ts`;
/** Capture specs skip unless CAPTURES=1: never selected through an import, only by name. */
const capture = spec => CROSS_SPECS.captures.includes(spec);
const ownerOf = spec => Object.keys(GAME_SPECS).find(id => GAME_SPECS[id].includes(spec));
const idPattern = id => new RegExp(`^${id}([-._/]|$)`);
const gameIn = name => Object.keys(GAME_SPECS).sort((a, b) => b.length - a.length).find(id => idPattern(id).test(name));

/** Game ids of the games array in src/registry.ts (drift check against GAME_SPECS). */
export function registryIds(root) {
    const source = readFileSync(join(root, 'src/registry.ts'), 'utf8');
    return [...source.slice(source.indexOf('export const games')).matchAll(/\{ id: '([a-z-]+)'/g)].map(m => m[1]);
}
/** Line of the test() call whose title is `title`: what `playwright test file:line` addresses. */
export function testLine(root, spec, title) {
    const source = readFileSync(join(root, specPath(spec)), 'utf8');
    const at = source.indexOf(`'${title}'`);
    if (at < 0 || source.indexOf(`'${title}'`, at + 1) >= 0) throw new Error(`${spec}: title not found exactly once: ${title}`);
    const before = source.slice(0, at), call = [...before.matchAll(/\btest(?:\.\w+)?\s*\(/g)].pop();
    if (!call) throw new Error(`${spec}: no test() before: ${title}`);
    const line = before.slice(0, call.index).split('\n').length;
    if (before.split('\n').length - line > 1) throw new Error(`${spec}: test() too far from its title: ${title}`);
    return line;
}

/** Static relative import graph of src/ and tests/e2e/: file -> files it imports (paths relative to root). */
export function importGraph(root) {
    const files = [];
    const walk = dir => {
        for (const name of readdirSync(join(root, dir))) {
            const path = `${dir}/${name}`;
            if (statSync(join(root, path)).isDirectory()) walk(path);
            else if (/\.(ts|js)$/.test(name) && !name.endsWith('.d.ts')) files.push(path);
        }
    };
    walk('src'); walk(E2E_DIR);
    const resolve = (from, target) => {
        const base = normalize(join(dirname(from), target)).replace(/\\/g, '/');
        for (const candidate of [base, `${base}.ts`, `${base}.js`, `${base}/index.ts`]) if (existsSync(join(root, candidate)) && statSync(join(root, candidate)).isFile()) return candidate;
        return null;
    };
    const graph = new Map();
    for (const file of files) {
        const source = readFileSync(join(root, file), 'utf8');
        const targets = [...source.matchAll(/(?:from|import)\s*\(?\s*'(\.{1,2}\/[^']+)'|new URL\('(\.{1,2}\/[^']+)', import\.meta\.url\)/g)].map(m => resolve(file, m[1] ?? m[2])).filter(Boolean);
        graph.set(file, [...new Set(targets)]);
    }
    return graph;
}
/** Every file whose import closure contains `target`. */
function importersOf(graph, target) {
    const reached = new Set();
    let changed = true;
    while (changed) {
        changed = false;
        for (const [file, list] of graph) if (!reached.has(file) && list.some(t => t === target || reached.has(t))) { reached.add(file); changed = true; }
    }
    return reached;
}

/** Classifies one path: { level, games, specs, why }. */
export function classify(path, root, graph = importGraph(root)) {
    const r = (level, why, games = [], specs = []) => ({ file: path, level, why, games, specs });
    const e2e = path.startsWith(`${E2E_DIR}/`) ? path.slice(E2E_DIR.length + 1) : null;
    if (e2e !== null && !e2e.includes('/')) {
        if (e2e.endsWith('.spec.ts')) {
            const spec = e2e.slice(0, -8), owner = ownerOf(spec);
            if (owner) return r('N1', `spec de ${owner}`, [owner]);
            return r('N1', 'spec transverse', [], [spec]);
        }
        const importers = [...importersOf(graph, path)].filter(f => f.endsWith('.spec.ts')).map(f => f.slice(E2E_DIR.length + 1, -8));
        const owners = [...new Set(importers.map(ownerOf))];
        if (importers.length && owners.length === 1 && owners[0]) return r('N1', `aide E2E de ${owners[0]}`, [owners[0]]);
        if (importers.length) return r('N2', `aide E2E partagée (${importers.length} specs)`, owners.filter(Boolean), importers.filter(s => !ownerOf(s) && !capture(s)));
        return r('N3', 'aide E2E importée par aucune spec');
    }
    const area = /^src\/(games|engines)\/([^/]+)\//.exec(path);
    if (area) {
        if (GAME_SPECS[area[2]]) return r('N1', `jeu ${area[2]}`, [area[2]]);
        return r('N3', `jeu absent de la table : ${area[2]}`);
    }
    if (/^tests\/[^/]+\.test\.ts$/.test(path)) {
        const id = gameIn(path.slice('tests/'.length));
        return id ? r('N1', `test unitaire du jeu ${id}`, [id]) : r('N0', 'test unitaire (job rapide)');
    }
    if (/^tests\/(fixtures\/|[^/]+\.(ts|json)$)/.test(path)) return r('N0', 'oracle ou donnée de test unitaire');
    if (DOCS.test(path)) return r('N0', 'documentation');
    const zone = ZONES.find(([pattern]) => pattern.test(path));
    if (SHARED.test(path)) {
        const importers = importersOf(graph, path);
        const games = Object.keys(GAME_SPECS).filter(id => [...importers].some(f => f.startsWith(`src/games/${id}/`) || f.startsWith(`src/engines/${id}/`)));
        const specs = [...importers].filter(f => f.endsWith('.spec.ts')).map(f => f.slice(E2E_DIR.length + 1, -8)).filter(s => !ownerOf(s) && !capture(s));
        const zoneSpecs = zone ? zone[1] : [];
        if (games.length || specs.length || zoneSpecs.length) return r('N2', `module partagé : ${games.length} jeu(x) l’importent`, games, [...new Set([...specs, ...zoneSpecs])]);
        return r('N3', 'module partagé sans dépendant déterminable');
    }
    if (zone) return r('N3', 'outillage de la PWA', [], zone[1]);
    if (TOOLING.test(path)) return r('N3', 'dépendances, outillage ou CI');
    return r('N3', 'fichier non classé');
}

/** Selection for a list of changed files, or null (no usable base): N3 smoke. */
export function select(files, root) {
    const allSpecs = readdirSync(join(root, E2E_DIR)).filter(f => f.endsWith('.spec.ts')).map(f => f.slice(0, -8));
    const graph = importGraph(root);
    const reasons = files === null ? [{ file: '(base absente)', level: 'N3', why: 'pas de base de comparaison', games: [], specs: [] }] : files.map(f => classify(f, root, graph));
    const level = reasons.reduce((top, x) => LEVELS.indexOf(x.level) > LEVELS.indexOf(top) ? x.level : top, 'N0');
    const games = [...new Set(reasons.flatMap(x => x.games))].sort();
    const specs = new Set(reasons.flatMap(x => x.specs));
    const tests = new Set();
    const notes = [];
    if (level !== 'N0') for (const s of LIGHT_SPECS) specs.add(s);
    const full = games.length <= MAX_FULL_GAMES ? games : [];
    if (games.length > MAX_FULL_GAMES) notes.push(`${games.length} jeux nommés (> ${MAX_FULL_GAMES}) : un test court par jeu, pas leurs specs`);
    for (const id of full) for (const s of GAME_SPECS[id]) specs.add(s);
    const shortGames = level === 'N3' ? Object.keys(SMOKE_TESTS) : games.length > MAX_FULL_GAMES ? games : [];
    for (const id of shortGames) {
        if (full.includes(id)) continue;
        const [spec, title] = SMOKE_TESTS[id];
        if (!specs.has(spec)) tests.add(`${specPath(spec)}:${testLine(root, spec, title)}`);
    }
    const missing = [...specs].filter(s => !allSpecs.includes(s));
    if (missing.length) throw new Error(`specs absentes de ${E2E_DIR} : ${missing.join(', ')}`);
    if (allSpecs.every(s => specs.has(s))) throw new Error('la sélection couvrirait toute la suite E2E : refusé');
    return { level, games, specs: [...[...specs].sort().map(specPath), ...[...tests].sort()], reasons, notes };
}
/** Explicit list (workflow_dispatch): every entry must be an existing spec file, optionally :line. */
export function manual(text, root) {
    const list = text.split(/[\s,]+/).filter(Boolean);
    const bad = list.filter(s => !SPEC_ARG.test(s) || !existsSync(join(root, s.replace(/:\d+$/, ''))));
    if (bad.length) throw new Error(`specs refusées : ${bad.join(' ')}`);
    const allSpecs = readdirSync(join(root, E2E_DIR)).filter(f => f.endsWith('.spec.ts'));
    if (allSpecs.every(f => list.includes(`${E2E_DIR}/${f}`))) throw new Error('la sélection couvrirait toute la suite E2E : refusé');
    return { level: 'manuel', games: [], specs: [...new Set(list)], reasons: [], notes: ['liste donnée à la main'] };
}
/** Changed paths between the merge base of base and head, or null when base is absent, zero or unknown. */
export function changedFiles(base, head, root) {
    if (!base || /^0+$/.test(base)) return null;
    const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    try {
        git('cat-file', '-e', `${base}^{commit}`);
        const from = git('merge-base', base, head);
        return git('diff', '--name-only', '--no-renames', from, head).split('\n').filter(Boolean);
    } catch {
        return null;
    }
}

function option(args, name) {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1] ?? '';
}
function main(args) {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const fileArgs = args.includes('--files') ? args.slice(args.indexOf('--files') + 1).filter(a => !a.startsWith('--')) : null;
    const explicit = option(args, '--specs');
    let result;
    if (explicit && explicit.trim()) result = manual(explicit, root);
    else if (fileArgs) result = select(fileArgs, root);
    else result = select(changedFiles(option(args, '--base'), option(args, '--head') || 'HEAD', root), root);
    if (args.includes('--args')) { process.stdout.write(`${result.specs.join(' ')}\n`); return; }
    const lines = [`Niveau ${result.level} — ${result.specs.length} cible(s)`];
    if (result.games.length) lines.push(`Jeux nommés : ${result.games.join(', ')}`);
    for (const n of result.notes) lines.push(`Note : ${n}`);
    for (const x of result.reasons) lines.push(`  ${x.level} ${x.file} — ${x.why}`);
    lines.push(result.specs.length ? 'Specs :' : 'Aucun E2E à lancer.');
    for (const s of result.specs) lines.push(`  ${s}`);
    process.stdout.write(`${lines.join('\n')}\n`);
    if (args.includes('--github')) {
        const out = process.env.GITHUB_OUTPUT;
        if (!out) throw new Error('GITHUB_OUTPUT absent');
        appendFileSync(out, `level=${result.level}\nspecs=${result.specs.join(' ')}\ncount=${String(result.specs.length)}\n`);
        if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### E2E ciblé : ${result.level}\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
    }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
