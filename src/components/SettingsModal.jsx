import { t } from '../i18n';
import { useEffect, useState } from 'react';
import { cloudEnabled } from '../services/vault';
import { useDocumentStore } from '../store/documentStore';
import { useSettings } from '../store/settingsStore';
import { useQuota } from '../store/quotaStore';
import { Button } from './ui';

export default function SettingsModal({ onClose }) {
  const { geminiKey, setGeminiKey } = useSettings();
  const { used, limit, shared } = useQuota();
  const [draft, setDraft] = useState(geminiKey);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cloud, setCloud] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncFromCloud = useDocumentStore((st) => st.syncFromCloud);

  useEffect(() => {
    cloudEnabled().then(setCloud);
  }, []);

  const save = () => {
    setGeminiKey(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6 font-mono" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="rise bg-paper text-ink w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[10px] md:rounded-[3px] p-5 md:p-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink/50 mb-2">Settings</p>
            <h2 className="font-pixel text-2xl uppercase">{t("ตั้งค่า")}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-11 h-11 grid place-items-center hover:bg-ink/5 shrink-0">✕</button>
        </div>

        {cloud && (
          <section className="mb-6 pb-6 border-b border-ink/10">
            <p className="font-menu font-medium mb-1">{t("ซิงก์ประวัติ")}</p>
            <p className="text-sm text-ink/60 mb-3">{t("เครื่องไหนใส่รหัสผ่านเดียวกัน จะเห็นประวัติ 7 วันชุดเดียวกัน")}</p>
            <Button
              variant="ghost"
              disabled={syncing}
              onClick={async () => { setSyncing(true); await syncFromCloud(); setSyncing(false); }}
            >
              {syncing ? t('กำลังซิงก์...') : t('↻ ซิงก์ตอนนี้')}
            </Button>
          </section>
        )}

        <section className="mb-6">
          <p className="font-menu font-medium mb-1">{t("Gemini API Key ส่วนตัว (ไม่บังคับ)")}</p>
          <p className="text-xs text-ink/60 mb-3">
            {t("ใส่คีย์ของตัวเองเพื่อแยกโควตาจากทีม คีย์เก็บในเครื่องนี้เท่านั้น และส่งผ่านเซิร์ฟเวอร์ของเราไปที่ Google ตอนสแกน")}
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type={show ? 'text' : 'password'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="AIza..."
              autoComplete="off"
              spellCheck={false}
              className="flex-1 min-w-0 min-h-[48px] px-3 bg-white/70 border border-ink/20 rounded-[3px] outline-none focus:border-ink"
            />
            <button onClick={() => setShow((v) => !v)} className="font-menu text-sm px-3 border border-ink/20 rounded-[3px]">{show ? t('ซ่อน') : t('ดู')}</button>
          </div>
          <div className="flex gap-2">
            <Button onClick={save} className="flex-1">{saved ? t('✓ บันทึกแล้ว') : t('บันทึก')}</Button>
            {geminiKey && <Button variant="danger" onClick={() => { setDraft(''); setGeminiKey(''); }}>{t("ลบคีย์")}</Button>}
          </div>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="inline-block mt-3 text-xs underline underline-offset-4 text-ink/60">
            {t("ขอคีย์ฟรีที่ Google AI Studio ↗")}
          </a>
        </section>

        <section className="text-xs text-ink/60 border-t border-ink/10 pt-4">
          <p>{t('โควตาวันนี้: ใช้ไป {used} / {limit} รูป ({mode})', { used: used.toLocaleString(), limit: limit.toLocaleString(), mode: geminiKey ? t('คีย์ส่วนตัว') : shared ? t('รวมทั้งทีม') : t('นับในเครื่องนี้') })}</p>
          <p className="mt-1">{t("รีเซ็ตทุกเที่ยงคืนตามเวลาแปซิฟิก (ประมาณ 14:00–15:00 น. เวลาไทย)")}</p>
        </section>
      </div>
    </div>
  );
}
