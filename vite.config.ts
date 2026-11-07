import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './pwa-manifest.ts';
import { version } from './package.json';
export default defineConfig({ base: './', define: { __APP_VERSION__: JSON.stringify(version) }, // Hide-and-seek props stay separate files (never inlined in the script): the precache lists them one by one.
    build: { assetsInlineLimit: (file: string) => (/[\\/]cherche[\\/]props[\\/]/.test(file) ? false : undefined) }, plugins: [VitePWA({ strategies: 'generateSW', registerType: 'autoUpdate', manifest, workbox: { cacheId: 'opencadkid', clientsClaim: true, cleanupOutdatedCaches: true, globPatterns: ['**/*.{html,js,css,png,webmanifest}', 'assets/cherche-*.webp'], // The hide-and-seek props (about 90 kB) are precached: without them a scene would be empty offline. // Painted puzzle scenes (hashed WebP) stay out of the precache budget: fetched when a puzzle shows one, then kept for offline play.
        runtimeCaching: [{ urlPattern: /\/assets\/[\w-]+\.webp$/, handler: 'CacheFirst', options: { cacheName: 'opencadkid-scenes', expiration: { maxEntries: 12 } } }] } })] });
