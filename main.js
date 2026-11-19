const { app, BrowserWindow, WebContentsView, ipcMain, shell, Tray, Menu, globalShortcut, nativeImage, dialog, clipboard, session, safeStorage } = require('electron');
const path = require('path'), fs = require('fs');
const auth = require('./src/auth');
const { scan } = require('./src/scanner');
const { CATALOG } = require('./src/catalog');

// Chrome-like UA without the "Electron" token (best effort: Google may still refuse sign-in inside embedded views).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const AUTH_HOSTS = ['accounts.google.com', 'login.microsoftonline.com', 'appleid.apple.com', 'github.com', 'auth0.com'];
const ICON = path.join(__dirname, 'assets', 'icon.png');

// Only our own UI (file://) may call the main process.
const _handle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (ch, fn) => _handle(ch, (e, ...a) => {
  if (!e.senderFrame || !e.senderFrame.url.startsWith('file://')) throw new Error('Untrusted sender');
  return fn(e, ...a);
});
app.on('web-contents-created', (_, wc) => wc.on('will-attach-webview', (e) => e.preventDefault()));

const okUrl = (u) => { try { const p = new URL(u).protocol; return p === 'https:' || p === 'http:'; } catch { return false; } };
const origin = (u) => { try { return new URL(u).origin; } catch { return ''; } };
// Third-party tools get no powerful permissions unless you approve (mic/camera/notifications are asked once per site).
const AUTO = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock']);
const ASK = new Set(['media', 'notifications']);
const asked = new Map();
function lockSession(ses, id) {
  ses.setPermissionRequestHandler(async (wc, perm, cb, d) => {
    if (AUTO.has(perm)) return cb(true);
    if (!ASK.has(perm)) return cb(false);
    const k = id + '|' + origin(d.requestingUrl) + '|' + perm;
    if (!asked.has(k)) {
      const r = await dialog.showMessageBox(win, { type: 'question', buttons: ['Allow', 'Block'], defaultId: 1, cancelId: 1,
        message: origin(d.requestingUrl) + ' wants to use your ' + (perm === 'media' ? 'microphone or camera' : perm) + '.' });
      asked.set(k, r.response === 0);
    }
    cb(asked.get(k));
  });
  ses.setPermissionCheckHandler((wc, perm, org) => AUTO.has(perm) || (ASK.has(perm) && asked.get(id + '|' + org + '|' + perm) === true));
}
let win, tray, quitting = false;
let prefs = { closeToTray: true, startMinimized: false, hotkey: 'CommandOrControl+Shift+Space' };
const views = new Map(), urls = new Map();
const stateFile = () => path.join(app.getPath('userData'), 'state.json');
const readState = () => { try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return null; } };

if (!app.requestSingleInstanceLock()) app.quit();
else app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });
app.setAppUserModelId('dev.opensource.bentobay');

function sendCmd(c) { if (win) win.webContents.send('cmd', c); }
let binds = { palette: 'Mod+Shift+P', settings: 'Mod+,', split: 'Mod+\\' };
const combo = (i) => {
  const m = []; if (i.control || i.meta) m.push('Mod'); if (i.alt) m.push('Alt'); if (i.shift) m.push('Shift');
  let k = i.key; if (k === ' ') k = 'Space'; else if (k.length === 1) k = k.toUpperCase();
  return m.concat(k).join('+');
};
function keys(wc) {
  wc.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    const c = combo(i); let cmd = null;
    for (const n of Object.keys(binds)) if (binds[n] === c) cmd = n;
    const d = c.match(/^Mod\+([1-9])$/); if (!cmd && d) cmd = 'tool:' + d[1];
    if (cmd) { e.preventDefault(); sendCmd(cmd); }
  });
}
function viewFor(id, url) {
  if (views.has(id)) return views.get(id);
  if (!okUrl(url)) return null;
  const v = new WebContentsView({ webPreferences: { partition: 'persist:' + id, sandbox: true, contextIsolation: true } });
  lockSession(v.webContents.session, id);
  v.webContents.on('will-navigate', (e, u) => { if (!okUrl(u)) e.preventDefault(); });
  v.webContents.setUserAgent(UA);
  v.webContents.setWindowOpenHandler(({ url: u }) => {
    try {
      const host = new URL(u).hostname;
      if (new URL(u).protocol === 'https:' && AUTH_HOSTS.some((h) => host === h || host.endsWith('.' + h))) return { action: 'allow' };
      if (/^https?:/.test(u)) shell.openExternal(u);
    } catch {}
    return { action: 'deny' };
  });
  keys(v.webContents);
  v.webContents.loadURL(url);
  v.setVisible(false);
  win.contentView.addChildView(v);
  views.set(id, v); urls.set(id, url);
  return v;
}
function toggleWin() { if (win.isVisible() && win.isFocused()) win.hide(); else { win.show(); win.focus(); } }
function hotkey(acc) { globalShortcut.unregisterAll(); try { return !!acc && globalShortcut.register(acc, toggleWin); } catch { return false; } }

function createWindow() {
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 960, minHeight: 620, show: false, backgroundColor: '#0e0f11', title: 'BentoBay', icon: ICON,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#141518', symbolColor: '#8b8d96', height: 48 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true }
  });
  win.setMenuBarVisibility(false);
  keys(win.webContents);
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.once('ready-to-show', () => { if (!(prefs.startMinimized && tray)) win.show(); });
  win.on('close', (e) => { if (prefs.closeToTray && !quitting && tray) { e.preventDefault(); win.hide(); } });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}
