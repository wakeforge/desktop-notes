'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// 沙箱 preload（Electron 默认 sandbox:true）只允许 require('electron')：
// 语言解析与翻译一律经同步 IPC 委托主进程（主进程持有 store 与 app.getLocale）。
let _locale = ipcRenderer.sendSync('i18n:get');
const _t = (key, params) => ipcRenderer.sendSync('i18n:t', key, params);

// 翻译当前文档的 data-i18n* 属性（各份 preload 各持一份，沙箱下无法共享外部文件）
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

contextBridge.exposeInMainWorld('aboutAPI', {
  locale: _locale,
  t: _t,
  setLocale: (l) => { _locale = l; },
  applyI18n: _applyI18n,
  onI18nChanged: (cb) => ipcRenderer.on('i18n:changed', (_e, loc) => cb(loc)),
  // 应用元信息（版本 / 发布时间 / 链接 / 运行时版本）
  getAppInfo: () => ipcRenderer.invoke('app:info'),
  // 用系统默认浏览器打开外链
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  // 关闭自身
  close: () => ipcRenderer.send('about:close')
});
