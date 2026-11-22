import { useEffect, useRef, useState } from 'react';
import { compressToDataURL } from '../utils/image';

// Full-screen live camera with a viewfinder and shutter.
// Calls onCapture(dataURL) for each shot; stays open for multi-page scanning.
export default function CameraCapture({ onCapture, onClose, shots = 0 }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(0);
  const [busy, setBusy] = useState(false);

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
        setError('เปิดกล้องไม่ได้ — อนุญาตการใช้กล้องในการตั้งค่า หรือใช้ "เลือกรูป" แทน');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || busy) return;
    setBusy(true);
    setFlash((n) => n + 1);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
      onCapture(await compressToDataURL(blob));
    } catch {
      setError('ถ่ายรูปไม่สำเร็จ ลองอีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col font-mono">
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] h-16 shrink-0">
        <button onClick={onClose} className="font-menu min-h-[44px] px-2 text-sm">‹ เสร็จ</button>
        <span className="font-pixel text-xs uppercase tracking-wider">{shots} page{shots === 1 ? '' : 's'}</span>
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
        {!ready && !error && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/60">กำลังเปิดกล้อง...</p>
        )}
        {error && <p className="absolute inset-0 grid place-items-center text-center p-8 text-sm text-white/80">{error}</p>}
        {flash > 0 && <div key={flash} className="flash absolute inset-0 pointer-events-none" />}
        <p className="absolute bottom-3 inset-x-0 text-center text-xs text-white/60">วางเอกสารให้อยู่ในกรอบ แสงสว่างพอ</p>
      </div>

      <div className="h-32 shrink-0 grid place-items-center pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={shoot}
          disabled={!ready || busy}
          aria-label="Take photo"
          className="w-20 h-20 rounded-full border-4 border-white grid place-items-center disabled:opacity-40 active:scale-95 transition"
        >
          <span className="w-16 h-16 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}
