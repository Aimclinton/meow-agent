import { DAILY_LIMIT, DETAILED_MODEL, FALLBACK_MODELS, PRIMARY_MODEL, quotaDay, readJSON, sendJSON, supabaseEnabled } from './_lib/config.js';
import { addUsage, findVault, getUsage } from './_lib/supabase.js';
import { transcribePage } from './_lib/gemini.js';


export default async function handler(req, res) {
  const started = Date.now();
  if (req.method !== 'POST') return sendJSON(res, 405, { error: 'method_not_allowed' });

  // With Supabase configured, only people logged in with a team password may use the shared key.
  const userKey = (req.headers['x-user-gemini-key'] || '').trim();
  if (supabaseEnabled() && !userKey) {
    const vault = await findVault(req.headers['x-meow-vault']).catch(() => null);
    if (!vault) return sendJSON(res, 401, { error: 'unauthorized' });
  }

  const apiKey = userKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return sendJSON(res, 503, { error: 'not_configured', message: 'GEMINI_API_KEY is not set' });

  let body;
  try {
    body = await readJSON(req);
  } catch {
    return sendJSON(res, 400, { error: 'bad_json' });
  }
  const match = /^data:(image\/[\w.+-]+);base64,(.+)$/s.exec(body.image || '');
  if (!match) return sendJSON(res, 400, { error: 'bad_image' });

  const day = quotaDay();
  const shared = !userKey;
  if (shared) {
    const used = await getUsage(day);
    if (used !== null && used >= DAILY_LIMIT) return sendJSON(res, 429, { error: 'quota_exhausted', used, limit: DAILY_LIMIT, day });
  }

  const models = body.detailed
    ? [DETAILED_MODEL, ...FALLBACK_MODELS.filter((m) => m !== DETAILED_MODEL)]
    : [PRIMARY_MODEL, ...FALLBACK_MODELS];

  try {
    const { page, model } = await transcribePage({
      image: match[2],
      mimeType: match[1],
      apiKey,
      models: [...new Set(models)],
      deadline: started + 60_000,
      template: body.template && body.template.structure ? body.template : undefined,
    });
    const used = shared ? await addUsage(day, 1) : null;
    return sendJSON(res, 200, { page, model, usage: used === null ? null : { used, limit: DAILY_LIMIT, day } });
  } catch (err) {
    const status = err.status === 429 ? 429 : err.status === 504 ? 504 : 502;
    return sendJSON(res, status, { error: status === 429 ? 'rate_limited' : 'ocr_failed', message: String(err.message || err).slice(0, 400) });
  }
}
