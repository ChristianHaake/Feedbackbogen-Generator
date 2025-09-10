import { defineConfig } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// __dirname replacement for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Minimal plugin to serve/copy /content alongside /public
function contentPlugin() {
  const contentDir = path.resolve(__dirname, 'content');
  return {
    name: 'content-static',
    configureServer(server: any) {
      server.middlewares.use('/content', (req: any, res: any, next: any) => {
        const url = req.url?.replace(/^\/content\/?/, '') || '';
        const filePath = path.join(contentDir, url);
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
  base: '/Feedbackbogen-Generator/', // Wichtig für GitHub Pages
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
  plugins: [contentPlugin()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8'
    }
  }
});
