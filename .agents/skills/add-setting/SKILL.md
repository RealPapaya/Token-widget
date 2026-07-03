---
name: add-setting
description: 新增設定項到 Claude Usage Widget。當需要新增一個使用者可切換的偏好設定時使用此 skill。
---

# 新增設定項

設定項同時出現在三個介面：設定頁、右鍵選單、系統匣選單。新增時必須同步所有介面。

## Checklist

### 1. `main.js` — 後端

- **`DEFAULTS`** 物件：加入預設值
  ```js
  const DEFAULTS = {
    // ...
    newSetting: false, // or true, or a number
  };
  ```

- **`publicSettings()`**：加入回傳
  ```js
  function publicSettings() {
    return {
      // ...
      newSetting: settings.newSetting,
    };
  }
  ```

- **`ipcMain.on('set-setting')`** 的 switch：加入 case
  ```js
  case 'newSetting':
    settings.newSetting = !!value; // boolean 用 !! ，number 用 Math.min/max
    // 若需 side effect，在此處理
    break;
  ```

- **`rebuildTrayMenu()`**（選填）：若要出現在右鍵選單
  ```js
  {
    label: '新設定的中文名稱',
    type: 'checkbox',
    checked: settings.newSetting,
    click: (item) => {
      settings.newSetting = item.checked;
      saveSettings();
      pushSettings();
    },
  },
  ```

### 2. `renderer/index.html` — 設定頁 UI

在 `#settings-view` 的 `.set-group` 裡加入 toggle：
```html
<label class="set-toggle"><span>新設定的中文名稱</span>
  <input type="checkbox" id="set-newSetting" /></label>
```

若是數值滑桿，參考 `poll-slider` 的結構。

### 3. `renderer/renderer.js` — 前端

- **`syncSettingsControls()`**：加入同步
  ```js
  'set-newSetting': s.newSetting !== false,
  ```

- **`TOGGLE_KEYS`**：加入映射
  ```js
  'set-newSetting': 'newSetting',
  ```

- 若該設定影響 gauge 渲染，在 `onSettings` callback 裡更新本地變數並呼叫 `renderGauges()`。

### 4. README.md

在「設定檔」段落更新欄位說明。

## 設定持久化注意

- `saveSettings()` 有 300ms 防抖，不需擔心高頻寫入。
- 修改設定後的固定 pattern：`saveSettings(); pushSettings(); rebuildTrayMenu();`
- `set-setting` IPC handler 裡 `saveSettings()` 和 `pushSettings()` + `rebuildTrayMenu()` 會在 switch 後統一呼叫，不需在 case 裡重複。
