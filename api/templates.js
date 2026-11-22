import { readJSON, sendJSON, supabaseEnabled } from './_lib/config.js';
import { dbReady, findVault, insertTemplate, listTemplates, removeTemplate } from './_lib/supabase.js';

// Shared template library for the whole team (stored in Supabase `templates`).
export default async function handler(req, res) {
  if (!supabaseEnabled() || !(await dbReady()).ok) return sendJSON(res, 200, { enabled: false, templates: [] });
  const token = req.headers['x-meow-vault'];
  if (!(await findVault(token).catch(() => null))) return sendJSON(res, 401, { error: 'unauthorized' });

  try {
    if (req.method === 'GET') return sendJSON(res, 200, { enabled: true, templates: await listTemplates() });
    const body = await readJSON(req);
    if (req.method === 'POST') {
      const name = String(body.name || '').trim().slice(0, 80);
      if (!name || !body.structure?.blocks) return sendJSON(res, 400, { error: 'bad_template' });
      const size = JSON.stringify(body.structure).length;
      if (size > 50_000) return sendJSON(res, 413, { error: 'too_large' });
      const t = await insertTemplate({ name, description: String(body.description || '').slice(0, 200), structure: body.structure });
      return sendJSON(res, 200, { template: t });
    }
    if (req.method === 'DELETE') {
      await removeTemplate(String(body.id));
      return sendJSON(res, 200, { ok: true });
    }
    return sendJSON(res, 405, { error: 'method_not_allowed' });
  } catch (err) {
    return sendJSON(res, 500, { error: 'server_error', message: String(err.message || err).slice(0, 200) });
  }
}
