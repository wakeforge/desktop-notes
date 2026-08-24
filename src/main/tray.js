'use strict';

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const wm = require('./windowManager');
const store = require('./store');
const i18n = require('../shared/locales');

let tray = null;

const ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'tray.png');

function buildMenu() {
  const t = (key, params) => i18n.t(i18n.resolveLocale(store.getSettings().language, app.getLocale()), key, params);
  return Menu.buildFromTemplate([
    {
      label: t('tray.newNote'),
      submenu: [
        {
          label: t('tray.newTextNote'),
          click: () => createNoteOfType('text')
        },
        {
          label: t('tray.newWebNote'),
          click: () => createNoteOfType('web')
        }
      ]
    },
    { label: t('tray.openMainWindow'), click: () => wm.showConfigWindow() },
    { type: 'separator' },
    { label: t('tray.lockAll'), click: () => { wm.setAllLocked(true); refresh(); } },
    { label: t('tray.unlockAll'), click: () => { wm.setAllLocked(false); refresh(); } },
    { type: 'separator' },
    { label: t('tray.showAll'), click: () => { wm.setAllHidden(false); refresh(); } },
    { label: t('tray.hideAll'), click: () => { wm.setAllHidden(true); refresh(); } },
    {
      label: t('tray.quit'),
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
}

function createNoteOfType(type) {
  const note = store.createNote({ type });
  wm.createNoteWindow(note);
  wm.broadcastConfig();
  refresh();
}

function refresh() {
  if (tray) tray.setContextMenu(buildMenu());
}

function createTray() {
  let icon = nativeImage.createFromPath(ICON_PATH);
  if (icon.isEmpty()) {
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAO0lEQVR4nGNgGDTg/4Oo//jws0N6KJhkA9ANIcsAZEPINgBmCE4DqqIE8GKYOopcQFsDRr1AgQsGDAAA/xiruic8kD8AAAAASUVORK5CYII='
    );
  }
  tray = new Tray(icon);
  tray.setToolTip(i18n.t(i18n.resolveLocale(store.getSettings().language, app.getLocale()), 'tray.tooltip'));
  tray.setContextMenu(buildMenu());
  tray.on('double-click', () => wm.showConfigWindow());
  return tray;
}

module.exports = { createTray, refresh };
