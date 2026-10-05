// Procedurally generates the PWA icons (no external art). Run: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const encodePng = (w, h, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const BG = [17, 21, 28];
const ACCENT = [255, 138, 30];
const LIGHT = [235, 240, 245];

// Signed-distance shapes in normalised [-1,1] space.
const sdCircle = (x, y, r) => Math.hypot(x, y) - r;
const sdBox = (x, y, hx, hy) => {
  const dx = Math.abs(x) - hx, dy = Math.abs(y) - hy;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0);
};
const sdRoundBox = (x, y, h, r) => sdBox(x, y, h - r, h - r) - r;

function shade(x, y, { maskable, rounded }) {
  const s = maskable ? 0.72 : 1; // keep content inside maskable safe zone
  const u = x / s, v = y / s;
  let col = null;
  const bgD = rounded ? sdRoundBox(x, y, 1, 0.22) : -1;
  if (bgD > 0) return [0, 0, 0, 0];
  // vertical gradient background
  const g = 0.5 + 0.5 * y;
  col = BG.map((c) => c + 14 * (1 - g));
  // crosshair ring
  const ring = Math.abs(sdCircle(u, v, 0.56)) - 0.07;
  // tick marks
  const ticks = Math.min(sdBox(u, v - 0.66, 0.06, 0.16), sdBox(u, v + 0.66, 0.06, 0.16), sdBox(u - 0.66, v, 0.16, 0.06), sdBox(u + 0.66, v, 0.16, 0.06));
  const dot = sdCircle(u, v, 0.13);
  if (Math.min(ring, ticks) < 0) col = ACCENT;
  if (dot < 0) col = LIGHT;
  return [...col, 255];
}

function render(size, opts) {
  const buf = Buffer.alloc(size * size * 4);
  const SS = 4;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = ((px + (sx + 0.5) / SS) / size) * 2 - 1;
          const y = ((py + (sy + 0.5) / SS) / size) * 2 - 1;
          const c = shade(x, y, opts);
          const a = c[3] / 255;
          acc[0] += c[0] * a; acc[1] += c[1] * a; acc[2] += c[2] * a; acc[3] += c[3];
        }
      }
      const n = SS * SS;
      const a = acc[3] / n;
      const i = (py * size + px) * 4;
      buf[i] = a > 0 ? Math.round(acc[0] / (a / 255) / n) : 0;
      buf[i + 1] = a > 0 ? Math.round(acc[1] / (a / 255) / n) : 0;
      buf[i + 2] = a > 0 ? Math.round(acc[2] / (a / 255) / n) : 0;
      buf[i + 3] = Math.round(a);
    }
  }
  return encodePng(size, size, buf);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', render(192, { maskable: false, rounded: true }));
writeFileSync('public/icons/icon-512.png', render(512, { maskable: false, rounded: true }));
writeFileSync('public/icons/icon-maskable-512.png', render(512, { maskable: true, rounded: false }));
writeFileSync('public/icons/apple-touch-icon-180.png', render(180, { maskable: false, rounded: false }));
writeFileSync('public/icons/favicon-64.png', render(64, { maskable: false, rounded: true }));
writeFileSync(
  'public/icons/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2"><rect x="-1" y="-1" width="2" height="2" rx="0.22" fill="#11151c"/><circle r="0.56" fill="none" stroke="#ff8a1e" stroke-width="0.14"/><g fill="#ff8a1e"><rect x="-0.06" y="-0.82" width="0.12" height="0.32"/><rect x="-0.06" y="0.5" width="0.12" height="0.32"/><rect x="-0.82" y="-0.06" width="0.32" height="0.12"/><rect x="0.5" y="-0.06" width="0.32" height="0.12"/></g><circle r="0.13" fill="#ebf0f5"/></svg>`,
);
console.info('icons written');
