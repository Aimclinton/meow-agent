// Cloud sync of document history via Supabase (only when configured and signed in).
import { supabase, supabaseEnabled, getUserId } from '../lib/supabase';

const BUCKET = 'meow-pages';
const DAY = 24 * 60 * 60 * 1000;
const timers = new Map();

function dataURLToBlob(dataURL) {
  const [head, b64] = dataURL.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg';
  const bin = atob(b64 || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// Upload missing page images, then upsert the document row (without image bytes).
export async function pushDocument(doc) {
  const uid = await getUserId();
  if (!uid) return null;
  const pages = [];
  for (const p of doc.pages || []) {
    let imagePath = p.imagePath;
    const expected = `${uid}/${doc.id}/${p.id}.jpg`;
    if (p.imageData && imagePath !== expected) {
      const { error } = await supabase.storage.from(BUCKET).upload(expected, dataURLToBlob(p.imageData), { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      imagePath = expected;
    }
    const { imageData: _drop, ...rest } = p;
    pages.push({ ...rest, imagePath });
  }
  const data = { ...doc, pages };
  const { error } = await supabase.from('meow_documents').upsert({
    user_id: uid,
    id: doc.id,
    title: doc.title,
    data,
    updated_at: new Date(doc.updatedAt || Date.now()).toISOString(),
  });
  if (error) throw error;
  // Return the image paths so the local copy knows they're uploaded.
  return pages.map((p) => ({ id: p.id, imagePath: p.imagePath }));
}

// Debounced push (many edits → one upload).
export function schedulePush(doc, onDone) {
  if (!supabaseEnabled) return;
  clearTimeout(timers.get(doc.id));
  timers.set(doc.id, setTimeout(() => {
    timers.delete(doc.id);
    pushDocument(doc).then((paths) => paths && onDone?.(paths)).catch((err) => console.warn('Sync push failed', err));
  }, 1500));
}

export async function deleteRemote(doc) {
  const uid = await getUserId();
  if (!uid) return;
  const paths = (doc.pages || []).map((p) => `${uid}/${doc.id}/${p.id}.jpg`);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  await supabase.from('meow_documents').delete().eq('user_id', uid).eq('id', doc.id);
}

// Fetch the last 7 days from the cloud; returns docs newer than the local copies.
// Also removes cloud documents older than 7 days.
export async function pullDocuments(localDocs) {
  const uid = await getUserId();
  if (!uid) return [];
  const cutoff = new Date(Date.now() - 7 * DAY).toISOString();

  const { data: old } = await supabase.from('meow_documents').select('id,data').eq('user_id', uid).lt('updated_at', cutoff);
  for (const row of old || []) await deleteRemote(row.data).catch(() => {});

  const { data: rows, error } = await supabase.from('meow_documents').select('id,data,updated_at').eq('user_id', uid).gte('updated_at', cutoff);
  if (error) throw error;
  const local = new Map(localDocs.map((d) => [d.id, d]));
  const fresh = [];
  for (const row of rows || []) {
    const mine = local.get(row.id);
    if (mine && new Date(mine.updatedAt) >= new Date(row.updated_at)) continue;
    const doc = row.data;
    const pages = [];
    for (const p of doc.pages || []) {
      const cached = mine?.pages?.find((x) => x.id === p.id)?.imageData;
      let imageData = cached;
      if (!imageData && p.imagePath) {
        const { data: blob } = await supabase.storage.from(BUCKET).download(p.imagePath);
        if (blob) imageData = await blobToDataURL(blob);
      }
      pages.push({ ...p, imageData });
    }
    fresh.push({ ...doc, pages, updatedAt: row.updated_at });
  }
  // Push local documents the cloud doesn't have yet (e.g. made before signing in).
  const remoteIds = new Set((rows || []).map((r) => r.id));
  localDocs.filter((d) => !remoteIds.has(d.id)).forEach((d) => schedulePush(d));
  return fresh;
}
