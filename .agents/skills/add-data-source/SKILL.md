---
name: add-data-source
description: 新增資料來源到 Claude Usage Widget。當需要讀取新的 CLI 工具用量、本機檔案、或外部 API 來顯示在 widget 上時使用此 skill。
---

# 新增資料來源

Widget 目前有三種資料來源模式可參考：

| 模式 | 範例 | 特性 |
|------|------|------|
| HTTP API 輪詢 | Claude usage API | 需要 token、有網路延遲、需錯誤處理 |
| 本機檔案掃描 | Codex rollout files | 無網路、tail-read 大檔案、依賴 CLI 產生的檔案 |
| 本機 JSON 讀取 | Claude stats-cache | 無網路、單一 JSON 檔、簡單 parse |

## 本機檔案掃描模式（推薦，參考 Codex）

### main.js

1. **定義路徑常數**
   ```js
   const NEW_SOURCE_DIR = path.join(os.homedir(), '.new-cli', 'data');
   ```

2. **遞迴收集檔案**
   ```js
   function collectNewSourceFiles(dir, out) {
     let entries;
     try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
     for (const e of entries) {
       const p = path.join(dir, e.name);
       if (e.isDirectory()) collectNewSourceFiles(p, out);
       else if (e.isFile() && e.name.endsWith('.jsonl')) {
         try { out.push({ p, mtime: fs.statSync(p).mtimeMs }); } catch {}
       }
     }
   }
   ```

3. **解析與彙整**：使用 `tailRead()` 讀取檔案尾部（避免載入整個大檔案），解析最新的相關 JSON 行。

4. **頂層讀取函式**
   ```js
   function readNewSourceUsage() {
     // ... 回傳結構化的 usage 資料或 null
   }
   ```

5. **整合到 `pollNow()`**
   ```js
   async function pollNow() {
     // ...
     const newSource = readNewSourceUsage();
     payload.newSource = newSource;
     // ...
   }
   ```

## 工具函式（已有，可直接使用）

- `tailRead(file, maxBytes)` — 讀取檔案最後 N bytes
- `headRead(file, maxBytes)` — 讀取檔案前 N bytes
- `num(v)` — 安全的 number 轉換（非 finite 回傳 0）
- `fmtCompactTokens(n)` — 格式化 token 數量（1.2M, 45.3K）
- `collectRolloutFiles(dir, out)` — 遞迴收集 rollout-*.jsonl（可作為模板）

## 偵測可用性

在 `detectAvailability()` 加入新來源的偵測：
```js
function detectAvailability() {
  return {
    claudeAvailable: fs.existsSync(CRED_PATH),
    codexAvailable: hasCodexSessions(),
    newSourceAvailable: fs.existsSync(NEW_SOURCE_DIR),
  };
}
```

這會影響設定頁的開關是否可以啟用（disabled state）。

## 效能考量

- 掃描目錄時限制深度或檔案數量（`files.slice(0, 8)`）
- 大檔案用 `tailRead` 只讀尾部（如最後 256KB ~ 512KB）
- 不要在主行程同步讀取超過 2MB 的檔案
- 排序取最新的 N 個（`files.sort((a, b) => b.mtime - a.mtime)`）
