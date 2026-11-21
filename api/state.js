import { loadState, guard } from './_store.js';

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  try {
    const d = await loadState();
    return res.status(200).json({ chats: d.chats, outbox: d.outbox, sent: d.sent, lastSyncAt: d.lastSyncAt });
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
