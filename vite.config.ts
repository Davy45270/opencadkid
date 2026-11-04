import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { manifest } from './pwa-manifest.ts';
import { version } from './package.json';
export default defineConfig({ base: './', define: { __APP_VERSION__: JSON.stringify(version) }, plugins: [VitePWA({ strategies: 'generateSW', registerType: 'autoUpdate', manifest, workbox: { cacheId: 'opencadkid', clientsClaim: true, cleanupOutdatedCaches: true, globPatterns: ['**/*.{html,js,css,png,webmanifest}'], runtimeCaching: [] } })] });
