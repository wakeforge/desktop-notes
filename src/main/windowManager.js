'use strict';

const { BrowserWindow, screen, app } = require('electron');
const path = require('path');
const store = require('./store');
const i18n = require('../shared/locales');

function currentLocale() {
  return i18n.resolveLocale(store.getSettings().language, app.getLocale());
}
function t(key, params) {
  return i18n.t(currentLocale(), key, params);
}

const noteWindows = new Map();
let configWindow = null;
const noteConfigWindows = new Map(); // noteId -> 详情弹窗 BrowserWindow
let globalConfigWindow = null;       // 全局配置弹窗（单例）

// 笔记位置存的是虚拟桌面绝对坐标 (absX, absY)，直接落位，不依赖 display id。
// 若绝对坐标已越界（拔屏/改分辨率），用 getDisplayMatching 兜底回主屏工作区。
function clampToScreen(bounds) {
  const d = screen.getDisplayMatching(bounds) || screen.getPrimaryDisplay();
  const wa = d.workArea;
  const w = bounds.width;
  const h = bounds.height;
  let x = bounds.x;
  let y = bounds.y;
  if (x + w > wa.x + wa.width) x = wa.x + wa.width - w;
  if (y + h > wa.y + wa.height) y = wa.y + wa.height - h;
  if (x < wa.x) x = wa.x;
  if (y < wa.y) y = wa.y;
  return { x: Math.round(x), y: Math.round(y) };
}

function createNoteWindow(note) {
  if (noteWindows.has(note.id)) {
    return noteWindows.get(note.id);
  }
  const pos = clampToScreen({
    x: note.absX ?? 0,
    y: note.absY ?? 0,
    width: note.width || 240,
    height: note.height || 160
  });

  const win = new BrowserWindow({
    x: pos.x,
    y: pos.y,
    width: note.width || 240,
    height: note.height || 160,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: note.alwaysOnTop !== false,
    hasShadow: false,
    focusable: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload', 'note-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webviewTag: true
      }
  });

  if (note.alwaysOnTop !== false) {
    win.setAlwaysOnTop(true, 'floating');
  }

  win.loadFile(path.join(__dirname, '..', 'renderer', 'note', 'note.html'), {
    query: { id: note.id }
  });

  win.on('closed', () => {
    noteWindows.delete(note.id);
  });

  noteWindows.set(note.id, win);
  applyLockState(note.id, note.locked !== false);
  applyHiddenState(note.id, note.hidden === true);
  return win;
}

function applyHiddenState(id, hidden) {
  const win = noteWindows.get(id);
  if (!win || win.isDestroyed()) return;
  if (hidden) win.hide();
  else win.show();
}

function applyLockState(id, locked) {
  const win = noteWindows.get(id);
  if (!win || win.isDestroyed()) return;
  if (locked) {
    win.setIgnoreMouseEvents(true, { forward: false });
    win.setResizable(false);
    win.setMovable(false);
  } else {
    win.setIgnoreMouseEvents(false);
    win.setResizable(true);
    win.setMovable(true);
    win.focus();
  }
  win.webContents.send('note:lock-changed', locked);
}

function reloadNote(id) {
  const note = store.getNote(id);
  const win = noteWindows.get(id);
  if (!note) {
    if (win && !win.isDestroyed()) win.close();
    return;
  }
  if (!win || win.isDestroyed()) {
    createNoteWindow(note);
    return;
  }
  const pos = clampToScreen({
    x: note.absX ?? 0,
    y: note.absY ?? 0,
    width: note.width || 240,
    height: note.height || 160
  });
  win.setBounds({ x: pos.x, y: pos.y, width: note.width || 240, height: note.height || 160 });
  win.setAlwaysOnTop(note.alwaysOnTop !== false, 'floating');
  applyLockState(id, note.locked !== false);
  applyHiddenState(id, note.hidden === true);
  win.webContents.send('note:data', note);
}

function closeNoteWindow(id) {
  const win = noteWindows.get(id);
  if (win && !win.isDestroyed()) win.close();
  noteWindows.delete(id);
}

function restoreAllNotes() {
  const notes = store.getNotes();
  for (const note of notes) {
    createNoteWindow(note);
  }
}

function setAllLocked(locked) {
  for (const note of store.getNotes()) {
    store.updateNote(note.id, { locked });
    applyLockState(note.id, locked);
  }
  broadcastConfig();
}

function setAllHidden(hidden) {
  for (const note of store.getNotes()) {
    store.updateNote(note.id, { hidden });
    applyHiddenState(note.id, hidden);
  }
  broadcastConfig();
}

function getNoteWindow(id) {
  return noteWindows.get(id) || null;
}

