'use strict';

const fs = require('fs');
const path = require('path');
const { app, ipcMain, screen, protocol, clipboard, dialog, nativeTheme } = require('electron');
const store = require('./store');
const wm = require('./windowManager');
const trayModule = require('./tray');
const i18n = require('../shared/locales');

// 主进程侧当前生效语言（供窗口标题、托盘、原生对话框使用）
function currentLocale() {
  return i18n.resolveLocale(store.getSettings().language, app.getLocale());
}

// 图片落地目录：userData/note-imgs/<noteId>/<file>
const IMG_ROOT = path.join(app.getPath('userData'), 'note-imgs');

function ensureImgDir() {
  try { fs.mkdirSync(IMG_ROOT, { recursive: true }); } catch (_) {}
}

function noteImgDir(noteId) {
  return path.join(IMG_ROOT, String(noteId));
}

function saveImageForNote(noteId, srcPath, ext) {
  ensureImgDir();
  const dir = noteImgDir(noteId);
  fs.mkdirSync(dir, { recursive: true });
  const base = Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + (ext || '.png');
  const dest = path.join(dir, base);
  fs.copyFileSync(srcPath, dest);
  return `noteimg://${noteId}/${base}`;
}

function saveClipboardImageForNote(noteId) {
  const img = clipboard.readImage();
  if (img.isEmpty()) return null;
  ensureImgDir();
  const dir = noteImgDir(noteId);
  fs.mkdirSync(dir, { recursive: true });
  const base = Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '.png';
  const dest = path.join(dir, base);
  fs.writeFileSync(dest, img.toPNG());
  return `noteimg://${noteId}/${base}`;
}

function removeNoteImages(noteId) {
  const dir = noteImgDir(noteId);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => wm.showConfigWindow());
}

function applyLaunchOnStartup(enabled) {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    app.setLoginItemSettings({ openAtLogin: !!enabled });
  }
}

// 应用主题：nativeTheme.themeSource 驱动所有渲染层的 prefers-color-scheme
function applyTheme(theme) {
  if (theme === 'dark' || theme === 'light' || theme === 'system') {
    nativeTheme.themeSource = theme;
  } else {
    nativeTheme.themeSource = 'system';
  }
}

app.whenReady().then(() => {
  ensureImgDir();

  // 自定义协议：noteimg://<noteId>/<file> → userData/note-imgs/<noteId>/<file>
  protocol.registerFileProtocol('noteimg', (request, callback) => {
    try {
      const rel = decodeURIComponent(request.url.replace(/^noteimg:\/\//, ''));
      const full = path.join(IMG_ROOT, rel);
      if (!full.startsWith(IMG_ROOT)) { callback({ error: -10 }); return; }
      callback(full);
    } catch (err) {
      callback({ error: -2 });
    }
  });

  const settings = store.getSettings();
  applyLaunchOnStartup(settings.launchOnStartup);
  applyTheme(settings.theme);

  wm.restoreAllNotes();
  trayModule.createTray();

  if (store.getNotes().length === 0) {
    wm.showConfigWindow();
  }

  screen.on('display-metrics-changed', () => {
    for (const n of store.getNotes()) wm.reloadNote(n.id);
  });
  screen.on('display-added', () => {
    for (const n of store.getNotes()) wm.reloadNote(n.id);
  });
  screen.on('display-removed', () => {
    for (const n of store.getNotes()) wm.reloadNote(n.id);
  });
});

app.on('window-all-closed', (e) => {
  // 常驻托盘，不退出
});

app.on('before-quit', () => {
  app.isQuitting = true;
  wm.destroyConfigForQuit();
});

/* ---------------- IPC: 数据读写 ---------------- */

ipcMain.handle('data:get', () => store.getData());
ipcMain.handle('notes:list', () => store.getNotes());
ipcMain.handle('note:get', (_e, id) => store.getNote(id));

ipcMain.handle('note:create', (_e, partial) => {
  const primary = screen.getPrimaryDisplay();
  const note = store.createNote({
    absX: primary.workArea.x + 60,
    absY: primary.workArea.y + 60,
    ...(partial || {})
  });
  wm.createNoteWindow(note);
  trayModule.refresh();
  return note;
});

ipcMain.handle('note:update', (_e, id, patch) => {
  const note = store.updateNote(id, patch);
  if (note) {
    wm.reloadNote(id);
    trayModule.refresh();
  }
  return note;
});

// 仅更新内容/位置/尺寸，不触发整窗 reload（供笔记窗自身实时保存用）
ipcMain.handle('note:save-live', (_e, id, patch) => {
  const note = store.updateNote(id, patch);
  wm.broadcastConfig();
  trayModule.refresh();
  return note;
});

ipcMain.handle('note:delete', (_e, id) => {
  const ok = store.deleteNote(id);
  if (ok) removeNoteImages(id);
  wm.closeNoteWindow(id);
  trayModule.refresh();
  return ok;
});

ipcMain.handle('note:duplicate', (_e, id) => {
  const note = store.duplicateNote(id);
  if (note) {
    wm.createNoteWindow(note);
    trayModule.refresh();
  }
  return note;
});

ipcMain.handle('note:set-lock', (_e, id, locked) => {
  store.updateNote(id, { locked });
  wm.applyLockState(id, locked);
  trayModule.refresh();
  return locked;
});

ipcMain.handle('notes:set-all-lock', (_e, locked) => {
  wm.setAllLocked(locked);
  trayModule.refresh();
  return locked;
});

ipcMain.handle('note:set-hidden', (_e, id, hidden) => {
  store.updateNote(id, { hidden });
  wm.applyHiddenState(id, hidden);
  trayModule.refresh();
  return hidden;
});

ipcMain.handle('notes:set-all-hidden', (_e, hidden) => {
  wm.setAllHidden(hidden);
  trayModule.refresh();
  return hidden;
});

/* ---------------- IPC: 设置 ---------------- */

ipcMain.handle('settings:get', () => store.getSettings());
ipcMain.handle('settings:update', (_e, patch) => {
  const s = store.updateSettings(patch);
  if ('launchOnStartup' in patch) applyLaunchOnStartup(s.launchOnStartup);
  if ('theme' in patch) applyTheme(s.theme);
  if ('language' in patch) {
    trayModule.refresh();
    wm.broadcastI18n();
  }
  return s;
});

// 当前生效主题（'system' 时解析为实际的 light/dark，供渲染层初始化用）
ipcMain.handle('theme:effective', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

/* ---------------- IPC: 显示器信息 ---------------- */

ipcMain.handle('displays:list', () => {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    index: i,
    isPrimary: d.id === primary.id,
    bounds: d.bounds,
    workArea: d.workArea,
    label: i18n.t(currentLocale(), 'display.label', { n: i + 1 }) +
      (d.id === primary.id ? i18n.t(currentLocale(), 'display.primary') : '') +
      ` · ${d.size.width}×${d.size.height}`
  }));
});

