---
name: add-ipc-channel
description: 新增 IPC 通道到 Claude Usage Widget。當需要在 main process 和 renderer 之間傳遞新的訊息時使用此 skill。
---

# 新增 IPC 通道

Electron IPC 通訊經由 `preload.js` 的 `contextBridge` 橋接，所有通道都必須在此註冊。

## 架構

```
main.js  ←→  preload.js (contextBridge)  ←→  renderer.js
   ↑              ↑                              ↑
ipcMain     ipcRenderer                    window.widget.*
```

## Main → Renderer（推送資料）

### 1. `preload.js`
```js
contextBridge.exposeInMainWorld('widget', {
  // ...
  onNewEvent: (cb) => ipcRenderer.on('new-event', (_e, d) => cb(d)),
});
```

### 2. `main.js`
```js
// 在適當時機發送
if (win && !win.isDestroyed()) {
  win.webContents.send('new-event', payload);
}
```

### 3. `renderer/renderer.js`
```js
window.widget.onNewEvent((data) => {
  // 處理收到的資料
});
```

## Renderer → Main（使用者操作）

### 1. `preload.js`
```js
contextBridge.exposeInMainWorld('widget', {
  // ...
  doAction: (arg) => ipcRenderer.send('do-action', arg),
});
```

### 2. `renderer/renderer.js`
```js
$('btn-action').addEventListener('click', () => {
  window.widget.doAction({ key: 'value' });
});
```

### 3. `main.js`
```js
ipcMain.on('do-action', (_e, arg) => {
  // 處理
});
```

## 注意事項

- **所有 IPC 通道必須在 `preload.js` 註冊**，不可在 renderer 直接 require electron。
- `contextIsolation: true` 確保 renderer 只能透過 `window.widget` 存取 IPC。
- 事件名用 kebab-case（如 `resize-height`），API 方法用 camelCase（如 `resizeHeight`）。
- 帶參數的 `send` 統一用單一物件 `{ key, value }` 格式（參考 `set-setting`）。
