'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// 沙箱 preload（Electron 默认 sandbox:true）只允许 require('electron')：
// 语言解析与翻译一律经同步 IPC 委托主进程（主进程持有 store 与 app.getLocale）。
const params = new URLSearchParams(location.search);
const noteId = params.get('id');
let _locale = ipcRenderer.sendSync('i18n:get');
const _t = (key, params) => ipcRenderer.sendSync('i18n:t', key, params);

// 翻译当前文档的 data-i18n* 属性（四份 preload 各持一份，沙箱下无法共享外部文件）
function _applyI18n(root) {
  root = root || document;
  if (!root || !root.querySelectorAll) return;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = _t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.setAttribute('title', _t(el.getAttribute('data-i18n-title')));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', _t(el.getAttribute('data-i18n-placeholder')));
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', _t(el.getAttribute('data-i18n-aria')));
  });
}

contextBridge.exposeInMainWorld('noteAPI', {
  id: noteId,
  locale: _locale,
  t: _t,
  setLocale: (l) => { _locale = l; },
  formatRelTime: (iso) => ipcRenderer.sendSync('i18n:reltime', iso),
  formatCount: (n) => ipcRenderer.sendSync('i18n:count', n),
  applyI18n: _applyI18n,
  onI18nChanged: (cb) => ipcRenderer.on('i18n:changed', (_e, loc) => cb(loc)),
  getSelf: () => ipcRenderer.invoke('note:self-get', noteId),
  saveLive: (patch) => ipcRenderer.invoke('note:save-live', noteId, patch),
  reportBounds: (bounds) => ipcRenderer.invoke('note:report-bounds', noteId, bounds),
  setLock: (locked) => ipcRenderer.invoke('note:set-lock', noteId, locked),
  pickImage: () => ipcRenderer.invoke('note:pick-image', noteId),
  addImageFromPath: (p) => ipcRenderer.invoke('note:add-image-from-path', noteId, p),
  pasteImage: () => ipcRenderer.invoke('note:paste-image', noteId),
  openConfig: () => ipcRenderer.invoke('config:open', noteId),
  onLockChanged: (cb) => ipcRenderer.on('note:lock-changed', (_e, locked) => cb(locked)),
  onData: (cb) => ipcRenderer.on('note:data', (_e, data) => cb(data))
});
