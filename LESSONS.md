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
