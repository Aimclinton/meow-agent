import { useEffect, useRef, useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import DocumentViewer from '../components/DocumentViewer';
import DocEditor from '../components/DocEditor';
import { Button, PageTitle } from '../components/ui';
import { ocrPagesToDoc } from '../utils/ocrToDoc';

function ensureRichDoc(document) {
  return document.richDoc || {
    content: ocrPagesToDoc(document.pages),
    header: '',
    footer: '',
    pageNumbers: true,
    references: [],
    version: 0,
  };
}

export default function ReviewPage({ document, onExport }) {
  const { reorderPages, deletePage, updateDocumentTitle, updatePageText, updateDoc } = useDocumentStore();
  const [tab, setTab] = useState('doc');
  const [rich, setRich] = useState(() => ensureRichDoc(document));
  const saveTimer = useRef();

  // Save the first generated version right away.
  useEffect(() => {
    if (!document.richDoc) updateDoc(document.id, (d) => ({ ...d, richDoc: rich }));
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const change = (next) => {
    setRich(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => updateDoc(document.id, (d) => ({ ...d, richDoc: next })), 500);
  };

  const regenerate = () => {
    if (!window.confirm('สร้างเอกสารใหม่จากข้อความที่สแกน? การแก้ไขในเอกสารจะหายไป')) return;
    change({ ...rich, content: ocrPagesToDoc(document.pages), version: (rich.version || 0) + 1 });
    setTab('doc');
  };

  const tabs = [
    ['doc', 'เอกสาร'],
    ['pages', `หน้าสแกน (${document.pages.length})`],
  ];

  return (
    <div className="safe-x pb-32">
      <div className="max-w-4xl mx-auto pt-8">
        <PageTitle kicker="Step 02" title="Edit">
          แมวจัดหัวข้อ รายการ และตารางให้แล้ว แก้ต่อได้เลย — ตัวหนา ตัวเอียง ตาราง หัว/ท้ายกระดาษ และอ้างอิง
        </PageTitle>

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
              onClick={() => setTab(k)}
              className={`min-h-[44px] px-4 -mb-px border-b-2 transition ${tab === k ? 'border-ink text-ink font-medium' : 'border-transparent text-ink/50 hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
          <button onClick={regenerate} className="ml-auto min-h-[44px] px-2 text-xs text-ink/60 hover:text-ink underline underline-offset-4">
            ↻ จัดใหม่จากสแกน
          </button>
        </div>

        <div className={tab === 'doc' ? '' : 'hidden'}>
          <DocEditor value={rich} onChange={change} />
        </div>

        {tab === 'pages' && (
          <>
            <p className="text-xs text-ink/50 mb-4">ข้อความดิบจากการสแกน — แก้แล้วกด “จัดใหม่จากสแกน” เพื่อสร้างเอกสารใหม่</p>
            <DocumentViewer
              pages={document.pages}
              onReorder={(a, b) => reorderPages(document.id, a, b)}
              onDelete={(i) => deletePage(document.id, i)}
              onEditText={(pageId, text) => updatePageText(document.id, pageId, text)}
            />
          </>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-20 bg-paper/90 backdrop-blur border-t border-ink/10 safe-x pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="max-w-4xl mx-auto flex justify-end">
          <Button
            onClick={() => {
              clearTimeout(saveTimer.current);
              updateDoc(document.id, (d) => ({ ...d, richDoc: rich }));
              onExport();
            }}
            className="w-full sm:w-auto sm:px-10"
          >
            ส่งออก ›
          </Button>
        </div>
      </div>
    </div>
  );
}
