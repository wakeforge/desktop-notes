'use strict';

const { contextBridge, ipcRenderer, app } = require('electron');
const store = require('../main/store');
const i18n = require('../shared/locales');

let _locale = i18n.resolveLocale(store.getSettings().language, app.getLocale());
const _t = (key, params) => i18n.t(_locale, key, params);

contextBridge.exposeInMainWorld('noteConfigAPI', {
  locale: _locale,
  t: _t,
  setLocale: (l) => { _locale = l; },
  formatRelTime: (iso) => i18n.formatRelTime(_locale, iso),
  formatCount: (n) => i18n.formatCount(_locale, n),
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
