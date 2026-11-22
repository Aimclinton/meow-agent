import { useRef, useState } from 'react';

// Zoomable original page: buttons, ctrl/⌘ + wheel, and two-finger pinch.
export default function ZoomImage({ src, alt = '', className = '' }) {
  const [zoom, setZoom] = useState(1);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const clamp = (z) => Math.min(5, Math.max(1, z));

  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };
  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      setZoom(clamp(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist)));
    }
  };
  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  return (
    <div className={`relative bg-white border border-ink/15 rounded-[3px] overflow-hidden ${className}`}>
      <div
        className="w-full h-full overflow-auto overscroll-contain"
        style={{ touchAction: zoom > 1 ? 'pan-x pan-y' : 'pan-y' }}
        onWheel={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          e.preventDefault();
          setZoom((z) => clamp(z - e.deltaY * 0.01));
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2.5))}
      >
        <img src={src} alt={alt} draggable={false} style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} className="block select-none" />
      </div>
      <div className="absolute bottom-2 right-2 flex bg-ink text-paper rounded-[3px] font-menu text-sm overflow-hidden">
        <button onClick={() => setZoom((z) => clamp(z - 0.5))} className="w-10 h-10" aria-label="ซูมออก">−</button>
        <button onClick={() => setZoom(1)} className="px-2 h-10 text-xs tabular-nums" aria-label="รีเซ็ตซูม">{Math.round(zoom * 100)}%</button>
        <button onClick={() => setZoom((z) => clamp(z + 0.5))} className="w-10 h-10" aria-label="ซูมเข้า">+</button>
      </div>
    </div>
  );
}
