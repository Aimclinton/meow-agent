import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';

const LANGS = ['tha', 'eng'];

// One shared worker for the whole app: language data is downloaded once
// (and cached by the browser), later pages start instantly.
let workerPromise = null;
let progressListener = null;

function getWorker() {
  if (!workerPromise) {
    const base = new URL(`${import.meta.env.BASE_URL}tesseract/`, window.location.origin).href;
    workerPromise = createWorker(LANGS, 1, {
      workerPath: `${base}worker.min.js`,
      corePath: `${base}core`,
      langPath: `${base}lang`,
      logger: (m) => progressListener?.(m),
    }).catch((err) => {
      workerPromise = null; // allow a retry after a network error
      throw err;
    });
  }
  return workerPromise;
}

// Tesseract's Thai output puts spaces between characters and splits sara am.
const THAI_GAP = /([\u0E00-\u0E7F]) +(?=[\u0E00-\u0E7F])/g;
export function cleanThai(t = '') {
  return t.replace(/\u0E4D\s*\u0E32/g, '\u0E33').replace(THAI_GAP, '$1');
}

// Compact layout used to rebuild structure: per line its text, height,
// paragraph id and the cells separated by wide horizontal gaps (tables).
function extractLayout(data) {
  const lines = [];
  let pid = 0;
  (data.blocks || []).forEach((block) => {
    (block.paragraphs || []).forEach((para) => {
      pid += 1;
      (para.lines || []).forEach((line) => {
        const words = (line.words || []).filter((w) => w.text.trim()).sort((a, b) => a.bbox.x0 - b.bbox.x0);
        if (!words.length) return;
        const width = line.bbox.x1 - line.bbox.x0;
        const chars = words.reduce((n, w) => n + w.text.length, 0) || 1;
        const charW = width / (chars + words.length - 1);
        const cells = [[words[0].text]];
        for (let i = 1; i < words.length; i++) {
          const gap = words[i].bbox.x0 - words[i - 1].bbox.x1;
          if (gap > charW * 2.2) cells.push([words[i].text]);
          else cells[cells.length - 1].push(words[i].text);
        }
        const hs = words.map((w) => w.bbox.y1 - w.bbox.y0).sort((a, b) => a - b);
        lines.push({
          t: cleanThai(words.map((w) => w.text).join(' ')),
          h: hs[Math.floor(hs.length / 2)],
          cw: charW,
          p: pid,
          x: line.bbox.x0,
          cells: cells.map((c) => cleanThai(c.join(' '))),
        });
      });
    });
  });
  return { lines };
}

// Map tesseract's log messages to one 0-100 bar with a friendly label.
function toStage(m) {
  const p = typeof m.progress === 'number' ? m.progress : 0;
  if (m.status === 'recognizing text') return { stage: 'reading', progress: 30 + Math.round(p * 70) };
  if (m.status?.includes('traineddata')) return { stage: 'download', progress: 5 + Math.round(p * 20) };
  if (m.status?.includes('core') || m.status?.includes('tesseract')) return { stage: 'boot', progress: Math.round(p * 5) };
  if (m.status?.includes('api')) return { stage: 'boot', progress: 28 };
  return null;
}

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('boot');
  const [error, setError] = useState(null);

  const processImage = useCallback(async (imageData) => {
    setIsProcessing(true);
    setProgress(0);
    setStage('boot');
    setError(null);
    progressListener = (m) => {
      const s = toStage(m);
      if (s) {
        setStage(s.stage);
        setProgress((prev) => Math.max(prev, s.progress));
      }
    };

    try {
      const worker = await getWorker();
      setStage('reading');
      setProgress((prev) => Math.max(prev, 30));
      const { data } = await worker.recognize(imageData, {}, { text: true, blocks: true });
      setProgress(100);
      return {
        text: cleanThai(data.text || '').trim(),
        confidence: data.confidence || 0,
        layout: extractLayout(data),
      };
    } catch (err) {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setError(
        offline
          ? 'ยังไม่ได้ต่ออินเทอร์เน็ต — ครั้งแรกต้องโหลดข้อมูลภาษาก่อน'
          : `อ่านข้อความไม่สำเร็จ (${err?.message || err})`
      );
      console.error('OCR error', err);
      return null;
    } finally {
      progressListener = null;
      setIsProcessing(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { processImage, isProcessing, progress, stage, error, clearError };
}
