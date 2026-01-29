#!/usr/bin/env node
// ===========================================
// PWA Icon Generator Script
// Generates SVG icons for PWA manifest
// Run: node scripts/generate-pwa-icons.js
// ===========================================

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icon SVG for each size
ICON_SIZES.forEach(size => {
  const borderRadius = Math.floor(size * 0.2);
  const logoScale = 0.6;
  const offset = size * (1 - logoScale) / 2;
  
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="teal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5EEDC3"/>
      <stop offset="50%" stop-color="#2DD4BF"/>
      <stop offset="100%" stop-color="#14B8A6"/>
    </linearGradient>
    <linearGradient id="coral" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8A9B"/>
      <stop offset="50%" stop-color="#F87171"/>
      <stop offset="100%" stop-color="#EF5A6F"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${borderRadius}" fill="url(#bg)"/>
  <g transform="translate(${offset}, ${offset}) scale(${logoScale * size / 200})">
    <path d="M100 10 L120 80 L100 100 L80 80 Z" fill="url(#teal)"/>
    <path d="M190 100 L120 120 L100 100 L120 80 Z" fill="url(#teal)"/>
    <path d="M100 190 L80 120 L100 100 L120 120 Z" fill="url(#coral)"/>
    <path d="M10 100 L80 80 L100 100 L80 120 Z" fill="url(#coral)"/>
  </g>
</svg>`;

  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svg);
  console.log(`Generated: icon-${size}x${size}.svg`);
});

// Shortcut icons
const shortcuts = [
  { name: 'shortcut-analyze', path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { name: 'shortcut-dashboard', path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'shortcut-concierge', path: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
];

shortcuts.forEach(({ name, path: iconPath }) => {
  const svg = `<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="20" fill="#1e293b"/>
  <g transform="translate(24, 24)">
    <path d="${iconPath}" stroke="#2DD4BF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="scale(2)"/>
  </g>
</svg>`;
  fs.writeFileSync(path.join(iconsDir, `${name}.svg`), svg);
  console.log(`Generated: ${name}.svg`);
});

console.log('\n✅ PWA icons generated!');
