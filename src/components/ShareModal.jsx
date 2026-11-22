import { useState } from 'react';
import { saveAs } from 'file-saver';
import { t } from '../i18n';
import { Button } from './ui';

export const ShareIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" /><path d="M7 8l5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);
export const MailIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
  </svg>
);
export const LineIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" rx="6" fill="#06C755" />
    <path d="M12 5.5c-4.1 0-7.4 2.6-7.4 5.9 0 2.9 2.6 5.4 6.2 5.8.6.1.5.7.4 1.5-.1.5.3.6.7.4 2.9-1.6 7.5-4.6 7.5-7.7 0-3.3-3.3-5.9-7.4-5.9z" fill="#fff" />
  </svg>
);
export const MessengerIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="msg-g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#0866FF" /><stop offset="1" stopColor="#A033FF" /></linearGradient></defs>
    <rect width="24" height="24" rx="6" fill="url(#msg-g)" />
    <path d="M12 5C8 5 5 7.9 5 11.6c0 2 .9 3.7 2.4 4.9v2.4l2.2-1.2c.8.2 1.6.3 2.4.3 4 0 7-2.9 7-6.5S16 5 12 5zm.7 8.7l-1.8-1.9-3.5 1.9 3.8-4.1 1.8 1.9 3.5-1.9-3.8 4.1z" fill="#fff" />
  </svg>
);

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

// Fallback when the device can't share files (most desktop browsers):
// download + pre-filled email, or copy all text for LINE / Messenger.
export default function ShareModal({ file, document, summary, onClose, onDone }) {
  const [to, setTo] = useState('');
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [copied, setCopied] = useState(false);

  const emails = to.split(/[,;\s]+/).filter(Boolean);

  const sendEmail = (e) => {
    e.preventDefault();
    if (emails.length && !emails.every((m) => EMAIL_RE.test(m))) return setError(t('อีเมลไม่ถูกต้อง'));
    saveAs(file, file.name);
    const subject = t('เอกสารจาก MEOW Agent: {title}', { title: document.title || 'Untitled' });
    const excerpt = summary.length > 1200 ? `${summary.slice(0, 1200)}…` : summary;
    const body = [
      t('ส่งเอกสารที่สแกนเรียบร้อยแล้ว 🐱'),
      '',
      `${document.title || 'Untitled'} · ${document.pages.length} ${t('หน้า')}`,
      t('ไฟล์แนบ: {name}', { name: file.name }),
      '',
      '— ' + t('สรุปเนื้อหา') + ' —',
      excerpt,
    ].join('\n');
    const href = `mailto:${emails.map(encodeURIComponent).join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => { window.location.href = href; }, 400);
    setHint(t('ดาวน์โหลด {name} แล้ว ลากไฟล์นี้แนบลงในอีเมลที่เปิดขึ้นมาได้เลย', { name: file.name }));
    onDone?.('email');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      const ta = window.document.createElement('textarea');
      ta.value = summary;
      window.document.body.appendChild(ta);
      ta.select();
      window.document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onDone?.('copy');
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6 font-mono" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="rise bg-paper text-ink w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[10px] md:rounded-[3px] p-5 md:p-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-ink/50 mb-2 flex items-center gap-1.5"><ShareIcon size={13} /> Share</p>
            <h2 className="font-menu font-bold text-xl">{t('ส่งต่อไฟล์')}</h2>
            <p className="text-xs text-ink/60 mt-1">{t('เครื่องนี้แชร์ไฟล์ตรง ๆ ไม่ได้ เลือกวิธีด้านล่างแทนนะ')}</p>
            <span className="inline-block mt-2 bg-ink text-paper font-menu text-xs px-2 py-1 rounded-[3px] max-w-full truncate">📄 {file.name}</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-11 h-11 grid place-items-center hover:bg-ink/5 shrink-0">✕</button>
        </div>

        {/* 1) Email */}
        <form onSubmit={sendEmail} className="bg-white/70 border border-ink/15 rounded-[3px] p-4 mb-3">
          <p className="font-menu font-medium flex items-center gap-2 mb-1"><MailIcon /> {t('ส่งผ่านอีเมล')}</p>
          <p className="text-xs text-ink/60 mb-3">{t('จ๋องจะดาวน์โหลดไฟล์ให้ แล้วเปิดร่างอีเมลที่ใส่หัวข้อและสรุปไว้แล้ว เหลือแค่แนบไฟล์')}</p>
          <input
            type="text"
            inputMode="email"
            autoComplete="email"
            value={to}
            onChange={(e) => { setTo(e.target.value); setError(''); }}
            placeholder={t('อีเมลผู้รับ (ใส่หลายคนคั่นด้วย ,)')}
            className="w-full min-h-[48px] px-3 mb-3 bg-white border border-ink/20 rounded-[3px] outline-none focus:border-ink"
          />
          {error && <p className="text-sm text-red-700 mb-3">{error}</p>}
          <Button type="submit" className="w-full"><MailIcon size={16} /> {t('ดาวน์โหลด + เปิดอีเมล')}</Button>
          {hint && <p className="rise text-xs border-l-2 border-[#e2782a] pl-3 py-1 mt-3">{hint}</p>}
        </form>

        {/* 2) Copy for LINE / Messenger */}
        <div className="bg-white/70 border border-ink/15 rounded-[3px] p-4">
          <p className="font-menu font-medium flex items-center gap-2 mb-1"><LineIcon /> <MessengerIcon /> {t('ส่งใน LINE / Messenger')}</p>
          <p className="text-xs text-ink/60 mb-3">{t('คัดลอกข้อความทั้งหมด แล้วกดวางในแชท หรือดาวน์โหลดไฟล์แล้วลากใส่หน้าแชทบนคอม')}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={copy}>{copied ? t('✓ คัดลอกแล้ว') : t('📋 คัดลอกข้อความ')}</Button>
            <Button variant="ghost" onClick={() => { saveAs(file, file.name); onDone?.('download'); }}>⬇ {t('ดาวน์โหลดไฟล์')}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
