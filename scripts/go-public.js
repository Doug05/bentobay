#!/usr/bin/env node
// Cross-platform: scan for secrets, then make the BentoBay repo PUBLIC (open source).
const { spawnSync } = require('child_process');
const readline = require('readline');
const path = require('path');
process.chdir(path.resolve(__dirname, '..'));
let REPO = 'bentobay';
try { const m = /\/([^/]+?)(\.git)?$/.exec(require('../package.json').repository || ''); if (m) REPO = m[1]; } catch (e) {}
const run = (cmd, args, inherit) => { const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'] }); return { ok: r.status === 0, out: (r.stdout || '').trim(), missing: !!(r.error && r.error.code === 'ENOENT') }; };
const die = (m) => { console.error('\n' + m + '\n'); process.exit(1); };

console.log('\n BentoBay: make the repo PUBLIC (open source)\n --------------------------------------------');
if (run('gh', ['--version']).missing) die('GitHub CLI is not installed (https://cli.github.com).');
const login = run('gh', ['api', 'user', '--jq', '.login']).out;
if (!login) die('Could not read your GitHub account. Try: gh auth login');
if (!run('gh', ['repo', 'view', login + '/' + REPO]).ok) die('Repo ' + login + '/' + REPO + ' was not found. Run push-private first.');

// Patterns for common key formats. This script and the old go-public.bat are excluded because they contain the patterns as text.
const pat = ['sk-ant-[A-Za-z0-9]', 'ghp_[A-Za-z0-9]', 'github_pat_', 'AIza[0-9A-Za-z_-]{20}', 'GOCSPX-'].join('|');
const skip = [':(exclude)scripts/go-public.js', ':(exclude)go-public.bat'];
console.log('Scanning files for secrets...');
if (run('git', ['grep', '-q', '-I', '-E', pat, '--', '.'].concat(skip)).ok) die('Possible secret found in your files. Aborting.\nSee it with: git grep -n -I -E "sk-ant-|ghp_|github_pat_|AIza|GOCSPX-"');
console.log('Scanning git history for secrets...');
if (run('git', ['log', '--all', '--format=%h', '-G', pat, '--', '.'].concat(skip)).out) die('Possible secret found in git history. Aborting. Clean the history before going public.');
console.log('No secrets found.\n');
console.log(' This makes ' + login + '/' + REPO + ' PUBLIC. Anyone can read the code and the full git history.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Type PUBLIC to continue: ', (a) => {
  rl.close();
  if (a.trim().toUpperCase() !== 'PUBLIC') { console.log('Cancelled. Nothing changed.'); process.exit(0); }
  const e = run('gh', ['repo', 'edit', login + '/' + REPO, '--visibility', 'public', '--accept-visibility-change-consequences',
    '--description', 'One native desktop bay for all your AI tools', '--add-topic', 'electron', '--add-topic', 'ai', '--add-topic', 'productivity', '--add-topic', 'desktop-app', '--add-topic', 'llm'], true);
  if (!e.ok) die('Could not change visibility. See the message above.');
  console.log('\nBentoBay is now public: https://github.com/' + login + '/' + REPO + '\nNext: tag a release so installers get built: git tag v0.4.0 && git push --tags\n');
});
