#!/usr/bin/env node
// Cross-platform (Windows, macOS, Linux): push BentoBay to a PRIVATE GitHub repo, creating it if needed.
// Needs: Node.js, git, and the GitHub CLI (gh). Usage: node scripts/push-private.js ["commit message"]
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
process.chdir(root);

function run(cmd, args, o) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', stdio: o && o.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'] });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: (r.stderr || '').trim(), missing: !!(r.error && r.error.code === 'ENOENT') };
}
const git = (...a) => run('git', a);
const gh = (...a) => run('gh', a);
const die = (m) => { console.error('\n' + m + '\n'); process.exit(1); };
const same = (a, b) => { try { return fs.realpathSync(a).toLowerCase() === fs.realpathSync(b).toLowerCase(); } catch { return false; } };

console.log('\n BentoBay: push to GitHub (private)\n ----------------------------------');
if (git('--version').missing) die('Git is not installed.\n  Windows: winget install Git.Git\n  macOS:   xcode-select --install\n  Linux:   sudo apt install git (or your package manager)');
if (gh('--version').missing) die('GitHub CLI is not installed.\n  Windows: winget install GitHub.cli\n  macOS:   brew install gh\n  Linux:   https://github.com/cli/cli#installation');
if (!gh('auth', 'status').ok) { console.log('Signing in to GitHub...'); run('gh', ['auth', 'login'], { inherit: true }); }
const login = gh('api', 'user', '--jq', '.login').out, id = gh('api', 'user', '--jq', '.id').out, realName = gh('api', 'user', '--jq', '.name').out;
if (!login || !id) die('Could not read your GitHub account. Try: gh auth login');
const display = realName && realName !== 'null' ? realName : login, noreply = id + '+' + login + '@users.noreply.github.com';
console.log('Signed in as ' + login);


// Fill in placeholders (username, author) so the repo and installers carry your real details.
const pj = JSON.parse(fs.readFileSync('package.json', 'utf8'));

let REPO = 'bentobay';
{
  const m = /\/([^/]+?)(\.git)?$/.exec(pj.repository || '');
  if (m) REPO = m[1];
}
if (typeof pj.repository === 'string') pj.repository = pj.repository.replace('YOUR_USER', login);
if (pj.author && typeof pj.author === 'object') {
  if (!pj.author.email || pj.author.email === 'bentobay@users.noreply.github.com') pj.author.email = noreply;
  if (pj.author.name === 'BentoBay contributors') pj.author.name = display;
}
fs.writeFileSync('package.json', JSON.stringify(pj, null, 2) + '\n');
if (fs.existsSync('README.md')) fs.writeFileSync('README.md', fs.readFileSync('README.md', 'utf8').split('YOUR_USER').join(login));

if (!fs.existsSync('.git')) { if (!git('init', '-b', 'main').ok) { git('init'); git('symbolic-ref', 'HEAD', 'refs/heads/main'); } }
const cn = git('config', 'user.name').out, ce = git('config', 'user.email').out;
if (!cn || cn === 'YourName') git('config', 'user.name', display);
if (!ce || ce === 'you@example.com') git('config', 'user.email', noreply);

const top = git('rev-parse', '--show-toplevel').out;
if (!top || !same(top, root)) die('Safety stop: git is working on "' + top + '" instead of this folder.\nA stray .git folder is probably in a parent folder (for example your user folder). Delete that .git folder and run this again.');

const url = 'https://github.com/' + login + '/' + REPO + '.git';
const exists = gh('repo', 'view', login + '/' + REPO).ok;
git('remote', 'remove', 'origin');
if (exists) {
  git('remote', 'add', 'origin', url);
  if (!git('fetch', 'origin').ok) die('Could not fetch from GitHub: ' + url);
  let b = gh('repo', 'view', login + '/' + REPO, '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name').out;
  if (!b || b === 'null') b = 'main';
  if (git('rev-parse', '--verify', '-q', 'origin/' + b).ok) {
    let needReset = false;
    if (git('symbolic-ref', '--short', 'HEAD').out !== b) { git('symbolic-ref', 'HEAD', 'refs/heads/' + b); needReset = true; }
    if (!git('rev-parse', '--verify', '-q', 'HEAD').ok || !git('merge-base', '--is-ancestor', 'origin/' + b, 'HEAD').ok) needReset = true;
    if (needReset) { console.log("Your local history is not based on GitHub's. Keeping the GitHub history and adding your files on top."); git('reset', 'origin/' + b); }
  }
}

git('add', '-A');
const staged = git('ls-files').out.split('\n').filter(Boolean).length;
if (staged > 300) { git('reset'); die('Safety stop: ' + staged + ' files are staged. That does not look like the BentoBay folder. Nothing was committed or pushed.'); }
if (!git('diff', '--cached', '--quiet').ok) {
  const c = run('git', ['commit', '-m', process.argv[2] || 'BentoBay update']);
  if (!c.ok) die('Commit failed: ' + c.err);
  console.log('Committed ' + staged + ' tracked files.');
} else console.log('No new changes to commit.');
if (!git('rev-parse', '--verify', '-q', 'HEAD').ok) die('Nothing to push: this folder has no files to commit.');

const p = exists ? run('git', ['push', '-u', 'origin', 'HEAD'], { inherit: true })
  : run('gh', ['repo', 'create', REPO, '--private', '--source=.', '--remote=origin', '--push'], { inherit: true });
if (!p.ok) die('Push failed. See the message above.\nIf it says updates were rejected, run this script again.');
console.log('\nDone. Private repo: https://github.com/' + login + '/' + REPO + '\nWhen you are ready to open source it, run go-public.\n');
