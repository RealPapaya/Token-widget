@echo off
setlocal

cd /d "%~dp0"

if not exist "package.json" (
  echo package.json was not found. Please run this file from the widget folder.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run from source.
  echo For other computers, build and share the portable EXE with build-portable.bat.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

start "" /D "%~dp0" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0"
exit /b 0
