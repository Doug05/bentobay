/* BentoBay pages: dashboard, settings, prompts, wrapped, lock screen */
const P = () => S.prefs;
const tg = (k) => '<label class="sw"><input type="checkbox" data-pref="' + k + '"' + (P()[k] ? ' checked' : '') + '><i></i></label>';
const sel = (k, o) => '<select data-pref="' + k + '">' + o.map((x) => '<option value="' + x[0] + '"' + (String(P()[k]) === String(x[0]) ? ' selected' : '') + '>' + x[1] + '</option>').join('') + '</select>';
const num = (k, a, b) => '<input class="nin" type="number" data-pref="' + k + '" min="' + a + '" max="' + b + '" value="' + P()[k] + '">';
const inp = (k, type) => '<input class="nin" type="' + type + '" data-pref="' + k + '" value="' + esc(P()[k]) + '">';
const row = (l, d, c) => '<div class="srow" data-t="' + esc((l + ' ' + d).toLowerCase()) + '"><div class="grow"><div class="rl">' + l + '</div><div class="sub">' + d + '</div></div>' + c + '</div>';
const sec = (id, title, rows) => '<section class="ssec" id="s-' + id + '"><h3>' + title + '</h3>' + rows.join('') + '</section>';

function petBlock(size) {
  const m = petMood(); if (!petLine) petLine = pickLine(m);
  return '<div class="petbox" data-act="pat">' + petSVG(S.pet.kind, m, size) + '<div class="bub">' + esc(petLine) + '</div></div>';
}
function renderPet() {
  const el = $('#pet'); if (!P().pet) { el.innerHTML = ''; return; }
  const m = petMood(); if (!petLine) petLine = pickLine(m);
  el.innerHTML = '<div class="petmini" data-act="pat">' + petSVG(S.pet.kind, m, 44) + '<div class="grow"><div class="pn">' + esc(S.pet.name) + ' <span class="sub">Lv ' + petLevel() + '</span></div><div class="mini"><i style="width:' + (S.pet.xp % 100) + '%;background:var(--acc)"></i></div></div></div><div class="bub nm">' + esc(petLine) + '</div>';
}

function home() {
  const vs = vis();
  if (!vs.length) return '<div class="empty"><h3>Welcome to BentoBay</h3><p>Detect your subscriptions with Google, or pick your tools yourself.</p><button class="btn p" data-act="pick">Get started</button></div>';
  const spend = vs.reduce((a, t) => a + (Number(t.cost) || 0), 0);
  const nxt = vs.filter((t) => days(t) !== null && days(t) >= 0).sort((a, b) => days(a) - days(b))[0];
  const hot = vs.filter((t) => t.total > 0).sort((a, b) => pct(b) - pct(a))[0];
  const banners = vs.filter((t) => rescue(t)).map((t) => '<div class="banner"><span class="grow">' + esc(t.name) + ' is at ' + Math.round(pct(t)) + '%. ' + esc(rescue(t).name) + ' has ' + Math.round(100 - pct(rescue(t))) + '% left.</span><button class="btn sm" data-go="' + esc(rescue(t).id) + '">Switch</button></div>').join('');
  const lim = P().limiter ? Math.min(100, usedToday() / limitSecs() * 100) : 0;
  const health = '<div class="card static health">' + (P().pet ? petBlock(96) : '') + '<div class="grow"><h3>Healthy usage</h3><div class="sub" style="margin-bottom:8px">' + (P().limiter ? 'Limiter on: ' + chipText() : 'Limiter off. Turn it on to set a daily budget for AI time.') + '</div>' +
    (P().limiter ? '<div class="bar" style="margin-bottom:10px"><i style="width:' + lim + '%;background:' + col(lim) + '"></i></div>' : '') +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + tg('limiter') + '<button class="btn" data-act="manual">Start manual power</button>' + (P().petChat ? '<button class="btn" data-act="chat">Chat</button>' : '') + '<button class="btn ghost" data-go="settings">Limits</button></div></div></div>';
  return banners + '<div class="stats">' +
    '<div class="stat"><div class="sub">Monthly spend</div><div class="v">' + money(spend) + '</div><div class="sub">' + vs.length + ' tools</div></div>' +
    '<div class="stat"><div class="sub">Next renewal</div><div class="v">' + (nxt ? esc(nxt.name) : '–') + '</div><div class="sub">' + (nxt ? renewTxt(nxt) : 'Set renewal dates') + '</div></div>' +
    '<div class="stat"><div class="sub">Most used credits</div><div class="v">' + (hot ? Math.round(pct(hot)) + '%' : '–') + '</div><div class="sub">' + (hot ? esc(hot.name) : 'Set credit totals') + '</div></div>' +
    '<div class="stat"><div class="sub">Time today</div><div class="v">' + fmt(usedToday()) + '</div><div class="sub">across your tools</div></div></div>' + health +
    '<div class="grid">' + vs.map((t) => '<div class="card" data-go="' + esc(t.id) + '"><h3>' + tile(t) + esc(t.name) + '</h3><div class="plan"><span>' + (t.plan ? esc(t.plan) : 'Plan not set') + '</span>' + (t.cost ? '<span>· ' + money(t.cost) + '/mo</span>' : '') + (t.notes ? '<span>· ' + esc(t.notes) + '</span>' : '') + '</div>' + meter(t) + '</div>').join('') + '</div>';
}

