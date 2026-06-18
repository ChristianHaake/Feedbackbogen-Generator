import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// __dirname replacement for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal plugin to serve/copy /content alongside /public
function contentPlugin() {
  const contentDir = path.resolve(__dirname, 'content');
  return {
    name: 'content-static',
    configureServer(server: any) {
      server.middlewares.use('/content', (req: any, res: any, _next: any) => {
        let requestPath = '';
        try {
          requestPath = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
            .replace(/^\/+/, '')
            .replace(/^content\/?/, '');
        } catch {
          res.statusCode = 400;
          res.end('Bad request');
          return;
        }
        const filePath = path.resolve(contentDir, requestPath);
        const relativePath = path.relative(contentDir, filePath);
        if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          fs.createReadStream(filePath).pipe(res);
        } else {
          res.statusCode = 404;
          res.end('Not found');
        }
      });
    },
    closeBundle() {
      const out = path.resolve(__dirname, 'dist', 'content');
      fs.mkdirSync(out, { recursive: true });
      function copyRecursive(src: string, dest: string) {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
          fs.mkdirSync(dest, { recursive: true });
          for (const f of fs.readdirSync(src)) {
            copyRecursive(path.join(src, f), path.join(dest, f));
          }
        } else {
          fs.copyFileSync(src, dest);
        }
      }
      if (fs.existsSync(contentDir)) copyRecursive(contentDir, out);
    },
  } as any;
}

export default defineConfig({
  root: path.resolve(__dirname, 'src/ui'),
  base: '/',
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  plugins: [
    contentPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'logo.png', 'logo-wide.png'],
      manifest: {
        name: 'Feedbackbogen-Generator',
        short_name: 'Feedbackbogen',
        description: 'Feedbackbögen für zukunftsorientierte Prüfungsformate — lokal im Browser.',
        lang: 'de',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#245DCC',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // App shell is precached; runtime-fetched /content/* (markdown + JSON) is
        // cached on first online visit so it stays available offline afterwards.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/content/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'content',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      }
    })
  ],
  test: {
    root: __dirname,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8'
    }
  }
});
