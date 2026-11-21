import { loadState, saveState, newId, readJson, guard } from './_store.js';

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { chatId, text } = await readJson(req);
    if (!chatId || !text || !String(text).trim()) return res.status(400).json({ error: 'chatId and text are required' });
    const d = await loadState();
    if (!d.chats.some((c) => c.id === chatId)) return res.status(404).json({ error: `unknown chatId: ${chatId}` });
    const item = { id: newId('ob'), type: 'message', chatId, text: String(text), createdAt: new Date().toISOString() };
    d.outbox.push(item);
    await saveState(d);
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
