const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Create crisp SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="pwa-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#c2410c"/>
    </linearGradient>
    <filter id="pwa-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#pwa-grad)"/>
  <g filter="url(#pwa-shadow)" fill="#ffffff">
    <!-- Utensil: Fork -->
    <path d="M160 120 v75 c0 22 14 40 34 46 v135 c0 8 6 14 14 14 h2 c8 0 14-6 14-14 V241 c20-6 34-24 34-46 v-75 c0-7-5-12-12-12 s-12 5-12 12 v60 h-14 v-60 c0-7-5-12-12-12 s-12 5-12 12 v60 h-14 v-60 c0-7-5-12-12-12 s-12 5-12 12 z"/>
    <!-- Utensil: Knife -->
    <path d="M305 120 c-7 0-12 5-12 12 v118 c0 22 14 40 34 46 v90 c0 8 6 14 14 14 h2 c8 0 14-6 14-14 V134 c0-8-7-14-15-14 c-25 0-32 0-37 0 z"/>
    <!-- Serving Plate base curve -->
    <rect x="180" y="405" width="152" height="18" rx="9" fill="#ffffff" opacity="0.85"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.svg'), svgContent, 'utf8');

// 2. Pure Node.js PNG Generator
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function generatePng(size, isMaskable = false) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // 8-bit
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const raw = Buffer.alloc(size * (1 + size * 4));
  let offset = 0;

  const cornerRadius = isMaskable ? 0 : size * 0.22;

  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // Filter: None
    for (let x = 0; x < size; x++) {
      // Base orange gradient
      const gradRatio = y / size;
      let r = Math.round(234 * (1 - gradRatio * 0.2));
      let g = Math.round(88 * (1 - gradRatio * 0.3));
      let b = Math.round(12 * (1 - gradRatio * 0.4));
      let a = 255;

      // Rounded rect boundary if not maskable
      if (!isMaskable) {
        let dx = 0;
        let dy = 0;
        if (x < cornerRadius) dx = cornerRadius - x;
        else if (x > size - cornerRadius) dx = x - (size - cornerRadius);
        if (y < cornerRadius) dy = cornerRadius - y;
        else if (y > size - cornerRadius) dy = y - (size - cornerRadius);

        if (dx > 0 && dy > 0) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > cornerRadius) {
            a = 0; // Transparent outside corner
          } else if (dist > cornerRadius - 1.5) {
            a = Math.round(255 * (cornerRadius - dist) / 1.5);
          }
        }
      }

      // Draw white silhouette: Utensils (Fork on left, Knife on right)
      const nx = x / size;
      const ny = y / size;

      let isWhite = false;

      // Fork body (left side)
      if (nx >= 0.30 && nx <= 0.325 && ny >= 0.25 && ny <= 0.40) isWhite = true;
      if (nx >= 0.355 && nx <= 0.380 && ny >= 0.25 && ny <= 0.40) isWhite = true;
      if (nx >= 0.410 && nx <= 0.435 && ny >= 0.25 && ny <= 0.40) isWhite = true;
      if (nx >= 0.30 && nx <= 0.435 && ny >= 0.40 && ny <= 0.48) isWhite = true;
      if (nx >= 0.355 && nx <= 0.380 && ny >= 0.48 && ny <= 0.72) isWhite = true;

      // Knife body (right side)
      if (nx >= 0.58 && nx <= 0.67 && ny >= 0.25 && ny <= 0.48) {
        const bladeLimit = 0.58 + 0.09 * (1 - (ny - 0.25) / 0.23);
        if (nx <= bladeLimit) isWhite = true;
      }
      if (nx >= 0.58 && nx <= 0.615 && ny >= 0.48 && ny <= 0.72) isWhite = true;

      // Bottom plate / underline accent
      if (nx >= 0.32 && nx <= 0.68 && ny >= 0.77 && ny <= 0.81) isWhite = true;

      if (isWhite && a > 0) {
        r = 255;
        g = 255;
        b = 255;
      }

      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Generate sizes
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), generatePng(192, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), generatePng(512, false));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192x192.png'), generatePng(192, true));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512x512.png'), generatePng(512, true));

console.log('SUCCESS: Generated all PWA PNG and SVG icons');
