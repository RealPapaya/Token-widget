# Project Lessons - Claude Usage Widget

Append new lessons at the TOP, newest first, in this format:

```markdown
## <kebab-case-slug> (YYYY-MM-DD)
- Trap: <what goes wrong, 1-2 lines>
- Cost: <what it broke / time lost>
- Rule: <literal instruction that prevents it>
```

Wins use the same format with `Win:` / `Benefit:` / `Rule:` lines.

Machine-global lessons go to `C:\Users\morris_hsueh\.agents\institution\lessons.md` instead, with one pointer line here.

---

## box-shadow-in-a-tight-transparent-window-draws-a-box (2026-10-15)
- Trap: `.panel` / `.capsule` had `box-shadow`, but the transparent window is sized to the element (+4px height). The shadow filled the transparent area outside the rounded corners and got clipped by the window rectangle.
- Cost: The user saw a faint dark square frame behind the rounded widget.
- Rule: Don't put outer `box-shadow` on a surface that fills the window. If a shadow is ever wanted, the window must include transparent padding wide enough for the full blur.

## smoke-test-with-user-data-dir-instead-of-killing-the-widget (2026-10-15)
- Win: `electron . --user-data-dir=<scratch dir> --screenshot <png> [--collapsed]` gets its own single-instance lock and settings file, so the user's running widget (packaged `Claude Usage Widget.exe`) keeps running. Write `<scratch dir>/settings.json` first to test specific settings.
- Benefit: No need to stop and restart the user's widget for screenshots, and per-setting screenshots are easy.
- Rule: Use an isolated `--user-data-dir` for smoke tests. Stop the real widget only when the test needs real settings.

## sync-session-scans-freeze-the-widget-animations (2026-09-03)
- Trap: `pollNow()` re-parsed every Claude transcript and Codex rollout synchronously on every poll and every 立即更新. Measured 921ms of blocking main-process I/O here (226 rollouts / 376 MB + 32 transcripts / 22 MB). Because this widget runs with GPU compositing off (see `disable-gpu-for-transparent-widget`), nothing can fall back to a compositor thread, so a blocked process freezes the refresh spinner outright.
- Cost: The 立即更新 spin animation visibly stuttered for about a second on every refresh, and the cost grew with the user's session history.
- Rule: Session transcripts are append-only — cache each parse by `mtime`+`size` (one Map per source, since the prune step evicts anything absent from the scan that just ran) and `await` a yield every few files so window messages keep flowing. Never call a session breakdown from a rate-limit mapper or from `cachedUsagePayload()`; attach it in `pollNow()` instead.

## gpu-off-means-animation-cost-lands-on-the-main-thread (2026-09-03)
- Trap: With `disable-gpu-compositing`, CSS animations cannot be promoted to a compositor thread, so any renderer main-thread stall shows up as dropped animation frames. A forced reflow per gauge bar plus one `requestAnimationFrame` loop per percentage counter is enough to be visible.
- Cost: Bar and counter animations competed with the concurrently spinning refresh icon on every render.
- Rule: In this renderer, batch DOM write/read cycles — stage all "from" values, then do a single forced reflow and one shared rAF loop per render. Add `will-change` to elements with infinite animations so they get their own layer instead of repainting their parent.

## powershell-inline-cjk-literals-can-mojibake (2026-08-14)
- Trap: Even a .NET UTF-8 read/write fallback can corrupt newly inserted CJK when the PowerShell command itself carries raw non-ASCII literals through an incompatible command encoding.
- Cost: A narrowly edited documentation line becomes mojibake while surrounding UTF-8 content remains intact.
- Rule: In PowerShell fallback edits, construct new CJK text from Unicode code points or use apply_patch; verify inserted non-ASCII text with a UTF-8 read-back before continuing.

## unknown-claude-gauges-default-to-special (2026-08-14)
- Win: Recognizing ordinary Claude quotas by standard time-window naming while honoring the existing `ONE_TIME` set keeps known one-time credits visible and makes new campaign or unknown categories special automatically.
- Benefit: Turning off `顯示特殊分類` hides campaign or unknown categories such as Nimbus Quill while keeping one-time credits visible across the widget, notifications, and tray summary.
- Rule: Treat keys in `ONE_TIME` and standard time-window keys as ordinary; classify all remaining Claude gauge keys as special by default.

