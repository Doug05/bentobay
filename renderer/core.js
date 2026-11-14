/* BentoBay core: state, helpers, usage tracking, limiter, manual power, pet logic */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAC = /Mac/.test(navigator.userAgent), MOD = MAC ? '⌘' : 'Ctrl+';
const DEF = { theme: 'system', accent: '#7c8cff', density: 'comfortable', sidebar: 'expanded', reduceMotion: false, launchAtLogin: false, startMinimized: false,
  closeToTray: true, defaultTool: 'last', hotkey: 'CommandOrControl+Shift+Space', keepWarm: true, alertAt: 80, alertAt2: 95, remindDays: 3, currency: '$',
  pet: true, limiter: false, limitMins: 120, limitMode: 'nudge', quiet: false, quietFrom: '23:00', quietTo: '07:00',
  petChat: false, petModel: 'claude-sonnet-5-5', petContext: false, binds: { palette: 'Mod+Shift+P', settings: 'Mod+,', split: 'Mod+\\' } };
let S = { tools: [], prefs: Object.assign({}, DEF), prompts: [], alerted: {}, last: 'home', usage: {}, stats: { switches: 0, manual: { sessions: 0, minutes: 0 } },
  pet: { name: 'Miso', kind: 'onigiri', xp: 0, lastBonus: '' }, extra: {}, session: null, quietSnooze: 0 };
let catalog = [], g = {}, active = 'home', prev = null, split = null, modal = false, layout = [], hkOk = true, petLine = '', dirty = false, hasKey = false, chatHist = [];

