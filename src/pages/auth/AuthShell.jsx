import { t } from '../../i18n';
import CalicoCat from '../../components/CalicoCat';
import { HowTo, PixelLogo } from '../../components/ui';

// Split layout: cat on top (phone) / left (iPad), form card below / right.
export default function AuthShell({ mood = 'open', shake = false, children }) {
  return (
    <div className="min-h-screen bg-paper text-ink font-mono overflow-x-hidden safe-x pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 h-12">
          <PixelLogo />
          <span className="font-pixel text-sm uppercase">Meow AI Agent</span>
        </div>
        <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center md:min-h-[80vh] pt-4">
          <div className="w-[62%] max-w-[300px] md:w-full md:max-w-[440px] mx-auto">
            <CalicoCat mood={mood} />
          </div>
          <div className={`rise w-full max-w-md mx-auto ${shake ? 'shake' : ''}`}>
            {children}
            <div className="mt-6">
              <HowTo
                id="auth"
                items={[
                  ['🔑', 'ตั้งรหัสอย่างน้อย 4 ตัว ยิ่งยาวยิ่งปลอดภัย ใครรู้รหัสจะเห็นเอกสารของคุณ'],
                  ['🔄', 'เครื่องใหม่? ใส่รหัสเดิม ประวัติจะตามมาเอง'],
                  ['🧾', 'เก็บรหัสกู้คืน (MEOW-XXXX-...) ไว้ ใช้ตอนลืมรหัสผ่าน'],
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-ink/60 mb-2">{label}</span>
      <input
        {...props}
        className="w-full min-h-[52px] px-4 bg-white/70 border border-ink/20 rounded-[3px] text-base outline-none focus:border-ink focus:bg-white transition placeholder:text-ink/30"
      />
    </label>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return <p className="text-sm text-red-700 border-l-2 border-red-700 pl-3 py-1">{children}</p>;
}

// Shown right after a password is created/reset.
export function RecoveryCodeCard({ code, onDone }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch { /* ignore */ }
  };
  const save = () => {
    const blob = new Blob([`MEOW AI Agent — recovery code\n\n${code}\n\n${t('ใช้รหัสนี้เมื่อลืมรหัสผ่าน')}`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'meow-recovery-code.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wider text-ink/50 mb-2">Recovery code</p>
        <h2 className="font-pixel text-2xl uppercase leading-tight">{t("เก็บรหัสกู้คืนไว้นะ")}</h2>
        <p className="text-sm text-ink/60 mt-2">
          {t("ถ้าลืมรหัสผ่าน ใช้รหัสนี้ตั้งรหัสใหม่ได้โดยเอกสารไม่หาย ระบบจะแสดงรหัสนี้แค่ครั้งเดียว")}
        </p>
      </div>
      <div className="bg-ink text-paper rounded-[3px] px-4 py-5 text-center font-pixel text-xl sm:text-2xl tracking-wider select-all break-all">
        {code}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={copy} className="font-menu min-h-[48px] border border-ink rounded-[3px] text-sm hover:bg-ink hover:text-paper transition">{t("คัดลอก")}</button>
        <button onClick={save} className="font-menu min-h-[48px] border border-ink rounded-[3px] text-sm hover:bg-ink hover:text-paper transition">{t("บันทึกเป็นไฟล์")}</button>
      </div>
      <button onClick={onDone} className="font-menu font-medium w-full min-h-[52px] bg-ink text-paper rounded-[3px] hover:bg-neutral-700 transition">
        {t("เก็บแล้ว เข้าแอปเลย ›")}
      </button>
    </div>
  );
}