## codex-live-usage-endpoint-beats-rollout-rounding (2026-07-22)
- Win: The authenticated Codex `/wham/usage` endpoint reported the current 1-2% weekly usage while the newest rollout `rate_limits` snapshot still reported `used_percent: 0.0`.
- Benefit: The widget can show current Codex quota consumption instead of a misleading 0%, while retaining offline behavior.
- Rule: For ChatGPT-authenticated Codex usage, read the live `/wham/usage` response first and keep rollout snapshots only as the network/auth fallback.

## powershell-converttojson-escapes-package-scripts (2026-07-08)
- Trap: PowerShell 5 ConvertTo-Json escapes npm script && operators as \u0026\u0026 and can heavily reformat package.json.
- Cost: Platform packaging changes become noisy to review and the script text can be misread while debugging build commands.
- Rule: For package.json edits in this repo, prefer Node JSON.parse/stringify or exact anchor edits; avoid PowerShell ConvertTo-Json for npm scripts.

## powershell-js-regex-backslash-escaping (2026-07-07)
- Trap: PowerShell scripted edits that emit JavaScript regex literals can accidentally write `/[-\\s]+/g` when the intended regex is `/[-\s]+/g`.
- Cost: The code can pass syntax checks while changing runtime matching behavior for keys containing spaces.
- Rule: After scripted edits that touch JS regex literals, inspect the diff for single-vs-double backslashes and run a targeted `rg` read-back before verification.

## apply-patch-may-hit-windows-sandbox-logon-error (2026-07-07)
- Trap: The harness apply_patch tool can fail in this workspace with `CreateProcessWithLogonW failed: 1385` before reading editable project files.
- Cost: A normal patch path can stall even when the intended edit is small and inside the writable repo.
- Rule: If apply_patch hits the Windows sandbox logon error, use small verified .NET UTF-8 read/write anchors, require every anchor to match before writing, then inspect `git diff` and run the narrow syntax checks.
## release-workflow-asset-name-matches-builder-output (2026-07-07)
- Win: GitHub Actions release assets now use the same `usage widget.exe` name produced by electron-builder and copied to the repo root.
- Benefit: Main/master pushes can update the fixed `latest` Release without failing on a missing legacy `Claude Usage Widget.exe` path.
- Rule: When changing `build.win.artifactName` or `scripts/copy-release-exe.js` output names, update `.github/workflows/release-windows.yml` asset paths and README download text in the same change.
## powershell-scripted-edits-need-small-verified-anchors (2026-07-07)
- Trap: Large PowerShell replacement scripts are easy to break with quoting, regex escaping, or same-line comments even when the intended edit is small.
- Cost: Failed scripted edits waste time and can risk partial changes if writes are not delayed until all anchors pass.
- Rule: For this repo, use small checked anchors, write only after every anchor matches, and immediately inspect `git diff` plus `node --check` for touched JS.

## verify-scripted-replace-insertions (2026-07-07)
- Trap: Scripted exact-string replacements can partially apply, replacing a call site while missing the helper insertion when line endings or anchors differ.
- Cost: The file can pass `node --check` but still fail at runtime with an undefined helper.
- Rule: After any scripted replacement, read back the diff for both the call site and inserted definition; add a small runtime smoke test when the change introduces a helper.

## root-release-exe-locks-copy-step (2026-07-07)
- Trap: If `usage widget.exe` is still running from the project root, a plain copy over that EXE fails with `EBUSY`.
- Cost: `npm run dist:win` used to appear to fail after packaging succeeded, leaving the updated portable EXE only in `dist`.
- Rule: Keep `scripts/copy-release-exe.js` responsible for handling this: on `EBUSY`/`EPERM`, stop only the running root `usage widget.exe` process, then retry the copy.

## powershell-selectobject-sandbox-read-failure (2026-07-06)
- Trap: Get-Content | Select-Object -Skip style reads can hit sandbox CreateProcessWithLogonW failed: 1385 in this workspace even when narrower `rg -n -C` reads succeed.
- Cost: It blocks review-context gathering and wastes time on a tooling path that looks valid but is unreliable here.
- Rule: For line-range reads in this repo, prefer `rg -n -C` or other single-process reads before falling back to heavier PowerShell pipelines.


## mixed-line-endings-break-exact-powershell-anchors (2026-07-06)
- Trap: `renderer/style.css` can contain mixed LF/CRLF, so exact PowerShell string anchors may miss valid CSS blocks.
- Cost: A scoped UI edit stalled on anchor mismatches even though the target rules existed.
- Rule: For fallback patch scripts in this repo, use regex anchors with `\r?\n` for CSS; never pipe through `Get-Content | Set-Content`.

