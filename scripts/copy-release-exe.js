const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const fileName = 'Claude Usage Widget.exe';
const source = path.join(rootDir, 'dist', fileName);
const target = path.join(rootDir, fileName);

if (!fs.existsSync(source)) {
  console.error(`Missing build output: ${source}`);
  process.exit(1);
}

fs.copyFileSync(source, target);
console.log(`Release EXE copied to ${target}`);
