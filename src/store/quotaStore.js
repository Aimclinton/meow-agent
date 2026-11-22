import { create } from 'zustand';
import { useSettings } from './settingsStore';

// Gemini free tier: primary model allows ~500 requests/day, reset at midnight Pacific.
export const DEFAULT_LIMIT = 500;
export const MONTHLY_LIMIT = DEFAULT_LIMIT; // kept for older imports

export const quotaDay = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const storageKey = () => (useSettings.getState().geminiKey ? 'meow-quota-byok' : 'meow-quota');

function loadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()) || 'null');
    if (saved && saved.day === quotaDay()) return saved.used || 0;
  } catch { /* ignore */ }
  return 0;
}

function saveLocal(used) {
  try { localStorage.setItem(storageKey(), JSON.stringify({ day: quotaDay(), used })); } catch { /* ignore */ }
}

export const useQuota = create((set, get) => ({
  day: quotaDay(),
  limit: DEFAULT_LIMIT,
  used: loadLocal(),
  shared: false, // true when the count comes from the server (whole team)

  // Ask the server for the team-wide count (Supabase) if available.
  refresh: async () => {
    try {
      const r = await fetch('/api/quota', { cache: 'no-store' });
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error('no api');
      const q = await r.json();
      const byok = !!useSettings.getState().geminiKey;
      if (q.shared && !byok) set({ limit: q.limit, used: q.used, shared: true, day: q.day });
      else set({ limit: q.limit || DEFAULT_LIMIT, used: loadLocal(), shared: false });
    } catch {
      set({ used: loadLocal(), shared: false });
    }
  },

  // Called after each successful scan. serverUsage comes from /api/ocr.
  consume: (serverUsage) => {
    if (serverUsage && typeof serverUsage.used === 'number' && !useSettings.getState().geminiKey) {
      set({ used: serverUsage.used, limit: serverUsage.limit, shared: true });
      return;
    }
    const used = get().used + 1;
    saveLocal(used);
    set({ used });
  },

  remaining: () => Math.max(0, get().limit - get().used),
}));

// Reload the page when the daily quota window rolls over (midnight Pacific).
export function watchQuotaReset() {
  const started = quotaDay();
  const check = () => { if (quotaDay() !== started) window.location.reload(); };
  const id = setInterval(check, 30_000);
  document.addEventListener('visibilitychange', check);
  useQuota.getState().refresh();
  const unsub = useSettings.subscribe(() => useQuota.getState().refresh());
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', check);
    unsub();
  };
}
export const watchMonthlyReset = watchQuotaReset;
