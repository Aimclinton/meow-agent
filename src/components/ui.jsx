import { useEffect, useRef, useState } from 'react';
import CalicoCat from './CalicoCat';
import { useQuota } from '../store/quotaStore';
import { useSound } from '../utils/sound';
import MoodCat from './MoodCat';

export function PixelLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 7 7" aria-label="MEOW Agent" role="img" shapeRendering="crispEdges">
      <path fill="#111" d="M0 0h3v3H0zM4 0h3v3H4zM0 4h3v3H0zM4 4h3v3H4z" />
      <path fill="#eeeeec" d="M1 1h1v1H1zM5 1h1v1H5zM1 5h1v1H1zM5 5h1v1H5z" />
    </svg>
  );
}

// Sticky top bar used by every inner page.
export function AppHeader({ onBack, backLabel = 'Back', right, children }) {
  return (
    <header className="safe-x sticky top-[calc(env(safe-area-inset-top)+1.75rem)] z-30 bg-paper/85 backdrop-blur border-b border-ink/10">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 h-14">
        <div className="flex items-center gap-3 min-w-0">
          {onBack ? (
            <button onClick={onBack} className="font-menu text-sm min-h-[44px] pr-2 inline-flex items-center gap-2 hover:underline underline-offset-4">
              <span aria-hidden="true">‹</span> {backLabel}
            </button>
          ) : (
            <PixelLogo />
          )}
          {children}
        </div>
        <div className="flex items-center gap-2 font-menu text-sm">{right}</div>
      </div>
    </header>
  );
}

export function PageTitle({ kicker, title, children }) {
  return (
    <div className="mb-8">
      {kicker && <p className="text-xs text-ink/50 mb-2 tracking-wider uppercase">{kicker}</p>}
      <h1 className="font-pixel font-bold uppercase leading-none text-[clamp(2.2rem,8vw,3.75rem)]">{title}</h1>
      {children && <p className="mt-3 text-sm text-ink/60 max-w-lg">{children}</p>}
    </div>
  );
}

const BTN = {
  primary: 'bg-ink text-paper hover:bg-neutral-700 disabled:bg-ink/40',
  ghost: 'border border-ink text-ink hover:bg-ink hover:text-paper disabled:opacity-40',
  soft: 'bg-ink/5 text-ink hover:bg-ink/10 disabled:opacity-40',
  danger: 'border border-red-700/40 text-red-700 hover:bg-red-700 hover:text-white',
  orange: 'bg-[#e2782a] text-white hover:bg-[#c9661d] disabled:opacity-40',
};

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      {...props}
      className={`font-menu font-medium min-h-[48px] px-5 rounded-[3px] text-sm inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:cursor-not-allowed ${BTN[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ className = '', children, ...props }) {
  return (
    <div {...props} className={`bg-white/60 border border-ink/15 rounded-[3px] ${className}`}>
      {children}
    </div>
  );
}

// Chunky block progress bar: ▮▮▮▮▯▯▯
export function PixelProgress({ value, blocks = 20, className = '' }) {
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * blocks);
  return (
    <div className={`flex gap-[3px] ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: blocks }, (_, i) => (
        <span
          key={i}
          className={`h-3 flex-1 transition-colors duration-200 ${i < filled ? (i === filled - 1 ? 'bg-[#e2782a]' : 'bg-ink') : 'bg-ink/10'}`}
        />
      ))}
    </div>
  );
}

export function StepBar({ step }) {
  const steps = ['capture', 'review', 'export'];
  const idx = steps.indexOf(step);
  return (
    <ol className="flex items-center gap-2 text-[11px] sm:text-xs">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={`w-6 h-6 grid place-items-center font-pixel ${i <= idx ? 'bg-ink text-paper' : 'border border-ink/30 text-ink/40'}`}
          >
            {i + 1}
          </span>
          <span className={`hidden sm:inline uppercase tracking-wider ${i === idx ? 'text-ink' : 'text-ink/40'}`}>{s}</span>
          {i < steps.length - 1 && <span className="w-4 sm:w-8 h-px bg-ink/25" />}
        </li>
      ))}
    </ol>
  );
}

const MEOWS = [
  'เมี้ยว!', 'Meow~', 'ส่งเอกสารมาเลย!', 'หิวปลาทู...', 'ขอเกาคางหน่อย', 'Purrrr...',
  'อ่านลายมือเก่งนะ', 'ฮึ่ม... ลายมือหมอ?', '=^..^=', 'วันนี้สแกนกี่หน้าดี?',
];

