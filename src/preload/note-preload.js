'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const params = new URLSearchParams(location.search);
const noteId = params.get('id');

contextBridge.exposeInMainWorld('noteAPI', {
  id: noteId,
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
