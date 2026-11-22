import { useSettings } from '../store/settingsStore';
import { getAccessToken } from '../lib/supabase';
import { localOCR } from './localOcr';
import { structuredToContent, structuredToText } from '../utils/structure';
import { ocrPagesToDoc } from '../utils/ocrToDoc';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class ScanError extends Error {}

async function callApi(imageData, detailed) {
  const headers = { 'Content-Type': 'application/json' };
  const key = useSettings.getState().geminiKey;
  if (key) headers['x-user-gemini-key'] = key;
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch('/api/ocr', { method: 'POST', headers, body: JSON.stringify({ image: imageData, detailed: !!detailed }) });
  const isJSON = (r.headers.get('content-type') || '').includes('json');
  const body = isJSON ? await r.json().catch(() => ({})) : {};
  return { status: r.status, ok: r.ok && isJSON, body };
}

// Scan one page. Tries Gemini (via /api/ocr) and falls back to on-device
// Tesseract when the API is unavailable, unconfigured or out of quota.
// Returns { content, header, footer, references, ocrText, confidence, engine, usage }.
export async function scanPage(imageData, { detailed = false, onStage } = {}) {
  let fallbackReason = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    onStage?.({ stage: 'ai', progress: attempt ? 45 : 20 });
    let res;
    try {
      res = await callApi(imageData, detailed);
    } catch {
      fallbackReason = 'offline';
      break;
    }
    if (res.ok && res.body.page) {
      const page = res.body.page;
      return {
        content: structuredToContent(page),
        header: page.header || '',
        footer: page.footer || '',
        references: (page.references || []).filter(Boolean),
        ocrText: structuredToText(page),
        confidence: 100,
        engine: res.body.model || 'gemini',
        usage: res.body.usage || null,
      };
    }
    if (res.status === 401) throw new ScanError('กรุณาเข้าสู่ระบบก่อนสแกน');
    if (res.status === 429 && res.body.error === 'quota_exhausted') { fallbackReason = 'quota'; break; }
    if ([404, 405, 503].includes(res.status) || !Object.keys(res.body).length) { fallbackReason = 'no-api'; break; }
    if (res.status === 400) throw new ScanError('รูปนี้ส่งไม่ได้ ลองถ่ายใหม่');
    // rate limited / timeout / model error: wait and try once more, then go local
    fallbackReason = 'ai-failed';
    if (attempt === 0) await sleep(4000);
  }

  // Offline fallback
  const local = await localOCR(imageData, (s) => onStage?.({ stage: s.stage, progress: s.progress, offline: true }));
  const page = { ocrText: local.text, layout: local.layout };
  return {
    content: ocrPagesToDoc([page]),
    header: '',
    footer: '',
    references: [],
    ocrText: local.text,
    confidence: local.confidence,
    engine: 'tesseract',
    fallbackReason,
    usage: null,
  };
}
