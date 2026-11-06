import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './pwa-manifest.ts';
import { version } from './package.json';
export default defineConfig({ base: './', define: { __APP_VERSION__: JSON.stringify(version) }, plugins: [VitePWA({ strategies: 'generateSW', registerType: 'autoUpdate', manifest, workbox: { cacheId: 'opencadkid', clientsClaim: true, cleanupOutdatedCaches: true, globPatterns: ['**/*.{html,js,css,png,webmanifest}'], // Painted puzzle scenes (hashed WebP) stay out of the precache budget: fetched when a puzzle shows one, then kept for offline play.
        runtimeCaching: [{ urlPattern: /\/assets\/[\w-]+\.webp$/, handler: 'CacheFirst', options: { cacheName: 'opencadkid-scenes', expiration: { maxEntries: 12 } } }] } })] });
