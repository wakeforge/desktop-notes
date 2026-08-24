'use strict';
// 跨平台启动器：清除可能干扰的 ELECTRON_RUN_AS_NODE，再拉起 Electron
const { spawn } = require('child_process');
const electron = require('electron');
const path = require('path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const appRoot = path.join(__dirname, '..');
const child = spawn(electron, [appRoot], { stdio: 'inherit', env });

child.on('close', (code) => process.exit(code ?? 0));