/* ---------------- IPC: 笔记窗口自身操作 ---------------- */

// 笔记窗获取自身数据
ipcMain.handle('note:self-get', (_e, id) => store.getNote(id));

// 笔记窗把当前实际 bounds 回写（虚拟桌面绝对坐标）
ipcMain.handle('note:report-bounds', (_e, id, bounds) => {
  const disp = screen.getDisplayMatching(bounds);
  store.updateNote(id, {
    absX: Math.round(bounds.x),
    absY: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
    displayId: disp ? disp.id : null
  });
  wm.broadcastConfig();
  return true;
});

// 打开配置窗并定位到某笔记
ipcMain.handle('config:open', (_e, focusId) => {
  wm.showConfigWindow();
  return true;
});

/* ---------------- IPC: 便签详情弹窗 / 定位 / 校准 ---------------- */

// 打开便签详情弹窗
ipcMain.handle('note-config:open', (_e, noteId) => {
  wm.openNoteConfigWindow(noteId);
  return true;
});

// 详情弹窗自身请求关闭
ipcMain.on('note-config:close', (e) => {
  wm.closeNoteConfigForSender(e.sender);
});

// 打开全局配置弹窗
ipcMain.handle('global-config:open', () => {
  wm.openGlobalConfigWindow();
  return true;
});

// 全局配置弹窗自身请求关闭
ipcMain.on('global-config:close', (e) => {
  wm.closeGlobalConfigForSender(e.sender);
});

// 在桌面定位（闪一下）某便签
ipcMain.handle('note:locate', (_e, id) => {
  wm.locateNote(id);
  return true;
});

// 重新校准所有便签到可见区
ipcMain.handle('notes:recalibrate', () => {
  wm.recalibrateAll();
  wm.broadcastConfig();
  trayModule.refresh();
  return true;
});

/* ---------------- IPC: 图片 ---------------- */

// 弹文件选择框选图
ipcMain.handle('note:pick-image', async (_e, id) => {
  const res = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: i18n.t(currentLocale(), 'dlg.image'), extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }]
  });
  if (res.canceled || !res.filePaths || !res.filePaths.length) return null;
  const p = res.filePaths[0];
  const ext = path.extname(p).toLowerCase() || '.png';
  try { return saveImageForNote(id, p, ext); }
  catch (err) { console.error('[img] pick failed', err); return null; }
});

// 从已知路径（拖拽/其它来源）存图
ipcMain.handle('note:add-image-from-path', (_e, id, srcPath) => {
  if (!srcPath) return null;
  const ext = path.extname(srcPath).toLowerCase() || '.png';
  try { return saveImageForNote(id, srcPath, ext); }
  catch (err) { console.error('[img] add failed', err); return null; }
});

// 读取剪贴板里的图片
ipcMain.handle('note:paste-image', (_e, id) => {
  try { return saveClipboardImageForNote(id); }
  catch (err) { console.error('[img] paste failed', err); return null; }
});
