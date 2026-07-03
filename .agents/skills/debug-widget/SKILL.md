---
name: debug-widget
description: 除錯 Claude Usage Widget 的常見問題。當 widget 出現白畫面、API 錯誤、視窗行為異常、或設定不生效時使用此 skill。
---

# Widget 除錯指南

## 常見問題與排查

### 白畫面 / 無內容
1. `node --check main.js && node --check renderer/renderer.js && node --check preload.js` — 語法錯誤
2. 檢查 CSP（`index.html` 的 `<meta>`）是否阻擋了新加入的資源
3. DevTools：`npx electron . --devtools`（若有加此 flag 的話），或在 main.js 加 `win.webContents.openDevTools()`

### API 錯誤
- `no-credentials`：`~/.claude/.credentials.json` 不存在 → 開一次 Claude Code
- `auth` / `tokenExpired`：OAuth token 過期 → 開一次 Claude Code 讓它自動 refresh
- `network`：無網路或 DNS 問題
- `http-429`：Anthropic rate limit，widget 下次排程會重試
- `http-4xx/5xx`：API 端問題，檢查 `USAGE_URL` 是否正確

### 視窗位置異常
- `validatePos()` 檢查儲存的位置是否在螢幕內（多螢幕切換後可能失效）
- 刪除 `%APPDATA%\claude-usage-widget\settings.json` 重置所有設定

### 設定不生效
檢查三點是否都有修改：
1. `set-setting` IPC handler 的 switch case
2. `publicSettings()` 回傳
3. `renderer.js` 的 `syncSettingsControls()` 和 `TOGGLE_KEYS`

### 視窗大小跳動
- `suppressResizePersistence` / `suppressMovePersistence` 是否正確設置
- 確認 `requestResize()` 在 `requestAnimationFrame` 裡執行
- 確認沒有 resize → save → apply → resize 的迴圈

### Codex 資料不顯示
- 確認 `~/.codex/sessions/` 下有 `rollout-*.jsonl` 檔案
- 確認檔案內有 `"rate_limits"` 或 `"token_count"` 行
- 確認 `showCodex` 設定為 true

### 系統匣圖示消失
- `assets/tray.png` 是否存在：`npm run gen-icon`
- `nativeImage.createFromPath()` 路徑是否正確

## 語法檢查

```bash
node --check main.js
node --check renderer/renderer.js
node --check preload.js
```

沒有 ESLint 或其他 lint 工具，用 Node `--check` 做基本語法檢查。

## Smoke Test

```bash
npx electron . --screenshot screenshot.png
```

啟動後等 5 秒截圖再退出，可用於 CI 驗證 widget 能正常渲染。

## 手動重置

```powershell
# 刪除設定檔
Remove-Item "$env:APPDATA\claude-usage-widget\settings.json" -ErrorAction SilentlyContinue

# 重新產生圖示
npm run gen-icon

# 重新啟動
npm start
```
