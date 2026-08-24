'use strict';

const ALLOWED_TAGS = ['P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'A', 'SPAN', 'DIV', 'FONT', 'IMG'];
const ALLOWED_ATTR = ['href', 'color', 'style', 'src', 'alt', 'width', 'height'];

const tr = window.noteAPI.t;

function sanitize(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = String(html || '');
  const walk = (node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === 1) {
        if (!ALLOWED_TAGS.includes(child.tagName)) {
          child.replaceWith(...Array.from(child.childNodes));
          continue;
        }
        for (const attr of Array.from(child.attributes)) {
          if (!ALLOWED_ATTR.includes(attr.name.toLowerCase())) {
            child.removeAttribute(attr.name);
            continue;
          }
          const val = attr.value || '';
          if (attr.name.toLowerCase() === 'href' && /^\s*javascript:/i.test(val)) {
            child.removeAttribute(attr.name);
          }
          // 图片只允许本地协议 / 内嵌 base64，禁止外链与脚本类协议
          if (attr.name.toLowerCase() === 'src') {
            const ok = /^(noteimg:|data:image\/)/i.test(val);
            if (!ok) child.removeAttribute(attr.name);
          }
        }
        walk(child);
      } else if (child.nodeType !== 3) {
        child.remove();
      }
    }
  };
  walk(tpl.content);
  return tpl.innerHTML;
}

const card = document.getElementById('card');
const content = document.getElementById('content');
const textToolbar = document.getElementById('toolbar');
const webToolbar = document.getElementById('webToolbar');
const webview = document.getElementById('webview');
const urlInput = document.getElementById('urlInput');
const lockBtn = document.getElementById('lockBtn');
const webLockBtn = document.getElementById('webLockBtn');
const fg = document.getElementById('fg');

let current = null;
let locked = true;
let mode = 'text'; // 'text' | 'web'
let saveTimer = null;

function applyStyles(n) {
  card.style.background = n.bgColor || '#FFF7B2';
  content.style.color = n.textColor || '#222';
  content.style.fontSize = (n.fontSize || 14) + 'px';
  card.style.opacity = String(n.opacity ?? 0.95);
}

let scrollCssKey = null;
const HIDE_SCROLLBAR_CSS = '::-webkit-scrollbar{display:none!important}html,body{scrollbar-width:none!important}';
async function hideWebScrollbars() {
  try {
    if (scrollCssKey) { try { await webview.removeInsertedCSS(scrollCssKey); } catch (_) {} }
    scrollCssKey = await webview.insertCSS(HIDE_SCROLLBAR_CSS);
  } catch (_) {}
}

function setupText(n) {
  mode = 'text';
  card.classList.add('mode-text');
  card.classList.remove('mode-web');
  content.innerHTML = sanitize(n.contentHtml);
  content.hidden = false;
  webview.hidden = true;
}

function setupWeb(n) {
  mode = 'web';
  card.classList.add('mode-web');
  card.classList.remove('mode-text');
  webview.src = n.url || '';
  urlInput.value = n.url || '';
  hideWebScrollbars();
  webview.hidden = false;
  content.hidden = true;
}

function setLockUI(isLocked) {
  locked = isLocked;
  card.classList.toggle('locked', isLocked);
  card.classList.toggle('unlocked', !isLocked);
  if (mode === 'text') {
    textToolbar.hidden = isLocked;
    webToolbar.hidden = true;
    content.contentEditable = isLocked ? 'false' : 'true';
    lockBtn.textContent = isLocked ? tr('note.lock') : tr('note.done');
    if (!isLocked) content.focus();
  } else {
    webToolbar.hidden = isLocked;
    textToolbar.hidden = true;
    webLockBtn.textContent = isLocked ? tr('note.lock') : tr('note.done');
    // webview 始终可见；锁定=点击穿透（无法操作），解锁=可交互
    if (isLocked) { try { webview.blur(); } catch (_) {} }
  }
}

