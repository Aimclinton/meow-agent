import { create } from 'zustand';

const KEY = 'meow-gemini-key';
const read = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };

// Optional personal Gemini key (BYOK) so a team member can use their own quota.
export const useSettings = create((set) => ({
  geminiKey: read(),
  setGeminiKey: (k) => {
    const v = (k || '').trim();
    try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch { /* ignore */ }
    set({ geminiKey: v });
  },
}));
