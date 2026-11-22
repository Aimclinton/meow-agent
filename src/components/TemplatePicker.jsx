import { useEffect, useState } from 'react';
import { useTemplates } from '../store/templateStore';
import { structuredToContent } from '../utils/structure';
import { contentToMarkdown } from '../utils/docContent';

// Choose a saved form template before scanning (AI fills the same structure).
export default function TemplatePicker() {
  const { templates, shared, selectedId, load, select, remove } = useTemplates();
  const [peek, setPeek] = useState(false);
  const current = templates.find((t) => t.id === selectedId);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-md mb-8">
      <span className="block text-xs uppercase tracking-wider text-ink/60 mb-2">
        Template {shared ? '· คลังของทีม' : templates.length ? '· ในเครื่องนี้' : ''}
      </span>
      <div className="flex gap-2">
        <select
          value={selectedId}
          onChange={(e) => select(e.target.value)}
          className="flex-1 min-w-0 min-h-[52px] px-3 bg-white/70 border border-ink/20 rounded-[3px] outline-none focus:border-ink"
          aria-label="เลือก Template"
        >
          <option value="">ไม่ใช้ Template (ให้แมวจัดเอง)</option>
          {templates.map((t) => <option key={t.id} value={t.id}>📋 {t.name}</option>)}
        </select>
        {current && (
          <button onClick={() => setPeek((v) => !v)} className="font-menu text-sm px-3 border border-ink/20 rounded-[3px]" aria-expanded={peek}>
            {peek ? 'ซ่อน' : 'ดู'}
          </button>
        )}
      </div>
      {!templates.length && <p className="text-xs text-ink/50 mt-2">ยังไม่มี Template — สแกนฟอร์มที่มีตาราง แล้วกด “บันทึกโครงสร้างนี้เป็น Template” ในหน้าตรวจทาน</p>}
      {current && <p className="text-xs text-[#c9661d] mt-2">แมวจะกรอกข้อมูลจากรูปลงช่องของ “{current.name}”</p>}
      {current && peek && (
        <div className="mt-3 bg-white/70 border border-ink/15 rounded-[3px] p-3">
          <pre className="text-[11px] leading-relaxed whitespace-pre-wrap max-h-48 overflow-auto">{contentToMarkdown(structuredToContent(current.structure))}</pre>
          <button
            onClick={() => { if (window.confirm(`ลบ Template “${current.name}”${shared ? ' ออกจากคลังของทีม' : ''}?`)) remove(current.id); }}
            className="font-menu text-xs text-red-700 underline underline-offset-4 mt-2 min-h-[36px]"
          >
            ลบ Template นี้
          </button>
        </div>
      )}
    </div>
  );
}
