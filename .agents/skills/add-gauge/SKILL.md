---
name: add-gauge
description: 新增用量 gauge 列到 Claude Usage Widget。當需要新增一個 API 回傳的用量欄位、或新增一種品牌來源的 gauge 時使用此 skill。
---

# 新增 Gauge 列

Widget 的 gauge（用量進度條）分為兩類：Claude（橘色）和 Codex（藍色），各自渲染為帶品牌 logo 的進度條列。

## 新增 Claude API gauge（API 自動出現的欄位）

若 Anthropic API 新增欄位，Widget 會自動渲染（`normalize()` 遍歷所有 key），只需：

1. **`renderer/renderer.js`** — 在 `LABELS` 物件加入 key 與繁體中文標籤：
   ```js
   const LABELS = {
     // 既有 ...
     new_field: '新欄位描述',
   };
   ```
2. 若該欄位是一次性額度（非滾動重置），加入 `ONE_TIME` Set。
3. 若需要自訂排序，在 `normalize()` 的 `order` 陣列調整位置。

## 新增非 API gauge（如 Codex 或其他工具）

以 Codex 為參考模式：

### main.js（主行程）
1. 寫一個資料讀取函式（如 `readCodexUsage()`），回傳 `{ fiveHour: { pct, resetsAt }, sevenDay: { pct, resetsAt } }` 結構。
2. 在 `pollNow()` 呼叫它，附加到 payload：`payload.newSource = readNewSourceUsage();`
3. 在 `extractGauges()` 或獨立函式裡產生 `{ key, utilization }` 陣列供通知用。
4. 更新 `maybeNotify()` 合併新來源的 gauge。

### renderer/renderer.js（渲染行程）
1. 建立 `newSourceGauges(data)` 函式，回傳與 `normalize()` 相同結構的 gauge 陣列，設定 `brand: 'newSource'`。
2. 在 `displayGauges()` 合併。
3. 在 `onUsage` callback 存最新資料。

### renderer/style.css（樣式）
1. 定義品牌色 CSS variable：`--newSource: #HEXCOLOR;`
2. 加入 `.fill.newSource { background: var(--newSource); }`
3. 加入 `.gauge.brand-newSource .gauge-pct:not(.warn):not(.crit) { color: var(--newSource); }`

### 設定開關（選填）
若需可關閉：在 `DEFAULTS` 加 `showNewSource: true`，在 `publicSettings()`、`set-setting` IPC、settings-view HTML、`syncSettingsControls()`、`TOGGLE_KEYS` 各處同步。

## 注意
- gauge 的 `pct` 應 clamp 到 `[0, 100]`。
- `resetsAt` 為 ISO 8601 字串或 `null`。
- 品牌間以 `.gauge-divider` 分隔（自動由 `renderGauges()` 處理）。
