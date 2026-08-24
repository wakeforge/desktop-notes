'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('globalConfigAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (patch) => ipcRenderer.invoke('settings:update', patch),
  // 当前生效主题（'system' 设置解析后的实际 light/dark）
  effectiveTheme: () => ipcRenderer.invoke('theme:effective'),
  // 关闭自身
  closeWindow: () => ipcRenderer.send('global-config:close'),
  onRefresh: (cb) => ipcRenderer.on('global-config:refresh', () => cb())
});
