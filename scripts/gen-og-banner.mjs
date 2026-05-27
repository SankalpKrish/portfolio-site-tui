import sharp from 'sharp';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const W = 1200, H = 630;
const BG = '#1e1e2e';
const TEXT_COLOR = '#cdd6f4';
const DASH_COLOR = '#6c7086';

// Fetch JetBrains Mono Bold TTF (cache locally)
const fontCachePath = join(__dirname, '.jetbrains-mono-bold.ttf');
if (!existsSync(fontCachePath)) {
  console.log('Downloading JetBrains Mono Bold...');
  const res = await fetch('https://github.com/JetBrains/JetBrainsMono/raw/master/fonts/ttf/JetBrainsMono-Bold.ttf');
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(fontCachePath, buf);
  console.log('Font downloaded.');
}
const fontB64 = readFileSync(fontCachePath).toString('base64');

// Sans image: scale to 200px pixel-perfect
const sansSize = 200;
const sansBuf = await sharp(join(root, 'public/sans.png'))
  .resize(sansSize, sansSize, { kernel: 'nearest', fit: 'fill' })
  .png()
  .toBuffer();

// Layout: center the group (sans + gap + dash + gap + text) horizontally
// Approximate text width at 64px bold monospace: ~34px per char * 22 chars = ~748px
const fontSize = 64;
const dashWidth = 42;
const approxTextWidth = 748;
const innerGap = 32; // gap between sans and dash, dash and text
const groupWidth = sansSize + innerGap + dashWidth + innerGap + approxTextWidth;
const groupLeft = Math.round((W - groupWidth) / 2);

const sansX = groupLeft;
const sansY = Math.round((H - sansSize) / 2);
const dashX = groupLeft + sansSize + innerGap;
const textX = dashX + dashWidth + innerGap;
const baselineY = Math.round(H / 2 + fontSize * 0.35);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>
      @font-face {
        font-family: 'JetBrainsMono';
        src: url('data:font/ttf;base64,${fontB64}') format('truetype');
        font-weight: bold;
      }
    </style>
  </defs>
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <text x="${dashX}" y="${baselineY}"
        font-family="JetBrainsMono, monospace" font-size="${fontSize}"
        fill="${DASH_COLOR}">—</text>
  <text x="${textX}" y="${baselineY}"
        font-family="JetBrainsMono, monospace" font-size="${fontSize}" font-weight="bold"
        fill="${TEXT_COLOR}">Sankalp Krishnamurthy</text>
</svg>`;

const result = await sharp({
  create: { width: W, height: H, channels: 4, background: BG }
})
  .composite([
    { input: Buffer.from(svg), top: 0, left: 0 },
    { input: sansBuf, top: sansY, left: sansX },
  ])
  .png()
  .toFile(join(root, 'public/og-banner.png'));

console.log(`Generated public/og-banner.png (${result.width}x${result.height})`);
