'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('noteConfigAPI', {
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
