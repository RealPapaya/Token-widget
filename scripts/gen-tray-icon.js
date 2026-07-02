// Generates assets/tray.png — a Claude-style starburst in brand orange (#D97757)
// on a transparent background. Pure Node (zlib), no dependencies.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 32;
const COLOR = [0xd9, 0x77, 0x57]; // Claude orange

// Ray lengths vary to echo the irregular Claude sunburst mark.
const RAYS = 12;
const LENGTHS = [1.0, 0.72, 0.9, 0.68, 1.0, 0.78, 0.92, 0.7, 1.0, 0.74, 0.9, 0.78];

function coverage(px, py) {
  // 3x3 supersampling for antialiasing
  let hits = 0;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const x = px + (sx + 0.5) / 3 - SIZE / 2;
      const y = py + (sy + 0.5) / 3 - SIZE / 2;
      const r = Math.hypot(x, y);
      const maxR = SIZE / 2 - 1;
      if (r > maxR) continue;
      if (r < 1.6) { hits++; continue; } // solid core
      const angle = Math.atan2(y, x);
      const step = (Math.PI * 2) / RAYS;
      const k = Math.round(angle / step);
      const rayAngle = k * step;
      const idx = ((k % RAYS) + RAYS) % RAYS;
      const rayLen = maxR * LENGTHS[idx];
      if (r > rayLen) continue;
      // tapered width: wide at base, narrow at tip
      const t = r / rayLen;
      const halfWidth = 1.5 * (1 - t) + 0.45;
      const perp = Math.abs(r * Math.sin(angle - rayAngle));
      if (perp <= halfWidth) hits++;
    }
  }
  return hits / 9;
}

function buildRGBA() {
  const buf = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const a = coverage(x, y);
      const o = (y * SIZE + x) * 4;
      buf[o] = COLOR[0];
      buf[o + 1] = COLOR[1];
      buf[o + 2] = COLOR[2];
      buf[o + 3] = Math.round(a * 255);
    }
  }
  return buf;
}

// --- minimal PNG encoder ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    raw[y * (SIZE * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'tray.png'), encodePNG(buildRGBA()));
console.log('wrote assets/tray.png');
