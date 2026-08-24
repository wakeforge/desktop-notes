'use strict';

const api = window.globalConfigAPI;
const tr = window.globalConfigAPI.t;

const els = {
  closeBtn: document.getElementById('closeBtn'),
  launchOnStartup: document.getElementById('launchOnStartup'),
  langSel: document.getElementById('langSel'),
  themeSeg: document.getElementById('themeSeg'),
  fontSize: document.getElementById('defaultFontSize'),
  opacity: document.getElementById('defaultOpacity'),
  opacityVal: document.getElementById('opacityVal'),
  bgColor: document.getElementById('defaultBgColor'),
  bgSwatch: document.getElementById('bgSwatch'),
  textColor: document.getElementById('defaultTextColor'),
  textSwatch: document.getElementById('textSwatch')
};

/* ---------- 主题跟随（nativeTheme.themeSource 驱动 prefers-color-scheme） ---------- */

let currentLang = 'auto';

function fillLangSel() {
  els.langSel.innerHTML = '';
  const mk = (val, label) => {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = label;
    return o;
  };
  els.langSel.appendChild(mk('auto', tr('globalConfig.langAuto')));
  for (const loc of api.locales) {
    els.langSel.appendChild(mk(loc, api.localeLabels[loc]));
  }
}

const themeMq = window.matchMedia('(prefers-color-scheme: dark)');
function applyPageTheme() {
  document.documentElement.dataset.theme = themeMq.matches ? 'dark' : 'light';
}
themeMq.addEventListener('change', applyPageTheme);
applyPageTheme();

/* ---------- 表单 ---------- */

let loading = false;

async function load() {
  loading = true;
  const s = await api.getSettings();
  els.launchOnStartup.checked = s.launchOnStartup === true;
  setThemeSeg(s.theme || 'system');
  currentLang = s.language || 'auto';
  fillLangSel();
  els.langSel.value = currentLang;
  els.fontSize.value = s.defaultFontSize || 14;
  const op = Math.round((s.defaultOpacity ?? 0.95) * 100);
  els.opacity.value = op;
  els.opacityVal.textContent = op + '%';
  els.bgColor.value = toHex(s.defaultBgColor || '#FFF7B2');
  els.textColor.value = toHex(s.defaultTextColor || '#222222');
  els.bgSwatch.style.background = els.bgColor.value;
  els.textSwatch.style.background = els.textColor.value;
  loading = false;
}

function setThemeSeg(theme) {
  for (const btn of els.themeSeg.querySelectorAll('button')) {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  }
}

function toHex(c) {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const d = document.createElement('div');
  d.style.color = c;
  document.body.appendChild(d);
  const rgb = getComputedStyle(d).color;
  document.body.removeChild(d);
  const m = rgb.match(/\d+/g);
  if (!m) return '#222222';
  return '#' + m.slice(0, 3).map((x) => (+x).toString(16).padStart(2, '0')).join('');
}

/* ---------- 事件（即时保存） ---------- */

els.closeBtn.addEventListener('click', () => api.closeWindow());

els.langSel.addEventListener('change', () => {
  if (loading) return;
  currentLang = els.langSel.value;
  api.updateSettings({ language: currentLang });
});

els.launchOnStartup.addEventListener('change', () => {
  if (loading) return;
  api.updateSettings({ launchOnStartup: els.launchOnStartup.checked });
});

els.themeSeg.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-theme]');
  if (!btn || loading) return;
  setThemeSeg(btn.dataset.theme);
  api.updateSettings({ theme: btn.dataset.theme });
});

els.fontSize.addEventListener('change', () => {
  if (loading) return;
  const v = Math.min(72, Math.max(10, Number(els.fontSize.value) || 14));
  els.fontSize.value = v;
  api.updateSettings({ defaultFontSize: v });
});

els.opacity.addEventListener('input', () => {
  const v = Number(els.opacity.value);
  els.opacityVal.textContent = v + '%';
  if (loading) return;
  api.updateSettings({ defaultOpacity: v / 100 });
});

els.bgColor.addEventListener('change', () => {
  if (loading) return;
  els.bgSwatch.style.background = els.bgColor.value;
  api.updateSettings({ defaultBgColor: els.bgColor.value });
});

els.textColor.addEventListener('change', () => {
  if (loading) return;
  els.textSwatch.style.background = els.textColor.value;
  api.updateSettings({ defaultTextColor: els.textColor.value });
});

// 静态文案初始翻译 + 语言切换时重渲染
applyI18n(tr);
api.onI18nChanged((loc) => {
  api.setLocale(loc);
  applyI18n(tr);
  fillLangSel();
  els.langSel.value = currentLang;
});

load();
