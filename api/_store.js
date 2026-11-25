// Shared state store for the Vercel Functions in this folder.
//
// Storage priority:
// 1. Supabase (when SUPABASE_URL + SUPABASE_SERVICE_KEY are set): the whole
//    HQ state is one JSONB row (table hq_state, id=1) in Ted's existing free
//    Supabase project. Moved here 2026-11-25 after the Vercel Blob store hit
//    "Limits Exceeded" — Blob meters every read/write against a small plan
//    quota, Supabase's free tier does not meter REST reads this way, so the
//    30-second outbox watcher can poll safely.
// 2. Vercel Blob (fallback, when only BLOB_READ_WRITE_TOKEN is set): the
//    state is one JSON document at pathname "hq-state.json".
// 3. Local test: server/data.json, exactly like server/server.js.
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

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const useSupabase = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

function seedState() {
  return { chats: SEED_CHATS, outbox: [], sent: [], lastSyncAt: null };
}

// --- Supabase transport (PostgREST, service key bypasses RLS) ---
async function supabaseLoad() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hq_state?id=eq.1&select=doc`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`supabase read failed: HTTP ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0].doc;
}

async function supabaseSave(state) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/hq_state`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ id: 1, doc: state, updated_at: new Date().toISOString() }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`supabase write failed: HTTP ${res.status}`);
}

export async function loadState() {
  if (useSupabase) {
    const doc = await supabaseLoad();
    if (doc) return doc;
    const s = seedState();
    await saveState(s);
    return s;
  }
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
  if (useSupabase) {
    await supabaseSave(state);
    return;
  }
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
