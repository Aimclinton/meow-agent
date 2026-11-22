import { t } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useQuota } from '../store/quotaStore';
import DocEditor from '../components/DocEditor';
import ZoomImage from '../components/ZoomImage';
import CalicoCat from '../components/CalicoCat';
import { Button, Card, HowTo, PageTitle, PageTransition, PixelProgress } from '../components/ui';
import { ocrPagesToDoc } from '../utils/ocrToDoc';
import { scanPage } from '../services/ocrClient';
import { meow } from '../utils/sound';
import SaveTemplateModal from '../components/SaveTemplateModal';
import { Toast } from '../components/FeatureRequest';

const contentOf = (page) => page.content || ocrPagesToDoc([page]);

// Drag & drop + up/down list for page order.
function PageOrder({ pages, onMove, onDelete, onOpen }) {
  const [dragged, setDragged] = useState(null);
  return (
    <ol className="space-y-2">
      {pages.map((p, i) => (
        <li
          key={p.id}
          draggable
          onDragStart={() => setDragged(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => { if (dragged !== null && dragged !== i) onMove(dragged, i); setDragged(null); }}
          className={`flex items-center gap-3 bg-white/70 border border-ink/15 rounded-[3px] p-2 transition ${dragged === i ? 'opacity-40' : ''}`}
        >
          <span className="cursor-grab text-ink/40 px-1 select-none" aria-hidden="true">⋮⋮</span>
          <button onClick={() => onOpen(i)} className="w-12 h-16 shrink-0 bg-white border border-ink/10 overflow-hidden">
            <img src={p.imageData} alt="" className="w-full h-full object-cover object-top" />
          </button>
          <button onClick={() => onOpen(i)} className="flex-1 min-w-0 text-left">
            <span className="font-pixel text-sm">{t('หน้า {n}', { n: String(i + 1).padStart(2, '0') })}</span>
            <span className="block text-xs text-ink/50 truncate">{(p.ocrText || '').slice(0, 80) || t('(ไม่พบข้อความ)')}</span>
          </button>
          <div className="flex shrink-0">
            <button disabled={i === 0} onClick={() => onMove(i, i - 1)} aria-label={t("เลื่อนขึ้น")} className="w-10 h-10 hover:bg-ink/5 disabled:opacity-25">↑</button>
            <button disabled={i === pages.length - 1} onClick={() => onMove(i, i + 1)} aria-label={t("เลื่อนลง")} className="w-10 h-10 hover:bg-ink/5 disabled:opacity-25">↓</button>
            <button onClick={() => onDelete(i)} aria-label={t("ลบหน้า")} className="w-10 h-10 text-red-700 hover:bg-red-50">✕</button>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ReviewPage({ document, onExport }) {
  const { reorderPages, deletePage, updateDocumentTitle, updatePage, updateMeta } = useDocumentStore();
  const consume = useQuota((q) => q.consume);
  const [tab, setTab] = useState('edit');
  const [index, setIndex] = useState(0);
  const [rescan, setRescan] = useState(null); // { progress }
  const [rescanError, setRescanError] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [showImage, setShowImage] = useState(true);
  const [saveTpl, setSaveTpl] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef(null);
  const pending = useRef({ pages: {}, meta: {} });
  const pages = document.pages;
  const page = pages[Math.min(index, pages.length - 1)];
  const prevIndex = useRef(index);
  const pageDir = index >= prevIndex.current ? 'next' : 'prev';
  prevIndex.current = index;

  // Write queued edits to the store (and IndexedDB).
  const flush = () => {
    clearTimeout(timer.current);
    const { pages: pp, meta } = pending.current;
    pending.current = { pages: {}, meta: {} };
    Object.entries(pp).forEach(([pid, content]) => updatePage(document.id, pid, { content }));
    if (Object.keys(meta).length) updateMeta(document.id, meta);
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => () => flushRef.current(), []);

  const schedule = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), 400);
  };

  if (!page) {
    return <p className="text-center text-sm text-ink/60 py-20">{t("ไม่มีหน้าแล้ว — กลับไปสแกนเพิ่มได้")}</p>;
  }

  const value = {
    content: contentOf(page),
    header: document.header || '',
    footer: document.footer || '',
    references: document.references || [],
    pageNumbers: document.pageNumbers !== false,
  };

  const onChange = (next) => {
    if (next.content !== value.content) pending.current.pages[page.id] = next.content;
    ['header', 'footer', 'references', 'pageNumbers'].forEach((k) => {
      if (next[k] !== value[k]) pending.current.meta[k] = next[k];
    });
    schedule();
  };

  const rescanDetailed = async () => {
    if (!window.confirm(t('สแกนหน้านี้ใหม่แบบละเอียด? ข้อความที่แก้ในหน้านี้จะถูกแทนที่'))) return;
    flush();
    delete pending.current.pages[page.id];
    setRescan({ progress: 10 });
    setRescanError('');
    try {
      const res = await scanPage(page.imageData, {
        detailed: true,
        onStage: (s) => setRescan((r) => ({ progress: Math.max(r?.progress || 0, s.progress || 0) })),
      });
      consume(res.usage);
      updatePage(document.id, page.id, {
        content: res.content, ocrText: res.ocrText, engine: res.engine, confidence: res.confidence,
        header: res.header, footer: res.footer, references: res.references,
      });
      const meta = {};
      if (!document.header && res.header) meta.header = res.header;
      if (!document.footer && res.footer) meta.footer = res.footer;
      const refs = [...new Set([...(document.references || []), ...(res.references || [])])];
      if (refs.length !== (document.references || []).length) meta.references = refs;
      if (Object.keys(meta).length) updateMeta(document.id, meta);
      setEditorKey((k) => k + 1);
      meow();
      if (res.engine === 'tesseract') setRescanError(t('ตอนนี้ใช้ AI ไม่ได้ เลยสแกนแบบออฟไลน์ให้แทน'));
    } catch (err) {
      setRescanError(err.message || t('สแกนใหม่ไม่สำเร็จ'));
    } finally {
      setRescan(null);
    }
  };

  const tabs = [
    ['edit', t('แก้ไข')],
    ['order', t('จัดเรียงหน้า ({n})', { n: pages.length })],
  ];

  return (
    <div className="safe-x pb-32">
      <div className="max-w-7xl mx-auto pt-8">
        <PageTitle kicker="Step 02" title="Review">
          {t("เทียบกับต้นฉบับแล้วแก้ได้ทุกจุด — หัวข้อ ย่อหน้า ตาราง หัว/ท้ายกระดาษ และอ้างอิง จุดสีเหลืองคือที่แมวอ่านไม่ชัด")}
        </PageTitle>

        <HowTo
          id="review"
          items={[
            ['‹ ›', 'กดลูกศร ‹ › หรือเลือกจากเมนู “หน้า 1 / 3” เพื่อเปลี่ยนหน้า'],
            ['🔍', 'รูปต้นฉบับ: จีบนิ้วหรือกด + − เพื่อซูม ดับเบิลแตะเพื่อซูมเร็ว'],
            ['✎', 'แตะข้อความเพื่อแก้ แถบเครื่องมือด้านบนปัดซ้าย-ขวาเพื่อดูปุ่มเพิ่ม (ตัวหนา ตาราง อ้างอิง)'],
            ['🟨', 'คำสีเหลือง [ไม่ชัดเจน] คือจุดที่แมวอ่านไม่ออก แก้ให้ถูกก่อนส่งออก'],
            ['↑ ↓', 'แท็บ “จัดเรียงหน้า” ลากวาง หรือกดลูกศรเพื่อสลับหน้า'],
          ]}
        />

        <label className="block max-w-md mb-6">
          <span className="block text-xs uppercase tracking-wider text-ink/60 mb-2">Document title</span>
          <input
            value={document.title}
            onChange={(e) => updateDocumentTitle(document.id, e.target.value)}
            className="w-full min-h-[52px] px-4 bg-white/70 border border-ink/20 rounded-[3px] outline-none focus:border-ink focus:bg-white transition"
          />
        </label>

        <div className="flex items-center gap-1 mb-4 border-b border-ink/15 font-menu text-sm">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              onClick={() => { flush(); setTab(k); }}
              className={`min-h-[44px] px-4 -mb-px border-b-2 transition ${tab === k ? 'border-ink text-ink font-medium' : 'border-transparent text-ink/50 hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'order' && (
          <div className="max-w-2xl">
            <p className="text-xs text-ink/50 mb-3">{t("ลากวาง หรือกด ↑ ↓ เพื่อเรียงลำดับหน้าก่อนส่งออก")}</p>
            <PageOrder
              pages={pages}
              onMove={(a, b) => { flush(); reorderPages(document.id, a, b); setIndex(b); }}
              onDelete={(i) => {
                if (!window.confirm(t('ลบหน้า {n}?', { n: i + 1 }))) return;
                flush();
                deletePage(document.id, i);
                setIndex(0);
              }}
              onOpen={(i) => { setIndex(i); setTab('edit'); }}
            />
          </div>
        )}

        {tab === 'edit' && (
          <>
            {/* Page switcher */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center border border-ink/20 rounded-[3px] font-menu">
                <button disabled={index === 0} onClick={() => { flush(); setIndex(index - 1); }} className="w-11 h-11 disabled:opacity-25" aria-label={t("หน้าก่อนหน้า")}>‹</button>
                <select
                  value={index}
                  onChange={(e) => { flush(); setIndex(Number(e.target.value)); }}
                  className="h-11 bg-transparent text-sm px-1 outline-none"
                  aria-label={t("เลือกหน้า")}
                >
                  {pages.map((p, i) => <option key={p.id} value={i}>{t('หน้า {i} / {n}', { i: i + 1, n: pages.length })}</option>)}
                </select>
                <button disabled={index >= pages.length - 1} onClick={() => { flush(); setIndex(index + 1); }} className="w-11 h-11 disabled:opacity-25" aria-label={t("หน้าถัดไป")}>›</button>
              </div>
              <button onClick={() => setShowImage((v) => !v)} className="md:hidden font-menu text-sm min-h-[44px] px-3 underline underline-offset-4 text-ink/70">
                {showImage ? t('ซ่อนต้นฉบับ') : t('ดูต้นฉบับ')}
              </button>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  onClick={() => { flush(); setSaveTpl(true); }}
                  disabled={!(pending.current.pages[page.id] || value.content)?.content?.some((n) => n.type === 'table')}
                  title={t("ต้องมีตารางในหน้านี้")}
                >
                  {t("💾 บันทึกโครงสร้างนี้เป็น Template")}
                </Button>
                <Button variant="ghost" onClick={rescanDetailed} disabled={!!rescan}>
                  {t("🔍 สแกนหน้านี้ใหม่แบบละเอียด")}
                </Button>
              </div>
            </div>

            {(rescan || rescanError) && (
              <Card className="p-3 mb-4 flex items-center gap-3">
                <div className="w-10 shrink-0"><CalicoCat backdrop={false} blink={false} mood={rescan ? 'open' : 'closed'} /></div>
                {rescan ? (
                  <div className="flex-1"><p className="text-xs mb-2">{t('แมวกำลังอ่านหน้า {n} อย่างละเอียด...', { n: index + 1 })}</p><PixelProgress value={rescan.progress} /></div>
                ) : (
                  <p className="text-sm text-[#c9661d]">{rescanError}</p>
                )}
              </Card>
            )}

            <PageTransition k={`${page.id}-${tab}`} dir={pageDir} paws={false}>
            <div className="grid md:grid-cols-2 gap-4 items-start">
              <div className={`${showImage ? '' : 'hidden'} md:block md:sticky md:top-[calc(env(safe-area-inset-top)+6rem)]`}>
                <ZoomImage key={page.id} src={page.imageData} alt={t('ต้นฉบับหน้า {n}', { n: index + 1 })} className="h-[42vh] md:h-[calc(100vh-8rem)]" />
                <p className="text-[11px] text-ink/40 mt-1">
                  {t('ต้นฉบับ')} · {page.engine === 'tesseract' ? t('อ่านแบบออฟไลน์') : page.engine ? t('อ่านโดย {engine}', { engine: page.engine }) : ''} · {t('ดับเบิลแตะหรือจีบนิ้วเพื่อซูม')}
                </p>
              </div>
              <div className="min-w-0">
                <DocEditor key={`${page.id}-${editorKey}`} value={value} onChange={onChange} />
              </div>
            </div>
            </PageTransition>
          </>
        )}
      </div>

      {saveTpl && (
        <SaveTemplateModal
          content={value.content}
          defaultName={document.title}
          onClose={() => setSaveTpl(false)}
          onSaved={(tpl) => { setSaveTpl(false); setToast(t('บันทึก Template “{name}” แล้ว ใช้ได้ตอนสแกนครั้งหน้า', { name: tpl.name })); }}
        />
      )}
      {toast && <Toast text={toast} onDone={() => setToast('')} />}

      <div className="fixed bottom-0 inset-x-0 z-20 bg-paper/90 backdrop-blur border-t border-ink/10 safe-x pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="max-w-7xl mx-auto flex justify-end">
          <Button
            onClick={() => {
              flush(); // export always uses the latest edits
              onExport();
            }}
            className="w-full sm:w-auto sm:px-10"
          >
            {t("ส่งออก ›")}
          </Button>
        </div>
      </div>
    </div>
  );
}

