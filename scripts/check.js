// Portable syntax check used by CI and `npm run check`.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const files = ['main.js', 'preload.js'];
for (const d of ['src', 'renderer', 'scripts']) for (const f of fs.readdirSync(d)) if (f.endsWith('.js')) files.push(path.join(d, f));
for (const f of files) cp.execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
console.log('syntax ok (' + files.length + ' files)');
