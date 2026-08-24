'use strict';
// 生成 build/icon.ico：256x256 黄色便签图标，PNG 封装进 ICO 容器
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const px = Buffer.alloc(SIZE * SIZE * 4);

function setPx(x, y, r, g, b, a) {
  const i = (y * SIZE + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}

// 便签矩形
const L = 22, T = 22, R = 234, B = 234;
const RAD = 22;          // 圆角半径（仅 TL/TR/BL，BR 为折角不圆）
const FOLD = 46;         // 折角三角形边长
const yellow = [255, 221, 51];
const yellowFold = [226, 188, 28];
const edge = [196, 150, 8]; // 折角边线阴影

function inCircle(cx, cy, x, y, rad) {
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= rad * rad;
}

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    if (x >= L && x <= R && y >= T && y <= B) {
      let inside = true;
      if (x < L + RAD && y < T + RAD && !inCircle(L + RAD, T + RAD, x, y, RAD)) inside = false;
      if (x > R - RAD && y < T + RAD && !inCircle(R - RAD, T + RAD, x, y, RAD)) inside = false;
      if (x < L + RAD && y > B - RAD && !inCircle(L + RAD, B - RAD, x, y, RAD)) inside = false;
      if (inside) {
        // 右下折角三角形
        if (x >= R - FOLD && y >= B - FOLD && (R - x) + (B - y) <= FOLD) {
          r = yellowFold[0]; g = yellowFold[1]; b = yellowFold[2]; a = 255;
          // 折角斜边（从 R,B-FOLD 到 R-FOLD,B）描一条暗线
          const dist = Math.abs((R - x) + (B - y) - FOLD);
          if (dist <= 2) { r = edge[0]; g = edge[1]; b = edge[2]; }
        } else {
          // 主体：左侧/顶部轻微高光，右侧/底部轻微暗化
          const shade = (x - L) / (R - L) * 0.12 - (y - T) / (B - T) * 0.06;
          r = Math.max(0, Math.min(255, yellow[0] + shade * 30));
          g = Math.max(0, Math.min(255, yellow[1] + shade * 30));
          b = Math.max(0, Math.min(255, yellow[2] + shade * 30));
          a = 255;
        }
      }
    }
    setPx(x, y, r, g, b, a);
  }
}

// ---- PNG 编码 ----
let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // color type RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0; // filter: none
  px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const idat = zlib.deflateSync(raw, { level: 9 });

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0))
]);

// ---- ICO 封装（PNG 直接作为图像数据） ----
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // count

const entry = Buffer.alloc(16);
entry[0] = 0;   // width (0 => 256)
entry[1] = 0;   // height
entry[2] = 0;   // colors
entry[3] = 0;   // reserved
entry.writeUInt16LE(1, 4);      // planes
entry.writeUInt16LE(32, 6);     // bit count
entry.writeUInt32LE(png.length, 8);   // bytes in resource
entry.writeUInt32LE(6 + 16, 12);      // offset

const ico = Buffer.concat([header, entry, png]);

const outDir = path.join(__dirname, '..', 'build');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
console.log('icon.ico written:', ico.length, 'bytes');
