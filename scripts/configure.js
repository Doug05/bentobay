#!/usr/bin/env node
// Interactive setup for the values that start out as placeholders. Press Enter to keep the value in [brackets] or to skip.
// Writes your details into package.json, LICENSE and README.md, and (optionally) your Google client file outside the repo.
const fs = require('fs'), path = require('path'), os = require('os'), readline = require('readline'), { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);

const gh = (...a) => { const r = spawnSync('gh', a, { encoding: 'utf8' }); return r.status === 0 ? (r.stdout || '').trim() : ''; };
const pj = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const isPlaceholder = (v) => !v || /YOUR_USER|contributors|noreply@users/.test(v);
const repoNow = (typeof pj.repository === 'string' ? pj.repository : '').replace(/^github:/, '').split('/');
const ghLogin = gh('api', 'user', '--jq', '.login'), ghId = gh('api', 'user', '--jq', '.id'), ghName = gh('api', 'user', '--jq', '.name');

function userData() {
  const n = 'BentoBay';
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), n);
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', n);
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), n);
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lines = []; let ended = false;
rl.on('line', (l) => lines.push(l)); rl.on('close', () => { ended = true; });
const ask = (q, def) => new Promise((res) => {
  process.stdout.write(q + (def ? ' [' + def + ']' : '') + ': ');
  const tryRead = () => { if (lines.length) { const a = lines.shift().trim(); process.stdout.write('\n'); res(a || def || ''); } else if (ended) res(def || ''); else setTimeout(tryRead, 20); };
  tryRead();
});

(async () => {
  console.log('\n BentoBay setup: fill in your details\n ------------------------------------');
  console.log(' Press Enter to keep the value in [brackets] or to skip a question.\n');

  const cur = { user: !isPlaceholder(repoNow[0]) ? repoNow[0] : ghLogin, repo: repoNow[1] || 'bentobay',
    name: !isPlaceholder(pj.author && pj.author.name) ? pj.author.name : (ghName && ghName !== 'null' ? ghName : ghLogin),
    email: !isPlaceholder(pj.author && pj.author.email) ? pj.author.email : (ghId && ghLogin ? ghId + '+' + ghLogin + '@users.noreply.github.com' : '') };

  const user = await ask('GitHub username', cur.user);
  const repo = await ask('Repository name', cur.repo);
  const name = await ask('Your name (shown as author and in the license)', cur.name);
  console.log('   The email goes into installers and commits. Your GitHub no-reply address is a safe choice.');
  const email = await ask('Email', cur.email);

  const gfile = path.join(userData(), 'google-client.json');
  let g = {}; try { g = JSON.parse(fs.readFileSync(gfile, 'utf8')); } catch (e) {}
  console.log('\n Optional: Google sign-in to auto-detect your AI tools (see README, "Detecting your tools with Google").');
  const cid = await ask('Google OAuth Client ID', g.client_id || '');
  const csec = await ask('Google OAuth Client secret (not confidential for desktop apps)', g.client_secret || '');
  rl.close();

  const done = [], todo = [];
  if (user) { pj.repository = 'github:' + user + '/' + repo; pj.homepage = 'https://github.com/' + user + '/' + repo; pj.bugs = { url: 'https://github.com/' + user + '/' + repo + '/issues' }; done.push('Repository link: ' + user + '/' + repo); } else todo.push('GitHub username');
  if (name || email) { pj.author = { name: name || (pj.author && pj.author.name) || '', email: email || (pj.author && pj.author.email) || '' }; done.push('Author: ' + pj.author.name + (pj.author.email ? ' <' + pj.author.email + '>' : '')); }
  if (!email) todo.push('Author email (needed for Linux packages)');
  fs.writeFileSync('package.json', JSON.stringify(pj, null, 2) + '\n');

  if (name && fs.existsSync('LICENSE')) {
    const lic = fs.readFileSync('LICENSE', 'utf8').replace(/^Copyright \(c\) .*$/m, 'Copyright (c) ' + new Date().getFullYear() + ' ' + name);
    fs.writeFileSync('LICENSE', lic); done.push('License holder: ' + name);
  }
  if (user && fs.existsSync('README.md')) {
    fs.writeFileSync('README.md', fs.readFileSync('README.md', 'utf8').split('YOUR_USER/bentobay').join(user + '/' + repo).split('YOUR_USER').join(user));
    done.push('README links');
  }
  if (cid) {
    fs.mkdirSync(path.dirname(gfile), { recursive: true });
    fs.writeFileSync(gfile, JSON.stringify({ client_id: cid, client_secret: csec || '' }, null, 2));
    done.push('Google client saved to ' + gfile + ' (outside the repo, never committed)');
  } else todo.push('Google client ID (only for auto-detecting tools; manual setup works without it)');

  console.log('\n Done:'); done.forEach((d) => console.log('   + ' + d));
  todo.push('Your Anthropic API key (optional): enter it inside the app, Settings > Companion, so it is stored encrypted');
  todo.push('App screenshots for the README, and check the name is free on GitHub, npm and trademarks');
  console.log('\n Still yours to add:'); todo.forEach((t) => console.log('   - ' + t));
  console.log('\n Next: publish with push-private, or build the installer with build-installer.\n');
})();