async function init() {
  current = await window.noteAPI.getSelf();
  if (!current) return;
  if (current.type === 'web') setupWeb(current);
  else setupText(current);
  applyStyles(current);
  setLockUI(current.locked !== false);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const html = sanitize(content.innerHTML);
    window.noteAPI.saveLive({ contentHtml: html });
  }, 500);
}

function reportBounds() {
  window.noteAPI.reportBounds({
    x: window.screenX,
    y: window.screenY,
    width: window.outerWidth,
    height: window.outerHeight
  });
}

/* ---------------- 图片插入 ---------------- */

function insertImageAtCursor(url) {
  content.focus();
  document.execCommand('insertImage', false, url);
  scheduleSave();
}

async function pickAndInsertImage() {
  const url = await window.noteAPI.pickImage();
  if (url) insertImageAtCursor(url);
}

/* ---------------- 网页便签 ---------------- */

function goUrl() {
  let u = (urlInput.value || '').trim();
  if (!u) return;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  webview.src = u;
  window.noteAPI.saveLive({ url: u });
}

/* ---------------- 事件绑定 ---------------- */

content.addEventListener('input', () => { if (!locked && mode === 'text') scheduleSave(); });

// 工具栏命令
document.querySelectorAll('.text-toolbar button[data-cmd]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const cmd = btn.dataset.cmd;
    if (cmd === 'insertImage') {
      pickAndInsertImage();
      return;
    }
    if (cmd === 'createLink') {
      const url = prompt(tr('note.linkPrompt'), 'https://');
      if (url) document.execCommand('createLink', false, url);
    } else {
      document.execCommand(cmd, false, null);
    }
    content.focus();
    scheduleSave();
  });
});

fg.addEventListener('input', () => {
  if (mode !== 'text') return;
  document.execCommand('foreColor', false, fg.value);
  content.focus();
  scheduleSave();
});

// 锁定/解锁（文本与网页共用逻辑）
function toggleLock() {
  const next = !locked;
  if (next && mode === 'text') {
    const html = sanitize(content.innerHTML);
    window.noteAPI.saveLive({ contentHtml: html });
    reportBounds();
  }
  window.noteAPI.setLock(next);
}
lockBtn.addEventListener('click', toggleLock);
webLockBtn.addEventListener('click', toggleLock);

// 网页便签：地址栏 / 刷新
document.getElementById('goBtn').addEventListener('click', goUrl);
document.getElementById('reloadBtn').addEventListener('click', () => webview.reload());
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') goUrl(); });
// 导航后同步地址栏显示（不写回存储，避免循环）
webview.addEventListener('did-navigate', (e) => { urlInput.value = e.url; });
webview.addEventListener('did-finish-load', hideWebScrollbars);

// 拖拽图片进笔记
content.addEventListener('dragover', (e) => { e.preventDefault(); });
content.addEventListener('drop', async (e) => {
  e.preventDefault();
  if (locked || mode !== 'text') return;
  const file = Array.from(e.dataTransfer.files || []).find((f) => /^image\//.test(f.type));
  if (!file) return;
  const url = await window.noteAPI.addImageFromPath(file.path);
  if (url) insertImageAtCursor(url);
});

// 粘贴图片
content.addEventListener('paste', async (e) => {
  if (locked || mode !== 'text') return;
  const url = await window.noteAPI.pasteImage();
  if (url) {
    e.preventDefault();
    insertImageAtCursor(url);
  }
});

window.addEventListener('mouseup', () => { if (!locked) reportBounds(); });
window.addEventListener('resize', () => { if (!locked) reportBounds(); });

// 阻止把文件拖到窗口任意处时被当作"打开文件"
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

window.noteAPI.onLockChanged((isLocked) => setLockUI(isLocked));
window.noteAPI.onData((data) => {
  current = data;
  if (data.type === 'web') setupWeb(data);
  else setupText(data);
  applyStyles(data);
  setLockUI(data.locked !== false);
});

window.noteAPI.onI18nChanged((loc) => {
  window.noteAPI.setLocale(loc);
  window.noteAPI.applyI18n();
  setLockUI(locked);
});

window.noteAPI.applyI18n();
init();
