import { useRef, useState } from 'react';
import { useDocxExport } from '../hooks/useDocxExport';
import { useXlsxExport } from '../hooks/useXlsxExport';
import { useDocumentStore } from '../store/documentStore';
import { documentToPlainText } from '../utils/docContent';
import { useEffect } from 'react';
import { REPORT_FONTS, docFont, docFontSize, fontInfo, loadPreviewFonts } from '../utils/fonts';
import { t, useLang } from '../i18n';
import CreateSlidesModal from '../components/CreateSlidesModal';
import FeatureRequest, { Toast } from '../components/FeatureRequest';
import ShareModal, { ShareIcon } from '../components/ShareModal';
import { meow } from '../utils/sound';
import { AppHeader, Button, Card, CatMascot, HowTo, PageTitle, PawBurst } from '../components/ui';

const DONE_PHRASES = ['เสร็จแล้ว! เมี้ยว~', 'ขอจ๋องเลียเป็นค่าจ้าง', 'Purrfect!', 'งานไวเหมือนจ๋องวิ่ง'];

// Report font picker: one font for Thai + English, each tile previews itself.
function FontPicker({ value, size, onChange, onSize }) {
  const lang = useLang((st) => st.lang);
  useEffect(() => { loadPreviewFonts(); }, []);
  const current = fontInfo(value);
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4" role="radiogroup" aria-label={t('ฟอนต์')}>
        {REPORT_FONTS.map((f) => (
          <button
            key={f.name}
            role="radio"
            aria-checked={f.name === value}
            onClick={() => onChange(f.name)}
            className={`text-left rounded-[3px] border p-3 transition ${f.name === value ? 'border-ink bg-white shadow-[2px_2px_0_#111]' : 'border-ink/15 bg-white/50 hover:border-ink/50'}`}
          >
            <span className="block text-lg leading-snug truncate" style={{ fontFamily: `${f.css}, sans-serif` }}>รายงาน Report ๑๒๓</span>
            <span className="block font-menu text-xs font-medium mt-1 truncate">{f.name}</span>
            <span className="block text-[11px] text-ink/50 truncate">{lang === 'en' ? f.noteEn : f.note}</span>
          </button>
        ))}
      </div>
      <div className="bg-white border border-ink/10 rounded-[3px] p-4 leading-relaxed" style={{ fontFamily: `${current.css}, sans-serif`, fontSize: `${Math.round(size * 1.35)}px` }} aria-label={t('ตัวอย่างฟอนต์')}>
        <b>บันทึกการรักษา Case Report</b><br />
        ฟันกรามซี่ที่ ๖ มีรอยผุ ผู้ป่วยปวดเสียวเมื่อดื่มน้ำเย็น — <i>Lower first molar, deep caries</i>, probing 4 mm.
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-ink/60">
        <label className="flex items-center gap-2">
          {t('ขนาดตัวอักษร')}
          <select value={size} onChange={(e) => onSize(Number(e.target.value))} className="min-h-[40px] px-2 bg-white/70 border border-ink/20 rounded-[3px]">
            {[10, 11, 12, 14, 16, 18, 20].map((n) => <option key={n} value={n}>{n} pt</option>)}
          </select>
        </label>
        <span>{t('ถ้าเครื่องที่เปิดไฟล์ไม่มีฟอนต์นี้ Word จะใช้ฟอนต์ใกล้เคียงแทน')}</span>
      </div>
    </>
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
  const font = docFont(document);
  const fontSize = docFontSize(document);
  const [shareModal, setShareModal] = useState(null); // File for the desktop fallback
  const [tapAgain, setTapAgain] = useState(null); // kind whose file is ready but the gesture expired
  const [toast, setToast] = useState('');
  const fileCache = useRef({});
  const optsKey = JSON.stringify([document.updatedAt, font, fontSize, withImages, pageBreaks]);

  const makeFile = async (kind) => {
    const cached = fileCache.current[kind];
    if (cached && cached.key === optsKey) return cached.file;
    const res = kind === 'docx'
      ? await generateDocx(document, { includeImages: withImages, pageBreaks, download: false })
      : await generateXlsx(document, { download: false });
    if (!res.success) throw new Error(res.error);
    const type = kind === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const file = new File([res.blob], res.fileName, { type });
    fileCache.current[kind] = { key: optsKey, file };
    return file;
  };

  // Prepare both files in the background so the share sheet opens instantly
  // (iOS only allows navigator.share right after a tap).
  useEffect(() => {
    const id = setTimeout(() => {
      ['docx', 'xlsx'].reduce((p, k) => p.then(() => makeFile(k).catch(() => {})), Promise.resolve());
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optsKey]);

  const shared = () => {
    meow();
    setBurst((n) => n + 1);
    setToast(t('จ๋องคาบไฟล์ไปส่งให้แล้วนะ 🐾'));
  };

  const shareFile = async (kind) => {
    setMessage(null);
    setTapAgain(null);
    const ready = fileCache.current[kind]?.key === optsKey ? fileCache.current[kind].file : null;
    let file = ready;
    try {
      if (!file) {
        setBusy(`share-${kind}`);
        file = await makeFile(kind);
      }
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: t('เอกสารจาก MEOW Agent'), text: t('ส่งเอกสารที่สแกนเรียบร้อยแล้ว 🐱') });
          shared();
        } catch (err) {
          if (err.name === 'AbortError') return; // user closed the share sheet
          if (err.name === 'NotAllowedError' && !ready) { setTapAgain(kind); return; } // tap expired while building
          throw err;
        }
      } else {
        setShareModal(file);
      }
    } catch (err) {
      setMessage({ ok: false, text: t('ไม่สำเร็จ: {msg}', { msg: err.message }) });
    } finally {
      setBusy(null);
    }
  };

  const run = async (kind, fn) => {
    setBusy(kind);
    setMessage(null);
    try {
      const res = await fn();
      if (res?.success === false) throw new Error(res.error);
      setMessage({ ok: true, text: res?.fileName ? t('บันทึก {name} แล้ว', { name: res.fileName }) : t('เรียบร้อย!') });
      setBurst((n) => n + 1);
      if (kind === 'docx' || kind === 'xlsx') meow();
    } catch (err) {
      setMessage({ ok: false, text: t('ไม่สำเร็จ: {msg}', { msg: err.message }) });
    } finally {
      setBusy(null);
    }
  };

  const allText = () => documentToPlainText(document);
  const copyText = () => run('copy', async () => {
    await navigator.clipboard.writeText(allText());
    return { success: true };
  });
  const share = () => run('share', async () => {
    await navigator.share({ title: document.title, text: allText() });
    return { success: true };
  });

  const options = [
    { key: 'docx', tag: '.DOCX', title: 'Word', desc: t('หัวข้อ ตัวหนา/เอียง ตาราง (รวมเซลล์) หัว-ท้ายกระดาษ เลขหน้า และอ้างอิง'), action: () => generateDocx(document, { includeImages: withImages, pageBreaks }) },
    { key: 'xlsx', tag: '.XLSX', title: 'Excel', desc: t('คงหัวข้อ ตัวหนา/เอียง ตารางพร้อมเซลล์ผสาน และหัว-ท้ายกระดาษตอนพิมพ์'), action: () => generateXlsx(document) },
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

          <HowTo
            id="export"
            items={[
              ['Aa', 'แตะการ์ดฟอนต์เพื่อเลือก ดูตัวอย่างด้านล่างได้ทันที'],
              ['⬇', 'กดดาวน์โหลด .DOCX (Word) หรือ .XLSX (Excel) ไฟล์จะอยู่ในโฟลเดอร์ดาวน์โหลด'],
              ['🎬', 'Export as Slide = คัดลอก prompt ไปให้ AI ทำสไลด์ต่อ'],
              ['↗', 'ปุ่มแชร์ข้างปุ่มดาวน์โหลด: มือถือส่งไฟล์เข้า LINE / Messenger / อีเมลได้เลย ส่วนคอมจะมีตัวเลือกอีเมลหรือคัดลอกข้อความ'],
              ['📋', 'คัดลอกข้อความทั้งหมด ไปวางในแชทหรือโน้ตได้'],
            ]}
          />

          {/* Fonts */}
          <Card className="p-5 md:p-6 mb-4">
            <p className="font-pixel uppercase mb-1">Fonts</p>
            <p className="text-xs text-ink/60 mb-4">{t('เลือกฟอนต์สำหรับไฟล์ Word / Excel (ใช้ทั้งภาษาไทยและอังกฤษ)')}</p>
            <FontPicker
              value={font}
              size={fontSize}
              onChange={(name) => updateMeta(document.id, { font: name, fontSize: fontInfo(name).size })}
              onSize={(n) => updateMeta(document.id, { fontSize: n })}
            />
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
                      {t("ขึ้นหน้าใหม่ตามหน้าที่สแกน")}
                    </label>
                    <label className="flex items-center gap-3 text-sm min-h-[40px] cursor-pointer">
                      <input type="checkbox" checked={withImages} onChange={(e) => setWithImages(e.target.checked)} className="w-5 h-5 accent-[#111]" />
                      {t("แนบภาพต้นฉบับท้ายเอกสาร")}
                    </label>
                  </div>
                )}
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Button onClick={() => run(o.key, o.action)} disabled={!!busy}>
                    {busy === o.key ? t('กำลังสร้างไฟล์...') : t('ดาวน์โหลด {tag}', { tag: o.tag })}
                  </Button>
                  <Button
                    variant={tapAgain === o.key ? 'orange' : 'ghost'}
                    onClick={() => shareFile(o.key)}
                    disabled={!!busy}
                    aria-label={t('แชร์ไฟล์ {tag}', { tag: o.tag })}
                    className="px-4"
                  >
                    <ShareIcon />
                    <span>{busy === `share-${o.key}` ? '...' : tapAgain === o.key ? t('แตะอีกครั้ง') : t('แชร์')}</span>
                  </Button>
                </div>
                <p className="text-[11px] text-ink/45 mt-2">{t('แชร์ = ส่งเข้า LINE, Messenger, อีเมล หรือแอปอื่นได้ทันที')}</p>
              </Card>
            ))}

            {/* Slide teaser */}
            <Card className="p-5 md:p-6 flex flex-col border-[#7C3AED]/40" style={{ background: 'linear-gradient(160deg,#faf5ff,#ffffff)' }}>
              <span className="self-start text-white font-pixel text-xs px-2 py-1 mb-6" style={{ background: '#7C3AED' }}>.SLIDE</span>
              <h2 className="font-pixel text-2xl uppercase mb-1 text-[#5B21B6]">Slide</h2>
              <p className="text-sm text-ink/60 mb-4 flex-1">{t("สร้างพรีเซนเทชันโทนม่วง-ขาวจากเอกสารนี้")}</p>
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
            {onEdit && <Button variant="ghost" onClick={onEdit}>{t("✎ แก้ไขเอกสาร")}</Button>}
            <Button variant="ghost" onClick={copyText} disabled={!!busy}>{t("📋 คัดลอกข้อความทั้งหมด")}</Button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <Button variant="ghost" onClick={share} disabled={!!busy}>{t("↗ แชร์")}</Button>
            )}
          </div>

          {message && (
            <p className={`rise text-sm border-l-2 pl-3 py-1 mb-6 ${message.ok ? 'border-[#e2782a]' : 'border-red-700 text-red-700'}`}>
              {message.text}
            </p>
          )}

          {onDone && (
            <Button variant="soft" onClick={onDone} className="w-full sm:w-auto">{t("เสร็จแล้ว กลับหน้าแรก")}</Button>
          )}
        </div>
      </div>

      {shareModal && (
        <ShareModal
          file={shareModal}
          document={document}
          summary={allText()}
          onClose={() => setShareModal(null)}
          onDone={(how) => { if (how === 'email') shared(); }}
        />
      )}
      {toast && <Toast text={toast} onDone={() => setToast('')} />}
      <FeatureRequest />
      {slides && <CreateSlidesModal document={document} onClose={() => setSlides(false)} />}
    </div>
  );
}
