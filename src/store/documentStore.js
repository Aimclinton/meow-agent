import { create } from 'zustand';

const HISTORY_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// Persist the latest version of one document (pages included).
function persist(get, docId) {
  const doc = get().documents.find((d) => d.id === docId);
  if (doc) saveToIndexedDB(doc).catch((err) => console.error('Save failed', err));
}

function touch(doc) {
  return { ...doc, updatedAt: new Date() };
}

export const useDocumentStore = create((set, get) => ({
  documents: [],
  currentDocId: null,

  passwordSet: false,
  isAuthenticated: false,

  initStore: async () => {
    const db = await openIndexedDB();
    const { docs, passwordSet } = await loadFromDB(db);
    // Drop documents older than the history window.
    const cutoff = Date.now() - HISTORY_DAYS * DAY_MS;
    const fresh = [];
    for (const doc of docs) {
      if (new Date(doc.updatedAt).getTime() < cutoff) deleteFromIndexedDB(doc.id);
      else fresh.push(doc);
    }
    fresh.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    set({ documents: fresh, passwordSet });
  },

  // Create a document, optionally with its pages, and save it.
  createDocument: (title = 'New Document', pages = []) => {
    const now = new Date();
    const newDoc = {
      id: Date.now().toString(),
      title: title.trim() || 'New Document',
      pages: pages.map((p, i) => ({ ...p, pageNumber: i + 1 })),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ documents: [...state.documents, newDoc], currentDocId: newDoc.id }));
    saveToIndexedDB(newDoc).catch((err) => console.error('Save failed', err));
    return newDoc;
  },

  updateDoc: (docId, fn) => {
    set((state) => ({
      documents: state.documents.map((d) => (d.id === docId ? touch(fn(d)) : d)),
    }));
    persist(get, docId);
  },

  addPage: (docId, page) =>
    get().updateDoc(docId, (d) => ({ ...d, pages: [...d.pages, page] })),

  deletePage: (docId, pageIndex) =>
    get().updateDoc(docId, (d) => ({ ...d, pages: d.pages.filter((_, i) => i !== pageIndex) })),

  reorderPages: (docId, oldIndex, newIndex) =>
    get().updateDoc(docId, (d) => {
      const pages = [...d.pages];
      const [page] = pages.splice(oldIndex, 1);
      pages.splice(newIndex, 0, page);
      return { ...d, pages };
    }),

  updatePageText: (docId, pageId, ocrText) =>
    get().updateDoc(docId, (d) => ({
      ...d,
      pages: d.pages.map((p) => (p.id === pageId ? { ...p, ocrText, layout: null } : p)), // edited text wins over OCR layout
    })),

  updateDocumentTitle: (docId, title) =>
    get().updateDoc(docId, (d) => ({ ...d, title })),

  deleteDocument: (docId) => {
    set((state) => ({ documents: state.documents.filter((d) => d.id !== docId) }));
    deleteFromIndexedDB(docId);
  },

  getRecentDocuments: () => {
    const cutoff = Date.now() - HISTORY_DAYS * DAY_MS;
    return get().documents.filter((doc) => new Date(doc.updatedAt).getTime() > cutoff);
  },

  // ---- Auth ----
  // Returns the recovery code the user must keep for "forgot password".
  setPassword: async (password) => {
    const recoveryCode = generateRecoveryCode();
    await saveAuth(password, recoveryCode);
    return recoveryCode; // call finishAuth() once the user has saved it
  },

  // Reset with the recovery code: keeps all documents, issues a new code.
  resetPasswordWithCode: async (code, newPassword) => {
    const ok = await verifyRecoveryCode(code);
    if (!ok) return null;
    const recoveryCode = generateRecoveryCode();
    await saveAuth(newPassword, recoveryCode);
    return recoveryCode;
  },

  // Last resort when the code is lost too: wipe everything on this device.
  resetEverything: async () => {
    await clearAllData();
    set({ documents: [], passwordSet: false, isAuthenticated: false });
  },

  finishAuth: () => set({ passwordSet: true, isAuthenticated: true }),
  authenticate: () => set({ isAuthenticated: true }),
  logout: () => set({ isAuthenticated: false }),
}));

// ---------- crypto helpers ----------
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomHex(bytes = 16) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// e.g. MEOW-7K2P-QX9D-4HTA (no 0/O/1/I to avoid confusion)
function generateRecoveryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const vals = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...vals].map((v) => alphabet[v % alphabet.length]).join('');
  return `MEOW-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

export function normalizeCode(code) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// ---------- IndexedDB ----------
export async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DocScanner', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth', { keyPath: 'type' });
      }
    };
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function getAuthRecord(db, type) {
  return new Promise((resolve, reject) => {
    const req = db.transaction('auth', 'readonly').objectStore('auth').get(type);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveToIndexedDB(document) {
  const db = await openIndexedDB();
  const tx = db.transaction('documents', 'readwrite');
  tx.objectStore('documents').put(document);
  return txDone(tx);
}

export async function loadFromDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['documents', 'auth'], 'readonly');
    const docRequest = tx.objectStore('documents').getAll();
    const authRequest = tx.objectStore('auth').get('password');
    tx.oncomplete = () => resolve({ docs: docRequest.result || [], passwordSet: !!authRequest.result });
    tx.onerror = () => reject(tx.error);
  });
}

async function saveAuth(password, recoveryCode) {
  const salt = randomHex();
  const codeSalt = randomHex();
  const db = await openIndexedDB();
  const tx = db.transaction('auth', 'readwrite');
  const store = tx.objectStore('auth');
  store.put({ type: 'password', salt, hash: await sha256(salt + password) });
  store.put({ type: 'recovery', salt: codeSalt, hash: await sha256(codeSalt + normalizeCode(recoveryCode)) });
  return txDone(tx);
}

export async function verifyPassword(password) {
  const db = await openIndexedDB();
  const rec = await getAuthRecord(db, 'password');
  if (!rec) return false;
  if (rec.hash) return rec.hash === (await sha256(rec.salt + password));
  // Legacy format (base64) from earlier versions.
  return rec.value === btoa(unescape(encodeURIComponent(password))) || rec.value === safeBtoa(password);
}

function safeBtoa(s) {
  try { return btoa(s); } catch { return null; }
}

export async function hasRecoveryCode() {
  const db = await openIndexedDB();
  return !!(await getAuthRecord(db, 'recovery'));
}

async function verifyRecoveryCode(code) {
  const db = await openIndexedDB();
  const rec = await getAuthRecord(db, 'recovery');
  if (!rec) return false;
  return rec.hash === (await sha256(rec.salt + normalizeCode(code)));
}

export async function deleteFromIndexedDB(docId) {
  const db = await openIndexedDB();
  const tx = db.transaction('documents', 'readwrite');
  tx.objectStore('documents').delete(docId);
  return txDone(tx);
}

async function clearAllData() {
  const db = await openIndexedDB();
  const tx = db.transaction(['documents', 'auth'], 'readwrite');
  tx.objectStore('documents').clear();
  tx.objectStore('auth').clear();
  return txDone(tx);
}
