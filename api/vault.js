import { readJSON, sendJSON, supabaseEnabled } from './_lib/config.js';
import {
  createVault, dbReady, deleteDoc, findVault, imagePath, listDocs, listOldDocs, recoverVault, saveDoc, signedUrls, uploadImage,
} from './_lib/supabase.js';

const DAY = 24 * 60 * 60 * 1000;

// One endpoint for cloud history. A "vault" is identified by the password:
// every device that logs in with the same password sees the same documents.
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'method_not_allowed' });
  if (!supabaseEnabled()) return sendJSON(res, 200, { enabled: false });

  let body;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: 'bad_json' });
  }
  const { action, token } = body;

  try {
    // Not ready (wrong URL/key or schema.sql not run) → the app quietly stays local.
    const ready = await dbReady();
    if (!ready.ok) return sendJSON(res, 200, { enabled: false, reason: ready.reason, message: ready.message });
    if (action === 'status') return sendJSON(res, 200, { enabled: true });

    if (action === 'open') {
      const id = await findVault(token);
      if (id) return sendJSON(res, 200, { enabled: true, exists: true });
      if (!body.create) return sendJSON(res, 200, { enabled: true, exists: false });
      await createVault(token, body.recovery);
      return sendJSON(res, 200, { enabled: true, exists: true, created: true });
    }

    if (action === 'recover') {
      try {
        const id = await recoverVault(body.recovery, body.newToken);
        return sendJSON(res, id ? 200 : 404, id ? { ok: true } : { error: 'bad_code' });
      } catch (err) {
        if (err.code === 'password_taken') return sendJSON(res, 409, { error: 'password_taken' });
        throw err;
      }
    }

    const vaultId = await findVault(token);
    if (!vaultId) return sendJSON(res, 401, { error: 'unknown_vault' });

    if (action === 'list') {
      const now = Date.now();
      const old = await listOldDocs(vaultId, new Date(now - 7 * DAY).toISOString());
      await Promise.all(old.map((d) => deleteDoc(vaultId, d.id).catch(() => {})));
      const rows = await listDocs(vaultId, new Date(now - 7 * DAY).toISOString());
      const paths = rows.flatMap((r) => (r.data.pages || []).filter((p) => p.uploaded).map((p) => imagePath(vaultId, r.id, p.id)));
      const urls = await signedUrls(paths);
      const docs = rows.map((r) => ({
        ...r.data,
        updatedAt: r.updated_at,
        pages: (r.data.pages || []).map((p) => ({ ...p, imageUrl: urls[imagePath(vaultId, r.id, p.id)] || null })),
      }));
      return sendJSON(res, 200, { docs });
    }

    if (action === 'save') {
      const doc = body.doc;
      if (!doc?.id) return sendJSON(res, 400, { error: 'bad_doc' });
      const clean = { ...doc, pages: (doc.pages || []).map(({ imageData: _i, imageUrl: _u, ...p }) => p) };
      await saveDoc(vaultId, clean);
      return sendJSON(res, 200, { ok: true });
    }

    if (action === 'image') {
      const m = /^data:(image\/[\w.+-]+);base64,(.+)$/s.exec(body.image || '');
      if (!m || !body.docId || !body.pageId) return sendJSON(res, 400, { error: 'bad_image' });
      await uploadImage(imagePath(vaultId, body.docId, body.pageId), Buffer.from(m[2], 'base64'), m[1]);
      return sendJSON(res, 200, { ok: true });
    }

    if (action === 'delete') {
      await deleteDoc(vaultId, String(body.docId));
      return sendJSON(res, 200, { ok: true });
    }

    return sendJSON(res, 400, { error: 'unknown_action' });
  } catch (err) {
    console.error('vault error', err);
    return sendJSON(res, 500, { error: 'server_error', message: String(err.message || err).slice(0, 200) });
  }
}
