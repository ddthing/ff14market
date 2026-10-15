import { defineConfig, type Plugin } from 'vite'
import path from 'node:path'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { marketApiDevPlugin } from './scripts/vite-market-api.ts'
import { prerenderHome } from './scripts/prerender-home.ts'

// The initial document can paint without a second round trip for its UI styles.
// Keep the emitted assets available for route loading and the offline cache.
function inlineInitialStyles(): Plugin {
  let outputDirectory: string;
  return {
    name: 'inline-initial-styles',
    apply: 'build',
    configResolved(config) {
      outputDirectory = path.resolve(config.root, config.build.outDir);
    },
    async writeBundle(_options, bundle) {
      // Finalize the HTML before the PWA plugin computes its precache revisions.
      await prerenderHome(outputDirectory);
      const routeModules = [
        { source: '/src/pages/HotIssues.tsx', prefix: 'rendered-hot-issues' },
        { source: '/src/pages/Favorites.tsx', prefix: 'rendered-favorites' },
        { source: '/src/pages/ItemDetail.tsx', prefix: 'rendered-item-' },
      ];
      const files = await readdir(outputDirectory);
      for (const route of routeModules) {
        const chunk = Object.values(bundle).find(candidate =>
          candidate.type === 'chunk' && candidate.facadeModuleId?.replaceAll('\\', '/').endsWith(route.source),
        );
        if (!chunk) throw new Error(`Missing initial route chunk: ${route.source}`);
        const routeFiles = files.filter(file => file.startsWith(route.prefix)
          && (file.endsWith('.html') || file === 'rendered-item-template.template'));
        for (const file of routeFiles) {
          const htmlPath = path.join(outputDirectory, file);
          const html = await readFile(htmlPath, 'utf8');
          await writeFile(htmlPath, html.replace('</head>', `<link rel="modulepreload" crossorigin href="/${chunk.fileName}"></head>`));
        }
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const bundle = context.bundle;
        if (!bundle) return html;
        return html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/g, (tag) => {
          const href = tag.match(/\bhref="([^"]+)"/)?.[1];
          if (!href) return tag;
          const asset = bundle[href.replace(/^\//, '')];
          const css = asset?.type === 'asset' && href.endsWith('.css')
              ? typeof asset.source === 'string' ? asset.source : Buffer.from(asset.source).toString('utf8')
              : null;
          if (css === null) return tag;
          return `<style data-entry-style="${href}">${css.replace(/<\/style/gi, '<\\/style')}</style>`;
        });
      },
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'src'),
    },
  },
  plugins: [
    marketApiDevPlugin(),
    react(), 
    tailwindcss(),
    inlineInitialStyles(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Online navigations always use the deployed HTML, with a neutral offline shell.
        navigateFallback: null,
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        // Route chunks and glyph-specific font subsets are loaded on demand.
        globIgnores: ['**/PriceChart-*.js', '**/fonts/**/*.woff2', '**/index.html', '**/rendered-*.html'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
            options: {
              fetchOptions: { cache: 'no-store' },
              precacheFallback: { fallbackURL: '/spa.html' },
            },
          },
          {
            urlPattern: /\/fonts\/pretendard-v1\.3\.9\/PretendardVariable\.subset\.\d+\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-subsets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            urlPattern: /\/assets\/PriceChart-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'route-chunks',
              expiration: {
                maxEntries: 5,
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
        theme_color: '#FFFFFF',
        background_color: '#FFFFFF',
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
