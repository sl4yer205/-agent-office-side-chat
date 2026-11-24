import { loadState } from './_store.js';

// Public, content-free signal for the instant-relay watcher (a hook script
// that has no credentials): how many office outbox items are waiting, and
// their opaque ids so the watcher can dedupe. No message text, no chat data.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  try {
    const d = await loadState();
    const outbox = d.outbox || [];
    return res.status(200).json({ count: outbox.length, ids: outbox.map((i) => i.id) });
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
