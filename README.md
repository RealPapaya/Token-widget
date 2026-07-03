# Claude Usage Widget

Windows 桌面小工具：顯示 Claude Code 的用量限制（Your usage limits），含進度條、重置倒數與確切重置時間。同時支援 Enterprise（金額制預算）與個人方案（5 小時 session / weekly 百分比）——依 API 實際回傳的欄位動態渲染。

## 資料來源

讀取 `~/.claude/.credentials.json` 的 OAuth token，呼叫官方 `https://api.anthropic.com/api/oauth/usage`（與 Claude Code 內建 `/usage` 指令同一來源）。**每 3 分鐘自動更新**，喚醒（睡眠恢復）時也會立即更新。Token 不會離開本機，只用於呼叫 Anthropic 官方 API。

Token 由 Claude Code 自行維護更新；若 widget 顯示「Token 已過期」，開啟一次 Claude Code 即可。

### Codex（OpenAI）用量

若偵測到 OpenAI Codex CLI（`~/.codex`），會額外顯示 Codex 的 **5 小時 Session** 與 **本週用量**（藍色進度條、OpenAI logo 標示）。資料來自 Codex session rollout 檔（`~/.codex/sessions/**/rollout-*.jsonl`）裡最新的 `rate_limits` 快照——與 Codex 自身 `/status` 同源，不需額外呼叫網路。快照的新鮮度取決於 Codex 上次呼叫 API 的時間。可在選單以「顯示 Codex 用量」開關。

## 啟動

- 給一般使用者：先在開發機雙擊 `build-portable.bat`，完成後把 `dist` 裡的 `Claude Usage Widget-*-x64.exe` 給對方。對方在 Windows 上雙擊 `.exe` 即可使用，不需要 Node.js、npm、`node_modules` 或 `.vbs`。
- 開發/本機執行：雙擊 `start-widget.bat`。如果還沒有 `node_modules`，它會先執行 `npm install`，再啟動 widget。
- 終端機執行：`npm start`
- 隱藏啟動器視窗：可雙擊 `start-widget.vbs`。如果 Electron 尚未安裝，它會改開 `start-widget.bat` 顯示安裝進度。

打包命令也可以手動執行：

```powershell
npm.cmd install
npm.cmd run dist:win
```

首次啟動會自動註冊「開機自動啟動」。之後可在小工具內的設定頁或右鍵選單切換。

## 操作

| 操作 | 說明 |
|---|---|
| 拖曳面板 | 移動位置（會記住） |
| 拖曳邊緣 | 調整寬度（會記住；高度依內容自動貼合） |
| 標題列 `–` / 膠囊 `+` | 縮小成迷你膠囊 / 展開完整面板 |
| `⟳` | 立即更新 |
| 齒輪設定頁 | 更新間隔、置頂、開機自動啟動、警示通知、顯示 Claude / Codex 用量、顯示 Amber Ladder、金額幣值 USD/TWD |
| `⋯` 或右鍵 | 快速選單（置頂、開機啟動、警示通知、顯示 Claude / Codex 用量、顯示 Amber Ladder、金額幣值 USD/TWD、結束） |

Claude 與 Codex 各自成組，每列前方以品牌 logo（Claude 橘色標記 / OpenAI 標記）標示來源；可在設定選單分別開關「顯示 Claude 用量」「顯示 Codex 用量」。
| 系統匣圖示點擊 | 顯示 / 隱藏 widget |

## 警示

- 用量 ≥ 80%：進度條與百分比變**橘黃色**
- 用量 ≥ 95%：變**紅色**並閃爍
- 跨越門檻時發送 Windows 通知（可在選單關閉）

## 設定檔

`%APPDATA%\claude-usage-widget\settings.json` — 視窗位置、面板寬度（`panelWidth`）、縮小狀態、置頂、開機啟動、通知、是否顯示 Claude 用量（`showClaude`，預設開啟）、是否顯示 Amber Ladder（`showAmberLadder`，預設關閉）、是否顯示 Codex 用量（`showCodex`，預設開啟）、更新間隔（`pollMinutes`）、金額顯示幣值（`displayCurrency`，`USD` / `TWD`）。

## 專案結構

```
main.js                  Electron 主行程：輪詢 API、視窗/系統匣/設定/通知
preload.js               IPC bridge
renderer/                UI（Claude 深色風格，使用官方 Claude logo SVG）
scripts/gen-tray-icon.js 產生系統匣 PNG 圖示（純 Node，無相依套件）
```
