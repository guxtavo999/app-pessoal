// Gera os ícones PNG do app (fundo azul com gota branca): node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

// Gota em coordenadas normalizadas (0..1)
const CX = 0.5, CY = 0.6, R = 0.2, TOP = 0.2;
function inDrop(x, y) {
  if ((x - CX) ** 2 + (y - CY) ** 2 <= R * R) return true;
  if (y < TOP || y > CY) return false;
  const half = R * ((y - TOP) / (CY - TOP)) ** 1.4;
  return Math.abs(x - CX) <= half;
}

function png(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const S = 4; // supersampling
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let hit = 0;
      for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
        if (inDrop((px + (sx + 0.5) / S) / size, (py + (sy + 0.5) / S) / size)) hit++;
      }
      const a = hit / (S * S);
      const t = py / size; // gradiente vertical
      const bg = [Math.round(0x4a - 0x30 * t), Math.round(0x9d - 0x30 * t), 0xff];
      const o = py * (size * 4 + 1) + 1 + px * 4;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(bg[c] * (1 - a) + 255 * a);
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 bits, RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = join(import.meta.dirname, '..', 'icons');
mkdirSync(dir, { recursive: true });
for (const s of [180, 192, 512]) writeFileSync(join(dir, `icon-${s}.png`), png(s));
console.log('ícones gerados em', dir);
