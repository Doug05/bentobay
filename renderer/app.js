/* BentoBay app shell: rendering, navigation, modals, palette, events */
let lastPage = '', editing = null, editingP = null, det = {}, pal = { q: '', i: 0 }, palOpen = false;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const TITLES = { home: ['Dashboard', 'Credits, spend and renewals at a glance'], settings: ['Settings', 'Make BentoBay yours'], prompts: ['Prompt library', 'Save once, send to any tool'], wrapped: ['Wrapped', 'Your AI habits, Spotify-style'] };

function renderNav() {
  $('#nav').innerHTML = '<button class="item ' + (active === 'home' ? 'on' : '') + '" data-go="home">' + svgi(ICO_HOME) + '<span class="lbl">Dashboard</span></button>' +
    vis().map((t, i) => '<button class="item ' + (active === t.id ? 'on' : '') + '" data-go="' + esc(t.id) + '" title="' + esc(t.name) + '">' + tile(t) + '<span class="lbl grow"><span class="nm">' + esc(t.name) + '</span><span class="sub2">' + (t.total > 0 ? Math.round(100 - pct(t)) + '% left' : (t.plan ? esc(t.plan) : '')) + '</span></span>' + (i < 9 ? '<kbd>' + MOD + (i + 1) + '</kbd>' : '') + '</button>').join('');
  document.querySelectorAll('.sb-bottom .item').forEach((b) => b.classList.toggle('on', b.dataset.go === active));
}
function renderTop() {
  const t = get(active), el = $('#top');
  if (t) {
    const s = split && get(split), r = rescue(t);
    el.innerHTML = '<div class="ttl">' + tile(t) + '<div><h2>' + esc(t.name) + (s ? ' · ' + esc(s.name) : '') + '</h2><div class="sub">' + (t.plan ? esc(t.plan) : 'Plan not set') + (t.notes ? ' · ' + esc(t.notes) : '') + '</div></div></div><div class="meter">' + meter(t) + '</div>' +
      (r ? '<button class="chip warn" data-go="' + esc(r.id) + '">Nearing limit · try ' + esc(r.name) + '</button>' : '') + '<span class="chip" id="usechip">' + chipText() + '</span>' +
      '<div class="tb"><button class="btn ghost" data-act="split">Split</button><button class="btn ghost" data-act="manual">Manual</button><button class="btn ghost" data-act="edit">Usage</button><button class="btn ghost" data-act="reload">Reload</button></div>';
  } else { const x = TITLES[active] || TITLES.home; el.innerHTML = '<div class="ttl"><div><h2>' + x[0] + '</h2><div class="sub">' + x[1] + '</div></div></div>'; }
}
function render() {
  renderNav(); renderTop(); renderPet();
  const pg = $('#page'), st = lastPage === active ? pg.scrollTop : 0;
  if (isTool()) pg.style.display = 'none';
  else {
    pg.style.display = 'block';
    pg.innerHTML = active === 'settings' ? settingsPage() : active === 'prompts' ? promptsPage() : active === 'wrapped' ? wrappedPage() : home();
    pg.scrollTop = st; if (active === 'settings') filt(); if (active === 'prompts') filtP();
  }
  lastPage = active;
  const b = isTool() ? blockedReason() : null, lk = $('#lock');
  lk.style.display = b ? 'flex' : 'none'; if (b) lk.innerHTML = lockHTML(b);
  if (!modal) $('#snap').innerHTML = '';
  place();
}
function place() {
  if (!isTool() || modal || blockedReason()) { api.view.hide(); return; }
  const r = $('#stage').getBoundingClientRect(), a = get(active), b = split && get(split), X = Math.round(r.x), Y = Math.round(r.y), W = Math.round(r.width), H = Math.round(r.height);
  if (b) { const h = Math.floor(W / 2); layout = [{ id: a.id, url: a.url, x: X, y: Y, width: h - 1, height: H, rx: 0 }, { id: b.id, url: b.url, x: X + h + 1, y: Y, width: W - h - 1, height: H, rx: h + 1 }]; }
  else layout = [{ id: a.id, url: a.url, x: X, y: Y, width: W, height: H, rx: 0 }];
  api.view.layout(layout);
}
new ResizeObserver(() => place()).observe($('#stage'));
window.addEventListener('resize', place);

