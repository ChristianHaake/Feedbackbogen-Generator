// Generates PWA icons from square source PNGs.
//
// Usage:  node scripts/generate-icons.mjs [anySource.png] [maskableSource.png]
// Defaults:
//   any/apple : "assets/FBG - Logo auf Weiß.png"  (white background)
//   maskable  : "assets/FBG - Logo auf Blau.png"  (brand-blue, full-bleed for safe-zone crop)
//
// Outputs into public/icons/:
//   icon-192.png, icon-512.png            — standard "any" icons (white source)
//   icon-maskable-512.png                 — maskable, full-bleed brand background
//   apple-touch-icon.png (180x180)        — iOS home-screen icon (white source)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const anySrc = path.resolve(root, process.argv[2] ?? 'assets/FBG - Logo auf Weiß.png');
const maskSrc = path.resolve(root, process.argv[3] ?? 'assets/FBG - Logo auf Blau.png');
const outDir = path.resolve(root, 'public/icons');

for (const [label, file] of [['any', anySrc], ['maskable', maskSrc]]) {
  if (!fs.existsSync(file)) {
    console.error(`${label} source not found: ${file}\nProvide a square PNG (min 512x512).`);
    process.exit(1);
  }
}

fs.mkdirSync(outDir, { recursive: true });
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Square sources → straight cover resize keeps the baked-in background full-bleed.
async function resize(src, size, file) {
  await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(path.join(outDir, file));
}

await resize(anySrc, 192, 'icon-192.png');
await resize(anySrc, 512, 'icon-512.png');
await resize(anySrc, 180, 'apple-touch-icon.png');
await resize(maskSrc, 512, 'icon-maskable-512.png');
console.log('PWA icons written to public/icons/ (any+apple from white, maskable from blue)');
