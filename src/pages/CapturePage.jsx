import { useEffect, useRef, useState } from 'react';
import { useOCR } from '../hooks/useOCR';
import CameraCapture from '../components/CameraCapture';
import CalicoCat from '../components/CalicoCat';
import { Button, Card, PageTitle, PixelProgress, TypeLine } from '../components/ui';
import { compressToDataURL } from '../utils/image';
import { useQuota, MONTHLY_LIMIT } from '../store/quotaStore';

// Listing explicit types (instead of image/*) makes Android open the
// gallery/file picker rather than jumping straight to the camera.
const GALLERY_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif';

const STAGE_TEXT = {
  boot: 'ปลุกแมวให้ตื่น...',
  download: 'โหลดพจนานุกรมไทย-อังกฤษ (ครั้งแรกครั้งเดียว)...',
  reading: 'แมวกำลังอ่านลายมือ...',
};

let nextId = 0;
const newId = () => `${Date.now()}-${nextId++}`;

export default function CapturePage({ onCapture }) {
  const [pages, setPages] = useState([]);
  const [title, setTitle] = useState('');
  const [camera, setCamera] = useState(false);
  const [pickError, setPickError] = useState('');
  const fileRef = useRef(null);
  const { processImage, isProcessing, progress, stage, error, clearError } = useOCR();
  const used = useQuota((q) => q.used);
  const consume = useQuota((q) => q.consume);
  const left = Math.max(0, MONTHLY_LIMIT - used);
  const pending = pages.filter((p) => p.status === 'queued' || p.status === 'reading').length;
  const canAdd = left - pending > 0;

  const add = (imageData) => {
    if (!canAddRef.current()) return;
    setPages((prev) => [...prev, { id: newId(), imageData, status: 'queued', ocrText: '', confidence: 0 }]);
  };
  const canAddRef = useRef(() => true);
  canAddRef.current = () => {
    const q = useQuota.getState();
    const queuedNow = pagesRef.current.filter((p) => p.status === 'queued' || p.status === 'reading').length;
    return MONTHLY_LIMIT - q.used - queuedNow > 0;
  };
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  // Read queued pages one at a time.
  useEffect(() => {
    if (isProcessing) return;
    const next = pages.find((p) => p.status === 'queued');
    if (!next) return;
    setPages((prev) => prev.map((p) => (p.id === next.id ? { ...p, status: 'reading' } : p)));
    processImage(next.imageData).then((res) => {
      if (res) consume(1);
      setPages((prev) =>
        prev.map((p) =>
          p.id === next.id
            ? res
              ? { ...p, status: 'done', ocrText: res.text, confidence: res.confidence, layout: res.layout }
              : { ...p, status: 'error' }
            : p
        )
      );
    });
  }, [pages, isProcessing, processImage, consume]);

  const pickFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    setPickError('');
    for (const f of files) {
      if (!canAddRef.current()) break;
      try {
        add(await compressToDataURL(f));
      } catch {
        setPickError('เปิดรูปบางรูปไม่ได้');
      }
    }
  };

  const retry = (id) => {
    clearError();
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'queued' } : p)));
  };

  const remove = (id) => setPages((prev) => prev.filter((p) => p.id !== id));

  const reading = pages.find((p) => p.status === 'reading');
  const queued = pages.filter((p) => p.status === 'queued').length;
  const busy = !!reading || queued > 0;
  const readingIndex = reading ? pages.indexOf(reading) + 1 : 0;

  const finish = () => {
    const done = pages
      .filter((p) => p.status === 'done' || p.status === 'error')
      .map(({ id, imageData, ocrText, confidence, layout }) => ({ id, imageData, ocrText, confidence, layout, timestamp: new Date() }));
    onCapture(done, title || `Scan ${new Date().toLocaleDateString()}`);
  };

  return (
    <div className="safe-x pb-36">
      <div className="max-w-6xl mx-auto pt-8">
        <PageTitle kicker="Step 01" title="Scan">
          ถ่ายหรือเลือกรูปเอกสาร ได้หลายหน้า แมวจะอ่านข้อความให้ระหว่างที่คุณถ่ายหน้าต่อไป
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

        {/* Live reading panel */}
        {(reading || error) && (
          <Card className="rise p-4 md:p-5 mb-6 flex items-center gap-4">
            <div className="w-16 shrink-0">
              <CalicoCat mood={error ? 'closed' : 'open'} backdrop={false} blink={false} />
            </div>
            <div className="flex-1 min-w-0">
              {error ? (
                <p className="text-sm text-red-700">{error}</p>
              ) : (
                <>
                  <p className="text-sm mb-3 truncate">
                    <TypeLine text={`หน้า ${readingIndex}/${pages.length} — ${STAGE_TEXT[stage]}`} />
                  </p>
                  <PixelProgress value={progress} />
                  <p className="text-xs text-ink/50 mt-2">{progress}%</p>
                </>
              )}
            </div>
          </Card>
        )}

        {!canAdd && (
          <Card className="p-4 mb-6 flex items-center gap-4">
            <div className="w-14 shrink-0"><CalicoCat mood="closed" backdrop={false} blink={false} /></div>
            <p className="text-sm">แมวหลับแล้ว Zzz... เดือนหน้าแมวตื่นมาทำต่อให้</p>
          </Card>
        )}

        {pages.length === 0 ? (
          <Card className="viewfinder text-ink/70 border-dashed py-10 md:py-14 px-6 text-center">
            <i /><i /><i /><i />
            <div className="w-28 mx-auto mb-6">
              <CalicoCat backdrop={false} />
            </div>
            <p className="font-pixel text-lg uppercase mb-1 text-ink">No pages yet</p>
            <p className="text-sm text-ink/60 mb-6">เริ่มจากถ่ายรูปหน้าแรกได้เลย</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => setCamera(true)} disabled={!canAdd}>📷 เปิดกล้อง</Button>
              <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={!canAdd}>🖼 เลือกรูปจากเครื่อง</Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {pages.map((p, i) => (
              <Card key={p.id} className="rise overflow-hidden">
                <div className="relative aspect-[3/4] bg-ink/5 overflow-hidden scanlines">
                  <img src={p.imageData} alt={`Page ${i + 1}`} className="w-full h-full object-contain bg-white" />
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
                  {p.status === 'reading' && <span className="text-[#c9661d]">กำลังอ่าน...</span>}
                  {p.status === 'done' && (
                    <>
                      <span className="text-ink/50">แม่นยำ {Math.round(p.confidence)}%</span>
                      <p className="line-clamp-2 mt-1 text-ink/80">{p.ocrText || '(ไม่พบข้อความ)'}</p>
                    </>
                  )}
                  {p.status === 'error' && (
                    <button onClick={() => retry(p.id)} className="font-menu text-red-700 underline underline-offset-4 min-h-[40px]">
                      อ่านไม่สำเร็จ — ลองใหม่
                    </button>
                  )}
                </div>
              </Card>
            ))}
            <button
              onClick={() => setCamera(true)}
              disabled={!canAdd}
              className="disabled:opacity-30 aspect-[3/4] border border-dashed border-ink/30 rounded-[3px] grid place-items-center text-ink/60 hover:border-ink hover:text-ink transition"
            >
              <span className="text-center font-menu text-sm">
                <span className="block font-pixel text-3xl mb-2">+</span>
                เพิ่มหน้า
              </span>
            </button>
          </div>
        )}

        {pickError && <p className="text-sm text-red-700 mt-4">{pickError}</p>}

        <input ref={fileRef} type="file" accept={GALLERY_ACCEPT} multiple onChange={pickFiles} className="hidden" />
      </div>

      {/* Sticky action bar */}
      {pages.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-20 bg-paper/90 backdrop-blur border-t border-ink/10 safe-x pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="max-w-6xl mx-auto flex gap-3">
            <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={!canAdd} className="px-4" aria-label="เลือกรูปจากเครื่อง">🖼</Button>
            <Button variant="ghost" onClick={() => setCamera(true)} disabled={!canAdd} className="flex-1 sm:flex-none">📷 ถ่ายเพิ่ม</Button>
            <Button onClick={finish} disabled={busy} className="flex-1 sm:ml-auto sm:flex-none sm:px-8">
              {busy ? `กำลังอ่าน ${queued + (reading ? 1 : 0)} หน้า...` : `ตรวจทาน (${pages.length}) ›`}
            </Button>
          </div>
        </div>
      )}

      {camera && <CameraCapture shots={pages.length} onCapture={add} onClose={() => setCamera(false)} />}
    </div>
  );
}