const combo = (e) => {
  const m = []; if (e.ctrlKey || e.metaKey) m.push('Mod'); if (e.altKey) m.push('Alt'); if (e.shiftKey) m.push('Shift');
  let k = e.key; if (k === ' ') k = 'Space'; else if (k.length === 1) k = k.toUpperCase();
  return m.concat(k).join('+');
};
const bl = (c) => c.split('+').map((p) => (p === 'Mod' ? (MAC ? '⌘' : 'Ctrl') : MAC && p === 'Shift' ? '⇧' : MAC && p === 'Alt' ? '⌥' : p)).join(MAC ? '' : '+');
const save = () => { dirty = false; return api.state.save(S); };
const get = (id) => S.tools.find((t) => t.id === id);
const vis = () => S.tools.filter((t) => !t.hidden);
const isTool = () => !!get(active);
const dk = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const fmt = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? h + 'h ' + m + 'm' : m + 'm'; };
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const toMin = (s) => { const a = s.split(':').map(Number); return a[0] * 60 + (a[1] || 0); };
const money = (n) => esc(S.prefs.currency) + (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const pct = (t) => (t.total > 0 ? Math.min(100, Math.max(0, (t.used / t.total) * 100)) : 0);
const col = (p) => (p >= 90 ? 'var(--bad)' : p >= 70 ? 'var(--warn)' : 'var(--ok)');
const days = (t) => { if (!t.renew) return null; const d = Math.ceil((new Date(t.renew + 'T00:00:00') - Date.now()) / 864e5); return isNaN(d) ? null : d; };
const renewTxt = (t) => {
  const d = days(t), e = t.est ? ' (est.)' : '';
  if (d === null) return 'Renewal not set';
  if (d < 0) return 'Renewal date passed';
  return d === 0 ? 'Renews today' + e : 'Renews in ' + d + ' day' + (d === 1 ? '' : 's') + e;
};
const meter = (t) => {
  if (!(t.total > 0)) return '<div class="bar"></div><div class="meta"><span>Credits not set</span><span>' + renewTxt(t) + '</span></div>';
  const p = pct(t), left = Math.max(0, t.total - t.used);
  return '<div class="bar"><i style="width:' + p + '%;background:' + col(p) + '"></i></div><div class="meta"><span>' + left + ' of ' + t.total + ' ' + esc(t.unit) + ' left</span><span>' + renewTxt(t) + '</span></div>';
};
const nextRenewal = (iso) => { const d = new Date(iso + 'T00:00:00'); while (d < new Date()) d.setMonth(d.getMonth() + 1); return dk(d); };
const tile = (t) => { const p = pct(t); return '<span class="tw" style="--p:' + p + ';--rc:' + col(p) + '"><span class="tile" style="background:' + esc(t.color) + '">' + esc((t.name[0] || '?').toUpperCase()) + '</span></span>'; };
const svgi = (paths) => '<svg class="ic" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
const ICO_HOME = '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>';

/* ---------- usage + limiter + manual power ---------- */
const usedToday = () => { const u = S.usage[dk()]; return u ? Object.values(u.t).reduce((a, b) => a + b, 0) : 0; };
const limitSecs = () => (S.prefs.limitMins + (S.extra[dk()] || 0)) * 60;
function inQuiet() {
  const p = S.prefs; if (!p.quiet || (S.quietSnooze || 0) > Date.now()) return false;
  const n = new Date(), m = n.getHours() * 60 + n.getMinutes(), a = toMin(p.quietFrom), b = toMin(p.quietTo);
  return a <= b ? m >= a && m < b : m >= a || m < b;
}
function blockedReason() {
  const p = S.prefs;
  if (S.session && S.session.end > Date.now()) return { k: 'manual', end: S.session.end };
  if (p.limiter && p.limitMode === 'lock') {
    if (inQuiet()) return { k: 'quiet' };
    if (usedToday() >= limitSecs()) return { k: 'limit' };
  }
  return null;
}
const chipText = () => 'Today ' + fmt(usedToday()) + (S.prefs.limiter ? ' / ' + fmt(limitSecs()) : '');
function startSession(mins) { S.session = { start: Date.now(), end: Date.now() + mins * 60000, mins: mins }; save(); render(); }
function finishSession(done) {
  const s = S.session; if (!s) return;
  const el = Math.min(s.mins, Math.floor((Date.now() - s.start) / 60000));
  S.stats.manual.minutes += done ? s.mins : el;
  if (done) { S.stats.manual.sessions++; S.pet.xp += 20; notify('Manual power session complete', s.mins + ' minutes on your own. ' + S.pet.name + ' is proud (+20 XP).'); }
  S.session = null; save(); render();
}
function limitCheck() {
  const p = S.prefs; if (!p.limiter) return;
  const used = usedToday(), lim = limitSecs(), d = dk();
  [[0.8, '80'], [1, '100']].forEach((x) => {
    const k = 'lim|' + x[1] + '|' + d;
    if (used >= lim * x[0] && !S.alerted[k]) {
      S.alerted[k] = 1;
      if (x[1] === '100') notify('Daily AI limit reached', p.limitMode === 'lock' ? 'BentoBay will pause your tools.' : 'Time to wrap up, or start a manual session.');
      else notify('80% of today\u2019s AI limit used', fmt(lim - used) + ' left today');
    }
  });
}
async function tick() {
  const b = blockedReason(), lk = $('#lock').style.display === 'flex';
  if (isTool() && !!b !== lk) render();
  if (!isTool() || modal || b) return;
  if (!(await api.win.active())) return;
  const d = dk(), u = S.usage[d] || (S.usage[d] = { t: {}, h: {}, o: {} }), h = new Date().getHours();
  u.t[active] = (u.t[active] || 0) + 5; u.h[h] = (u.h[h] || 0) + 5; S.pet.xp += 5 / 300; dirty = true;
  const c = $('#usechip'); if (c) c.textContent = chipText();
  limitCheck(); if (blockedReason()) render();
}
function dayRollover() {
  const d = dk(); if (S.pet.lastBonus === d) return;
  const y = dk(new Date(Date.now() - 864e5)), u = S.usage[y];
  if (S.prefs.limiter && u) { const tot = Object.values(u.t).reduce((a, b) => a + b, 0); if (tot > 0 && tot <= (S.prefs.limitMins + (S.extra[y] || 0)) * 60) S.pet.xp += 25; }
  S.pet.lastBonus = d;
  const ks = Object.keys(S.usage).sort(); ks.slice(0, Math.max(0, ks.length - 400)).forEach((k) => delete S.usage[k]);
  save();
}

/* ---------- alerts ---------- */
function notify(title, body) { try { new Notification(title, { body: body }); } catch (e) {} }
function rescue(t) {
  if (!(t.total > 0) || pct(t) < S.prefs.alertAt) return null;
  return vis().filter((x) => x.id !== t.id && x.total > 0 && pct(x) < S.prefs.alertAt).sort((a, b) => pct(a) - pct(b))[0] || null;
}
function checkAlerts() {
  const p = S.prefs;
  S.tools.forEach((t) => {
    if (t.total > 0) {
      const q = pct(t), lv = q >= p.alertAt2 ? p.alertAt2 : q >= p.alertAt ? p.alertAt : 0;
      if (lv && !S.alerted[t.id + '|' + lv + '|' + t.renew]) {
        S.alerted[t.id + '|' + p.alertAt + '|' + t.renew] = 1; if (lv === p.alertAt2) S.alerted[t.id + '|' + p.alertAt2 + '|' + t.renew] = 1;
        const r = rescue(t); notify(t.name + ' is at ' + Math.round(q) + '%', r ? r.name + ' has ' + Math.round(100 - pct(r)) + '% left if you need a backup.' : 'Credits are running low.');
      }
    }
    const d = days(t), k = t.id + '|renew|' + t.renew;
    if (d !== null && d >= 0 && d <= p.remindDays && !S.alerted[k]) { S.alerted[k] = 1; notify(t.name + ' renews ' + (d === 0 ? 'today' : 'in ' + d + ' day' + (d === 1 ? '' : 's')), t.cost ? money(t.cost) + ' will be charged.' : 'Check your plan.'); }
  });
  save();
}

/* ---------- pet ---------- */
const PET_LINES = { happy: ['Ready when you are.', 'Nice rhythm today.', 'Tools stocked and ready.'], sleepy: ['It is late... maybe tomorrow?', 'Zzz... ideas keep till morning.'],
  tired: ['That is plenty for today.', 'Let us rest the AI for now.'], worried: ['A tool is almost out of credits!', 'Peek at your limits?'], proud: ['Look at you, thinking solo!', 'Manual power engaged.'] };
const pickLine = (m) => PET_LINES[m][Math.floor(Math.random() * PET_LINES[m].length)];
const petLevel = () => 1 + Math.floor(S.pet.xp / 100);
function petMood() {
  const p = S.prefs, h = new Date().getHours();
  if (S.session && S.session.end > Date.now()) return 'proud';
  if (p.limiter && usedToday() >= limitSecs()) return 'tired';
  if (h >= 23 || h < 6) return 'sleepy';
  if (S.tools.some((t) => t.total > 0 && pct(t) >= p.alertAt2)) return 'worried';
  return 'happy';
}
function petSVG(kind, mood, size) {
  const bodies = {
    onigiri: '<path d="M50 12C62 12 88 62 88 76C88 90 74 96 50 96C26 96 12 90 12 76C12 62 38 12 50 12Z" fill="#f4f1ea"/><path d="M30 82H70V96H30Z" fill="#26332b" opacity=".9"/>',
    dumpling: '<path d="M12 70C12 40 30 22 50 22C70 22 88 40 88 70C88 88 70 96 50 96C30 96 12 88 12 70Z" fill="#f3d9b1"/><path d="M34 26q4 8 0 14M50 22q4 8 0 16M66 26q4 8 0 14" stroke="#d9b887" stroke-width="3" fill="none" stroke-linecap="round"/>',
    sprout: '<path d="M14 72C14 46 30 32 50 32C70 32 86 46 86 72C86 90 70 96 50 96C30 96 14 90 14 72Z" fill="#8fd694"/><path d="M50 32C50 18 58 10 70 10C70 22 62 30 50 32Z" fill="#4fb36a"/>'
  };
  const ink = 'stroke="#2b2b2f" stroke-width="3" stroke-linecap="round" fill="none"';
  const faces = {
    happy: '<path d="M33 62q5-6 10 0M57 62q5-6 10 0" ' + ink + '/><path d="M44 72q6 6 12 0" ' + ink + '/>',
    sleepy: '<path d="M33 63h10M57 63h10" ' + ink + '/><path d="M47 74h6" ' + ink + '/><text x="72" y="40" font-size="14" fill="#8b8d96">z</text>',
    tired: '<path d="M33 61l10 4M67 61l-10 4" ' + ink + '/><path d="M44 77q6-5 12 0" ' + ink + '/>',
    worried: '<circle cx="38" cy="63" r="3.5" fill="#2b2b2f"/><circle cx="62" cy="63" r="3.5" fill="#2b2b2f"/><path d="M43 76q3-3 6 0t6 0" ' + ink + '/><path d="M76 52q4 6 0 9q-4-3 0-9Z" fill="#6cb8ff"/>',
    proud: '<circle cx="38" cy="62" r="3.5" fill="#2b2b2f"/><circle cx="62" cy="62" r="3.5" fill="#2b2b2f"/><path d="M42 71q8 10 16 0z" fill="#2b2b2f"/><path d="M76 34l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffd34d"/>'
  };
  return '<svg class="pet ' + mood + '" viewBox="0 0 100 100" width="' + size + '" height="' + size + '">' + (bodies[kind] || bodies.onigiri) + '<circle cx="30" cy="72" r="5" fill="#ff9aa2" opacity=".5"/><circle cx="70" cy="72" r="5" fill="#ff9aa2" opacity=".5"/>' + faces[mood] + '</svg>';
}
