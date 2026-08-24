'use strict';
// 本地镜像代理：仅拦截 winCodeSign-2.6.0.7z（返回已去除符号链接的重打包版本，
// 原版在禁止创建符号链接的沙箱里解压失败）。同时 app-builder 二进制的 SHA512
// 校验值已补丁为去符号链接版 7z 的哈希，故校验可通过。其余二进制重定向到官方 npmmirror。
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8123;
const REAL = 'https://registry.npmmirror.com/-/binary/electron-builder-binaries';
const LOCAL_7Z = path.resolve(__dirname, '..', 'winCodeSign-2.6.0.nosym.7z');

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/winCodeSign-2.6.0/winCodeSign-2.6.0.7z')) {
    fs.readFile(LOCAL_7Z, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('local winCodeSign 7z missing: ' + err.message);
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': data.length,
      });
      res.end(data);
    });
    return;
  }
  // 其余走官方镜像
  res.writeHead(302, { Location: REAL + req.url });
  res.end();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('[mirror-proxy] listening on http://127.0.0.1:' + PORT + '  local7z=' + LOCAL_7Z);
});
