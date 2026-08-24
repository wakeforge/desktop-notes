'use strict';
// 打印可能与代码签名相关的环境变量，并查找项目内的 pfx/p12 证书
const fs = require('fs');
const path = require('path');
const keys = Object.keys(process.env).filter((k) => /CSC|PFX|CERT|WIN_CSC|SIGN/i.test(k));
console.log('--- candidate env keys ---');
for (const k of keys) console.log(k, '=', JSON.stringify(process.env[k]));
if (keys.length === 0) console.log('(none)');

console.log('--- pfx/p12 in project root ---');
const root = path.resolve(__dirname, '..');
for (const f of fs.readdirSync(root)) {
  if (/\.(pfx|p12)$/i.test(f)) console.log(path.join(root, f));
}
console.log('--- done ---');
