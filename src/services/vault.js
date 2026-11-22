// Cloud history keyed by password ("vault"): same password → same documents on
// every device. Talks only to our /api/vault function (Supabase stays server-side).

let token = null; // derived from the password, kept in memory only
let enabledPromise = null;
const timers = new Map();

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const normalize = (code) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const tokenFor = (password) => sha256hex(`meow-vault-v1:${password}`);
export const recoveryTokenFor = (code) => sha256hex(`meow-rc-v1:${normalize(code)}`);

async function post(body) {
  const r = await fetch('/api/vault', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!(r.headers.get('content-type') || '').includes('json')) throw new Error('no_api');
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.error || 'vault_error'), { status: r.status, code: data.error });
  return data;
}

export function cloudEnabled() {
  if (!enabledPromise) {
    enabledPromise = post({ action: 'status' }).then((d) => !!d.enabled).catch(() => false);
  }
  return enabledPromise;
}

const LINK_KEY = 'meow-cloud-linked';
const markLinked = () => { try { localStorage.setItem(LINK_KEY, '1'); } catch { /* ignore */ } };
// Has this device ever been connected to a cloud history?
export const wasLinked = () => { try { return localStorage.getItem(LINK_KEY) === '1'; } catch { return false; } };

export const getVaultToken = () => token;
export const setVaultToken = (t) => { token = t; };

// Does a vault exist for this password? With create=true, make it (needs a recovery code).
export async function openVault(password, { create = false, recoveryCode } = {}) {
  if (!(await cloudEnabled())) return { enabled: false };
  const t = await tokenFor(password);
  const res = await post({
    action: 'open',
    token: t,
    create,
    recovery: recoveryCode ? await recoveryTokenFor(recoveryCode) : undefined,
  });
  if (res.exists) { token = t; markLinked(); }
  return res;
}

// Forgot password across devices: recovery code → attach new password to the same vault.
export async function recoverVault(code, newPassword) {
  if (!(await cloudEnabled())) return { enabled: false };
  const newToken = await tokenFor(newPassword);
  try {
    await post({ action: 'recover', recovery: await recoveryTokenFor(code), newToken });
    token = newToken;
    markLinked();
    return { ok: true };
  } catch (err) {
    if (err.code === 'bad_code') return { ok: false, reason: 'bad_code' };
    if (err.code === 'password_taken') return { ok: false, reason: 'password_taken' };
    throw err;
  }
}

async function urlToDataURL(url) {
  const r = await fetch(url);
  if (!r.ok) return null;
  const blob = await r.blob();
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(blob);
  });
}

// Download the last 7 days and return documents newer than the local copies.
export async function pullFromCloud(localDocs) {
  if (!token) return [];
  const { docs } = await post({ action: 'list', token });
  const local = new Map(localDocs.map((d) => [String(d.id), d]));
  const fresh = [];
  for (const doc of docs) {
    const mine = local.get(String(doc.id));
    if (mine && new Date(mine.updatedAt) >= new Date(doc.updatedAt)) continue;
    const pages = [];
    for (const p of doc.pages || []) {
      const { imageUrl, ...rest } = p;
      const cached = mine?.pages?.find((x) => x.id === p.id)?.imageData;
      pages.push({ ...rest, imageData: cached || (imageUrl ? await urlToDataURL(imageUrl) : null) });
    }
    fresh.push({ ...doc, pages });
  }
  const remote = new Set(docs.map((d) => String(d.id)));
  localDocs.filter((d) => !remote.has(String(d.id))).forEach((d) => schedulePush(d));
  return fresh;
}

async function push(doc, onUploaded) {
  const uploaded = [];
  for (const p of doc.pages || []) {
    if (p.uploaded || !p.imageData) continue;
    await post({ action: 'image', token, docId: doc.id, pageId: p.id, image: p.imageData });
    uploaded.push(p.id);
  }
  const pages = doc.pages.map((p) => ({ ...p, uploaded: p.uploaded || uploaded.includes(p.id) }));
  await post({ action: 'save', token, doc: { ...doc, pages } });
  if (uploaded.length) onUploaded?.(uploaded);
}

// Debounced upload (many edits → one save).
export function schedulePush(doc, onUploaded) {
  if (!token) return;
  clearTimeout(timers.get(doc.id));
  timers.set(doc.id, setTimeout(() => {
    timers.delete(doc.id);
    push(doc, onUploaded).catch((err) => console.warn('Cloud save failed', err));
  }, 1500));
}

export async function deleteFromCloud(docId) {
  if (!token) return;
  clearTimeout(timers.get(docId));
  await post({ action: 'delete', token, docId });
}
