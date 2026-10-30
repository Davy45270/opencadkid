import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './pwa-manifest.ts';
export default defineConfig({ base: './', plugins: [VitePWA({ strategies: 'generateSW', registerType: 'autoUpdate', manifest, workbox: { cacheId: 'opencadkid', clientsClaim: true, cleanupOutdatedCaches: true, globPatterns: ['**/*.{html,js,css,png,webmanifest}'], runtimeCaching: [] } })] });
