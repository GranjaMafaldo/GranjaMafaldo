import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'brand-icon.svg', 'brand-wordmark.svg'],
      manifest: {
        name: 'Granja Mafaldo',
        short_name: 'Mafaldo',
        description: 'Gestão integrada da Granja Mafaldo',
        theme_color: '#344718',
        background_color: '#f8f3e3',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        icons: [
          { src: '/brand-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/brand-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: { navigateFallback: '/index.html', cleanupOutdatedCaches: true }
    })
  ],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 }
});
