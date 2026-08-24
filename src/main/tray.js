'use strict';

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const wm = require('./windowManager');
const store = require('./store');

let tray = null;

const ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'tray.png');

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: '新建便签',
      submenu: [
        {
          label: '新建文本便签',
          click: () => createNoteOfType('text')
        },
        {
          label: '新建网页便签',
          click: () => createNoteOfType('web')
        }
      ]
    },
    { label: '打开主窗口', click: () => wm.showConfigWindow() },
    { type: 'separator' },
    { label: '全部锁定', click: () => { wm.setAllLocked(true); refresh(); } },
    { label: '全部解锁', click: () => { wm.setAllLocked(false); refresh(); } },
    { type: 'separator' },
    { label: '全部显示', click: () => { wm.setAllHidden(false); refresh(); } },
    { label: '全部隐藏', click: () => { wm.setAllHidden(true); refresh(); } },
    {
      label: '退出',
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
  tray.setToolTip('桌面便签');
  tray.setContextMenu(buildMenu());
  tray.on('double-click', () => wm.showConfigWindow());
  return tray;
}

module.exports = { createTray, refresh };
