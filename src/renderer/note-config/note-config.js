'use strict';

const api = window.noteConfigAPI;
const tr = window.noteConfigAPI.t;

const id = new URLSearchParams(location.search).get('id');

/* ---------- 主题跟随（nativeTheme.themeSource 驱动 prefers-color-scheme） ---------- */

const themeMq = window.matchMedia('(prefers-color-scheme: dark)');
function applyPageTheme() {
  document.documentElement.dataset.theme = themeMq.matches ? 'dark' : 'light';
}
themeMq.addEventListener('change', applyPageTheme);
applyPageTheme();

const els = {
  seq: document.getElementById('seqNum'),
  webBadge: document.getElementById('webBadge'),
  typeSel: document.getElementById('typeSel'),
  urlRow: document.getElementById('urlRow'),
  urlInput: document.getElementById('urlInput'),
  displaySel: document.getElementById('displaySel'),
  posX: document.getElementById('posX'),
  posY: document.getElementById('posY'),
  w: document.getElementById('w'),
  h: document.getElementById('h'),
  bgColor: document.getElementById('bgColor'),
  textColor: document.getElementById('textColor'),
  fontSize: document.getElementById('fontSize'),
  opacity: document.getElementById('opacity'),
  opacityVal: document.getElementById('opacityVal'),
  hidden: document.getElementById('hidden'),
  alwaysOnTop: document.getElementById('alwaysOnTop'),
  locked: document.getElementById('locked'),
  closeBtn: document.getElementById('closeBtn'),
  locateBtn: document.getElementById('locateBtn'),
  resetBtn: document.getElementById('resetBtn'),
  delBtn: document.getElementById('delBtn')
};

let note = null;
let displays = [];
let defaults = {};
let saveTimer = null;

function stripText(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

function displayOfPoint(absX, absY) {
  for (const d of displays) {
    const b = d.bounds;
    if (absX >= b.x && absX < b.x + b.width && absY >= b.y && absY < b.y + b.height) return d;
  }
  return displays[0] || null;
}

function fillDisplaySelect(selId) {
  els.displaySel.innerHTML = '';
  for (const d of displays) {
    const opt = document.createElement('option');
    opt.value = String(d.id);
    opt.textContent = d.label;
    if (selId != null && d.id === selId) opt.selected = true;
    els.displaySel.appendChild(opt);
  }
}

function fillForm() {
  const n = note;
  if (!n) return;
  const disp = displayOfPoint(n.absX ?? 0, n.absY ?? 0) || displays[0] || null;
  fillDisplaySelect(disp ? disp.id : null);

  els.typeSel.value = n.type || 'text';
  els.urlRow.hidden = (n.type || 'text') !== 'web';
  els.urlInput.value = n.url || '';
  els.webBadge.hidden = (n.type || 'text') !== 'web';

  els.posX.value = Math.round((n.absX ?? 0) - (disp ? disp.workArea.x : 0));
  els.posY.value = Math.round((n.absY ?? 0) - (disp ? disp.workArea.y : 0));
  els.w.value = n.width || 240;
  els.h.value = n.height || 160;

  els.bgColor.value = toHex(n.bgColor || defaults.defaultBgColor || '#FFF7B2');
  els.textColor.value = toHex(n.textColor || defaults.defaultTextColor || '#222222');
  els.fontSize.value = n.fontSize || defaults.defaultFontSize || 14;

  const op = Math.round((n.opacity ?? 0.95) * 100);
  els.opacity.value = op;
  els.opacityVal.textContent = op + '%';

  els.hidden.checked = n.hidden === true;
  els.alwaysOnTop.checked = n.alwaysOnTop !== false;
  els.locked.checked = n.locked !== false;
}

function toHex(c) {
  if (/^#([0-9a-f]{6})$/i.test(c)) return c;
  const d = document.createElement('div');
  d.style.color = c;
  document.body.appendChild(d);
  const rgb = getComputedStyle(d).color;
  document.body.removeChild(d);
  const m = rgb.match(/\d+/g);
  if (!m) return '#222222';
  return '#' + m.slice(0, 3).map((x) => (+x).toString(16).padStart(2, '0')).join('');
}

/* ---------- 保存（防抖） ---------- */

function scheduleSave(patch) {
  Object.assign(note, patch, { updatedAt: new Date().toISOString() });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api.updateNote(note.id, patch);
  }, 250);
}

