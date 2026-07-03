---
name: electron-widget-ui
description: 修改 Claude Usage Widget 的 UI 元件、樣式、動畫。當需要調整視覺外觀、新增 UI 元件、或修改 CSS 時使用此 skill。
---

# Widget UI 開發指南

## 設計系統

### 色彩（CSS Custom Properties in `:root`）

| Variable | 值 | 用途 |
|----------|------|------|
| `--orange` | `#D97757` | Claude 品牌色、進度條、重點文字 |
| `--bg` | `rgba(38,38,36,0.96)` | 面板背景（半透明深色） |
| `--bg-inner` | `rgba(255,255,255,0.05)` | 內部區塊背景、進度條底 |
| `--border` | `rgba(255,255,255,0.09)` | 分隔線、邊框 |
| `--text` | `#FAF9F5` | 主要文字（Claude cream） |
| `--dim` | `#9B9A94` | 次要文字、時間戳、提示 |
| `--warn` | `#F0B429` | 80%+ 警示 |
| `--crit` | `#E5484D` | 95%+ 危急 |
| `--codex` | `#4F9CF9` | Codex 品牌色（藍色） |

### 字型
`"Segoe UI", system-ui, sans-serif` — 不使用 Google Fonts（本機 widget 不需網路字型）。

### 圓角
- 面板：`border-radius: 16px`
- 膠囊：`border-radius: 999px`
- 按鈕：`border-radius: 6px`
- 進度條：`border-radius: 4px`

## 兩種模式

### 展開面板（`#panel`）
- 可拖曳標題列（`.drag` class）
- 可拖曳調整寬度（使用者拖邊緣）
- 高度隨內容自動貼合（`requestResize()`）
- 含 header（標題 + 按鈕）、gauges、settings-view、usage-view、footer

### 縮小膠囊（`#capsule`）
- 固定寬 240px、單列圓角膠囊
- 顯示最高用量的品牌 logo + 進度條 + 百分比 + 倒數
- `+` 按鈕展開

## 互斥 View 切換

```
gauges（預設）  ←→  settings-view  ←→  usage-view
```

切換邏輯在 `syncMainViewVisibility()` — 用 `.hidden` class toggle。
切換後必須呼叫 `requestResize()` 讓高度重新貼合。

## 新增 UI 區塊

1. **HTML** — 在 `renderer/index.html` 的 `#panel` 裡加入 div，預設加 `hidden` class
2. **CSS** — 在 `renderer/style.css` 加樣式，用既有的 CSS variables
3. **JS** — 在 `renderer/renderer.js` 加 render 函式，遵循：
   - 用 `$('id')` 取得元素
   - 動態內容用 `document.createElement` + `escapeHtml()`
   - 渲染完呼叫 `requestResize()`
   - 切換到新 view 時關閉其他 view
4. **按鈕** — 在 `.header-buttons` 加按鈕，按鈕加 `no-drag` class

## 動畫

- 進度條寬度：`transition: width 0.6s ease`
- 危急閃爍：`@keyframes pulse { 50% { opacity: 0.65; } }` + `animation: pulse 1.6s ease-in-out infinite`
- Hover 效果：`background: var(--bg-inner); color: var(--text);`

## 拖曳注意

- `-webkit-app-region: drag` 讓元素可拖曳視窗
- `-webkit-app-region: no-drag` 讓按鈕、輸入框可互動
- 嵌套元素需明確標記（例 header 是 drag，header 裡的按鈕是 no-drag）

## 視窗 Resize

渲染完畢後呼叫 `requestResize()`，它會：
1. 用 `requestAnimationFrame` 延遲到下一幀
2. 取得 `#panel` 或 `#capsule` 的 `getBoundingClientRect().height`
3. 透過 `window.widget.resizeHeight()` 通知 main process 調整視窗高度
4. 寬度由 main process 控制（展開 = `panelWidth`，膠囊 = 240px）
