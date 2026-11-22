import { useEffect, useRef, useState } from 'react';
import { compressToDataURL } from '../utils/image';

let nextId = 0;

// Full-screen burst camera: every tap on the shutter drops a photo into the
// tray at the bottom (no confirm step). "ให้แมวอ่านทั้งหมดทีเดียว" sends the
// whole tray to the sequential scan queue.
export default function CameraCapture({ onDone, onClose, onNativeCamera, alreadyQueued = 0 }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const trayRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(0);
  const [saving, setSaving] = useState(0);
  const [tray, setTray] = useState([]);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError('เปิดกล้องสดไม่ได้ — อนุญาตการใช้กล้องในการตั้งค่า หรือใช้กล้องของเครื่องแทน');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    trayRef.current?.scrollTo({ left: trayRef.current.scrollWidth, behavior: 'smooth' });
  }, [tray.length]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setFlash((n) => n + 1);
    navigator.vibrate?.(15);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setSaving((n) => n + 1);
    canvas.toBlob(async (blob) => {
      try {
        const dataURL = await compressToDataURL(blob);
        setTray((t) => [...t, { id: `shot-${Date.now()}-${nextId++}`, dataURL }]);
      } catch {
        setError('บันทึกรูปไม่สำเร็จ ลองอีกครั้ง');
      } finally {
        setSaving((n) => n - 1);
      }
    }, 'image/jpeg', 0.92);
  };

  const remove = (id) => {
    setTray((t) => t.filter((x) => x.id !== id));
    setPreview(null);
  };

  const close = () => {
    if (tray.length && !window.confirm(`ทิ้งรูปที่ถ่ายไว้ ${tray.length} รูป?`)) return;
    onClose();
  };

  const finish = () => onDone(tray.map((t) => t.dataURL));

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col font-mono">
      <div className="flex items-center justify-between px-4 pt-[max(0.5rem,env(safe-area-inset-top))] min-h-14 shrink-0">
        <button onClick={close} className="font-menu min-h-[44px] px-2 text-sm">‹ ยกเลิก</button>
        <span className="font-pixel text-xs uppercase tracking-wider">
          {tray.length} shot{tray.length === 1 ? '' : 's'}{alreadyQueued ? ` · +${alreadyQueued} in queue` : ''}
        </span>
      </div>

      <div className="relative flex-1 min-h-0 mx-3 overflow-hidden rounded-[3px] bg-neutral-900">
        {!error && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setReady(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="viewfinder absolute inset-[6%] text-[#e2782a] pointer-events-none">
          <i /><i /><i /><i />
        </div>
        {!ready && !error && <p className="absolute inset-0 grid place-items-center text-sm text-white/60">กำลังเปิดกล้อง...</p>}
        {error && (
          <div className="absolute inset-0 grid place-items-center text-center p-8">
            <div>
              <p className="text-sm text-white/80 mb-4">{error}</p>
              {onNativeCamera && (
                <button onClick={onNativeCamera} className="font-menu min-h-[48px] px-5 bg-white text-black rounded-[3px] text-sm">
                  ใช้กล้องของเครื่องแทน
                </button>
              )}
            </div>
          </div>
        )}
        {flash > 0 && <div key={flash} className="flash absolute inset-0 pointer-events-none" />}
        <p className="absolute bottom-3 inset-x-0 text-center text-xs text-white/60">กดถ่ายรัวได้เลย ไม่ต้องยืนยันทีละรูป</p>
      </div>

      {/* Thumbnail tray */}
      <div ref={trayRef} className="h-20 shrink-0 mx-3 mt-2 flex items-center gap-2 overflow-x-auto" aria-label="ถาดรูปที่ถ่ายแล้ว">
        {tray.length === 0 && saving === 0 && <p className="text-xs text-white/40 mx-auto">รูปที่ถ่ายจะมาอยู่ตรงนี้</p>}
        {tray.map((t, i) => (
          <div key={t.id} className="relative shrink-0 w-14 h-[72px] rise">
            <button onClick={() => setPreview(t)} className="w-full h-full rounded-[3px] overflow-hidden border border-white/30" aria-label={`ดูรูปที่ ${i + 1}`}>
              <img src={t.dataURL} alt="" className="w-full h-full object-cover" />
            </button>
            <span className="absolute bottom-0.5 left-0.5 bg-black/70 text-[10px] px-1 font-pixel">{i + 1}</span>
            <button onClick={() => remove(t.id)} aria-label={`ลบรูปที่ ${i + 1}`} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white text-black text-xs grid place-items-center">✕</button>
          </div>
        ))}
        {saving > 0 && <div className="shrink-0 w-14 h-[72px] rounded-[3px] border border-dashed border-white/40 grid place-items-center text-xs text-white/50">...</div>}
      </div>

      <div className="shrink-0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span />
        <button
          onClick={shoot}
          disabled={!ready}
          aria-label="ถ่ายรูป"
          className="w-[72px] h-[72px] rounded-full border-4 border-white grid place-items-center disabled:opacity-40 active:scale-90 transition"
        >
          <span className="w-14 h-14 rounded-full bg-white" />
        </button>
        <span />
        <button
          onClick={finish}
          disabled={!tray.length || saving > 0}
          className="col-span-3 font-menu font-medium min-h-[52px] rounded-[3px] bg-[#e2782a] text-white disabled:opacity-30 transition active:scale-[0.98]"
        >
          ให้แมวอ่านทั้งหมดทีเดียว{tray.length ? ` (${tray.length})` : ''}
        </button>
      </div>

      {preview && (
        <div className="absolute inset-0 z-10 bg-black/95 flex flex-col" onClick={() => setPreview(null)}>
          <div className="flex-1 min-h-0 p-4 grid place-items-center">
            <img src={preview.dataURL} alt="" className="max-w-full max-h-full object-contain" />
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="font-menu min-h-[52px] rounded-[3px] border border-white/40">ใช้รูปนี้</button>
            <button onClick={() => remove(preview.id)} className="font-menu min-h-[52px] rounded-[3px] bg-red-600">ลบรูปนี้ (เบลอ)</button>
          </div>
        </div>
      )}
    </div>
  );
}
