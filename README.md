# Claude Usage Widget

Windows 桌面小工具，用來顯示 Claude Code / Codex 的用量狀態、倒數時間與簡易告警。

[下載最新版 EXE](https://github.com/RealPapaya/Token-widget/releases/latest/download/Claude%20Usage%20Widget.exe) | [查看所有 Releases](https://github.com/RealPapaya/Token-widget/releases) | [GitHub Actions 建置紀錄](https://github.com/RealPapaya/Token-widget/actions)

## 下載

1. 到 [Releases](https://github.com/RealPapaya/Token-widget/releases)。
2. 打開最新版本。
3. 在 Assets 下載 `Claude Usage Widget.exe`。
4. 直接執行，不需要另外安裝 Node.js、npm 或 `node_modules`。

如果 Releases 頁面還是空的，代表尚未推送版本 tag。建立第一個 Release：

```powershell
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 會自動建置 Windows portable EXE，並把 `Claude Usage Widget.exe` 放到 Release Assets。

## Windows SmartScreen

第一次開啟自行打包或未簽章的 EXE 時，Windows 可能顯示：

> Windows 已保護您的電腦

這是 Microsoft Defender SmartScreen 對「下載次數少、沒有程式碼簽章、尚未累積信譽」的常見警告，不一定代表檔案有毒。短期處理方式：

1. 確認 EXE 是從本 repo 的 GitHub Releases 下載。
2. 在 SmartScreen 視窗點「其他資訊」。
3. 點「仍要執行」。

長期要降低這個警告，需要使用程式碼簽章憑證簽署 Windows EXE，並讓該簽章累積下載與執行信譽。只改檔名、README 或重新打包通常不能消除 SmartScreen。

## 本機開發

```powershell
npm install
npm start
```

## 本機打包

```powershell
npm run dist:win
```

或直接執行：

```powershell
.\build-portable.bat
```

建置完成後，根目錄會產生：

```text
Claude Usage Widget.exe
```

## 功能摘要

- 讀取本機 Claude / Codex 使用狀態。
- 顯示 session / weekly 用量與倒數。
- 可設定顯示項目、寬度、透明度與輪詢間隔。
- Windows tray 常駐，適合放在桌面邊緣監看。

## 設定檔

設定檔位於：

```text
%APPDATA%\claude-usage-widget\settings.json
```

常見設定包含 `panelWidth`、`showClaude`、`showCodex`、`pollMinutes`、`displayCurrency` 等。

## 專案結構

```text
main.js                  Electron main process、資料讀取、視窗與 tray
preload.js               IPC bridge
renderer/                Widget UI
assets/                  圖示資源
scripts/copy-release-exe.js
                         將 dist 產物複製成穩定檔名，供 Release 上傳
.github/workflows/       GitHub Actions Windows Release 建置流程
```