function settingsPage() {
  const accents = ['#7c8cff', '#3ecf8e', '#f0a33c', '#f0605d', '#d77cff', '#2fb8d9'];
  const toolRows = S.tools.map((t, i) => '<div class="srow" data-t="' + esc((t.name + ' tools reorder hide duplicate account ' + t.url).toLowerCase()) + '">' + tile(t) + '<div class="grow"><div class="rl">' + esc(t.name) + '</div><div class="sub">' + esc(t.url) + '</div></div>' +
    '<button class="btn sm ghost" data-act="up" data-id="' + esc(t.id) + '"' + (i ? '' : ' disabled') + '>↑</button><button class="btn sm ghost" data-act="down" data-id="' + esc(t.id) + '"' + (i < S.tools.length - 1 ? '' : ' disabled') + '>↓</button>' +
    '<label class="sw" title="Show in sidebar"><input type="checkbox" data-show="' + esc(t.id) + '"' + (t.hidden ? '' : ' checked') + '><i></i></label><button class="btn sm" data-act="tedit" data-id="' + esc(t.id) + '">Edit</button><button class="btn sm" data-act="dup" data-id="' + esc(t.id) + '">Add 2nd account</button></div>').join('');
  const shortcuts = [['palette', 'Command palette'], ['settings', 'Open settings'], ['split', 'Split view']].map((x) => row(x[1], 'Click, then press a new combination', '<input class="nin wide" readonly data-bind="' + x[0] + '" value="' + esc(bl(P().binds[x[0]])) + '">')).join('') +
    row('Jump to tool 1 to 9', 'Fixed: ' + bl('Mod') + ' plus the number', '<kbd>' + bl('Mod') + '1…9</kbd>') + row('Reset shortcuts', 'Back to defaults', '<button class="btn" data-act="resetbinds">Reset</button>');
  const nav = [['general', 'General'], ['appearance', 'Appearance'], ['tools', 'Tools'], ['credits', 'Credits & plans'], ['healthy', 'Healthy usage'], ['pet', 'Companion'], ['accounts', 'Accounts'], ['shortcuts', 'Shortcuts'], ['privacy', 'Privacy & data'], ['about', 'About']];
  return '<div class="sw-wrap"><div class="snav">' + nav.map((n) => '<a data-scroll="s-' + n[0] + '">' + n[1] + '</a>').join('') + '</div><div class="sbody"><input id="sq" class="pin" style="margin-bottom:18px" placeholder="Search settings" value="' + esc(sq) + '">' +
    sec('general', 'General', [
      row('Launch at login', 'Start BentoBay when you sign in', tg('launchAtLogin')), row('Start minimized', 'Open quietly in the tray', tg('startMinimized')),
      row('Close to tray', 'Keep running when you close the window', tg('closeToTray')), row('Keep tools loaded', 'Instant switching, uses more memory', tg('keepWarm')),
      row('Open on launch', 'Which screen to start on', sel('defaultTool', [['last', 'Last used'], ['home', 'Dashboard']].concat(S.tools.map((t) => [t.id, t.name]))))]) +
    sec('appearance', 'Appearance', [
      row('Theme', 'Match your system or pick one', sel('theme', [['system', 'System'], ['dark', 'Dark'], ['light', 'Light']])),
      row('Accent color', 'Highlights and buttons', '<div class="swatches">' + accents.map((a) => '<button data-accent="' + a + '" class="' + (P().accent === a ? 'on' : '') + '" style="background:' + a + '"></button>').join('') + '</div>'),
      row('Density', 'Spacing in lists and cards', sel('density', [['comfortable', 'Comfortable'], ['compact', 'Compact']])),
      row('Sidebar', 'Full labels or icons only', sel('sidebar', [['expanded', 'Expanded'], ['icons', 'Icons only']])), row('Reduce motion', 'Turn off animations', tg('reduceMotion'))]) +
    sec('tools', 'Tools', [toolRows || '<div class="sub">No tools yet.</div>', '<div class="srow" data-t="add tools detect custom"><div class="grow"><div class="rl">Add tools</div><div class="sub">Detect with Google, pick from the list, or add a custom URL</div></div><button class="btn" data-act="pick">Detect / choose</button><button class="btn" data-act="add">Custom</button></div>']) +
    sec('credits', 'Credits & plans', [
      row('First warning at', 'Percent of credits used', num('alertAt', 40, 99)), row('Final warning at', 'Percent of credits used', num('alertAt2', 50, 100)),
      row('Renewal reminder', 'Days before a plan renews', num('remindDays', 0, 30)), row('Currency symbol', 'Used for spend totals', sel('currency', [['$', '$'], ['€', '€'], ['£', '£'], ['₹', '₹']]))]) +
    sec('healthy', 'Healthy usage', [
      row('Usage limiter', 'Master switch. Off means BentoBay never limits you', tg('limiter')), row('Daily limit', 'Minutes of AI time per day', num('limitMins', 10, 1440)),
      row('When the limit hits', 'Nudge only, or pause the tools', sel('limitMode', [['nudge', 'Nudge'], ['lock', 'Pause tools']])), row('Quiet hours', 'Rest AI at night', tg('quiet')),
      row('Quiet from', '', inp('quietFrom', 'time')), row('Quiet until', '', inp('quietTo', 'time'))]) +
    sec('pet', 'Companion', [
      row('Show companion', 'A small friend that reacts to your habits', tg('pet')),
      row('Name', '', '<input class="nin wide" type="text" data-pet="name" value="' + esc(S.pet.name) + '">'), row('AI chat', 'Talk to ' + esc(S.pet.name) + ' with your own Anthropic API key', tg('petChat')),
      row('API key', hasKey ? 'Saved, encrypted on this device. Messages go to the Anthropic API' : 'Not set', '<input id="keyin" class="nin wide" type="password" placeholder="sk-ant-..."><button class="btn" data-act="savekey">Save</button>' + (hasKey ? '<button class="btn d" data-act="clearkey">Remove</button>' : '')),
      row('Chat model', 'Model name sent to the API', '<input class="nin wide" type="text" data-pref="petModel" value="' + esc(P().petModel) + '">'),
      row('Share usage summary', 'Lets the pet see today\u2019s total time and tool count. Off by default', tg('petContext')),
      row('Kind', '', '<select data-pet="kind">' + [['onigiri', 'Onigiri'], ['dumpling', 'Dumpling'], ['sprout', 'Sprout']].map((k) => '<option value="' + k[0] + '"' + (S.pet.kind === k[0] ? ' selected' : '') + '>' + k[1] + '</option>').join('') + '</select>')]) +
    sec('accounts', 'Accounts', [row('Google', g.signedIn ? 'Connected as ' + esc(g.email) : g.configured ? 'Not connected. Used only to detect your AI subscriptions' : 'Not configured. See the README', g.signedIn ? '<button class="btn" data-act="scan2">Rescan</button><button class="btn" data-act="gout">Disconnect</button>' : '<button class="btn p" data-act="gin2">Connect</button>')]) +
    sec('shortcuts', 'Shortcuts', [row('Summon BentoBay anywhere', 'Click, then press a new combination', '<input id="hk" class="nin wide" readonly value="' + esc(P().hotkey) + '">'), shortcuts]) +
    sec('privacy', 'Privacy & data', [
      row('Stored on this device only', 'Usage stats are time counters. No page content, no telemetry', ''),
      row('Back up', 'Export or import your settings, prompts and stats', '<button class="btn" data-act="export">Export</button><button class="btn" data-act="import">Import</button>'),
      row('Reset usage stats', 'Clears Wrapped and pet XP history', '<button class="btn d" data-act="resetusage">Reset</button>'),
      row('Sign out of all tools', 'Clears saved logins in every tool', '<button class="btn d" data-act="clearsess">Clear</button>')]) +
    sec('about', 'About', [row('BentoBay 0.3.1', 'Open source under the MIT license. Not affiliated with any listed service', '')]) + '</div></div>';
}