function currentDisp() {
  return displays.find((d) => String(d.id) === els.displaySel.value) || displays[0] || null;
}

function absFromForm() {
  const disp = currentDisp();
  return {
    absX: Math.round((disp ? disp.workArea.x : 0) + (Number(els.posX.value) || 0)),
    absY: Math.round((disp ? disp.workArea.y : 0) + (Number(els.posY.value) || 0)),
    width: Number(els.w.value) || 240,
    height: Number(els.h.value) || 160
  };
}

/* ---------- 事件 ---------- */

// 类型
els.typeSel.addEventListener('change', () => {
  const isWeb = els.typeSel.value === 'web';
  els.urlRow.hidden = !isWeb;
  els.webBadge.hidden = !isWeb;
  scheduleSave({ type: els.typeSel.value, url: isWeb ? els.urlInput.value.trim() : '' });
});

els.urlInput.addEventListener('change', () => {
  scheduleSave({ url: els.urlInput.value.trim() });
});

// 切屏幕：保持相对坐标，重算绝对坐标
els.displaySel.addEventListener('change', () => {
  scheduleSave(absFromForm());
});

// 尺寸坐标
['posX', 'posY', 'w', 'h'].forEach((k) => {
  els[k].addEventListener('change', () => scheduleSave(absFromForm()));
});

// 外观
els.bgColor.addEventListener('change', () => scheduleSave({ bgColor: els.bgColor.value }));
els.textColor.addEventListener('change', () => scheduleSave({ textColor: els.textColor.value }));
els.fontSize.addEventListener('change', () => scheduleSave({ fontSize: Number(els.fontSize.value) || 14 }));

// 透明度
els.opacity.addEventListener('input', () => {
  const v = Number(els.opacity.value);
  els.opacityVal.textContent = v + '%';
  scheduleSave({ opacity: v / 100 });
});

// 行为开关
els.hidden.addEventListener('change', () => {
  api.setHidden(note.id, els.hidden.checked);
});
els.locked.addEventListener('change', () => {
  api.setLock(note.id, els.locked.checked);
});
els.alwaysOnTop.addEventListener('change', () => {
  scheduleSave({ alwaysOnTop: els.alwaysOnTop.checked });
});

// 顶部关闭按钮
els.closeBtn.addEventListener('click', () => api.closeWindow());

els.locateBtn.addEventListener('click', () => api.locateNote(note.id));

els.resetBtn.addEventListener('click', async () => {
  if (!confirm(tr('noteConfig.resetConfirm'))) return;
  const patch = {
    bgColor: defaults.defaultBgColor || '#FFF7B2',
    textColor: defaults.defaultTextColor || '#222222',
    fontSize: defaults.defaultFontSize || 14,
    opacity: defaults.defaultOpacity ?? 0.95
  };
  Object.assign(note, patch);
  await api.updateNote(note.id, patch);
  await reload();
});

els.delBtn.addEventListener('click', async () => {
  if (!confirm(tr('noteConfig.deleteConfirm'))) return;
  await api.deleteNote(note.id);
  api.closeWindow();
});

// 底部关闭按钮已移除，弹窗仅由右上角 ✕ 关闭

/* ---------- 数据加载 ---------- */

async function reload() {
  const [n, ds, all, s] = await Promise.all([
    api.getNote(id),
    api.listDisplays(),
    api.listNotes(),
    api.getSettings()
  ]);
  if (!n) { api.closeWindow(); return; }
  note = n;
  displays = ds;
  defaults = s;
  const seq = all.findIndex((x) => x.id === id);
  els.seq.textContent = seq >= 0 ? (seq + 1) : '-';
  fillForm();
}

api.onRefresh(() => reload());

// 静态文案初始翻译 + 语言切换时重渲染
api.applyI18n(api.t);
api.onI18nChanged((loc) => {
  api.setLocale(loc);
  api.applyI18n(api.t);
});

reload();
