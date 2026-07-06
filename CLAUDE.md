Global rules: read C:\Users\morris_hsueh\.agents\institution\core-rules.md first.
Session protocol + project commands: read AGENTS.md in this directory.

# Claude Usage Widget — CLAUDE.md

## 專案概述

Windows 桌面小工具（Electron），即時顯示 Claude Code 與 Codex CLI 的 API 用量限制，含進度條、重置倒數、工作階段 Token 分析。

## 技術棧

- **Runtime**: Electron 33+（Node.js 主行程 + Chromium 渲染行程）
- **語言**: 純 JavaScript（CommonJS），無 TypeScript、無 Babel、無 bundler
- **樣式**: Vanilla CSS，深色主題，Claude 品牌色 `#D97757`
- **依賴**: 僅 `electron`（devDependencies），無其他第三方套件
- **平台**: 僅 Windows（系統匣、VBS 啟動器、`setLoginItemSettings`）

## 架構

```
main.js          → Electron main process：API 輪詢、設定持久化、系統匣、IPC、通知
preload.js       → contextBridge，暴露 window.widget API 給 renderer
renderer/
  index.html     → UI 骨架（展開面板 + 縮小膠囊兩種模式）
  renderer.js    → 前端邏輯：gauge 渲染、工作階段分析、設定頁
  style.css      → 全部樣式，CSS custom properties 為色彩系統
scripts/
  gen-tray-icon.js → 純 Node 產生 32×32 PNG 系統匣圖示（無外部依賴）
assets/
  tray.png       → 產出的系統匣圖示
start-widget.vbs → Windows 隱藏啟動器（不顯示終端機視窗）
```

## 資料流

1. **Claude 用量**：讀取 `~/.claude/.credentials.json` OAuth token → `fetch()` 呼叫 `https://api.anthropic.com/api/oauth/usage` → 每 N 分鐘輪詢（預設 3 分）
2. **Codex 用量**：掃描 `~/.codex/sessions/**/rollout-*.jsonl`，tail-read 最新的 `rate_limits` 快照 → 純本機、不需網路
3. **Claude 工作階段明細**：掃描 `~/.claude/projects/**/*.jsonl` transcript，累計每個 session 的 token usage
4. **Claude 使用習慣**：讀取 `~/.claude/stats-cache.json`（modelUsage, hourCounts）
5. **IPC 通道**：main → renderer：`usage`, `init`, `collapsed-changed`, `settings`；renderer → main：`resize`, `resize-height`, `toggle-collapse`, `refresh`, `open-menu`, `set-setting`, `hide-window`

## 關鍵慣例

### 程式碼風格
- `'use strict'` 放在每個檔案開頭
- 分號結尾
- 2 空格縮排
- 函式命名 camelCase，常數 UPPER_SNAKE_CASE
- DOM helper: `const $ = (id) => document.getElementById(id);`
- 不使用 `innerHTML` 的地方一律用 `escapeHtml()` 跳脫
- 繁體中文 UI（通知文字、label、tooltip）

### 安全
- CSP 設定在 index.html `<meta>`：`default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;`
- `contextIsolation: true`, `nodeIntegration: false`
- OAuth token 僅用於 Anthropic 官方 API，不會離開本機

### 設定持久化
- 路徑：`%APPDATA%\claude-usage-widget\settings.json`
- 寫入防抖 300ms（`saveSettings()` 用 setTimeout 合併）
- 修改設定後必須同時呼叫 `saveSettings()` + `pushSettings()` + `rebuildTrayMenu()`

### 視窗管理
- 展開模式寬度由使用者拖曳決定（`panelWidth`），高度隨內容自動貼合（`resizeHeight`）
- 膠囊模式固定寬度 240px
- 程式化 resize 需先 `markProgrammaticResize()` 以免觸發持久化

### 通知門檻
- ≥80% → `warn`（橘黃）
- ≥95% → `crit`（紅色 + 閃爍）
- 只在嚴重度「升級」時發送 Windows 通知（避免重複）

## 常用指令

```bash
# 啟動小工具（背景無黑視窗執行，或直接在本機雙擊 start-widget.vbs）
wscript start-widget.vbs

# 語法檢查（無 lint 工具，用 Node --check）
node --check main.js
node --check renderer/renderer.js
node --check preload.js

# 重新產生系統匣圖示
npm run gen-icon

# 截圖模式（CI / smoke test 用）
npx electron . --screenshot output.png
```

## 修改注意事項

- **新增 gauge**：若 API 回傳新欄位，只需在 `renderer.js` 的 `LABELS` 物件加入對應 key 即可自動渲染。
- **新增設定項**：需同步修改 `main.js` 的 `DEFAULTS`、`publicSettings()`、`set-setting` IPC handler，以及 `renderer/index.html` 的 settings-view 和 `renderer.js` 的 `syncSettingsControls()`、`TOGGLE_KEYS`。
- **新增 IPC 通道**：必須在 `preload.js` 的 `contextBridge.exposeInMainWorld` 裡註冊。
- **修改視窗尺寸邏輯**：注意 `suppressResizePersistence` / `suppressMovePersistence` 機制，避免程式化 resize 被當作使用者操作寫回設定。
- **新增品牌來源**：參考 Codex 的實作模式——在 main.js 讀取資料、附加到 `payload`，renderer.js 解析並以 `brand-xxx` class 標記視覺差異。
