const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const fileName = 'Claude Usage Widget.exe';
const distDir = path.join(rootDir, 'dist');
const preferredSource = path.join(distDir, fileName);
const target = path.join(rootDir, fileName);

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

fs.copyFileSync(source, target);
console.log(`Release EXE copied to ${target}`);
