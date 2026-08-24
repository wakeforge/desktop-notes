'use strict';

/**
 * 渲染层共用的 i18n DOM 辅助。
 * 由各个窗口的 HTML 通过 <script src="../shared/_i18n.js"></script> 引入（须在各自主脚本之前）。
 * 不依赖具体 API 名称：调用方把 preload 暴露的 t() 传进来即可。
 *
 * 用法：
 *   <span data-i18n="config.myNotes"></span>                       → textContent
 *   <button data-i18n-title="config.calibrateTip"></button>        → title
 *   <input data-i18n-placeholder="config.searchPlaceholder" />     → placeholder
 *   <button data-i18n-aria="config.globalConfig"></button>         → aria-label
 */

function applyI18n(t, root) {
  root = root || document;
  if (!t) return;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
}
