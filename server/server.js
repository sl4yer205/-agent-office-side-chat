// Agent Office — Side Chat HQ · tiny zero-dependency API server.
//
// Mirrors the Muse Space actions of the same name:
//   GET  /api/state        -> { chats, outbox, sent, lastSyncAt }
//   POST /api/send-message { chatId, text }            -> queues an outbox "message"
//   POST /api/create-bot   { name, purpose, color }    -> queues an outbox "create_bot"
//   POST /api/hq-sync      { chats, processedIds }     -> replaces chats, marks outbox
//                                                         items as sent, stamps
//                                                         lastSyncAt, returns { outbox }
//
// State lives in server/data.json (created from seed.js on first run, gitignored).
// In production (`npm run build` first) this server also serves dist/ statically.

import { createServer } from 'node:http';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_CHATS } from './seed.js';

const PORT = process.env.PORT || 8787;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA_FILE = join(ROOT, 'server', 'data.json');
const DIST_DIR = join(ROOT, 'dist');

let db = null;

async function loadDb() {
  if (db) return db;
  if (existsSync(DATA_FILE)) {
    db = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } else {
    db = { chats: SEED_CHATS, outbox: [], sent: [], lastSyncAt: null };
    await saveDb();
  }
  return db;
}

async function saveDb() {
  await writeFile(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (path === '/' || path === '\\') path = 'index.html';
  const file = join(DIST_DIR, path);
  try {
    const st = await stat(file);
    if (!st.isFile()) throw new Error('not a file');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    // SPA fallback
    try {
      const data = await readFile(join(DIST_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(data);
    } catch {
      sendJson(res, 404, { error: 'not found (run `npm run build` for static serving, or use `npm run dev`)' });
    }
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;

    if (p === '/api/state' && req.method === 'GET') {
      const d = await loadDb();
      return sendJson(res, 200, { chats: d.chats, outbox: d.outbox, sent: d.sent, lastSyncAt: d.lastSyncAt });
    }

    if (p === '/api/send-message' && req.method === 'POST') {
      const d = await loadDb();
      const { chatId, text } = await readJson(req);
      if (!chatId || !text || !String(text).trim()) return sendJson(res, 400, { error: 'chatId and text are required' });
      if (!d.chats.some((c) => c.id === chatId)) return sendJson(res, 404, { error: `unknown chatId: ${chatId}` });
      const item = { id: newId('ob'), type: 'message', chatId, text: String(text), createdAt: new Date().toISOString() };
      d.outbox.push(item);
      await saveDb();
      return sendJson(res, 201, { item });
    }

    if (p === '/api/create-bot' && req.method === 'POST') {
      const d = await loadDb();
      const { name, purpose, color } = await readJson(req);
      if (!name || !String(name).trim()) return sendJson(res, 400, { error: 'name is required' });
      const item = {
        id: newId('ob'),
        type: 'create_bot',
        name: String(name),
        purpose: String(purpose || ''),
        color: String(color || '#2fbfa0'),
        createdAt: new Date().toISOString(),
      };
      d.outbox.push(item);
      await saveDb();
      return sendJson(res, 201, { item });
    }

    if (p === '/api/hq-sync' && req.method === 'POST') {
      const d = await loadDb();
      const { chats, processedIds } = await readJson(req);
      if (!Array.isArray(chats)) return sendJson(res, 400, { error: 'chats must be an array' });
      const done = new Set(Array.isArray(processedIds) ? processedIds : []);
      const now = new Date().toISOString();
      d.sent = [
        ...d.outbox.filter((i) => done.has(i.id)).map((i) => ({ ...i, sentAt: now })),
        ...d.sent,
      ].slice(0, 30);
      d.outbox = d.outbox.filter((i) => !done.has(i.id));
      d.chats = chats;
      d.lastSyncAt = now;
      await saveDb();
      return sendJson(res, 200, { outbox: d.outbox });
    }

    if (p.startsWith('/api/')) return sendJson(res, 404, { error: 'unknown endpoint' });
    if (req.method === 'GET') return serveStatic(req, res);
    return sendJson(res, 405, { error: 'method not allowed' });
  } catch (err) {
    return sendJson(res, 500, { error: String(err && err.message ? err.message : err) });
  }
});

server.listen(PORT, () => {
  console.log(`HQ API server listening on http://localhost:${PORT}`);
});
