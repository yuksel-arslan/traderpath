#!/usr/bin/env node
// ===========================================
// Capacitor Icon & Splash Screen Generator
//
// Converts the TraderPath SVG logo to the PNG
// source files required by @capacitor/assets.
//
// USAGE:
//   node scripts/generate-icons.mjs
//   # then:
//   npx @capacitor/assets generate
//
// REQUIRES:
//   npm install --save-dev sharp   (or: pnpm add -D sharp)
//
// OUTPUT (into capacitor-assets/):
//   icon-only.png        1024×1024  app icon, no bg
//   icon-background.png  1024×1024  solid teal bg for Android adaptive icon
//   icon-foreground.png  1024×1024  transparent bg for Android adaptive icon
//   splash.png           2732×2732  centered logo, dark bg
//   splash-dark.png      2732×2732  centered logo, dark bg (same for dark mode)
// ===========================================

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'capacitor-assets');

// Verify sharp is available
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('❌  sharp is not installed.');
  console.error('    Run: npm install --save-dev sharp');
  process.exit(1);
}

// Source SVG — the dark app icon
const svgPath = join(root, 'public', 'app-icon-dark.svg');
if (!existsSync(svgPath)) {
  console.error(`❌  SVG not found: ${svgPath}`);
  process.exit(1);
}
const svgBuffer = readFileSync(svgPath);

const TEAL = '#14B8A6';   // TraderPath accent color
const DARK = '#0A0A0A';   // App dark background

// ── Icon: transparent background (1024×1024) ─────────────────────────────────
console.log('Generating icon-only.png...');
await sharp(svgBuffer)
  .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(outDir, 'icon-only.png'));

// ── Icon: solid dark background (for iOS) ────────────────────────────────────
console.log('Generating icon-background.png...');
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: DARK },
})
  .composite([{
    input: await sharp(svgBuffer).resize(700, 700, { fit: 'contain' }).png().toBuffer(),
    gravity: 'center',
  }])
  .png()
  .toFile(join(outDir, 'icon-background.png'));

// ── Icon: foreground logo for Android adaptive icon ───────────────────────────
console.log('Generating icon-foreground.png...');
await sharp(svgBuffer)
  .resize(700, 700, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 162, bottom: 162, left: 162, right: 162, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(join(outDir, 'icon-foreground.png'));

// ── Splash screen (2732×2732, dark bg) ───────────────────────────────────────
async function makeSplash(filename) {
  console.log(`Generating ${filename}...`);
  await sharp({
    create: { width: 2732, height: 2732, channels: 4, background: DARK },
  })
    .composite([{
      input: await sharp(svgBuffer).resize(512, 512, { fit: 'contain' }).png().toBuffer(),
      gravity: 'center',
    }])
    .png()
    .toFile(join(outDir, filename));
}

await makeSplash('splash.png');
await makeSplash('splash-dark.png');

console.log('');
console.log('✅  All source images generated in capacitor-assets/');
console.log('');
console.log('Next step:');
console.log('  npx @capacitor/assets generate');
