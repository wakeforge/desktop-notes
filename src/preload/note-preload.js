'use strict';

const { contextBridge, ipcRenderer, app } = require('electron');
const store = require('../main/store');
const i18n = require('../shared/locales');

const params = new URLSearchParams(location.search);
const noteId = params.get('id');
let _locale = i18n.resolveLocale(store.getSettings().language, app.getLocale());
const _t = (key, params) => i18n.t(_locale, key, params);

contextBridge.exposeInMainWorld('noteAPI', {
  id: noteId,
  locale: _locale,
  t: _t,
  setLocale: (l) => { _locale = l; },
  formatRelTime: (iso) => i18n.formatRelTime(_locale, iso),
  formatCount: (n) => i18n.formatCount(_locale, n),
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