function createConfigWindow() {
  if (configWindow && !configWindow.isDestroyed()) {
    configWindow.show();
    configWindow.focus();
    return configWindow;
  }
  configWindow = new BrowserWindow({
    width: 860,
    height: 640,
    minWidth: 680,
    minHeight: 480,
    title: t('app.name'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'config-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  configWindow.loadFile(path.join(__dirname, '..', 'renderer', 'config', 'config.html'));
  configWindow.on('close', (e) => {
    e.preventDefault();
    configWindow.hide();
  });
  return configWindow;
}

function showConfigWindow() {
  const win = createConfigWindow();
  win.show();
  win.focus();
}

function broadcastConfig() {
  if (configWindow && !configWindow.isDestroyed()) {
    configWindow.webContents.send('config:refresh');
  }
  // 同步通知所有打开的便签详情弹窗
  for (const [id, win] of noteConfigWindows) {
    if (win && !win.isDestroyed()) win.webContents.send('note-config:refresh');
    else noteConfigWindows.delete(id);
  }
}

// 语言切换后：更新所有窗口标题，并通知所有渲染层重新翻译
function broadcastI18n() {
  const loc = currentLocale();
  const set = (w, title) => { if (w && !w.isDestroyed()) w.setTitle(title); };
  set(configWindow, i18n.t(loc, 'app.name'));
  set(globalConfigWindow, i18n.t(loc, 'globalConfig.title'));
  for (const [id, win] of noteConfigWindows) {
    if (win && !win.isDestroyed()) win.setTitle(i18n.t(loc, 'noteConfig.title'));
    else noteConfigWindows.delete(id);
  }
  const send = (w) => { if (w && !w.isDestroyed()) w.webContents.send('i18n:changed', loc); };
  send(configWindow);
  send(globalConfigWindow);
  for (const w of noteConfigWindows.values()) send(w);
  for (const w of noteWindows.values()) send(w);
}

function destroyConfigForQuit() {
  if (configWindow && !configWindow.isDestroyed()) {
    configWindow.removeAllListeners('close');
    configWindow.destroy();
  }
  // 关闭所有详情弹窗
  for (const [, win] of noteConfigWindows) {
    if (win && !win.isDestroyed()) { win.removeAllListeners('closed'); win.destroy(); }
  }
  noteConfigWindows.clear();
  // 关闭全局配置弹窗
  if (globalConfigWindow && !globalConfigWindow.isDestroyed()) {
    globalConfigWindow.removeAllListeners('closed');
    globalConfigWindow.destroy();
  }
  globalConfigWindow = null;
}

/* ---------------- 便签详情弹窗 ---------------- */

function openNoteConfigWindow(noteId) {
  const existing = noteConfigWindows.get(noteId);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return existing;
  }
  const parentWin = (configWindow && !configWindow.isDestroyed()) ? configWindow : null;
  const win = new BrowserWindow({
    width: 440,
    height: 640,
    minWidth: 380,
    minHeight: 520,
    resizable: true,
    minimizable: false,
    maximizable: false,
    title: t('noteConfig.title'),
    parent: parentWin,
    modal: parentWin !== null,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'note-config-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'note-config', 'note-config.html'), {
    query: { id: noteId }
  });
  win.on('closed', () => {
    noteConfigWindows.delete(noteId);
  });
  noteConfigWindows.set(noteId, win);
  return win;
}

function closeNoteConfigForSender(sender) {
  for (const [id, win] of noteConfigWindows) {
    if (win === sender) {
      win.close();
      noteConfigWindows.delete(id);
      return;
    }
  }
}

/* ---------------- 全局配置弹窗 ---------------- */

function openGlobalConfigWindow() {
  if (globalConfigWindow && !globalConfigWindow.isDestroyed()) {
    globalConfigWindow.show();
    globalConfigWindow.focus();
    return globalConfigWindow;
  }
  const parentWin = (configWindow && !configWindow.isDestroyed()) ? configWindow : null;
  globalConfigWindow = new BrowserWindow({
    width: 400,
    height: 540,
    minWidth: 360,
    minHeight: 460,
    resizable: true,
    minimizable: false,
    maximizable: false,
    title: t('globalConfig.title'),
    parent: parentWin,
    modal: parentWin !== null,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'global-config-preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  globalConfigWindow.loadFile(path.join(__dirname, '..', 'renderer', 'global-config', 'global-config.html'));
  globalConfigWindow.on('closed', () => {
    globalConfigWindow = null;
  });
  return globalConfigWindow;
}

function closeGlobalConfigForSender(sender) {
  if (globalConfigWindow && !globalConfigWindow.isDestroyed() &&
      globalConfigWindow.webContents === sender) {
    globalConfigWindow.close();
    globalConfigWindow = null;
  }
}

/* ---------------- 定位 / 全屏 / 校准 ---------------- */

// 让桌面便签闪一下，方便用户在桌面找到它
function locateNote(noteId) {
  const win = noteWindows.get(noteId);
  if (!win || win.isDestroyed()) return;
  const note = store.getNote(noteId);
  if (!note) return;
  const wasHidden = note.hidden === true;
  if (wasHidden) win.show();
  const wasOnTop = note.alwaysOnTop !== false;
  win.setAlwaysOnTop(true, 'screen-saver');
  win.focus();
  setTimeout(() => {
    if (win.isDestroyed()) return;
    win.setAlwaysOnTop(wasOnTop, 'floating');
    if (wasHidden) win.hide();
  }, 1500);
}

// 重新校准所有便签到可见区
function recalibrateAll() {
  for (const note of store.getNotes()) {
    const pos = clampToScreen({
      x: note.absX ?? 0,
      y: note.absY ?? 0,
      width: note.width || 240,
      height: note.height || 160
    });
    if (pos.x !== Math.round(note.absX ?? 0) || pos.y !== Math.round(note.absY ?? 0)) {
      store.updateNote(note.id, { absX: pos.x, absY: pos.y });
      const win = noteWindows.get(note.id);
      if (win && !win.isDestroyed()) {
        win.setBounds({ x: pos.x, y: pos.y, width: note.width || 240, height: note.height || 160 });
      }
    }
  }
}

module.exports = {
  createNoteWindow,
  reloadNote,
  closeNoteWindow,
  restoreAllNotes,
  applyLockState,
  applyHiddenState,
  setAllLocked,
  setAllHidden,
  getNoteWindow,
  createConfigWindow,
  showConfigWindow,
  broadcastConfig,
  broadcastI18n,
  destroyConfigForQuit,
  openNoteConfigWindow,
  closeNoteConfigForSender,
  openGlobalConfigWindow,
  closeGlobalConfigForSender,
  locateNote,
  recalibrateAll
};
