'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// 沙箱 preload（Electron 默认 sandbox:true）只允许 require('electron')：
// 语言解析与翻译一律经同步 IPC 委托主进程（主进程持有 store 与 app.getLocale）。
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

contextBridge.exposeInMainWorld('noteConfigAPI', {
  locale: _locale,
  t: _t,
  setLocale: (l) => { _locale = l; },
  formatRelTime: (iso) => ipcRenderer.sendSync('i18n:reltime', iso),
  formatCount: (n) => ipcRenderer.sendSync('i18n:count', n),
  applyI18n: _applyI18n,
  onI18nChanged: (cb) => ipcRenderer.on('i18n:changed', (_e, loc) => cb(loc)),
  getNote: (id) => ipcRenderer.invoke('note:get', id),
  updateNote: (id, patch) => ipcRenderer.invoke('note:update', id, patch),
  deleteNote: (id) => ipcRenderer.invoke('note:delete', id),
  listNotes: () => ipcRenderer.invoke('notes:list'),
  listDisplays: () => ipcRenderer.invoke('displays:list'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setLock: (id, locked) => ipcRenderer.invoke('note:set-lock', id, locked),
  setHidden: (id, hidden) => ipcRenderer.invoke('note:set-hidden', id, hidden),
  locateNote: (id) => ipcRenderer.invoke('note:locate', id),
  closeWindow: () => ipcRenderer.send('note-config:close'),
  onRefresh: (cb) => ipcRenderer.on('note-config:refresh', () => cb())
});
