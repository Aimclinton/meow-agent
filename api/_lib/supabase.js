import { createHmac } from 'node:crypto';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, supabaseEnabled } from './config.js';

const BUCKET = 'meow-pages';
// New-style keys (sb_secret_...) go only in `apikey`; legacy JWT keys also need Authorization.
const authHeaders = () => (SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_')
  ? { apikey: SUPABASE_SERVICE_ROLE_KEY }
  : { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` });

const headers = (extra = {}) => ({ ...authHeaders(), 'Content-Type': 'application/json', ...extra });

async function rest(path, { method = 'GET', body, prefer } = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: headers(prefer ? { Prefer: prefer } : {}),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`supabase ${method} ${path.split('?')[0]}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}

// Is the database set up (schema.sql run, URL and key correct)?
export async function dbReady() {
  if (!supabaseEnabled()) return { ok: false, reason: 'not_configured' };
  try {
    await rest('meow_vaults?select=id&limit=1');
    return { ok: true };
  } catch (err) {
    const msg = String(err.message || err);
    const reason = /42501|permission denied|TO anon/i.test(msg) ? 'wrong_key_use_service_role' : /PGRST205|does not exist|schema cache/i.test(msg) ? 'run_schema_sql' : 'db_error';
    return { ok: false, reason, message: msg.slice(0, 200) };
  }
}

// ---------- vaults: "same password → same history" ----------
const SECRET = () => process.env.VAULT_SECRET || SUPABASE_SERVICE_ROLE_KEY;
const hmac = (kind, value) => createHmac('sha256', SECRET()).update(`${kind}:${value}`).digest('hex');
const isToken = (t) => typeof t === 'string' && /^[0-9a-f]{64}$/.test(t);

export async function findVault(token) {
  if (!supabaseEnabled() || !isToken(token)) return null;
  const rows = await rest(`meow_vaults?key_hash=eq.${hmac('k', token)}&select=id`);
  return rows[0]?.id || null;
}

export async function createVault(token, recoveryToken) {
  const rows = await rest('meow_vaults', {
    method: 'POST',
    prefer: 'return=representation',
    body: { key_hash: hmac('k', token), recovery_hash: isToken(recoveryToken) ? hmac('r', recoveryToken) : null },
  });
  return rows[0]?.id;
}

// Forgot password: find the vault by recovery code and attach the new password to it.
export async function recoverVault(recoveryToken, newToken) {
  if (!isToken(recoveryToken) || !isToken(newToken)) return null;
  const rows = await rest(`meow_vaults?recovery_hash=eq.${hmac('r', recoveryToken)}&select=id`);
  const id = rows[0]?.id;
  if (!id) return null;
  if (await findVault(newToken)) throw Object.assign(new Error('password_taken'), { code: 'password_taken' });
  await rest(`meow_vaults?id=eq.${id}`, { method: 'PATCH', body: { key_hash: hmac('k', newToken) } });
  return id;
}

export async function listDocs(vaultId, sinceISO) {
  return rest(`meow_vault_documents?vault_id=eq.${vaultId}&updated_at=gte.${encodeURIComponent(sinceISO)}&select=id,data,updated_at`);
}

export async function listOldDocs(vaultId, beforeISO) {
  return rest(`meow_vault_documents?vault_id=eq.${vaultId}&updated_at=lt.${encodeURIComponent(beforeISO)}&select=id`);
}

export async function saveDoc(vaultId, doc) {
  await rest('meow_vault_documents?on_conflict=vault_id,id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates',
    body: { vault_id: vaultId, id: String(doc.id), title: doc.title || '', data: doc, updated_at: new Date(doc.updatedAt || Date.now()).toISOString() },
  });
}

export async function deleteDoc(vaultId, docId) {
  await rest(`meow_vault_documents?vault_id=eq.${vaultId}&id=eq.${encodeURIComponent(docId)}`, { method: 'DELETE' });
  await removeFolder(`${vaultId}/${docId}`);
}

// ---------- storage ----------
const safe = (s) => String(s).replace(/[^\w.-]/g, '_');
export const imagePath = (vaultId, docId, pageId) => `${vaultId}/${safe(docId)}/${safe(pageId)}.jpg`;

export async function uploadImage(path, bytes, contentType = 'image/jpeg') {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': contentType, 'x-upsert': 'true' },
    body: bytes,
  });
  if (!r.ok) throw new Error(`storage upload: ${r.status} ${(await r.text()).slice(0, 200)}`);
}

export async function signedUrls(paths, expiresIn = 600) {
  if (!paths.length) return {};
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ expiresIn, paths }),
  });
  if (!r.ok) return {};
  const out = {};
  for (const item of await r.json()) {
    if (item.signedURL) out[item.path] = `${SUPABASE_URL}/storage/v1${item.signedURL}`;
  }
  return out;
}

async function removeFolder(prefix) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ prefix, limit: 1000 }),
  });
  if (!r.ok) return;
  const files = (await r.json()).map((f) => `${prefix}/${f.name}`);
  if (!files.length) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: headers(),
    body: JSON.stringify({ prefixes: files }),
  });
}

// ---------- usage counter ----------
export async function getUsage(day) {
  if (!supabaseEnabled()) return null;
  try {
    const rows = await rest(`meow_usage?day=eq.${encodeURIComponent(day)}&select=count`);
    return rows[0]?.count || 0;
  } catch {
    return null;
  }
}

export async function addUsage(day, n = 1) {
  if (!supabaseEnabled()) return null;
  try {
    return await rest('rpc/meow_increment_usage', { method: 'POST', body: { p_day: day, p_n: n } });
  } catch {
    return null;
  }
}

// ---------- shared templates ----------
export async function listTemplates() {
  return rest('templates?select=id,name,description,structure,created_at&order=created_at.desc&limit=200');
}
export async function insertTemplate(t) {
  const rows = await rest('templates', { method: 'POST', prefer: 'return=representation', body: t });
  return rows[0];
}
export async function removeTemplate(id) {
  await rest(`templates?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}
