import { create } from 'zustand';

export const useDocumentStore = create((set, get) => ({
  // Document state
  documents: [],
  currentDocId: null,
  currentDocument: null,

  // Password state
  passwordSet: false,
  isAuthenticated: false,

  // Load from IndexedDB
  initStore: async () => {
    const db = await openIndexedDB();
    const { docs, passwordSet } = await loadFromDB(db);
    set({ documents: docs, passwordSet });
  },

  // Document operations
  createDocument: (title = 'New Document') => {
    const newDoc = {
      id: Date.now().toString(),
      title,
      pages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => ({
      documents: [...state.documents, newDoc],
      currentDocId: newDoc.id,
      currentDocument: newDoc,
    }));
    saveToIndexedDB(newDoc);
    return newDoc;
  },

  addPage: (docId, page) => {
    set((state) => {
      const doc = state.documents.find((d) => d.id === docId);
      if (doc) {
        doc.pages.push(page);
        doc.updatedAt = new Date();
      }
      return { documents: [...state.documents] };
    });
  },

  deletePage: (docId, pageIndex) => {
    set((state) => {
      const doc = state.documents.find((d) => d.id === docId);
      if (doc) {
        doc.pages.splice(pageIndex, 1);
        doc.updatedAt = new Date();
      }
      return { documents: [...state.documents] };
    });
  },

  reorderPages: (docId, oldIndex, newIndex) => {
    set((state) => {
      const doc = state.documents.find((d) => d.id === docId);
      if (doc) {
        const [page] = doc.pages.splice(oldIndex, 1);
        doc.pages.splice(newIndex, 0, page);
        doc.updatedAt = new Date();
      }
      return { documents: [...state.documents] };
    });
  },

  updateDocumentTitle: (docId, title) => {
    set((state) => {
      const doc = state.documents.find((d) => d.id === docId);
      if (doc) {
        doc.title = title;
        doc.updatedAt = new Date();
      }
      return { documents: [...state.documents] };
    });
  },

  clearDocument: (docId) => {
    set((state) => {
      const doc = state.documents.find((d) => d.id === docId);
      if (doc) {
        doc.pages = [];
        doc.updatedAt = new Date();
      }
      return { documents: [...state.documents] };
    });
  },

  // Auth operations
  setPassword: (password) => {
    set({ passwordSet: true, isAuthenticated: true });
    savePasswordToIndexedDB(password);
  },

  authenticate: (password) => {
    // Compare with stored password (should be hashed in production)
    set({ isAuthenticated: true });
  },

  logout: () => {
    set({ isAuthenticated: false });
  },
}));

// IndexedDB helpers
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

export async function saveToIndexedDB(document) {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    const request = store.put(document);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function loadFromDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['documents', 'auth'], 'readonly');

    // Load documents
    const docStore = tx.objectStore('documents');
    const docRequest = docStore.getAll();

    // Load auth
    const authStore = tx.objectStore('auth');
    const authRequest = authStore.get('password');

    let docs = [];
    let passwordSet = false;
    let completed = 0;

    docRequest.onsuccess = () => {
      docs = docRequest.result;
      completed++;
      if (completed === 2) resolve({ docs, passwordSet });
    };

    authRequest.onsuccess = () => {
      passwordSet = !!authRequest.result;
      completed++;
      if (completed === 2) resolve({ docs, passwordSet });
    };

    tx.onerror = () => reject(tx.error);
  });
}

export async function savePasswordToIndexedDB(password) {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('auth', 'readwrite');
    const store = tx.objectStore('auth');
    // In production: hash the password with bcrypt or similar
    const request = store.put({ type: 'password', value: btoa(password) });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function verifyPassword(password) {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('auth', 'readonly');
    const store = tx.objectStore('auth');
    const request = store.get('password');
    request.onsuccess = () => {
      const stored = request.result?.value;
      resolve(stored === btoa(password));
    };
    request.onerror = () => reject(request.error);
  });
}
