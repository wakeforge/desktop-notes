'use strict';

const api = window.aboutAPI;
const tr = window.aboutAPI.t;

/* ---------- 主题跟随（nativeTheme.themeSource 驱动 prefers-color-scheme） ---------- */

const themeMq = window.matchMedia('(prefers-color-scheme: dark)');
function applyPageTheme() {
  document.documentElement.dataset.theme = themeMq.matches ? 'dark' : 'light';
}
themeMq.addEventListener('change', applyPageTheme);
applyPageTheme();

const els = {
  appName: document.getElementById('appName'),
  appId: document.getElementById('appId'),
  version: document.getElementById('version'),
  releaseDate: document.getElementById('releaseDate'),
  linkWebsite: document.getElementById('linkWebsite'),
  linkGithub: document.getElementById('linkGithub'),
  tech: document.getElementById('tech'),
  copyright: document.getElementById('copyright')
};

let info = null; // 应用元信息缓存（语言切换后用它重填展示名）

async function load() {
  info = await api.getAppInfo();
  fill();
}

function fill() {
  if (!info) return;
  els.appName.textContent = info.displayName || tr('app.name');
  els.appId.textContent = info.name || '';
  els.version.textContent = info.version ? 'v' + info.version : '-';
  els.releaseDate.textContent = info.releaseDate || '-';
  els.linkWebsite.title = info.website || '';
  els.linkGithub.title = info.github || '';
  els.tech.textContent = `Electron ${info.electron} · Chromium ${info.chrome} · Node ${info.node}`;
  els.copyright.textContent = info.license
    ? `${info.copyright} · ${info.license}`
    : (info.copyright || '');
}

function openLink(url) {
  if (url) api.openExternal(url);
}

/* ---------- 事件 ---------- */

els.linkWebsite.addEventListener('click', () => { if (info) openLink(info.website); });
els.linkGithub.addEventListener('click', () => { if (info) openLink(info.github); });

// Esc 关闭（窗口本身有关闭按钮，这里只是补个键盘快捷方式）
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') api.close();
});

// 静态文案初始翻译 + 语言切换时重填
api.applyI18n();
api.onI18nChanged((loc) => {
  api.setLocale(loc);
  api.applyI18n();
  fill();
});

load();
