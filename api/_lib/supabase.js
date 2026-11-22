import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, supabaseEnabled } from './config.js';

const headers = () => ({
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
});

// Returns the signed-in Supabase user for a request, or null.
export async function getUser(req) {
  if (!supabaseEnabled()) return null;
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
  });
  return r.ok ? r.json() : null;
}

export async function getUsage(day) {
  if (!supabaseEnabled()) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/meow_usage?day=eq.${encodeURIComponent(day)}&select=count`, { headers: headers() });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0]?.count || 0;
}

export async function addUsage(day, n = 1) {
  if (!supabaseEnabled()) return null;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/meow_increment_usage`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ p_day: day, p_n: n }),
  });
  return r.ok ? r.json() : null;
}
