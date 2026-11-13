// Detects which AI tools you pay for by looking at receipt/invoice emails from known vendor domains (Gmail, read-only).
const { CATALOG } = require('./catalog');
const { getAccessToken } = require('./auth');
const gm = async (p, tok) => {
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + p, { headers: { Authorization: 'Bearer ' + tok } });
  if (!r.ok) throw new Error('Gmail request failed (' + r.status + ')');
  return r.json();
};
async function scan() {
  const tok = await getAccessToken();
  if (!tok) throw new Error('NOT_SIGNED_IN');
  const domains = CATALOG.flatMap((t) => t.domains);
  const q = `from:(${domains.join(' OR ')}) (receipt OR invoice OR subscription OR payment) newer_than:120d`;
  const list = await gm('messages?maxResults=60&q=' + encodeURIComponent(q), tok);
  const found = {};
  for (const m of list.messages || []) {
    const d = await gm(`messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, tok);
    const h = Object.fromEntries(d.payload.headers.map((x) => [x.name.toLowerCase(), x.value]));
    const tool = CATALOG.find((t) => t.domains.some((dm) => (h.from || '').toLowerCase().includes(dm)));
    if (!tool) continue;
    const at = Number(d.internalDate);
    if (!found[tool.id] || at > found[tool.id].last) {
      const pm = (h.subject || '').match(/\b(Plus|Pro|Max|Team|Premium|Ultra|Business|Go)\b/i);
      found[tool.id] = { id: tool.id, last: at, plan: pm ? pm[1] : '' };
    }
  }
  return Object.values(found).map((f) => ({ ...f, last: new Date(f.last).toISOString().slice(0, 10) }));
}
module.exports = { scan };
