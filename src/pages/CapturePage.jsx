import { useEffect, useRef, useState } from 'react';
import CameraCapture from '../components/CameraCapture';
import CalicoCat from '../components/CalicoCat';
import { Button, Card, PageTitle, PixelProgress, TypeLine } from '../components/ui';
import { compressToDataURL } from '../utils/image';
import { scanPage } from '../services/ocrClient';
import { useQuota } from '../store/quotaStore';

// Album picker: explicit types and NO `capture` attribute, so phones open the
// photo library / gallery instead of forcing the camera.
const GALLERY_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

const STAGE_TEXT = {
  ai: 'แมว AI กำลังแกะหัวข้อ ตาราง และตัวหนา',
  boot: 'โหมดออฟไลน์: ปลุกแมวให้ตื่น',
  download: 'โหมดออฟไลน์: โหลดพจนานุกรมไทย-อังกฤษ',
  reading: 'โหมดออฟไลน์: แมวกำลังอ่าน',
};

let nextId = 0;
const newId = () => `${Date.now()}-${nextId++}`;

export default function CapturePage({ onCapture }) {
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');
  const [camera, setCamera] = useState(false);
  const [pickError, setPickError] = useState('');
  const [working, setWorking] = useState(null); // { id, stage, progress, offline }
  const [scanError, setScanError] = useState('');
  const albumRef = useRef(null);
  const nativeCamRef = useRef(null);
  const consume = useQuota((q) => q.consume);

  const add = (imageData) =>
    setPages((prev) => [...prev, { id: newId(), imageData, status: 'queued', ocrText: '', confidence: 0 }]);

  // Sequential queue: one page at a time, in order.
  useEffect(() => {
    if (working) return;
    const next = pages.find((p) => p.status === 'queued');
    if (!next) return;
    setWorking({ id: next.id, stage: 'ai', progress: 5 });
    setPages((prev) => prev.map((p) => (p.id === next.id ? { ...p, status: 'reading' } : p)));
    scanPage(next.imageData, {
      onStage: (s) => setWorking((w) => (w ? { ...w, ...s, progress: Math.max(w.progress, s.progress || 0) } : w)),
    })
      .then((res) => {
        consume(res.usage);
        setPages((prev) => prev.map((p) => (p.id === next.id ? { ...p, ...res, status: 'done' } : p)));
      })
      .catch((err) => {
        setScanError(err.message || 'สแกนไม่สำเร็จ');
        setPages((prev) => prev.map((p) => (p.id === next.id ? { ...p, status: 'error' } : p)));
      })
      .finally(() => setWorking(null));
  }, [pages, working, consume]);

  const pickFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    setPickError('');
    for (const f of files) {
      try {
        add(await compressToDataURL(f));
      } catch {
        setPickError('เปิดรูปบางรูปไม่ได้ (ลองเลือกเป็น JPG/PNG)');
      }
    }
  };

  const retry = (id) => {
    setScanError('');
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'queued' } : p)));
  };
  const remove = (id) => setPages((prev) => prev.filter((p) => p.id !== id));
  const move = (i, dir) =>
    setPages((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const queued = pages.filter((p) => p.status === 'queued').length;
  const busy = !!working || queued > 0;
  const currentIndex = working ? pages.findIndex((p) => p.id === working.id) + 1 : 0;

  const finish = () => {
    const done = pages
      .filter((p) => p.status === 'done' || p.status === 'error')
      .map((p) => {
        const { status: _status, ...rest } = p;
        return { ...rest, timestamp: new Date() };
      });
    onCapture(done, title || `Scan ${new Date().toLocaleDateString()}`);
  };

  return (
    <div className="safe-x pb-36">
      <div className="max-w-6xl mx-auto pt-8">
        <PageTitle kicker="Step 01" title="Scan">
          ถ่ายหรือเลือกรูปเอกสาร ได้หลายหน้า แมวจะประมวลผลทีละหน้าตามลำดับ ระหว่างนั้นถ่ายหน้าต่อไปได้เลย
        </PageTitle>

        <label className="block max-w-md mb-8">
          <span className="block text-xs uppercase tracking-wider text-ink/60 mb-2">Document title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น รายงานเคส 001"
            className="w-full min-h-[52px] px-4 bg-white/70 border border-ink/20 rounded-[3px] outline-none focus:border-ink focus:bg-white transition"
          />
        </label>

        {(working || scanError) && (
          <Card className="rise p-4 md:p-5 mb-6 flex items-center gap-4" aria-live="polite">
            <div className="w-16 shrink-0">
              <CalicoCat mood={scanError && !working ? 'closed' : 'open'} backdrop={false} blink={false} />
            </div>
            <div className="flex-1 min-w-0">
              {!working ? (
                <p className="text-sm text-red-700">{scanError}</p>
              ) : (
                <>
                  <p className="text-sm font-medium mb-1">กำลังประมวลผลหน้าที่ {currentIndex} จาก {pages.length}...</p>
                  <p className="text-xs text-ink/60 mb-3 truncate">
                    <TypeLine key={working.stage} text={STAGE_TEXT[working.stage] || STAGE_TEXT.ai} />
                  </p>
                  <PixelProgress value={working.progress} />
                </>
              )}
            </div>
          </Card>
        )}

        {pages.length === 0 ? (
          <Card className="viewfinder text-ink/70 border-dashed py-10 md:py-14 px-6 text-center">
            <i /><i /><i /><i />
            <div className="w-28 mx-auto mb-6">
              <CalicoCat backdrop={false} />
            </div>
            <p className="font-pixel text-lg uppercase mb-1 text-ink">No pages yet</p>
            <p className="text-sm text-ink/60 mb-6">เริ่มจากถ่ายรูปหรือเลือกรูปจากอัลบั้ม</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => setCamera(true)}>📷 Open Camera</Button>
              <Button variant="ghost" onClick={() => albumRef.current?.click()}>🖼 Choose Photo</Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {pages.map((p, i) => (
              <Card key={p.id} className="rise overflow-hidden">
                <div className="relative aspect-[3/4] bg-white overflow-hidden scanlines">
                  <img src={p.imageData} alt={`Page ${i + 1}`} className="w-full h-full object-contain" />
                  {(p.status === 'reading' || p.status === 'queued') && (
                    <div className="absolute inset-0 bg-paper/30">{p.status === 'reading' && <div className="scan-beam" />}</div>
                  )}
                  <span className="absolute top-2 left-2 bg-ink text-paper font-pixel text-xs px-2 py-1">{String(i + 1).padStart(2, '0')}</span>
                  <button
                    onClick={() => remove(p.id)}
                    aria-label="Remove page"
                    className="absolute top-1 right-1 w-10 h-10 grid place-items-center text-paper bg-ink/70 hover:bg-ink rounded-[3px]"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-3 text-xs min-h-[64px]">
                  {p.status === 'queued' && <span className="text-ink/50">รอคิว...</span>}
                  {p.status === 'reading' && <span className="text-[#c9661d]">กำลังประมวลผล...</span>}
                  {p.status === 'done' && (
                    <>
                      <span className="text-ink/50">{p.engine === 'tesseract' ? `ออฟไลน์ · ${Math.round(p.confidence)}%` : 'AI ✓'}</span>
                      <p className="line-clamp-2 mt-1 text-ink/80">{p.ocrText || '(ไม่พบข้อความ)'}</p>
                    </>
                  )}
                  {p.status === 'error' && (
                    <button onClick={() => retry(p.id)} className="font-menu text-red-700 underline underline-offset-4 min-h-[40px]">
                      ไม่สำเร็จ — ลองใหม่
                    </button>
                  )}
                </div>
                <div className="flex border-t border-ink/10">
                  <button disabled={i === 0} onClick={() => move(i, -1)} aria-label="เลื่อนขึ้น" className="flex-1 h-10 hover:bg-ink/5 disabled:opacity-25">↑</button>
                  <button disabled={i === pages.length - 1} onClick={() => move(i, 1)} aria-label="เลื่อนลง" className="flex-1 h-10 hover:bg-ink/5 disabled:opacity-25 border-l border-ink/10">↓</button>
                </div>
              </Card>
            ))}
            <button
              onClick={() => albumRef.current?.click()}
              className="aspect-[3/4] border border-dashed border-ink/30 rounded-[3px] grid place-items-center text-ink/60 hover:border-ink hover:text-ink transition"
            >
              <span className="text-center font-menu text-sm">
                <span className="block font-pixel text-3xl mb-2">+</span>
                เพิ่มหน้า
              </span>
            </button>
          </div>
        )}

        {pickError && <p className="text-sm text-red-700 mt-4">{pickError}</p>}

        <input ref={albumRef} type="file" accept={GALLERY_ACCEPT} multiple onChange={pickFiles} className="hidden" data-testid="album-input" />
        {/* System camera fallback when the live camera is blocked */}
        <input ref={nativeCamRef} type="file" accept="image/*" capture="environment" onChange={pickFiles} className="hidden" />
      </div>

      {pages.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-paper/90 backdrop-blur border-t border-ink/10 safe-x pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="max-w-6xl mx-auto flex gap-3">
            <Button variant="ghost" onClick={() => albumRef.current?.click()} className="px-4" aria-label="Choose Photo">🖼</Button>
            <Button variant="ghost" onClick={() => setCamera(true)} className="flex-1 sm:flex-none">📷 ถ่ายเพิ่ม</Button>
            <Button onClick={finish} disabled={busy} className="flex-1 sm:ml-auto sm:flex-none sm:px-8">
              {busy ? `เหลือ ${queued + (working ? 1 : 0)} หน้า...` : `ตรวจทาน (${pages.length}) ›`}
            </Button>
          </div>
        </div>
      )}

      {camera && (
        <CameraCapture
          shots={pages.length}
          onCapture={add}
          onClose={() => setCamera(false)}
          onNativeCamera={() => { setCamera(false); nativeCamRef.current?.click(); }}
        />
      )}
    </div>
  );
}