## transparent-widget-hide-taskbar-button (2026-07-06)
- Win: Creating the BrowserWindow with `show: false`, setting `skipTaskbar`, then calling `setSkipTaskbar(true)` again before `show()` leaves the packaged widget without a Windows taskbar main window.
- Benefit: The app can live as a tray widget instead of appearing as a normal `.exe` button on the bottom taskbar.
- Rule: For this frameless tray widget, keep taskbar hiding both in BrowserWindow options and in the show/re-show paths.

## windows-run-autostart-paths-need-quotes (2026-07-06)
- Trap: Windows `Run` registry values are command-line strings; an exe path with spaces must be quote-wrapped even when the path itself is correct.
- Cost: The Run key can point at `D:\Google AI\Token widget\usage widget.exe`, but login parses it incorrectly and the widget never appears after reboot.
- Rule: For portable packaged autostart, verify the actual `HKCU\...\Run` value is `"<stable exe path>"`, not just that the value exists.

## portable-autostart-needs-stable-exe-path (2026-07-06)
- Trap: `app.setLoginItemSettings({ openAtLogin })` in an electron-builder portable app can register the extracted/runtime executable instead of the stable user-facing EXE.
- Cost: The setting appears enabled, but Windows reboot/login does not relaunch the widget.
- Rule: For packaged portable builds, pass an explicit login item `name`, stable `path` from `PORTABLE_EXECUTABLE_FILE`/portable directory, empty `args`, and clear legacy Electron/TEMP Run keys.

## app-icon-from-user-source (2026-07-06)
- Win: `assets/app.ico` is generated from `assets/app-source.png` with background-key transparency, while `assets/tray.png` remains generated separately.
- Benefit: User-provided EXE icon art survives future `npm run gen-icon` runs instead of being overwritten by the tray icon generator.
- Rule: Keep app icon source art in repo and verify ICO transparency by extracting the PNG entry, not by relying only on `Icon.ToBitmap()`.

## package-icon-and-artifact-name (2026-07-06)
- Win: The release artifact is now named `usage widget.exe` and uses `assets/app.ico` generated from the same starburst asset as the tray icon.
- Benefit: VBS/BAT launchers, root release copy, and dist output all point at the same user-facing EXE name and icon.
- Rule: When renaming packaged artifacts, update electron-builder `artifactName`, release-copy script, and launcher targets together; verify the associated icon from the built EXE.

## launcher-prefers-packaged-exe (2026-07-06)
- Win: `start-widget.vbs` and `start-widget.bat` now prefer `Claude Usage Widget.exe` when it exists, falling back to source Electron only for development.
- Benefit: The shortcut path uses the same packaged runtime as the manually verified EXE, avoiding unstable source-mode rendering on this machine.
- Rule: User-facing launchers should start the packaged EXE first; keep source Electron as a fallback, not the default.

## disable-gpu-for-transparent-widget (2026-07-06)
- Trap: Windows transparent frameless Electron windows can render visually corrupted on some GPU/driver combinations even when DOM text and capture smoke tests are otherwise healthy.
- Cost: The widget opens but appears broken to the user.
- Rule: For this lightweight transparent widget, call `app.disableHardwareAcceleration()` and append `disable-gpu-compositing` before creating windows.

## portable-exe-screenshot-args-unreliable (2026-07-06)
- Trap: The electron-builder portable EXE may launch and exit without writing the app's `--screenshot` output where expected.
- Cost: A smoke test can be misread as successful if only the exit code is checked.
- Rule: After any screenshot smoke test, explicitly verify the PNG exists and has nonzero size.

## guard-destroyed-browserwindow (2026-07-06)
- Trap: A stale BrowserWindow reference can remain after the window is destroyed; second-instance, tray, or menu handlers that only check `win` can throw `TypeError: Object has been destroyed`.
- Cost: Launching the portable EXE can show a main-process JavaScript error and leave the widget unusable until old processes are cleared.
- Rule: Before calling BrowserWindow methods from lifecycle, tray, or single-instance handlers, require `win && !win.isDestroyed()`; recreate the window when needed.

## pin-electron-for-builder (2026-07-06)
- Trap: electron-builder rejects a ranged Electron devDependency such as `^33.0.0` when computing the packaged Electron version.
- Cost: `npm run dist:win` fails before producing the portable EXE.
- Rule: Keep `package.json` and `package-lock.json` pinned to the installed Electron version used for packaging.
