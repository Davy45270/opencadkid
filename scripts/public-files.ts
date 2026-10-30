import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const excluded = new Set(['node_modules', 'dist', 'test-results', 'playwright-report', 'blob-report']);
const allowed = (file: string): boolean => !file.split(/[\\/]/).some(part => part.startsWith('.') || excluded.has(part))
    && file !== 'package-lock.json' && !/\.(png|ico|jpg|jpeg|webp|woff2?)$/i.test(file);
function sourceFiles(root: string): string[] {
    const walk = (directory: string): string[] => readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
        const file = join(directory, entry.name);
        if (!allowed(file)) return [];
        return entry.isDirectory() ? walk(file) : [file];
    });
    const folders = ['src', 'tests', 'scripts', 'docs', 'public'];
    return [...folders.flatMap(folder => existsSync(join(root, folder)) ? walk(folder) : []),
        ...readdirSync(root, { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => entry.name)];
}
export function publicFiles(root: string, tracked: () => string[] = () => execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0')): string[] {
    let files: string[];
    try { files = tracked(); } catch { files = sourceFiles(root); }
    return files.filter(file => file && allowed(file) && existsSync(join(root, file)));
}
export function publicLines(root: string, tracked?: () => string[], read: (path: string) => string = path => readFileSync(path, 'utf8')): { file: string; line: string; number: number }[] {
    return publicFiles(root, tracked).flatMap(file => read(join(root, file)).split('\n').map((line, i) => ({ file, line, number: i + 1 })));
}
