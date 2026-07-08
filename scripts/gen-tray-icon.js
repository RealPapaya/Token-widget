const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const COLOR = [0xd9, 0x77, 0x57]; // Claude orange
const TEMPLATE_COLOR = [0x00, 0x00, 0x00];
const APP_ICON_SIZES = [
  { size: 16, type: 'icp4' },
  { size: 32, type: 'icp5' },
  { size: 64, type: 'icp6' },
  { size: 128, type: 'ic07' },
  { size: 256, type: 'ic08' },
  { size: 512, type: 'ic09' },
  { size: 1024, type: 'ic10' },
];
const RAYS = 12;
const LENGTHS = [1.0, 0.72, 0.9, 0.68, 1.0, 0.78, 0.92, 0.7, 1.0, 0.74, 0.9, 0.78];

function coverage(px, py, size) {
  let hits = 0;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      const x = px + (sx + 0.5) / 3 - size / 2;
      const y = py + (sy + 0.5) / 3 - size / 2;
      const r = Math.hypot(x, y);
      const maxR = size / 2 - Math.max(1, size / 32);
      if (r > maxR) continue;
      if (r < size * 0.05) { hits++; continue; }
      const angle = Math.atan2(y, x);
      const step = (Math.PI * 2) / RAYS;
      const k = Math.round(angle / step);
      const rayAngle = k * step;
      const idx = ((k % RAYS) + RAYS) % RAYS;
      const rayLen = maxR * LENGTHS[idx];
      if (r > rayLen) continue;
      const t = r / rayLen;
      const halfWidth = size * 0.047 * (1 - t) + size * 0.014;
      const perp = Math.abs(r * Math.sin(angle - rayAngle));
      if (perp <= halfWidth) hits++;
    }
  }
  return hits / 9;
}

function buildRGBA(size, color = COLOR) {
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const a = coverage(x, y, size);
      const o = (y * size + x) * 4;
      buf[o] = color[0];
      buf[o + 1] = color[1];
      buf[o + 2] = color[2];
      buf[o + 3] = Math.round(a * 255);
    }
  }
  return buf;
}

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

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeICO(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + images.length * 16;
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry[0] = img.size === 256 ? 0 : img.size;
    entry[1] = img.size === 256 ? 0 : img.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(img.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += img.data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((img) => img.data)]);
}

function encodeICNS(images) {
  const entries = images.map((img) => {
    const header = Buffer.alloc(8);
    header.write(img.type, 0, 4, 'ascii');
    header.writeUInt32BE(img.data.length + 8, 4);
    return Buffer.concat([header, img.data]);
  });
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(8 + entries.reduce((sum, entry) => sum + entry.length, 0), 4);
  return Buffer.concat([header, ...entries]);
}

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'tray.png'), encodePNG(32, buildRGBA(32)));
fs.writeFileSync(path.join(outDir, 'trayTemplate.png'), encodePNG(16, buildRGBA(16, TEMPLATE_COLOR)));
fs.writeFileSync(path.join(outDir, 'trayTemplate@2x.png'), encodePNG(32, buildRGBA(32, TEMPLATE_COLOR)));
fs.writeFileSync(path.join(outDir, 'app.icns'), encodeICNS(
  APP_ICON_SIZES.map(({ size, type }) => ({
    type,
    data: encodePNG(size, buildRGBA(size)),
  }))
));
console.log('wrote assets/tray.png');
console.log('wrote assets/trayTemplate.png');
console.log('wrote assets/trayTemplate@2x.png');
console.log('wrote assets/app.icns');
