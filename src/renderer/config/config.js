'use strict';

const api = window.configAPI;
const tr = window.configAPI.t;
let locale = window.configAPI.locale;

/* ---------- 主题跟随（nativeTheme.themeSource 驱动 prefers-color-scheme） ---------- */

const themeMq = window.matchMedia('(prefers-color-scheme: dark)');
function applyPageTheme() {
  document.documentElement.dataset.theme = themeMq.matches ? 'dark' : 'light';
}
themeMq.addEventListener('change', applyPageTheme);
applyPageTheme();

const els = {
  grid: document.getElementById('cardGrid'),
  empty: document.getElementById('emptyState'),
  count: document.getElementById('countBadge'),
  newBtn: document.getElementById('newBtn'),
  newMenu: document.getElementById('newMenu'),
  search: document.getElementById('searchInput'),
  sort: document.getElementById('sortSel'),
  calibrate: document.getElementById('calibrateBtn'),
  globalCfg: document.getElementById('globalCfgBtn'),
  cardMenu: document.getElementById('cardMenu')
};

let notes = [];
let keyword = '';
let sortMode = 'updated';
let menuForId = null;

/* ---------- helpers ---------- */

function stripText(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

function cardTitle(n) {
  if (n.type === 'web') return (n.url || '').trim() || tr('config.webNote');
  return stripText(n.contentHtml) || tr('config.emptyNote');
}

function cardPreview(n) {
  if (n.type === 'web') return '🌐 ' + ((n.url || '').trim() || tr('config.noUrl'));
  return stripText(n.contentHtml) || tr('config.emptyContent');
}

function charCount(n) {
  if (n.type === 'web') return '';
  const text = stripText(n.contentHtml);
  return api.formatCount(text.length);
}

function relTime(iso) {
  return api.formatRelTime(iso);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ---------- rendering ---------- */

function filteredNotes() {
  let arr = notes.slice();
  if (keyword) {
    const k = keyword.toLowerCase();
    arr = arr.filter((n) =>
      cardTitle(n).toLowerCase().includes(k) ||
      cardPreview(n).toLowerCase().includes(k)
    );
  }
  arr.sort((a, b) => {
    if (sortMode === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortMode === 'size') return (b.fontSize || 0) - (a.fontSize || 0);
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });
  return arr;
}

function renderCards() {
  const arr = filteredNotes();
  els.count.textContent = notes.length;
  if (!arr.length) {
    els.grid.innerHTML = '';
    els.empty.hidden = notes.length > 0;
    if (notes.length === 0) {
      els.empty.querySelector('.empty-title').textContent = tr('config.emptyTitle');
      els.empty.querySelector('.empty-hint').textContent = tr('config.emptyHint');
    } else {
      els.empty.querySelector('.empty-title').textContent = tr('config.emptyNoMatch');
      els.empty.querySelector('.empty-hint').textContent = tr('config.emptyNoMatchHint');
    }
    return;
  }
  els.empty.hidden = true;

  els.grid.innerHTML = arr.map((n, i) => {
    const bg = n.bgColor || '#FFF7B2';
    const hidden = n.hidden === true;
    const locked = n.locked !== false;
    const isWeb = n.type === 'web';
    const idx = notes.indexOf(n) + 1;
    return `
      <div class="card${hidden ? ' is-hidden' : ''}" data-id="${escapeHtml(n.id)}">
        <div class="card-bar" style="background:${escapeHtml(bg)}"></div>
        <div class="card-body">
          <div class="card-title-row">
            <span class="card-title" title="${escapeHtml(cardTitle(n))}">${escapeHtml(cardTitle(n))}</span>
            ${isWeb ? '<span class="badge-web">WEB</span>' : ''}
            <button class="card-more" data-more="${escapeHtml(n.id)}" title="${tr('config.moreActions')}">⋯</button>
          </div>
          <div class="card-preview">${escapeHtml(cardPreview(n))}</div>
          <div class="card-meta">
            <span class="dot${hidden ? ' off' : ''}" title="${hidden ? tr('config.hidden') : tr('config.shown')}"></span>
            <span>#${idx}</span>
            ${charCount(n) ? `<span class="sep">·</span><span>${charCount(n)}</span>` : ''}
            <span class="sep">·</span>
            <span>${relTime(n.updatedAt || n.createdAt)}</span>
            <span class="sep">·</span>
            <span class="lock-tag">${locked ? '🔒' : '🔓'}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

/* ---------- actions ---------- */

async function refresh() {
  notes = await api.listNotes();
  renderCards();
}

async function createNote(type) {
  const n = await api.createNote({ type });
  await refresh();
  // 新建后顺手打开详情弹窗
  api.openNoteConfig(n.id);
}

function openCardMenu(id, x, y) {
  menuForId = id;
  els.cardMenu.style.left = x + 'px';
  els.cardMenu.style.top = y + 'px';
  els.cardMenu.hidden = false;
}

function closeCardMenu() {
  els.cardMenu.hidden = true;
  menuForId = null;
}

async function execMenuAction(act) {
  const id = menuForId;
  closeCardMenu();
  if (!id) return;
  const n = notes.find((x) => x.id === id);
  if (!n) return;
  switch (act) {
    case 'edit':
      api.openNoteConfig(id);
      break;
    case 'dup':
      await api.duplicateNote(id);
      await refresh();
      break;
    case 'toggle-hide':
      await api.setHidden(id, !(n.hidden === true));
      await refresh();
      break;
    case 'toggle-lock':
      await api.setLock(id, n.locked === false);
      await refresh();
      break;
    case 'del':
      if (!confirm(tr('config.confirmDelete'))) return;
      await api.deleteNote(id);
      await refresh();
      break;
  }
}

/* ---------- events ---------- */

// 卡片网格事件委托
els.grid.addEventListener('click', (e) => {
  const moreBtn = e.target.closest('[data-more]');
  if (moreBtn) {
    e.stopPropagation();
    const r = moreBtn.getBoundingClientRect();
    openCardMenu(moreBtn.dataset.more, r.left, r.bottom + 4);
    return;
  }
  const card = e.target.closest('.card');
  if (card) api.openNoteConfig(card.dataset.id);
});

// 右键也能打开菜单
els.grid.addEventListener('contextmenu', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  e.preventDefault();
  openCardMenu(card.dataset.id, e.clientX, e.clientY);
});

// 卡片菜单项
els.cardMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (btn) execMenuAction(btn.dataset.act);
});

// 新建下拉
els.newBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  els.newMenu.hidden = !els.newMenu.hidden;
});
els.newMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-type]');
  if (!btn) return;
  els.newMenu.hidden = true;
  createNote(btn.dataset.type);
});

// 点击空白关闭下拉/菜单
document.addEventListener('click', () => {
  els.newMenu.hidden = true;
  closeCardMenu();
});
document.addEventListener('scroll', closeCardMenu, true);

// 搜索
els.search.addEventListener('input', () => {
  keyword = els.search.value.trim();
  renderCards();
});

// 排序
els.sort.addEventListener('change', () => {
  sortMode = els.sort.value;
  renderCards();
});

// 校准：重新落位所有便签到可见区
els.calibrate.addEventListener('click', async () => {
  await api.recalibrate();
  await refresh();
});

// 全局配置：打开独立弹窗
els.globalCfg.addEventListener('click', () => {
  api.openGlobalConfig();
});

api.onRefresh(() => refresh());

// 静态文案初始翻译 + 语言切换时重渲染
applyI18n(tr);
api.onI18nChanged((loc) => {
  locale = loc;
  api.setLocale(loc);
  applyI18n(tr);
  renderCards();
});

refresh();
