import { useState } from 'react';
import { useDocxExport } from '../hooks/useDocxExport';
import { useXlsxExport } from '../hooks/useXlsxExport';
import { useDocumentStore } from '../store/documentStore';
import { documentToMarkdown } from '../utils/docContent';
import { TH_FONTS, EN_FONTS, cssFont, fontSizeFor } from '../utils/fonts';
import CreateSlidesModal from '../components/CreateSlidesModal';
import FeatureRequest from '../components/FeatureRequest';
import { meow } from '../utils/sound';
import { AppHeader, Button, Card, CatMascot, PageTitle, PawBurst } from '../components/ui';

const DONE_PHRASES = ['เสร็จแล้ว! เมี้ยว~', 'ขอแมวเลียเป็นค่าจ้าง', 'Purrfect!', 'งานไวเหมือนแมววิ่ง'];

function FontSelect({ label, list, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-ink/60 mb-2">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[48px] px-3 bg-white/70 border border-ink/20 rounded-[3px] outline-none focus:border-ink"
        style={{ fontFamily: cssFont(list, value) }}
      >
        {list.map((f) => (
          <option key={f.name} value={f.name}>{f.name}{f.note ? ` — ${f.note}` : ''}</option>
        ))}
      </select>
    </label>
  );
}

// embedded: rendered inside DocumentWorkflow (which owns the header).
export default function ExportPage({ document, onDone, onBack, onEdit, embedded = false }) {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);
  const [burst, setBurst] = useState(0);
  const [withImages, setWithImages] = useState(false);
  const [pageBreaks, setPageBreaks] = useState(true);
  const [slides, setSlides] = useState(false);
  const updateMeta = useDocumentStore((s) => s.updateMeta);
  const { generateDocx } = useDocxExport();
  const { generateXlsx } = useXlsxExport();
  const fonts = { th: 'Sarabun', en: 'Google Sans', ...(document.fonts || {}) };
  const setFont = (k, v) => updateMeta(document.id, { fonts: { ...fonts, [k]: v } });

  const run = async (kind, fn) => {
    setBusy(kind);
    setMessage(null);
    try {
      const res = await fn();
      if (res?.success === false) throw new Error(res.error);
      setMessage({ ok: true, text: res?.fileName ? `บันทึก ${res.fileName} แล้ว` : 'เรียบร้อย!' });
      setBurst((n) => n + 1);
      if (kind === 'docx' || kind === 'xlsx') meow();
    } catch (err) {
      setMessage({ ok: false, text: `ไม่สำเร็จ: ${err.message}` });
    } finally {
      setBusy(null);
    }
  };

  const allText = () => documentToMarkdown(document);
  const copyText = () => run('copy', async () => {
    await navigator.clipboard.writeText(allText());
    return { success: true };
  });
  const share = () => run('share', async () => {
    await navigator.share({ title: document.title, text: allText() });
    return { success: true };
  });

  const options = [
    { key: 'docx', tag: '.DOCX', title: 'Word', desc: 'หัวข้อ ตัวหนา/เอียง ตาราง (รวมเซลล์) หัว-ท้ายกระดาษ เลขหน้า และอ้างอิง', action: () => generateDocx(document, { includeImages: withImages, pageBreaks }) },
    { key: 'xlsx', tag: '.XLSX', title: 'Excel', desc: 'คงหัวข้อ ตัวหนา/เอียง ตารางพร้อมเซลล์ผสาน และหัว-ท้ายกระดาษตอนพิมพ์', action: () => generateXlsx(document) },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink font-mono overflow-x-hidden">
      {!embedded && <AppHeader onBack={onBack} />}
      <PawBurst key={burst} show={burst > 0} />

      <div className="safe-x pb-28">
        <div className="max-w-6xl mx-auto pt-8">
          <div className="grid md:grid-cols-[1fr_220px] gap-6 items-end">
            <PageTitle kicker={embedded ? 'Step 03' : 'Export'} title="Export">
              {document.title || 'Untitled'} · {document.pages.length} pages
            </PageTitle>
            <div className="hidden md:block w-[200px] ml-auto -mb-2">
              <CatMascot backdrop={false} mood={burst > 0 ? 'happy' : undefined} phrases={DONE_PHRASES} />
            </div>
          </div>

          {/* Fonts */}
          <Card className="p-5 md:p-6 mb-4">
            <p className="font-pixel uppercase mb-4">Fonts</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <FontSelect label="ภาษาไทย (TH)" list={TH_FONTS} value={fonts.th} onChange={(v) => setFont('th', v)} />
              <FontSelect label="English (EN)" list={EN_FONTS} value={fonts.en} onChange={(v) => setFont('en', v)} />
            </div>
            <div className="bg-white border border-ink/10 rounded-[3px] p-4 text-[17px] leading-relaxed" aria-label="ตัวอย่างฟอนต์">
              <span style={{ fontFamily: `${cssFont(TH_FONTS, fonts.th)}, sans-serif` }}>ฟันกรามซี่ที่ ๖ มีรอยผุ ผู้ป่วยปวดเสียวเมื่อดื่มน้ำเย็น </span>
              <span style={{ fontFamily: `${cssFont(EN_FONTS, fonts.en)}, sans-serif` }}>Lower first molar, deep caries — <b>Bold</b> <i>Italic</i> 123</span>
              <p className="text-[11px] text-ink/40 mt-2 font-mono">ขนาดตัวอักษรในไฟล์ {fontSizeFor(fonts.th)} pt · ถ้าเครื่องที่เปิดไฟล์ไม่มีฟอนต์นี้ Word จะใช้ฟอนต์ใกล้เคียงแทน</p>
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4">
            {options.map((o) => (
              <Card key={o.key} className="p-5 md:p-6 flex flex-col">
                <span className="self-start bg-ink text-paper font-pixel text-xs px-2 py-1 mb-6">{o.tag}</span>
                <h2 className="font-pixel text-2xl uppercase mb-1">{o.title}</h2>
                <p className="text-sm text-ink/60 mb-4 flex-1">{o.desc}</p>
                {o.key === 'docx' && (
                  <div className="mb-3">
                    <label className="flex items-center gap-3 text-sm min-h-[40px] cursor-pointer">
                      <input type="checkbox" checked={pageBreaks} onChange={(e) => setPageBreaks(e.target.checked)} className="w-5 h-5 accent-[#111]" />
                      ขึ้นหน้าใหม่ตามหน้าที่สแกน
                    </label>
                    <label className="flex items-center gap-3 text-sm min-h-[40px] cursor-pointer">
                      <input type="checkbox" checked={withImages} onChange={(e) => setWithImages(e.target.checked)} className="w-5 h-5 accent-[#111]" />
                      แนบภาพต้นฉบับท้ายเอกสาร
                    </label>
                  </div>
                )}
                <Button onClick={() => run(o.key, o.action)} disabled={!!busy}>
                  {busy === o.key ? 'กำลังสร้างไฟล์...' : `ดาวน์โหลด ${o.tag}`}
                </Button>
              </Card>
            ))}

            {/* Slide teaser */}
            <Card className="p-5 md:p-6 flex flex-col border-[#7C3AED]/40" style={{ background: 'linear-gradient(160deg,#faf5ff,#ffffff)' }}>
              <span className="self-start text-white font-pixel text-xs px-2 py-1 mb-6" style={{ background: '#7C3AED' }}>.SLIDE</span>
              <h2 className="font-pixel text-2xl uppercase mb-1 text-[#5B21B6]">Slide</h2>
              <p className="text-sm text-ink/60 mb-4 flex-1">สร้างพรีเซนเทชันโทนม่วง-ขาวจากเอกสารนี้</p>
              <button
                onClick={() => setSlides(true)}
                className="font-menu font-medium min-h-[48px] px-5 rounded-[3px] text-sm text-white transition active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#5B21B6,#7C3AED)' }}
              >
                Export as Slide
              </button>
            </Card>
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

      <FeatureRequest />
      {slides && <CreateSlidesModal document={document} onClose={() => setSlides(false)} />}
    </div>
  );
}
