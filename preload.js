'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widget', {
  onInit: (cb) => ipcRenderer.on('init', (_e, d) => cb(d)),
  onUsage: (cb) => ipcRenderer.on('usage', (_e, d) => cb(d)),
  onCollapsedChanged: (cb) => ipcRenderer.on('collapsed-changed', (_e, d) => cb(d)),
  resize: (width, height) => ipcRenderer.send('resize', { width, height }),
  toggleCollapse: () => ipcRenderer.send('toggle-collapse'),
  refresh: () => ipcRenderer.send('refresh'),
  openMenu: () => ipcRenderer.send('open-menu'),
  hide: () => ipcRenderer.send('hide-window'),
});
