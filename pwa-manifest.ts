import type { ManifestOptions } from 'vite-plugin-pwa';
export const manifest: Partial<ManifestOptions> = {
 name: 'Opencadkid', short_name: 'Opencadkid', lang: 'fr', display: 'standalone', theme_color: '#426c50', background_color: '#fffaf0', start_url: './', scope: './',
 icons: [ { src: 'icons/opencadkid-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: 'icons/opencadkid-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: 'icons/opencadkid-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' } ]
};
