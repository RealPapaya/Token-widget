'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widget', {
  onInit: (cb) => ipcRenderer.on('init', (_e, d) => cb(d)),
  onUsage: (cb) => ipcRenderer.on('usage', (_e, d) => cb(d)),
  onRefreshState: (cb) => ipcRenderer.on('refresh-state', (_e, d) => cb(d)),
  onCollapsedChanged: (cb) => ipcRenderer.on('collapsed-changed', (_e, d) => cb(d)),
  onSettings: (cb) => ipcRenderer.on('settings', (_e, d) => cb(d)),
  resize: (width, height) => ipcRenderer.send('resize', { width, height }),
  resizeHeight: (height) => ipcRenderer.send('resize-height', { height }),
  toggleCollapse: () => ipcRenderer.send('toggle-collapse'),
  refresh: () => ipcRenderer.send('refresh'),
  openMenu: () => ipcRenderer.send('open-menu'),
  setSetting: (key, value) => ipcRenderer.send('set-setting', { key, value }),
  hide: () => ipcRenderer.send('hide-window'),
});
