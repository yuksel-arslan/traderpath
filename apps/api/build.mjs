import * as esbuild from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// Get all TypeScript files recursively
function getEntryPoints(dir, base = dir) {
  const files = [];
  for (const file of readdirSync(dir)) {
    const path = join(dir, file);
    if (statSync(path).isDirectory()) {
      files.push(...getEntryPoints(path, base));
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      files.push(path);
    }
  }
  return files;
}

const entryPoints = getEntryPoints('./src');

await esbuild.build({
  entryPoints,
  outdir: 'dist',
  bundle: false,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  outExtension: { '.js': '.js' },
});

console.log('Build completed successfully');
