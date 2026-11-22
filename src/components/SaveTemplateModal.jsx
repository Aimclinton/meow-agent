import { t } from '../i18n';
import { useMemo, useState } from 'react';
import { useTemplates } from '../store/templateStore';
import { contentToStructured, makeTemplate, structuredToContent } from '../utils/structure';
import { contentToMarkdown } from '../utils/docContent';
import { Button } from './ui';

export default function SaveTemplateModal({ content, defaultName, onClose, onSaved }) {
  const save = useTemplates((s) => s.save);
  const shared = useTemplates((s) => s.shared);
  const [name, setName] = useState(defaultName || '');
  const [busy, setBusy] = useState(false);
  const structure = useMemo(() => makeTemplate(contentToStructured(content)), [content]);
  const preview = useMemo(() => contentToMarkdown(structuredToContent(structure)), [structure]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const saved = await save(name.trim(), structure);
      onSaved(saved);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6 font-mono" onClick={onClose}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        className="rise bg-paper text-ink w-full md:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-[10px] md:rounded-[3px] p-5 md:p-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink/50 mb-2">Template</p>
            <h2 className="font-menu font-bold text-xl">{t("บันทึกโครงสร้างนี้เป็น Template")}</h2>
            <p className="text-xs text-ink/60 mt-1">เก็บแค่หัวข้อ หัวตาราง และชื่อช่อง ข้อมูลคนไข้จะไม่ถูกบันทึก {shared ? t('· ทุกคนในทีมใช้ได้') : t('· เก็บในเครื่องนี้')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 grid place-items-center hover:bg-ink/5 shrink-0">✕</button>
        </div>
        <label className="block mb-4">
          <span className="block text-xs uppercase tracking-wider text-ink/60 mb-2">{t("ชื่อ Template")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoFocus
            required
            placeholder={t("เช่น ใบซักประวัติคนไข้ / Chart ตรวจฟัน")}
            className="w-full min-h-[52px] px-3 bg-white/70 border border-ink/20 rounded-[3px] outline-none focus:border-ink"
          />
        </label>
        <p className="text-xs uppercase tracking-wider text-ink/60 mb-2">{t("โครงสร้างที่จะบันทึก")}</p>
        <pre className="bg-white/70 border border-ink/15 rounded-[3px] p-3 text-[11px] leading-relaxed whitespace-pre-wrap max-h-60 overflow-auto mb-5">{preview || t('(ไม่มีหัวข้อหรือตาราง)')}</pre>
        <Button type="submit" disabled={busy || !preview} className="w-full">{busy ? t('กำลังบันทึก...') : t('💾 บันทึก Template')}</Button>
      </form>
    </div>
  );
}
