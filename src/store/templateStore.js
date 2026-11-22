import { create } from 'zustand';
import { cloudEnabled, getVaultToken } from '../services/vault';

const KEY = 'meow-templates';
const readLocal = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const writeLocal = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ } };

async function api(method, body) {
  const r = await fetch('/api/templates', {
    method,
    headers: { 'Content-Type': 'application/json', 'x-meow-vault': getVaultToken() || '' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!(r.headers.get('content-type') || '').includes('json')) throw new Error('no_api');
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'template_error');
  return data;
}

const useCloud = async () => (await cloudEnabled()) && !!getVaultToken();

// Form/table templates: shared with the team via Supabase, or kept on this
// device (localStorage) when the cloud isn't set up.
export const useTemplates = create((set, get) => ({
  templates: readLocal(),
  shared: false,
  selectedId: '',

  load: async () => {
    if (await useCloud()) {
      try {
        const { templates } = await api('GET');
        set({ templates, shared: true });
        return;
      } catch { /* fall back */ }
    }
    set({ templates: readLocal(), shared: false });
  },

  save: async (name, structure) => {
    if (await useCloud()) {
      try {
        const { template } = await api('POST', { name, structure });
        set({ templates: [template, ...get().templates.filter((t) => t.id !== template.id)], shared: true });
        return template;
      } catch { /* fall back to local */ }
    }
    const template = { id: `local-${Date.now()}`, name, structure, created_at: new Date().toISOString() };
    const list = [template, ...readLocal()];
    writeLocal(list);
    set({ templates: list, shared: false });
    return template;
  },

  remove: async (id) => {
    if (String(id).startsWith('local-')) writeLocal(readLocal().filter((t) => t.id !== id));
    else await api('DELETE', { id });
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id), selectedId: s.selectedId === id ? '' : s.selectedId }));
  },

  select: (id) => set({ selectedId: id }),
  selected: () => get().templates.find((t) => t.id === get().selectedId) || null,
}));
