'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('configAPI', {
  listNotes: () => ipcRenderer.invoke('notes:list'),
  getNote: (id) => ipcRenderer.invoke('note:get', id),
  createNote: (partial) => ipcRenderer.invoke('note:create', partial),
  updateNote: (id, patch) => ipcRenderer.invoke('note:update', id, patch),
  deleteNote: (id) => ipcRenderer.invoke('note:delete', id),
  duplicateNote: (id) => ipcRenderer.invoke('note:duplicate', id),
  setLock: (id, locked) => ipcRenderer.invoke('note:set-lock', id, locked),
  setAllLock: (locked) => ipcRenderer.invoke('notes:set-all-lock', locked),
  setHidden: (id, hidden) => ipcRenderer.invoke('note:set-hidden', id, hidden),
  setAllHidden: (hidden) => ipcRenderer.invoke('notes:set-all-hidden', hidden),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  listDisplays: () => ipcRenderer.invoke('displays:list'),
  // 打开便签详情弹窗
  openNoteConfig: (id) => ipcRenderer.invoke('note-config:open', id),
  // 打开全局配置弹窗
  openGlobalConfig: () => ipcRenderer.invoke('global-config:open'),
  // 重新校准所有便签到可见区
  recalibrate: () => ipcRenderer.invoke('notes:recalibrate'),
  onRefresh: (cb) => ipcRenderer.on('config:refresh', () => cb())
});
