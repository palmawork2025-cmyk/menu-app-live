import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
const BASE = '/menu-app-live/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '我が家の献立',
        short_name: '献立',
        description: '家族で共有する献立・買い物リストアプリ',
        theme_color: '#f97316',
        background_color: '#fff7ed',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: `${BASE}pwa-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${BASE}pwa-512.png`, sizes: '512x512', type: 'image/png' },
          { src: `${BASE}pwa-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
})
