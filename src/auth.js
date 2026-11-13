// Google OAuth for desktop: system browser + loopback redirect + PKCE. Tokens are encrypted with the OS keychain via safeStorage.
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const { app, shell, safeStorage } = require('electron');
const SCOPES = 'openid email https://www.googleapis.com/auth/gmail.readonly';
const tokFile = () => path.join(app.getPath('userData'), 'google.tok');
const b64 = (b) => b.toString('base64url');

function client() {
  if (process.env.GOOGLE_CLIENT_ID) return { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET || '' };
  try {
    const j = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'google-client.json'), 'utf8'));
    return { id: j.client_id, secret: j.client_secret || '' };
  } catch { return null; }
}
function readTok() {
  try { const raw = fs.readFileSync(tokFile()); return JSON.parse(safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString()); }
  catch { return null; }
}
function writeTok(t) {
  const s = JSON.stringify(t);
  fs.writeFileSync(tokFile(), safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(s) : s);
}
async function tokenCall(body, c) {
  const p = new URLSearchParams({ client_id: c.id, ...(c.secret ? { client_secret: c.secret } : {}), ...body });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: p });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error_description || j.error || 'Token request failed');
  return j;
}

async function signIn() {
  const c = client();
  if (!c || !c.id) throw new Error('NO_CLIENT');
  const verifier = b64(crypto.randomBytes(32)), state = b64(crypto.randomBytes(16));
  const challenge = b64(crypto.createHash('sha256').update(verifier).digest());
  let port;
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { srv.close(); reject(new Error('Sign-in timed out')); }, 180000);
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/cb') { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<body style="font-family:system-ui;text-align:center;margin-top:20vh">Signed in. You can close this tab and return to the app.</body>');
      clearTimeout(timer); srv.close();
      if (u.searchParams.get('state') === state && u.searchParams.get('code')) resolve(u.searchParams.get('code'));
      else reject(new Error('Sign-in cancelled'));
    });
    srv.listen(0, '127.0.0.1', () => {
      port = srv.address().port;
      const q = new URLSearchParams({ client_id: c.id, redirect_uri: `http://127.0.0.1:${port}/cb`, response_type: 'code', scope: SCOPES, state, code_challenge: challenge, code_challenge_method: 'S256', access_type: 'offline', prompt: 'consent' });
      shell.openExternal('https://accounts.google.com/o/oauth2/v2/auth?' + q);
    });
  });
  const t = await tokenCall({ code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: `http://127.0.0.1:${port}/cb` }, c);
  const info = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + t.access_token } })).json();
  writeTok({ access: t.access_token, refresh: t.refresh_token, exp: Date.now() + t.expires_in * 1000, email: info.email });
}
async function getAccessToken() {
  const t = readTok(), c = client();
  if (!t || !c) return null;
  if (t.exp > Date.now() + 60000) return t.access;
  const r = await tokenCall({ grant_type: 'refresh_token', refresh_token: t.refresh }, c);
  writeTok({ ...t, access: r.access_token, exp: Date.now() + r.expires_in * 1000 });
  return r.access_token;
}
function status() { const t = readTok(), c = client(); return { configured: !!(c && c.id), signedIn: !!t, email: t ? t.email : '' }; }
async function signOut() {
  const t = readTok();
  if (t && t.refresh) fetch('https://oauth2.googleapis.com/revoke?token=' + t.refresh, { method: 'POST' }).catch(() => {});
  try { fs.unlinkSync(tokFile()); } catch {}
}
module.exports = { signIn, signOut, getAccessToken, status };
