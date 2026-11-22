// Server-side configuration (all overridable with Vercel environment variables).
export const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';
export const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3-flash-preview,gemini-flash-latest')
  .split(',').map((s) => s.trim()).filter(Boolean);
export const DETAILED_MODEL = process.env.GEMINI_DETAILED_MODEL || 'gemini-3-flash-preview';
// Shared free allowance per day (Gemini free tier RPD of the primary model).
export const DAILY_LIMIT = Number(process.env.DAILY_LIMIT || 500);

// Accept the Project URL in any common form: trailing slash, or with /rest/v1 pasted on.
export const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/(rest|auth|storage)\/v1$/, '');
export const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
export const supabaseEnabled = () => !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

// Gemini free-tier daily quotas reset at midnight Pacific time.
export function quotaDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function sendJSON(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export async function readJSON(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}
