'use strict';

const { contextBridge, ipcRenderer, app } = require('electron');
const store = require('../main/store');
const i18n = require('../shared/locales');

let _locale = i18n.resolveLocale(store.getSettings().language, app.getLocale());
const _t = (key, params) => i18n.t(_locale, key, params);

contextBridge.exposeInMainWorld('globalConfigAPI', {
  locale: _locale,
  t: _t,
  setLocale: (l) => { _locale = l; },
  locales: i18n.LOCALES,
  localeLabels: i18n.LOCALE_LABELS,
  formatRelTime: (iso) => i18n.formatRelTime(_locale, iso),
  formatCount: (n) => i18n.formatCount(_locale, n),
  applyI18n: (root) => i18n.applyI18n(_t, root),
  onI18nChanged: (cb) => ipcRenderer.on('i18n:changed', (_e, loc) => cb(loc)),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  // 当前生效主题（'system' 设置解析后的实际 light/dark）
  effectiveTheme: () => ipcRenderer.invoke('theme:effective'),
  // 关闭自身
  closeWindow: () => ipcRenderer.send('global-config:close'),
  onRefresh: (cb) => ipcRenderer.on('global-config:refresh', () => cb())
});
