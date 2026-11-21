import { loadState, saveState, readJson, guard } from './_store.js';

// Called by the external sync agent (Hana's hq-sync loop): writes the freshest
// side-chat statuses in, confirms processed outbox items (they move to "sent"),
// stamps lastSyncAt, and returns the remaining outbox.
export default async function handler(req, res) {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { chats, processedIds } = await readJson(req);
    if (!Array.isArray(chats)) return res.status(400).json({ error: 'chats must be an array' });
    const d = await loadState();
    const done = new Set(Array.isArray(processedIds) ? processedIds : []);
    const now = new Date().toISOString();
    d.sent = [
      ...d.outbox.filter((i) => done.has(i.id)).map((i) => ({ ...i, sentAt: now })),
      ...d.sent,
    ].slice(0, 30);
    d.outbox = d.outbox.filter((i) => !done.has(i.id));
    d.chats = chats;
    d.lastSyncAt = now;
    await saveState(d);
    return res.status(200).json({ outbox: d.outbox });
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
