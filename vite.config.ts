import { defineConfig } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'src'),
    },
  },
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        // The catalog is loaded only after search/detail activation. Keep it
        // out of the install-time precache and cache it after first use.
        globIgnores: ['**/searchItems-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/searchItems-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'item-catalog',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'FF14 장터탐지기',
        short_name: '장터탐지기',
        description: '파이널판타지14 한국 서버 최저 매물가, 판매량, 가격 흐름을 한눈에',
        theme_color: '#101112',
        background_color: '#101112',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ],
})
