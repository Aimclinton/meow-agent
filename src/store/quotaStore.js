import { create } from 'zustand';

// Free monthly allowance, mirroring Vercel Hobby's 5,000 image transformations / month.
export const MONTHLY_LIMIT = 5000;
const KEY = 'meow-quota';

export const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.month === monthKey()) return saved;
  } catch { /* storage unavailable */ }
  return { month: monthKey(), used: 0 };
}

function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify({ month: state.month, used: state.used })); } catch { /* ignore */ }
}

export const useQuota = create((set, get) => ({
  ...load(),
  remaining: () => Math.max(0, MONTHLY_LIMIT - get().used),
  consume: (n = 1) => {
    const fresh = get().month === monthKey() ? get() : { month: monthKey(), used: 0 };
    const next = { month: fresh.month, used: Math.min(MONTHLY_LIMIT, fresh.used + n) };
    save(next);
    set(next);
  },
}));

// When the month rolls over, refresh the page so the quota resets everywhere.
export function watchMonthlyReset() {
  const started = useQuota.getState().month;
  const check = () => {
    if (monthKey() !== started) window.location.reload();
  };
  const id = setInterval(check, 30_000);
  document.addEventListener('visibilitychange', check);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', check);
  };
}
