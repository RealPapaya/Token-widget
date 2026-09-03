# Project instructions - Claude Usage Widget

Global rules: read `C:\Users\morris_hsueh\.agents\institution\core-rules.md` first.
Everything below is project-specific and adds to those rules.

## Session Protocol
1. Before any work: read `LESSONS.md` in this directory.
2. Before writing code: apply institution `coding-rules.md`; keep diffs scoped and match neighboring style.
3. Use a separate plan review before changes touching more than 3 files, shared process boundaries, or hard-to-reverse behavior.
4. Before claiming done: verify with the command listed below or state why it could not run.
5. After any mistake, surprise, or confirmed win: append it to `LESSONS.md`; machine-global lessons go to `C:\Users\morris_hsueh\.agents\institution\lessons.md`.

## Project Specifics
- What this project is: Windows Electron desktop widget showing Claude Code, Codex, and API usage limits with countdown/status UI.
- Build: `npm run dist:win`
- Test: `node --check main.js; node --check preload.js; node --check renderer/renderer.js`
- Run locally: `npm start`
- Module convention: new renderer behavior belongs in `renderer/`; shared process files (`main.js`, `preload.js`, `renderer/renderer.js`, `renderer/style.css`) receive only focused integration changes.
- Do NOT touch without asking: release/signing automation, user credential/cache files under home directories, and global harness files outside this repo.
- Style anchors: `main.js` and `renderer/renderer.js`.

Legacy project docs: `CLAUDE.md` in this directory is kept as-is.
