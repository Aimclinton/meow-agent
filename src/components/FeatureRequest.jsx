import { useEffect, useRef, useState } from 'react';
import { meow } from '../utils/sound';

const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || import.meta.env.NEXT_PUBLIC_WEB3FORMS_KEY;

// Two big cat eyes that follow the pointer and blink now and then.
export function WatchingEyes({ size = 44 }) {
  const ref = useRef(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const move = (e) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 160);
      setLook({ x: (dx / d) * 2.2 * k, y: (dy / d) * 2 * k });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', move);
    let t;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        loop();
      }, 2200 + Math.random() * 3000);
    };
    loop();
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      clearTimeout(t);
    };
  }, []);

  return (
    <svg ref={ref} width={size} height={size * 0.75} viewBox="0 0 24 18" aria-hidden="true" shapeRendering="crispEdges">
      {/* ears + head peeking */}
      <path d="M2 8 L4 1 L8 5 H16 L20 1 L22 8 V18 H2 Z" fill="#111" />
      <path d="M4 3 L6 5 H4 Z M20 3 L18 5 H20 Z" fill="#e2782a" />
      {[7, 17].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy="11" rx="3.4" ry={blink ? 0.4 : 3.4} fill="#e9b949" />
          {!blink && <ellipse cx={cx + look.x} cy={11 + look.y} rx="1.3" ry="2.2" fill="#111" />}
          {!blink && <rect x={cx + look.x - 0.4} y={9.4 + look.y} width="0.9" height="0.9" fill="#fff" />}
        </g>
      ))}
      <rect x="11.2" y="14" width="1.6" height="1" fill="#e58d8d" />
    </svg>
  );
}

export function FeatureRequestModal({ onClose, onSent }) {
  const [idea, setIdea] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const send = async (e) => {
    e.preventDefault();
    if (!idea.trim()) return setError('พิมพ์สิ่งที่อยากได้ก่อนน้า');
    if (!WEB3FORMS_KEY) return setError('ยังไม่ได้ตั้งค่าช่องทางส่ง (VITE_WEB3FORMS_KEY) บอกแอดมินหน่อยนะ');
    setBusy(true);
    setError('');
    try {
      const r = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `🐱 MEOW Agent: ข้าต้องการสิ่งนี้เพิ่ม${name ? ` — ${name}` : ''}`,
          from_name: name || 'MEOW Agent user',
          message: idea,
          page: window.location.href,
          device: navigator.userAgent,
          botcheck: '',
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data.success === false) throw new Error(data.message || `ส่งไม่สำเร็จ (${r.status})`);
      meow();
      onSent();
    } catch (err) {
      setError(err.message || 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-ink/70 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6 font-mono" onClick={onClose}>
      <form
        onSubmit={send}
        role="dialog"
        aria-modal="true"
        className="rise bg-paper text-ink w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[10px] md:rounded-[3px] p-5 md:p-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-5">
          <WatchingEyes size={64} />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-ink/50 mb-1">Feature request</p>
            <h2 className="font-menu font-bold text-xl">ข้าต้องการสิ่งนี้เพิ่ม</h2>
            <p className="text-xs text-ink/60 mt-1">บอกมาได้เลย แมวจ้องอยู่ จะส่งตรงถึง Dev</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 grid place-items-center hover:bg-ink/5 shrink-0">✕</button>
        </div>
        <label className="block mb-4">
          <span className="block text-xs uppercase tracking-wider text-ink/60 mb-2">อยากได้อะไรเพิ่ม</span>
          <textarea
            value={idea}
            onChange={(e) => { setIdea(e.target.value); setError(''); }}
            rows={5}
            maxLength={2000}
            autoFocus
            placeholder="เช่น อยากให้ส่งออกเป็น PDF ได้ / อยากให้มีโหมดมืด"
            className="w-full p-3 bg-white/70 border border-ink/20 rounded-[3px] outline-none focus:border-ink focus:bg-white text-sm leading-relaxed"
          />
        </label>
        <label className="block mb-4">
          <span className="block text-xs uppercase tracking-wider text-ink/60 mb-2">ชื่อเล่น (ไม่ใส่ก็ได้)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            className="w-full min-h-[48px] px-3 bg-white/70 border border-ink/20 rounded-[3px] outline-none focus:border-ink"
          />
        </label>
        <input type="checkbox" name="botcheck" className="hidden" tabIndex={-1} autoComplete="off" />
        {error && <p className="text-sm text-red-700 border-l-2 border-red-700 pl-3 py-1 mb-4">{error}</p>}
        <button disabled={busy} className="font-menu font-medium w-full min-h-[52px] bg-ink text-paper rounded-[3px] hover:bg-neutral-700 disabled:opacity-40 transition">
          {busy ? 'แมวกำลังวิ่งไปส่ง...' : 'ส่งให้แมว'}
        </button>
      </form>
    </div>
  );
}

export function Toast({ text, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[80] rise">
      <div className="bg-ink text-paper font-menu text-sm px-4 py-3 rounded-[3px] shadow-lg flex items-center gap-3 max-w-[92vw]">
        <span className="font-pixel text-xs shrink-0">=^.^=</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

// Entry points: a floating button (pages without a bottom action bar) or a compact header button.
export default function FeatureRequest({ variant = 'floating' }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(false);

  return (
    <>
      {variant === 'floating' ? (
        <button
          onClick={() => setOpen(true)}
          className="fixed z-30 right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-2 bg-paper border-2 border-ink rounded-full pl-2 pr-4 py-1.5 shadow-[3px_3px_0_#111] hover:-translate-y-0.5 active:translate-y-0 transition font-menu text-sm"
        >
          <WatchingEyes size={40} />
          <span>ข้าต้องการสิ่งนี้เพิ่ม</span>
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="min-h-[44px] px-1 flex items-center gap-1 hover:underline underline-offset-4" aria-label="ข้าต้องการสิ่งนี้เพิ่ม">
          <WatchingEyes size={30} />
          <span className="hidden sm:inline">ขอฟีเจอร์</span>
        </button>
      )}
      {open && <FeatureRequestModal onClose={() => setOpen(false)} onSent={() => { setOpen(false); setToast(true); }} />}
      {toast && <Toast text="แมวรับเรื่องไว้แล้ว เดี๋ยวไปสะกิด Dev ให้นะ!" onDone={() => setToast(false)} />}
    </>
  );
}
