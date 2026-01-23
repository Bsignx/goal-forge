import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

// Ensure icons directory exists
mkdirSync(iconsDir, { recursive: true });

// Create icon with emoji
async function createIcon(size, filename) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.167}" fill="#0c0a09"/>
      <text x="${size / 2}" y="${size * 0.6}" font-size="${size * 0.5}" text-anchor="middle" fill="white">🎯</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, filename));

  console.log(`Created ${filename}`);
}

// Create maskable icon (with extra padding for safe area)
async function createMaskableIcon(size, filename) {
  const padding = size * 0.1; // 10% padding for safe area
  const innerSize = size - (padding * 2);
  
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#0c0a09"/>
      <text x="${size / 2}" y="${size * 0.6}" font-size="${size * 0.4}" text-anchor="middle" fill="white">🎯</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(iconsDir, filename));

  console.log(`Created ${filename}`);
}

// Generate all icons
async function main() {
  await createIcon(192, 'icon-192x192.png');
  await createIcon(512, 'icon-512x512.png');
  await createMaskableIcon(512, 'icon-maskable-512x512.png');
  console.log('All icons generated!');
}

main().catch(console.error);
