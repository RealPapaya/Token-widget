# Claude Usage Widget

Windows 桌面小工具：顯示 Claude Code 的用量限制（Your usage limits），含進度條、重置倒數與確切重置時間。同時支援 Enterprise（金額制預算）與個人方案（5 小時 session / weekly 百分比）——依 API 實際回傳的欄位動態渲染。

## 資料來源

讀取 `~/.claude/.credentials.json` 的 OAuth token，呼叫官方 `https://api.anthropic.com/api/oauth/usage`（與 Claude Code 內建 `/usage` 指令同一來源）。**每 3 分鐘自動更新**，喚醒（睡眠恢復）時也會立即更新。Token 不會離開本機，只用於呼叫 Anthropic 官方 API。

Token 由 Claude Code 自行維護更新；若 widget 顯示「Token 已過期」，開啟一次 Claude Code 即可。

## 啟動

- 雙擊 `start-widget.vbs`（不開終端機視窗），或
- `npm start`

首次啟動會自動註冊「開機自動啟動」（可在右鍵選單關閉）。

## 操作

| 操作 | 說明 |
|---|---|
| 拖曳面板 | 移動位置（會記住） |
| 標題列 `–` / 膠囊 `+` | 縮小成迷你膠囊 / 展開完整面板 |
| `⟳` | 立即更新 |
| `⋯` 或右鍵 | 設定選單（置頂、開機啟動、警示通知、結束） |
| 系統匣圖示點擊 | 顯示 / 隱藏 widget |

## 警示

- 用量 ≥ 80%：進度條與百分比變**橘黃色**
- 用量 ≥ 95%：變**紅色**並閃爍
- 跨越門檻時發送 Windows 通知（可在選單關閉）

## 設定檔

`%APPDATA%\claude-usage-widget\settings.json` — 視窗位置、縮小狀態、置頂、開機啟動、通知、更新間隔（`pollMinutes`）。

## 專案結構

```
main.js                  Electron 主行程：輪詢 API、視窗/系統匣/設定/通知
preload.js               IPC bridge
renderer/                UI（Claude 深色風格，starburst logo 以 SVG 動態生成）
scripts/gen-tray-icon.js 產生系統匣 PNG 圖示（純 Node，無相依套件）
```