app.whenReady().then(() => {
  const ui = (perm) => perm === 'notifications' || perm === 'clipboard-sanitized-write';
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(ui(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => ui(perm));
  const s = readState(); if (s && s.prefs) { prefs = { ...prefs, ...s.prefs }; if (s.prefs.binds) binds = { ...binds, ...s.prefs.binds }; }
  try {
    tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 18, height: 18 }));
    tray.setToolTip('BentoBay');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Show BentoBay', click: () => { win.show(); win.focus(); } }, { label: 'Quit', click: () => { quitting = true; app.quit(); } }]));
    tray.on('click', () => { win.show(); win.focus(); });
  } catch { tray = null; }
  createWindow(); hotkey(prefs.hotkey);
});
app.on('activate', () => { if (win) { win.show(); win.focus(); } });
app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());

ipcMain.handle('catalog', () => CATALOG.map(({ domains, ...t }) => t));
ipcMain.handle('state:load', () => readState());
ipcMain.handle('state:save', (_, s) => { fs.writeFileSync(stateFile(), JSON.stringify(s)); });
ipcMain.handle('state:export', async (_, s) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: 'bentobay-backup.json' });
  if (!r.canceled && r.filePath) fs.writeFileSync(r.filePath, JSON.stringify(s, null, 2));
});
ipcMain.handle('state:import', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  try { return JSON.parse(fs.readFileSync(r.filePaths[0], 'utf8')); } catch { return null; }
});
ipcMain.handle('win:active', () => !!win && win.isVisible() && win.isFocused());
ipcMain.handle('prefs:apply', (_, p) => {
  prefs = { ...prefs, ...p }; if (p.binds) binds = { ...binds, ...p.binds };
  app.setLoginItemSettings({ openAtLogin: !!p.launchAtLogin });
  return hotkey(p.hotkey);
});
ipcMain.handle('chrome', (_, bg, fg) => { try { if (win.setTitleBarOverlay) win.setTitleBarOverlay({ color: bg, symbolColor: fg, height: 48 }); } catch {} });

ipcMain.handle('view:layout', (_, items) => {
  const ids = new Set(items.map((i) => i.id));
  for (const [k, v] of views) if (!ids.has(k)) v.setVisible(false);
  for (const i of items) { const v = viewFor(i.id, i.url); if (!v) continue; v.setBounds({ x: i.x, y: i.y, width: i.width, height: i.height }); v.setVisible(true); }
});
ipcMain.handle('view:hide', () => { for (const v of views.values()) v.setVisible(false); });
ipcMain.handle('view:warm', (_, items) => { for (const i of items) viewFor(i.id, i.url); });
ipcMain.handle('view:reload', (_, id) => { const v = views.get(id); if (v) v.webContents.loadURL(urls.get(id)); });
ipcMain.handle('view:remove', (_, id) => { const v = views.get(id); if (v) { win.contentView.removeChildView(v); v.webContents.close(); views.delete(id); urls.delete(id); } });
ipcMain.handle('view:snapshot', async (_, id) => { const v = views.get(id); if (!v) return null; try { return (await v.webContents.capturePage()).toDataURL(); } catch { return null; } });
ipcMain.handle('view:paste', (_, id, text) => { const v = views.get(id); if (!v) return; clipboard.writeText(text); v.webContents.focus(); setTimeout(() => v.webContents.paste(), 150); });
ipcMain.handle('sessions:clear', async (_, ids) => { await Promise.all(ids.map((id) => session.fromPartition('persist:' + id).clearStorageData())); for (const [k, v] of views) v.webContents.loadURL(urls.get(k)); });
ipcMain.handle('external', (_, u) => { if (/^https:\/\//.test(u)) shell.openExternal(u); });

const wrap = (fn) => async () => { try { return { ok: true, data: await fn() }; } catch (e) { return { ok: false, error: e.message }; } };
ipcMain.handle('g:status', () => auth.status());
ipcMain.handle('g:signin', wrap(auth.signIn));
ipcMain.handle('g:signout', wrap(auth.signOut));
ipcMain.handle('g:scan', wrap(scan));

// ---- Companion chat (bring your own Anthropic API key; key is encrypted with the OS keychain and never leaves main) ----
const keyFile = () => path.join(app.getPath('userData'), 'pet.key');
ipcMain.handle('secret:has', () => fs.existsSync(keyFile()));
ipcMain.handle('secret:set', (_, k) => {
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'OS keychain unavailable, key not saved' };
  fs.writeFileSync(keyFile(), safeStorage.encryptString(String(k).trim())); return { ok: true };
});
ipcMain.handle('secret:clear', () => { try { fs.unlinkSync(keyFile()); } catch {} });
ipcMain.handle('pet:chat', async (_, msgs, o) => {
  try {
    const key = safeStorage.decryptString(fs.readFileSync(keyFile()));
    const name = String(o.name || 'Miso').slice(0, 30), kind = String(o.kind || 'onigiri').slice(0, 20);
    const system = `You are ${name}, a small cheerful ${kind} companion living inside BentoBay, a desktop app that holds the user's AI tools. Your current mood is ${o.mood || 'happy'}. Reply in at most 60 words, warm and playful, never preachy. You may gently encourage healthy AI use but never lecture.` + (o.ctx ? ' Context about the user: ' + String(o.ctx).slice(0, 300) : '');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: o.model || 'claude-sonnet-5-5', max_tokens: 300, system, messages: msgs.slice(-12).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 2000) })) })
    });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: (j.error && j.error.message) || 'HTTP ' + r.status };
    return { ok: true, data: (j.content || []).map((b) => b.text || '').join('').trim() };
  } catch (e) { return { ok: false, error: e.message }; }
});
