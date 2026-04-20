import sharp from "sharp";
import { mkdirSync } from "node:fs";

const OUT = "public";
mkdirSync(OUT, { recursive: true });

const svg = (size, rounded, padding) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rounded ? size * 0.22 : 0}" fill="#16a34a"/>
  <text x="50%" y="50%" dy=".08em"
        font-family="-apple-system,BlinkMacSystemFont,system-ui,sans-serif"
        font-size="${size * (padding ? 0.45 : 0.6)}"
        font-weight="700"
        fill="#ffffff"
        text-anchor="middle"
        dominant-baseline="middle">C</text>
</svg>`;

const targets = [
  { name: "icon-192.png", size: 192, rounded: true, padding: false },
  { name: "icon-512.png", size: 512, rounded: true, padding: false },
  { name: "icon-maskable.png", size: 512, rounded: false, padding: true },
  { name: "apple-touch-icon.png", size: 180, rounded: false, padding: false },
];

for (const t of targets) {
  await sharp(Buffer.from(svg(t.size, t.rounded, t.padding)))
    .png()
    .toFile(`${OUT}/${t.name}`);
  console.log(`✓ ${t.name}`);
}
