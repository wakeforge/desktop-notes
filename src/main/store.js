'use strict';

const { app, screen } = require('electron');
const fs = require('fs');
const path = require('path');

let _file = null;
function filePath() {
  if (!_file) _file = path.join(app.getPath('userData'), 'notes.json');
  return _file;
}

const DEFAULT_DATA = {
  version: 1,
  settings: {
    launchOnStartup: false,
    defaultBgColor: '#FFF7B2',
    defaultTextColor: '#222222',
    defaultFontSize: 14,
    defaultOpacity: 0.95,
    theme: 'system', // 'light' | 'dark' | 'system'
    language: 'auto' // 'auto' 跟随系统；否则为受支持的语言代码（见 src/shared/locales.js）
  },
  notes: []
};

let cache = null;

function genId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

// 旧数据用 (displayId + 屏内相对坐标 x/y)，迁到虚拟桌面绝对坐标 absX/absY，
// 以彻底避免 Windows 多屏重启后 Display.id 漂移导致笔记归位主屏的问题。
function migratePositions(notes) {
  const primary = screen.getPrimaryDisplay();
  const byId = new Map(screen.getAllDisplays().map((d) => [d.id, d]));
  let changed = false;
  for (const n of notes) {
    if (typeof n.absX !== 'number' || typeof n.absY !== 'number') {
      const disp = (n.displayId != null && byId.has(n.displayId)) ? byId.get(n.displayId) : primary;
      const wa = disp.workArea;
      n.absX = Math.round(wa.x + (Number(n.x) || 0));
      n.absY = Math.round(wa.y + (Number(n.y) || 0));
      changed = true;
    }
  }
  return changed;
}

function load() {
  if (cache) return cache;
  try {
    if (fs.existsSync(filePath())) {
      const raw = fs.readFileSync(filePath(), 'utf-8');
      const parsed = JSON.parse(raw);
      cache = {
        ...DEFAULT_DATA,
        ...parsed,
        settings: { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) },
        notes: Array.isArray(parsed.notes) ? parsed.notes : []
      };
    } else {
      cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
  } catch (err) {
    console.error('[store] load failed, using defaults:', err);
    cache = JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  if (migratePositions(cache.notes)) persist();
  return cache;
}

function persist() {
  try {
    fs.mkdirSync(path.dirname(filePath()), { recursive: true });
    fs.writeFileSync(filePath(), JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[store] persist failed:', err);
  }
}

function getData() {
  return load();
}

function getSettings() {
  return load().settings;
}

function updateSettings(patch) {
  const data = load();
  data.settings = { ...data.settings, ...patch };
  persist();
  return data.settings;
}

function getNotes() {
  return load().notes;
}

function getNote(id) {
  return load().notes.find((n) => n.id === id) || null;
}

function createNote(partial = {}) {
  const data = load();
  const now = new Date().toISOString();
  const s = data.settings;
  const note = {
    id: genId(),
    type: partial.type || 'text',
    url: partial.url || '',
    contentHtml: partial.contentHtml || '<p>新便签</p>',
    displayId: partial.displayId ?? null,
    absX: partial.absX ?? 80,
    absY: partial.absY ?? 80,
    width: partial.width ?? 240,
    height: partial.height ?? 160,
    bgColor: partial.bgColor || s.defaultBgColor,
    textColor: partial.textColor || s.defaultTextColor,
    fontSize: partial.fontSize || s.defaultFontSize,
    opacity: partial.opacity ?? s.defaultOpacity ?? 0.95,
    locked: partial.locked ?? true,
    hidden: partial.hidden ?? false,
    alwaysOnTop: partial.alwaysOnTop ?? true,
    createdAt: now,
    updatedAt: now
  };
  data.notes.push(note);
  persist();
  return note;
}

function updateNote(id, patch = {}) {
  const data = load();
  const note = data.notes.find((n) => n.id === id);
  if (!note) return null;
  Object.assign(note, patch, { updatedAt: new Date().toISOString() });
  persist();
  return note;
}

function deleteNote(id) {
  const data = load();
  const idx = data.notes.findIndex((n) => n.id === id);
  if (idx === -1) return false;
  data.notes.splice(idx, 1);
  persist();
  return true;
}

function duplicateNote(id) {
  const src = getNote(id);
  if (!src) return null;
  const copy = { ...src };
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.x;
  delete copy.y;
  copy.absX = (src.absX ?? 0) + 24;
  copy.absY = (src.absY ?? 0) + 24;
  return createNote(copy);
}

module.exports = {
  filePath,
  getData,
  getSettings,
  updateSettings,
  getNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
  duplicateNote
};
