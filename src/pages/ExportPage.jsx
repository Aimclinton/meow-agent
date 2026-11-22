import { useState } from 'react';
import { useDocxExport } from '../hooks/useDocxExport';
import { useXlsxExport } from '../hooks/useXlsxExport';
import { docToPlainText } from '../utils/ocrToDoc';
import { AppHeader, Button, Card, CatMascot, PageTitle, PawBurst } from '../components/ui';

const DONE_PHRASES = ['เสร็จแล้ว! เมี้ยว~', 'ขอปลาทูเป็นค่าจ้าง', 'Purrfect!', 'งานไวเหมือนแมววิ่ง'];

// embedded: rendered inside DocumentWorkflow (which owns the header).
export default function ExportPage({ document, onDone, onBack, onEdit, embedded = false }) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [burst, setBurst] = useState(0);
  const [withImages, setWithImages] = useState(false);
  const { generateDocx } = useDocxExport();
  const { generateXlsx } = useXlsxExport();
  const allText = document.richDoc
    ? docToPlainText(document.richDoc.content)
    : document.pages.map((p, i) => `--- Page ${i + 1} ---\n${p.ocrText || ''}`).join('\n\n');

  const run = async (kind, fn) => {
    setBusy(kind);
    setMessage(null);
    try {
      const res = await fn();
      if (res?.success === false) throw new Error(res.error);
      setMessage({ ok: true, text: res?.fileName ? `บันทึก ${res.fileName} แล้ว` : 'เรียบร้อย!' });
      setBurst((n) => n + 1);
    } catch (err) {
      setMessage({ ok: false, text: `ไม่สำเร็จ: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  const copyText = () => run('copy', async () => {
    await navigator.clipboard.writeText(allText);
    return { success: true, fileName: null };
  });

  const share = () => run('share', async () => {
    await navigator.share({ title: document.title, text: allText });
    return { success: true };
  });

  const options = [
    { key: 'docx', tag: '.DOCX', title: 'Word', desc: 'หัวข้อ ตัวหนา/เอียง ตาราง หัว-ท้ายกระดาษ เลขหน้า และอ้างอิง ครบ', action: () => generateDocx(document, { includeImages: withImages }) },
    { key: 'xlsx', tag: '.XLSX', title: 'Excel', desc: 'หนึ่งหน้า = หนึ่งแถว เหมาะกับทำตาราง', action: () => generateXlsx(document) },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink font-mono overflow-x-hidden">
      {!embedded && <AppHeader onBack={onBack} />}
      <PawBurst key={burst} show={burst > 0} />

      <div className="safe-x pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="grid md:grid-cols-[1fr_220px] gap-6 items-end">
            <PageTitle kicker={embedded ? 'Step 03' : 'Export'} title="Export">
              {document.title || 'Untitled'} · {document.pages.length} pages
            </PageTitle>
            <div className="hidden md:block w-[200px] ml-auto -mb-2">
              <CatMascot backdrop={false} mood={burst > 0 ? 'happy' : undefined} phrases={DONE_PHRASES} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 md:gap-4 mb-4">
            {options.map((o) => (
              <Card key={o.key} className="p-5 md:p-6 flex flex-col">
                <span className="self-start bg-ink text-paper font-pixel text-xs px-2 py-1 mb-6">{o.tag}</span>
                <h2 className="font-pixel text-2xl uppercase mb-1">{o.title}</h2>
                <p className="text-sm text-ink/60 mb-6 flex-1">{o.desc}</p>
                {o.key === 'docx' && (
                  <label className="flex items-center gap-3 text-sm mb-4 min-h-[44px] cursor-pointer">
                    <input type="checkbox" checked={withImages} onChange={(e) => setWithImages(e.target.checked)} className="w-5 h-5 accent-[#111]" />
                    แนบภาพต้นฉบับท้ายเอกสาร
                  </label>
                )}
                <Button onClick={() => run(o.key, o.action)} disabled={!!busy}>
                  {busy === o.key ? 'กำลังสร้างไฟล์...' : `ดาวน์โหลด ${o.tag}`}
                </Button>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            {onEdit && <Button variant="ghost" onClick={onEdit}>✎ แก้ไขเอกสาร</Button>}
            <Button variant="ghost" onClick={copyText} disabled={!!busy}>📋 คัดลอกข้อความทั้งหมด</Button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <Button variant="ghost" onClick={share} disabled={!!busy}>↗ แชร์</Button>
            )}
          </div>

          {message && (
            <p className={`rise text-sm border-l-2 pl-3 py-1 mb-6 ${message.ok ? 'border-[#e2782a]' : 'border-red-700 text-red-700'}`}>
              {message.text}
            </p>
          )}

          {onDone && (
            <Button variant="soft" onClick={onDone} className="w-full sm:w-auto">เสร็จแล้ว กลับหน้าแรก</Button>
          )}
        </div>
      </div>
    </div>
  );
}