// Tappable mascot that says something on each tap.
export function CatMascot({ className = '', mood: moodProp, backdrop = true, phrases = MEOWS }) {
  const [say, setSay] = useState(null);
  const [happy, setHappy] = useState(false);
  const timer = useRef();
  const i = useRef(Math.floor(Math.random() * phrases.length));

  useEffect(() => () => clearTimeout(timer.current), []);

  const poke = () => {
    i.current = (i.current + 1) % phrases.length;
    setSay(phrases[i.current]);
    setHappy(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setSay(null); setHappy(false); }, 1800);
  };

  return (
    <div className={`relative ${className}`}>
      <button onClick={poke} aria-label="Pet the cat" className={`block w-full ${happy ? 'cat-hop' : ''}`}>
        <CalicoCat mood={moodProp || (happy ? 'happy' : 'open')} backdrop={backdrop} />
      </button>
      {say && (
        <div key={say} className="speech absolute left-[8%] top-[2%] font-menu text-sm bg-ink text-paper px-3 py-2 rounded-[3px] whitespace-nowrap pointer-events-none">
          {say}
        </div>
      )}
    </div>
  );
}

// Burst of pixel paws / fish for success moments.
export function PawBurst({ show }) {
  if (!show) return null;
  const bits = Array.from({ length: 22 }, (_, i) => {
    const angle = (i / 22) * Math.PI * 2;
    const dist = 120 + (i % 5) * 40;
    return {
      i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist - 60,
      ch: ['🐾', '🐟', '■', '◆'][i % 4],
      color: ['#111', '#e2782a', '#e9b949', '#111'][i % 4],
      delay: (i % 6) * 30,
    };
  });
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] grid place-items-center overflow-hidden" aria-hidden="true">
      {bits.map((b) => (
        <span
          key={b.i}
          className="paw-bit absolute text-xl"
          style={{ '--x': `${b.x}px`, '--y': `${b.y}px`, color: b.color, animationDelay: `${b.delay}ms` }}
        >
          {b.ch}
        </span>
      ))}
    </div>
  );
}

// Text that types itself out, one character at a time.
export function TypeLine({ text, speed = 35, className = '' }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <span className={className}>
      {text.slice(0, n)}
      <span className="caret">▌</span>
    </span>
  );
}

// Thin bar shown at the top of every screen: quota + cat mood + sound toggle.
export function QuotaBar() {
  const used = useQuota((s) => s.used);
  const limit = useQuota((s) => s.limit);
  const soundOn = useSound((s) => s.on);
  const toggleSound = useSound((s) => s.toggle);
  const left = Math.max(0, limit - used);
  const pct = limit ? (left / limit) * 100 : 0;
  const mood = left <= 0 ? 'asleep' : pct > 50 ? 'playful' : 'sleepy';
  const low = pct <= 10;
  return (
    <div className="sticky top-0 z-40 bg-ink text-paper safe-x pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto h-7 flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
        <span className="shrink-0 -mb-1" title={mood === 'playful' ? 'แมวคึกคัก' : mood === 'sleepy' ? 'แมวเริ่มง่วง' : 'แมวหลับ'}>
          <MoodCat mood={mood} size={30} />
        </span>
        <span className="truncate">
          {left > 0 ? (
            <>แมวเลียตอนนี้ แมวทำให้ได้อีก <b className={`font-pixel ${low ? 'text-[#e2782a]' : ''}`}>{left.toLocaleString()}</b> รูป</>
          ) : (
            <>รอเติมแมวเลียพรุ่งนี้น้า</>
          )}
        </span>
        <span className="ml-auto hidden sm:flex gap-[2px] w-24" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={`h-2 flex-1 ${i < Math.ceil(pct / 10) ? (low ? 'bg-[#e2782a]' : 'bg-paper') : 'bg-paper/20'}`} />
          ))}
        </span>
        <button
          onClick={toggleSound}
          aria-label={soundOn ? 'ปิดเสียงแมว' : 'เปิดเสียงแมว'}
          aria-pressed={soundOn}
          className="ml-auto sm:ml-0 w-7 h-7 -mr-1 grid place-items-center shrink-0 hover:bg-paper/10 rounded-[3px]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" stroke="none" />
            {soundOn ? (
              <><path d="M11 5.5a3.5 3.5 0 0 1 0 5" /><path d="M12.8 3.5a6 6 0 0 1 0 9" /></>
            ) : (
              <path d="M11 6l4 4M15 6l-4 4" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
