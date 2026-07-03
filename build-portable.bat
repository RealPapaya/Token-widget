@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to build the portable EXE.
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

echo Building portable Windows EXE...
call npm.cmd run dist:win
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

echo.
echo Done. Open Claude Usage Widget.exe from this folder.
pause
