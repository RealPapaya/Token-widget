const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const fileName = 'usage widget.exe';
const legacyFileName = 'Claude Usage Widget.exe';
const distDir = path.join(rootDir, 'dist');
const preferredSource = path.join(distDir, fileName);
const target = path.join(rootDir, fileName);
const legacyTarget = path.join(rootDir, legacyFileName);
const legacyDistTarget = path.join(distDir, legacyFileName);

let source = preferredSource;
if (!fs.existsSync(source)) {
  const exeFiles = fs.existsSync(distDir)
    ? fs.readdirSync(distDir).filter((entry) => entry.toLowerCase().endsWith('.exe'))
    : [];

  if (exeFiles.length !== 1) {
    console.error(`Missing build output: ${preferredSource}`);
    if (exeFiles.length > 1) {
      console.error(`Found multiple EXE files in ${distDir}: ${exeFiles.join(', ')}`);
    }
    process.exit(1);
  }

  source = path.join(distDir, exeFiles[0]);
}

if (!fs.existsSync(source)) {
  console.error(`Missing build output: ${source}`);
  process.exit(1);
}

function stopRunningTargetExe(exePath) {
  if (process.platform !== 'win32') return false;
  const escapedPath = path.resolve(exePath).replace(/'/g, "''");
  const ps = [
    `$target = [System.IO.Path]::GetFullPath('${escapedPath}')`,
    '$procs = Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and ([System.IO.Path]::GetFullPath($_.ExecutablePath) -ieq $target) }',
    'foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force }',
    'if ($procs) { Write-Output ($procs.ProcessId -join ",") }',
  ].join('; ');
  const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', ps], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
  if (output) console.log(`Stopped running release EXE process(es): ${output}`);
  return Boolean(output);
}

function copyReleaseExe(sourcePath, targetPath) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      fs.copyFileSync(sourcePath, targetPath);
      return;
    } catch (err) {
      if (!['EBUSY', 'EPERM'].includes(err && err.code) || attempt === 2) throw err;
      if (!stopRunningTargetExe(targetPath)) throw err;
    }
  }
}

copyReleaseExe(source, target);
for (const oldPath of [legacyTarget, legacyDistTarget]) {
  if (fs.existsSync(oldPath)) fs.rmSync(oldPath);
}
console.log(`Release EXE copied to ${target}`);
