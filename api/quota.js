import { DAILY_LIMIT, quotaDay, sendJSON, supabaseEnabled } from './_lib/config.js';
import { getUsage } from './_lib/supabase.js';

export default async function handler(req, res) {
  const day = quotaDay();
  const used = supabaseEnabled() ? await getUsage(day) : null;
  sendJSON(res, 200, {
    day,
    limit: DAILY_LIMIT,
    used,
    shared: used !== null,
    gemini: !!process.env.GEMINI_API_KEY,
    timeZone: 'America/Los_Angeles',
  });
}