function promptsPage() {
  const list = S.prompts.map((p) => '<div class="card static pcard" data-t="' + esc((p.title + ' ' + p.text).toLowerCase()) + '"><h3>' + esc(p.title) + '</h3><div class="ptxt">' + esc(p.text) + '</div><div class="pacts">' +
    vis().map((t) => '<button class="btn sm" data-act="sendp" data-id="' + esc(p.id) + '" data-tool="' + esc(t.id) + '">→ ' + esc(t.name) + '</button>').join('') +
    '<button class="btn sm ghost" data-act="copyp" data-id="' + esc(p.id) + '">Copy</button><button class="btn sm ghost" data-act="editp" data-id="' + esc(p.id) + '">Edit</button></div></div>').join('');
  return '<div class="pwrap"><div class="prow"><input id="pqs" class="pin" placeholder="Search prompts" value="' + esc(pq) + '"><button class="btn p" data-act="newp">New</button></div>' + (list || '<div class="empty">No prompts yet.</div>') + '<div class="sub">Sending pastes the text into the tool\u2019s focused box. Works best when its input is ready for typing.</div></div>';
}

/* ---------- Wrapped ---------- */
let wp = 7, wi = 0, sq = '', pq = '';
function wData(n) {
  const cut = n ? Date.now() - n * 864e5 : 0, tt = {}, hh = Array(24).fill(0), act = []; let total = 0;
  Object.keys(S.usage).sort().forEach((k) => {
    if (cut && new Date(k + 'T00:00:00').getTime() < cut) return;
    const u = S.usage[k]; let day = 0;
    for (const id in u.t) { tt[id] = (tt[id] || 0) + u.t[id]; day += u.t[id]; }
    for (const h in u.h) hh[h] += u.h[h];
    if (day > 0) act.push(k); total += day;
  });
  let streak = 0, run = 0, last = null;
  act.forEach((k) => { const t = new Date(k + 'T00:00:00').getTime(); run = last !== null && Math.round((t - last) / 864e5) === 1 ? run + 1 : 1; streak = Math.max(streak, run); last = t; });
  const top = Object.entries(tt).sort((a, b) => b[1] - a[1]);
  return { total, top, hh, peak: hh.indexOf(Math.max.apply(null, hh)), active: act.length, streak };
}
function persona(d) {
  const share = d.top.length ? d.top[0][1] / d.total : 0, hrs = wData(0).total / 3600;
  if (d.top.length >= 4 && share < 0.5) return ['The Explorer', 'You sample every tool and pick the right one for the job.'];
  if (share >= 0.7) return ['The Loyalist', 'One tool, all your trust. You know it inside out.'];
  if (hrs > 0 && S.stats.switches / hrs >= 8) return ['The Hopper', 'Always one click from the next idea.'];
  if (d.peak >= 22 || d.peak < 4) return ['The Night Owl', 'Your best prompts arrive after dark.'];
  if (d.peak >= 5 && d.peak < 9) return ['The Early Bird', 'First one up, first prompt in.'];
  return ['The Steady One', 'Calm, consistent and in control of your tools.'];
}
const hr12 = (h) => (h % 12 || 12) + ' ' + (h < 12 ? 'AM' : 'PM');
const tname = (id) => (get(id) ? get(id).name : id);
function wslides(d) {
  const max = Math.max.apply(null, d.hh) || 1, pe = persona(d), m = S.stats.manual;
  const s = [
    '<div class="slide g0"><div class="kick">Your AI time</div><div class="big">' + fmt(d.total) + '</div><div class="cap">across ' + d.top.length + ' tool' + (d.top.length === 1 ? '' : 's') + '</div></div>',
    '<div class="slide g1"><div class="kick">Your top tool</div><div class="big">' + esc(tname(d.top[0][0])) + '</div><div class="cap">' + Math.round(d.top[0][1] / d.total * 100) + '% of your time</div><div class="pod">' +
      d.top.slice(0, 3).map((x) => '<div><b>' + esc(tname(x[0])) + '</b><span><i style="width:' + Math.round(x[1] / d.top[0][1] * 100) + '%"></i></span>' + fmt(x[1]) + '</div>').join('') + '</div></div>',
    '<div class="slide g2"><div class="kick">Your peak hour</div><div class="big">' + hr12(d.peak) + '</div><div class="cap">When you think best with AI</div><div class="hist">' + d.hh.map((v, i) => '<i class="' + (i === d.peak ? 'on' : '') + '" style="height:' + Math.max(4, v / max * 100) + '%"></i>').join('') + '</div></div>',
    '<div class="slide g3"><div class="kick">Consistency</div><div class="big">' + d.active + ' day' + (d.active === 1 ? '' : 's') + '</div><div class="cap">Longest streak: ' + d.streak + ' day' + (d.streak === 1 ? '' : 's') + '<br>Manual power: ' + m.minutes + ' min across ' + m.sessions + ' session' + (m.sessions === 1 ? '' : 's') + '</div></div>',
    '<div class="slide g4"><div class="kick">Your AI personality</div><div class="big">' + pe[0] + '</div><div class="cap">' + pe[1] + '</div></div>'
  ];
  if (P().pet) s.push('<div class="slide g5"><div class="kick">Your companion</div><div style="display:flex;align-items:center;gap:20px">' + petSVG(S.pet.kind, 'happy', 110) + '<div><div class="big" style="font-size:44px">' + esc(S.pet.name) + '</div><div class="cap">Level ' + petLevel() + ' · ' + Math.floor(S.pet.xp) + ' XP</div></div></div></div>');
  return s;
}
function wSummary() { const d = wData(wp); if (!d.total) return ''; const pe = persona(d); return 'BentoBay Wrapped: ' + fmt(d.total) + ' with AI, top tool ' + tname(d.top[0][0]) + ', peak hour ' + hr12(d.peak) + ', ' + pe[0] + '.'; }
function wrappedPage() {
  const d = wData(wp);
  const seg = '<div class="seg">' + [[7, '7 days'], [30, '30 days'], [0, 'All time']].map((x) => '<button class="' + (wp === x[0] ? 'on' : '') + '" data-wp="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
  if (!d.total) return '<div class="wrap">' + seg + '<div class="empty"><h3>Your Wrapped is warming up</h3><p>Use a tool for a few minutes and your stats start filling in. Only time is counted, never what you type.</p></div></div>';
  const sl = wslides(d); wi = Math.max(0, Math.min(wi, sl.length - 1));
  return '<div class="wrap">' + seg + sl[wi] + '<div class="wnav"><button class="btn" data-act="wprev">‹ Back</button><div class="dots">' + sl.map((_, i) => '<i class="' + (i === wi ? 'on' : '') + '"></i>').join('') + '</div><button class="btn" data-act="wnext">Next ›</button></div><div style="text-align:center;margin-top:12px"><button class="btn ghost" data-act="copyw">Copy summary</button></div></div>';
}

/* ---------- lock screen (manual power, limit, quiet hours) ---------- */
function lockHTML(r) {
  const pet = P().pet ? petSVG(S.pet.kind, r.k === 'manual' ? 'proud' : petMood(), 84) : '';
  if (r.k === 'manual') return '<div class="lk">' + pet + '<h2>Manual power</h2><div class="cd" id="cd">' + mmss(r.end - Date.now()) + '</div><p>AI tools are paused. Work it out yourself, you have got this.</p><button class="btn" data-act="endmanual">End session</button></div>';
  if (r.k === 'quiet') return '<div class="lk">' + pet + '<h2>Quiet hours</h2><p>AI is resting until ' + esc(P().quietTo) + '.</p><div class="lka"><button class="btn" data-act="snooze">Allow 15 minutes</button><button class="btn" data-act="manual">Start manual power</button><button class="btn ghost" data-act="limoff">Turn limiter off</button></div></div>';
  return '<div class="lk">' + pet + '<h2>Daily limit reached</h2><p>You have used ' + fmt(usedToday()) + ' today (limit ' + fmt(P().limitMins * 60) + ').</p><div class="lka"><button class="btn p" data-act="manual">Start manual power</button><button class="btn" data-act="more">+15 minutes</button><button class="btn ghost" data-act="limoff">Turn limiter off</button></div></div>';
}
