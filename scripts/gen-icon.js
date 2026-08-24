'use strict';
// 生成一个 16x16 的托盘图标 PNG（黄色便签 + 折角），纯 Node，无依赖
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 16, H = 16;
const px = Buffer.alloc(W * H * 4, 0); // RGBA, 全透明

function set(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}

// 便签主体 (2..13) 黄色，右上角折角画成深一点
for (let y = 2; y <= 13; y++) {
  for (let x = 2; x <= 13; x++) {
    // 右上折角三角形
    if (x >= 10 && y <= 5 && (x - 10) + (5 - y) >= 3) {
      set(x, y, 0xE6, 0xC2, 0x2E, 255); // 折角深黄
    } else {
      set(x, y, 0xFF, 0xE0, 0x5A, 255); // 便签黄
    }
  }
}
// 三条“文字”横线
for (const ly of [6, 9, 12]) {
  for (let x = 4; x <= 11; x++) set(x, ly, 0x7A, 0x5A, 0x10, 255);
}

// 组装 PNG
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // color type RGBA
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0; // filter none
  px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
const idat = zlib.deflateSync(raw);
const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0))
]);

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'tray.png'), png);
console.log('tray.png written, bytes=', png.length);
console.log('dataurl=data:image/png;base64,' + png.toString('base64'));