async function lockStage() {
  if (!isTool() || !layout.length) return;
  const imgs = await Promise.all(layout.map((l) => api.view.snapshot(l.id)));
  $('#snap').innerHTML = layout.map((l, i) => imgs[i] ? '<img src="' + imgs[i] + '" style="left:' + l.rx + 'px;width:' + l.width + 'px;height:' + l.height + 'px">' : '').join('');
}
async function openModal(html, cls) {
  if (!modal && !blockedReason()) await lockStage();
  modal = true; $('#modal').className = 'modal on ' + (cls || ''); $('#sheet').innerHTML = html; place();
}
function closeModal() { modal = false; palOpen = false; $('#modal').className = 'modal'; place(); setTimeout(() => { if (!modal) $('#snap').innerHTML = ''; }, 120); }

function goTo(id) {
  if (id === active) return;
  if (get(id) && get(active)) S.stats.switches++;
  if (get(id)) { const d = dk(), u = S.usage[d] || (S.usage[d] = { t: {}, h: {}, o: {} }); u.o[id] = (u.o[id] || 0) + 1; S.last = id; }
  if (get(active)) prev = active;
  if (split === id || !get(id)) split = null;
  active = id; dirty = true; render();
}
function toggleSplit() {
  if (!isTool()) return;
  if (split) split = null;
  else { const o = prev && prev !== active && get(prev) && !get(prev).hidden ? prev : (vis().find((t) => t.id !== active) || {}).id; split = o || null; }
  render();
}
function warm() { if (S.prefs.keepWarm) api.view.warm(vis().map((t) => ({ id: t.id, url: t.url }))); }
function applyPrefs() {
  const p = S.prefs, d = document.documentElement;
  const light = p.theme === 'light' || (p.theme === 'system' && matchMedia('(prefers-color-scheme: light)').matches);
  d.dataset.theme = light ? 'light' : 'dark'; d.style.setProperty('--acc', p.accent);
  document.body.classList.toggle('icons', p.sidebar === 'icons'); document.body.classList.toggle('noanim', !!p.reduceMotion);
  document.body.style.fontSize = p.density === 'compact' ? '12.5px' : '';
  api.prefs.apply(p).then((ok) => { hkOk = ok; });
  const cs = getComputedStyle(d); api.chrome(cs.getPropertyValue('--panel').trim(), cs.getPropertyValue('--mute').trim());
}
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (S.prefs.theme === 'system') applyPrefs(); });

/* ---------- command palette ---------- */
function palItems() {
  const q = pal.q.toLowerCase(), t = get(active), it = [];
  vis().forEach((x) => it.push({ k: 'tool:' + x.id, label: 'Open ' + x.name, sub: x.notes || x.plan || '', c: x.color }));
  if (t) vis().filter((x) => x.id !== active).forEach((x) => it.push({ k: 'split:' + x.id, label: 'Split with ' + x.name, sub: 'Side by side', c: x.color }));
  if (split) it.push({ k: 'unsplit', label: 'Close split view' });
  it.push({ k: 'home', label: 'Dashboard' }, { k: 'wrapped', label: 'Wrapped', sub: 'Your usage stats' }, { k: 'prompts', label: 'Prompt library' }, { k: 'settings', label: 'Settings' },
    { k: 'manual', label: 'Start manual power session', sub: 'Pause AI and think it through' }, { k: 'limiter', label: (S.prefs.limiter ? 'Turn off' : 'Turn on') + ' usage limiter' }, { k: 'chat', label: 'Chat with ' + S.pet.name, sub: 'Companion' }, { k: 'pick', label: 'Detect or add tools' });
  return it.filter((i) => (i.label + ' ' + (i.sub || '')).toLowerCase().includes(q));
}
async function openPal() { pal = { q: '', i: 0 }; await openModal('<input id="pq" class="pin" placeholder="Search tools and actions…"><div id="pl"></div>', 'pal'); palOpen = true; $('#pq').focus(); drawPal(); }
function drawPal() {
  const it = palItems(); pal.i = Math.min(pal.i, Math.max(0, it.length - 1));
  $('#pl').innerHTML = it.map((x, i) => '<div class="pi ' + (i === pal.i ? 'on' : '') + '" data-pk="' + esc(x.k) + '"><span class="dot" style="background:' + esc(x.c || 'var(--mute)') + '"></span><span class="grow">' + esc(x.label) + '</span><span class="sub">' + esc(x.sub || '') + '</span></div>').join('') || '<div class="sub" style="padding:14px">No matches</div>';
}
function runPal(k) {
  closeModal(); const p = k.split(':'), a = p[0], b = p[1];
  if (a === 'tool') goTo(b); else if (a === 'split') { split = b; render(); } else if (k === 'unsplit') { split = null; render(); }
  else if (['home', 'settings', 'prompts', 'wrapped'].indexOf(k) >= 0) goTo(k); else if (k === 'manual') manualModal();
  else if (k === 'limiter') { S.prefs.limiter = !S.prefs.limiter; applyPrefs(); save(); render(); } else if (k === 'pick') pickerModal(); else if (k === 'chat') chatModal();
}

