// Shared state store for the Vercel Functions in this folder.
//
// Production (Vercel): the whole HQ state is one JSON document kept in Vercel
// Blob at pathname "hq-state.json" (needs BLOB_READ_WRITE_TOKEN, added
// automatically when a Blob store is connected to the project).
// Local test: when that token is absent, falls back to server/data.json so the
// functions can be exercised offline exactly like server/server.js does.
//
// State shape: { chats, outbox, sent, lastSyncAt } — same as server/server.js.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_CHATS } from '../server/seed.js';

const BLOB_PATH = 'hq-state.json';
const DATA_FILE = join(fileURLToPath(new URL('..', import.meta.url)), 'server', 'data.json');
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

function seedState() {
  return { chats: SEED_CHATS, outbox: [], sent: [], lastSyncAt: null };
}

export async function loadState() {
  if (useBlob) {
    const { get } = await import('@vercel/blob');
    // Read the state doc directly by pathname — no list() call. Every Blob
    // operation counts against the plan's included quota (the store hit
    // "Limits Exceeded" on 2026-11-25), so reads must stay at 1 op each.
    // Store is Private: read through the SDK (token-authenticated), a plain
    // fetch of the blob URL would be rejected. get() returns null only when
    // the blob truly does not exist; HTTP errors (403 etc.) throw, and those
    // must propagate — never seed over an unreadable store.
    const res = await get(BLOB_PATH, { access: 'private' });
    if (!res) {
      const s = seedState();
      await saveState(s);
      return s;
    }
    if (res.statusCode !== 200) throw new Error(`blob read failed: ${res && res.statusCode}`);
    const text = await new Response(res.stream).text();
    return JSON.parse(text);
  }
  if (existsSync(DATA_FILE)) return JSON.parse(await readFile(DATA_FILE, 'utf8'));
  const s = seedState();
  await saveState(s);
  return s;
}

export async function saveState(state) {
  if (useBlob) {
    const { put } = await import('@vercel/blob');
    await put(BLOB_PATH, JSON.stringify(state), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  await writeFile(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// All /api functions require header "x-hq-key" == HQ_SECRET when HQ_SECRET is
// set (production). Unset = local dev, no check. The office outbox relays into
// Ted's real Muse side chats, so production must never run without a secret.
export function checkAuth(req) {
  const secret = process.env.HQ_SECRET;
  if (!secret) return true;
  return (req.headers['x-hq-key'] || '') === secret;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function guard(req, res) {
  if (checkAuth(req)) return true;
  res.status(401).json({ error: 'unauthorized — missing or wrong x-hq-key' });
  return false;
}
