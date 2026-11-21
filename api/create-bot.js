import { loadState, saveState, newId, readJson, guard } from './_store.js';

export default async function handler(req, res) {
  if (!guard(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { name, purpose, color } = await readJson(req);
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
    const d = await loadState();
    const item = {
      id: newId('ob'),
      type: 'create_bot',
      name: String(name),
      purpose: String(purpose || ''),
      color: String(color || '#2fbfa0'),
      createdAt: new Date().toISOString(),
    };
    d.outbox.push(item);
    await saveState(d);
    return res.status(201).json({ item });
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