/* ---------- picker (Google detect or manual) ---------- */
function pickerModal(msg) {
  const gb = g.signedIn ? '<div class="sub">Connected as ' + esc(g.email) + '</div><button class="btn" data-act="scan" style="margin-top:8px">Rescan Gmail receipts</button>' :
    g.configured ? '<button class="btn p" data-act="gin">Sign in with Google to detect my tools</button><div class="sub" style="margin-top:6px">Looks for AI subscription receipts (read-only, processed on this device).</div>' :
      '<div class="msg">Google sign-in is not configured yet (see README). You can still choose tools manually.</div>';
  openModal('<h3>Choose your AI tools</h3><div class="sub">Detect automatically with Google, or tick them yourself.</div><div style="margin:12px 0">' + gb + '</div>' + (msg ? '<div class="msg">' + esc(msg) + '</div>' : '') +
    catalog.map((c) => '<label class="pick"><input type="checkbox" value="' + c.id + '"' + (get(c.id) || det[c.id] ? ' checked' : '') + '><span class="dot" style="background:' + c.color + '"></span><span class="grow">' + esc(c.name) + '</span>' + (det[c.id] ? '<span class="badge">detected' + (det[c.id].plan ? ' · ' + esc(det[c.id].plan) : '') + '</span>' : '') + '</label>').join('') +
    '<div class="act"><button class="btn" data-act="cancel">Cancel</button><button class="btn p" data-act="apply">Add selected</button></div>');
}
function applyPick() {
  document.querySelectorAll('.pick input:checked').forEach((cb) => {
    const c = catalog.find((x) => x.id === cb.value), d = det[c.id], ex = get(c.id);
    if (ex) { if (d && !ex.plan) ex.plan = d.plan; if (d && !ex.renew) { ex.renew = nextRenewal(d.last); ex.est = true; } return; }
    S.tools.push(Object.assign({}, c, { plan: d ? d.plan : '', total: 0, used: 0, unit: 'credits', renew: d ? nextRenewal(d.last) : '', est: !!d, cost: 0, notes: '' }));
  });
  save(); closeModal(); warm(); render(); checkAlerts();
}
async function gAct(fn) {
  const r = await fn();
  if (!r.ok) return pickerModal(r.error === 'NO_CLIENT' ? 'Google client ID missing. See README.' : r.error);
  g = await api.google.status();
  const s = await api.google.scan();
  if (!s.ok) return pickerModal(s.error);
  det = Object.fromEntries(s.data.map((x) => [x.id, x]));
  pickerModal(s.data.length ? '' : 'No AI subscription receipts found in the last 120 days. Choose tools manually.');
}

/* ---------- edit tool / prompt / manual ---------- */
function editTool(t, isNew) {
  editing = { t: t, isNew: isNew };
  openModal('<h3>' + (isNew ? 'Add custom tool' : 'Edit ' + esc(t.name)) + '</h3><label class="f">Name</label><input type="text" id="f_name" value="' + esc(t.name) + '"><label class="f">URL</label><input type="text" id="f_url" value="' + esc(t.url) + '" placeholder="https://">' +
    '<label class="f">Plan</label><input type="text" id="f_plan" value="' + esc(t.plan) + '" placeholder="e.g. Pro, Plus, Free">' +
    '<div class="row"><div><label class="f">Total credits</label><input type="number" min="0" id="f_total" value="' + t.total + '"></div><div><label class="f">Used</label><input type="number" min="0" id="f_used" value="' + t.used + '"></div></div>' +
    '<div class="row"><div><label class="f">Unit</label><input type="text" id="f_unit" value="' + esc(t.unit) + '"></div><div><label class="f">Next renewal</label><input type="date" id="f_renew" value="' + esc(t.renew) + '"></div></div>' +
    '<div class="row"><div><label class="f">Monthly cost</label><input type="number" min="0" id="f_cost" value="' + (t.cost || 0) + '"></div><div><label class="f">Best for (your note)</label><input type="text" id="f_notes" value="' + esc(t.notes) + '"></div></div>' +
    '<div class="act">' + (isNew ? '' : '<button class="btn d" data-act="del" style="margin-right:auto">Remove</button>') + '<button class="btn" data-act="cancel">Cancel</button><button class="btn p" data-act="save">Save</button></div>');
}
const fv = (id) => $('#' + id).value;
function saveEdit() {
  const t = editing.t; let u = fv('f_url').trim(); if (u && !/^https?:\/\//.test(u)) u = 'https://' + u;
  const n = fv('f_name').trim(); if (!n || !u) return;
  if (editing.isNew) { t.id = 'c' + Date.now(); t.color = '#' + (Math.floor(Math.random() * 0x555555) + 0x666666).toString(16); S.tools.push(t); }
  else if (u !== t.url) api.view.remove(t.id);
  t.name = n; t.url = u; t.plan = fv('f_plan'); t.total = Number(fv('f_total')) || 0; t.used = Number(fv('f_used')) || 0; t.unit = fv('f_unit') || 'credits';
  if (fv('f_renew') !== t.renew) t.est = false; t.renew = fv('f_renew'); t.cost = Number(fv('f_cost')) || 0; t.notes = fv('f_notes');
  save(); closeModal(); warm(); render(); checkAlerts();
}
function promptModal(p) {
  editingP = p;
  openModal('<h3>' + (p.id ? 'Edit prompt' : 'New prompt') + '</h3><label class="f">Title</label><input type="text" id="p_title" value="' + esc(p.title) + '"><label class="f">Text</label><textarea id="p_text">' + esc(p.text) + '</textarea>' +
    '<div class="act">' + (p.id ? '<button class="btn d" data-act="delp" style="margin-right:auto">Delete</button>' : '') + '<button class="btn" data-act="cancel">Cancel</button><button class="btn p" data-act="savep">Save</button></div>');
}
function manualModal() {
  openModal('<h3>Manual power</h3><div class="sub">AI tools pause for the time you pick. You think it through yourself, and your companion cheers you on.</div><div class="mins">' +
    [25, 45, 60, 90].map((m) => '<button class="btn" data-act="startm" data-min="' + m + '">' + m + ' min</button>').join('') + '</div><div class="act"><button class="btn" data-act="cancel">Cancel</button></div>');
}
function drawChat(busy) {
  const el = $('#cl'); if (!el) return;
  el.innerHTML = (chatHist.length ? '' : '<div class="cm a">' + esc(petLine || pickLine(petMood())) + '</div>') + chatHist.map((m) => '<div class="cm ' + (m.role === 'user' ? 'u' : 'a') + '">' + esc(m.content) + '</div>').join('') + (busy ? '<div class="cm a">…</div>' : '');
  el.scrollTop = el.scrollHeight;
}
function chatModal() {
  if (!P().petChat || !hasKey) { openModal('<h3>Chat with ' + esc(S.pet.name) + '</h3><div class="sub">Turn on AI chat and add your own API key in Settings, Companion. The key stays encrypted on this device.</div><div class="act"><button class="btn" data-act="cancel">Close</button><button class="btn p" data-go="settings">Open settings</button></div>'); return; }
  openModal('<h3>' + esc(S.pet.name) + '</h3><div class="chatlist" id="cl"></div><div class="row" style="margin-top:10px"><input type="text" id="cin" placeholder="Say something…"><button class="btn p" style="flex:none" data-act="csend">Send</button></div><div class="sub" style="margin-top:6px">Messages go to the Anthropic API with your key and are not saved after you close this.</div><div class="act"><button class="btn" data-act="cancel">Close</button></div>', 'chat');
  drawChat(false); setTimeout(() => { const i = $('#cin'); if (i) i.focus(); }, 30);
}
async function sendChat() {
  const i = $('#cin'); if (!i) return; const t = i.value.trim(); if (!t) return;
  chatHist.push({ role: 'user', content: t }); i.value = ''; drawChat(true);
  const ctx = P().petContext ? 'Today: ' + fmt(usedToday()) + ' of AI time across ' + vis().length + ' tools.' + (P().limiter ? ' Usage limiter is on.' : '') : '';
  const r = await api.pet.chat(chatHist.filter((m) => !m.err).map((m) => ({ role: m.role, content: m.content })), { name: S.pet.name, kind: S.pet.kind, mood: petMood(), ctx: ctx, model: P().petModel });
  chatHist.push(r.ok ? { role: 'assistant', content: r.data } : { role: 'assistant', err: 1, content: 'Could not reach the API: ' + r.error });
  drawChat(false);
}
function filt() {
  const q = sq.toLowerCase();
  document.querySelectorAll('.srow').forEach((r) => { r.style.display = !q || r.dataset.t.indexOf(q) >= 0 ? '' : 'none'; });
  document.querySelectorAll('.ssec').forEach((s) => { s.style.display = [].some.call(s.querySelectorAll('.srow'), (r) => r.style.display !== 'none') ? '' : 'none'; });
}
function filtP() { const q = pq.toLowerCase(); document.querySelectorAll('.pcard').forEach((c) => { c.style.display = !q || c.dataset.t.indexOf(q) >= 0 ? '' : 'none'; }); }
const pById = (id) => S.prompts.find((p) => p.id === id);

/* ---------- events ---------- */
document.addEventListener('click', async (e) => {
  const el = e.target;
  if (el.id === 'modal') { closeModal(); return; }
  const sc = el.closest('[data-scroll]'); if (sc) { const t = document.getElementById(sc.dataset.scroll); if (t) t.scrollIntoView({ behavior: S.prefs.reduceMotion ? 'auto' : 'smooth' }); return; }
  const ac = el.closest('[data-accent]'); if (ac) { S.prefs.accent = ac.dataset.accent; applyPrefs(); save(); render(); return; }
  const wb = el.closest('[data-wp]'); if (wb) { wp = Number(wb.dataset.wp); wi = 0; render(); return; }
  const pk = el.closest('[data-pk]'); if (pk) { runPal(pk.dataset.pk); return; }
  const gt = el.closest('[data-go]'); if (gt) { if (modal) closeModal(); goTo(gt.dataset.go); return; }
  const a = el.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act, id = a.dataset.id, t = get(active);
  switch (act) {
    case 'palette': openPal(); break;
    case 'pick': pickerModal(); break;
    case 'add': editTool({ id: '', name: '', url: '', plan: '', total: 0, used: 0, unit: 'credits', renew: '', color: '#888', cost: 0, notes: '' }, true); break;
    case 'edit': editTool(t, false); break;
    case 'tedit': editTool(get(id), false); break;
    case 'dup': { const s = get(id), c = Object.assign({}, s, { id: 'c' + Date.now(), name: s.name + ' (2)', used: 0, est: false }); S.tools.splice(S.tools.indexOf(s) + 1, 0, c); save(); editTool(c, false); break; }
    case 'save': saveEdit(); break;
    case 'cancel': closeModal(); break;
    case 'apply': applyPick(); break;
    case 'del': { const d = editing.t.id; api.view.remove(d); S.tools = S.tools.filter((x) => x.id !== d); if (active === d) active = 'home'; save(); closeModal(); render(); break; }
    case 'up': case 'down': { const i = S.tools.findIndex((x) => x.id === id), j = act === 'up' ? i - 1 : i + 1; if (S.tools[j]) { const x = S.tools[i]; S.tools[i] = S.tools[j]; S.tools[j] = x; save(); render(); } break; }
    case 'reload': api.view.reload(active); break;
    case 'split': toggleSplit(); break;
    case 'manual': manualModal(); break;
    case 'startm': closeModal(); startSession(Number(a.dataset.min)); break;
    case 'endmanual': if (confirm('End your manual session early?')) finishSession(false); break;
    case 'more': S.extra[dk()] = (S.extra[dk()] || 0) + 15; save(); render(); break;
    case 'snooze': S.quietSnooze = Date.now() + 15 * 60000; save(); render(); break;
    case 'limoff': S.prefs.limiter = false; applyPrefs(); save(); render(); break;
    case 'pat': petLine = pickLine(petMood()) + ' ♥'; renderPet(); if (active === 'home') render(); break;
    case 'wprev': wi = Math.max(0, wi - 1); render(); break;
    case 'wnext': wi++; render(); break;
    case 'copyw': try { await navigator.clipboard.writeText(wSummary()); a.textContent = 'Copied'; } catch (x) {} break;
    case 'newp': promptModal({ id: '', title: '', text: '' }); break;
    case 'editp': promptModal(pById(id)); break;
    case 'savep': { const p = editingP, ti = fv('p_title').trim(), tx = fv('p_text'); if (!ti) break; if (!p.id) { p.id = 'p' + Date.now(); S.prompts.unshift(p); } p.title = ti; p.text = tx; save(); closeModal(); render(); break; }
    case 'delp': S.prompts = S.prompts.filter((x) => x !== editingP); save(); closeModal(); render(); break;
    case 'copyp': try { await navigator.clipboard.writeText(pById(id).text); a.textContent = 'Copied'; } catch (x) {} break;
    case 'sendp': { const tx = pById(id).text, tool = a.dataset.tool; goTo(tool); await wait(400); api.view.paste(tool, tx); break; }
    case 'chat': chatModal(); break;
    case 'csend': sendChat(); break;
    case 'savekey': { const k = ($('#keyin').value || '').trim(); if (!k) break; const r = await api.pet.setKey(k); hasKey = !!r.ok; if (!r.ok) alert(r.error); render(); break; }
    case 'clearkey': await api.pet.clearKey(); hasKey = false; S.prefs.petChat = false; save(); render(); break;
    case 'resetbinds': S.prefs.binds = Object.assign({}, DEF.binds); applyPrefs(); save(); $('#pk').textContent = bl(S.prefs.binds.palette); render(); break;
    case 'gin': case 'gin2': gAct(api.google.signIn); break;
    case 'scan': case 'scan2': gAct(async () => ({ ok: true })); break;
    case 'gout': await api.google.signOut(); g = await api.google.status(); render(); break;
    case 'export': api.state.export(S); break;
    case 'import': { const j = await api.state.import(); if (j && Array.isArray(j.tools)) { j.tools = j.tools.filter((x) => x && typeof x.id === 'string' && /^https?:\/\//.test(x.url)); S = Object.assign(S, j, { prefs: Object.assign({}, DEF, j.prefs || {}) }); save(); applyPrefs(); warm(); render(); } break; }
    case 'resetusage': if (confirm('Reset all usage stats and pet XP?')) { S.usage = {}; S.stats = { switches: 0, manual: { sessions: 0, minutes: 0 } }; S.pet.xp = 0; save(); render(); } break;
    case 'clearsess': if (confirm('Sign out of every tool?')) api.view.clearSessions(S.tools.map((x) => x.id)); break;
  }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.pref) {
    const k = el.dataset.pref; S.prefs[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
    applyPrefs(); save(); if (k === 'keepWarm' && el.checked) warm(); if (/alert|remind/.test(k)) checkAlerts(); if (k === 'limiter' && el.checked) limitCheck(); render();
  } else if (el.dataset.pet) { S.pet[el.dataset.pet] = el.value; save(); render(); }
  else if (el.dataset.show) { const t = get(el.dataset.show); t.hidden = !el.checked; if (t.hidden && active === t.id) active = 'home'; save(); render(); }
});
document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'pq') { pal.q = e.target.value; pal.i = 0; drawPal(); } else if (id === 'sq') { sq = e.target.value; filt(); } else if (id === 'pqs') { pq = e.target.value; filtP(); }
});
document.addEventListener('keydown', (e) => {
  const el = e.target;
  if (el.id === 'hk') {
    e.preventDefault(); const k = e.key; if (['Control', 'Shift', 'Alt', 'Meta'].indexOf(k) >= 0) return;
    const m = []; if (e.ctrlKey || e.metaKey) m.push('CommandOrControl'); if (e.altKey) m.push('Alt'); if (e.shiftKey) m.push('Shift'); if (!m.length) return;
    const map = { ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' }, old = S.prefs.hotkey;
    S.prefs.hotkey = m.concat(map[k] || (k.length === 1 ? k.toUpperCase() : k)).join('+');
    api.prefs.apply(S.prefs).then((ok) => { if (!ok) { S.prefs.hotkey = old; api.prefs.apply(S.prefs); } el.value = S.prefs.hotkey; save(); });
    return;
  }
  if (el.dataset && el.dataset.bind) {
    e.preventDefault(); if (['Control', 'Shift', 'Alt', 'Meta'].indexOf(e.key) >= 0) return;
    const c = combo(e), n = el.dataset.bind; if (!/^(Mod|Alt)\+/.test(c)) return;
    if (/^Mod\+[1-9]$/.test(c) || Object.keys(S.prefs.binds).some((k) => k !== n && S.prefs.binds[k] === c)) { el.value = 'Already used'; return; }
    S.prefs.binds[n] = c; el.value = bl(c); applyPrefs(); save(); $('#pk').textContent = bl(S.prefs.binds.palette); return;
  }
  if (el.id === 'cin' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); return; }
  if (e.key === 'Escape' && modal) { closeModal(); return; }
  if (el.id === 'pq') {
    const n = palItems().length;
    if (e.key === 'ArrowDown') { pal.i = (pal.i + 1) % Math.max(1, n); drawPal(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { pal.i = (pal.i - 1 + n) % Math.max(1, n); drawPal(); e.preventDefault(); }
    else if (e.key === 'Enter') { const it = palItems()[pal.i]; if (it) runPal(it.k); }
    return;
  }
  if (active === 'wrapped' && !modal && !/INPUT|TEXTAREA|SELECT/.test(el.tagName)) {
    if (e.key === 'ArrowRight') { wi++; render(); } else if (e.key === 'ArrowLeft') { wi = Math.max(0, wi - 1); render(); }
  }
});

const seed = () => [
  { id: 'p1', title: 'Explain it simply', text: 'Explain the following as if I am new to the topic. Use a short analogy, then list the 3 key ideas:\n\n' },
  { id: 'p2', title: 'Tighten my writing', text: 'Edit the text below for clarity and brevity. Keep my voice. Show the revised version only:\n\n' },
  { id: 'p3', title: 'Pros and cons', text: 'Give me a balanced pros and cons list for the decision below, then say what extra info would change your view:\n\n' }];

(async function init() {
  document.body.classList.toggle('mac', MAC);   catalog = await api.catalog(); g = await api.google.status();
  const saved = await api.state.load(), first = !saved;
  if (saved) S = Object.assign(S, saved, { prefs: Object.assign({}, DEF, saved.prefs || {}) }); else S.prompts = seed();
  S.tools = S.tools.filter((x) => x && /^https?:\/\//.test(x.url));
  S.prefs.binds = Object.assign({}, DEF.binds, S.prefs.binds); $('#pk').textContent = bl(S.prefs.binds.palette); hasKey = await api.pet.hasKey();
  applyPrefs();
  const dt = S.prefs.defaultTool; active = dt === 'home' ? 'home' : dt === 'last' ? S.last : dt; if (!get(active) && active !== 'home') active = 'home';
  api.onCmd((c) => {
    if (c === 'palette') { palOpen ? closeModal() : openPal(); } else if (c === 'settings') goTo('settings'); else if (c === 'split') toggleSplit();
    else if (c.indexOf('tool:') === 0) { const t = vis()[Number(c.slice(5)) - 1]; if (t) goTo(t.id); }
  });
  render(); warm(); dayRollover(); checkAlerts();
  setInterval(tick, 5000); setInterval(() => { if (dirty) save(); }, 30000); setInterval(checkAlerts, 36e5); setInterval(renderPet, 60000);
  setInterval(() => {
    if (S.session && Date.now() >= S.session.end) finishSession(true);
    const cd = $('#cd'); if (cd && S.session) cd.textContent = mmss(S.session.end - Date.now());
    if (S.pet.lastBonus !== dk()) dayRollover();
  }, 1000);
  if (first) pickerModal();
})();
