import { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import DocumentWorkflow from './DocumentWorkflow';
import HistoryPage from './HistoryPage';
import ExportPage from './ExportPage';
import CreateSlidesModal from '../components/CreateSlidesModal';
import SettingsModal from '../components/SettingsModal';
import FeatureRequest from '../components/FeatureRequest';
import { CatMascot, PixelLogo } from '../components/ui';

export default function MainApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedDocForExport, setSelectedDocForExport] = useState(null);
  const [slidesDoc, setSlidesDoc] = useState(null);
  const [editDocId, setEditDocId] = useState(null);
  const [settings, setSettings] = useState(false);
  const { documents, logout } = useDocumentStore();

  // Handle page routing
  if (currentPage === 'workflow') {
    return <DocumentWorkflow initialDocId={editDocId} onExit={() => { setEditDocId(null); setCurrentPage('dashboard'); }} />;
  }

  if (currentPage === 'history') {
    return (
      <HistoryPage
        onBack={() => setCurrentPage('dashboard')}
        onNew={() => setCurrentPage('workflow')}
        onSelect={(doc) => {
          setEditDocId(doc.id);
          setCurrentPage('workflow');
        }}
        onExport={(doc) => {
          setSelectedDocForExport(doc);
          setCurrentPage('export');
        }}
      />
    );
  }

  if (currentPage === 'export' && selectedDocForExport) {
    return (
      <ExportPage
        document={documents.find((d) => d.id === selectedDocForExport.id) || selectedDocForExport}
        onBack={() => {
          setCurrentPage('dashboard');
          setSelectedDocForExport(null);
        }}
        onDone={() => {
          setCurrentPage('dashboard');
          setSelectedDocForExport(null);
        }}
        onEdit={() => {
          setEditDocId(selectedDocForExport.id);
          setSelectedDocForExport(null);
          setCurrentPage('workflow');
        }}
      />
    );
  }

  const totalPages = documents.reduce((sum, doc) => sum + doc.pages.length, 0);

  const actions = [
    { n: '01', title: 'New Document', desc: 'Start scanning', onClick: () => setCurrentPage('workflow') },
    { n: '02', title: 'History', desc: 'Past 7 days', onClick: () => setCurrentPage('history') },
    { n: '03', title: 'AI Slides', desc: documents.length ? 'From latest doc' : 'Scan first', onClick: () => (documents.length ? setSlidesDoc(documents[documents.length - 1]) : setCurrentPage('workflow')) },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink font-mono overflow-x-hidden">
      {/* Header */}
      <header className="safe-x pt-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-12">
          <PixelLogo />
          <nav className="font-menu flex items-center gap-1 sm:gap-4 text-sm">
            <button onClick={() => setCurrentPage('workflow')} className="px-2 py-2 hover:underline underline-offset-4">Scan</button>
            <button onClick={() => setCurrentPage('history')} className="px-2 py-2 hover:underline underline-offset-4">History</button>
            <a href="/guide.html" className="hidden sm:inline px-2 py-2 hover:underline underline-offset-4">Guide</a>
            <button onClick={() => setSettings(true)} aria-label="ตั้งค่า" className="px-2 py-2 hover:underline underline-offset-4">⚙</button>
            <button onClick={logout} className="px-2 py-2 hover:underline underline-offset-4">Logout</button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="safe-x">
        <div className="relative max-w-6xl mx-auto pt-6 pb-10 md:pt-14 md:pb-16 md:min-h-[min(78vh,760px)] md:flex md:flex-col md:justify-between">
          <h1 className="relative z-10 font-pixel font-bold uppercase leading-[0.95] tracking-tight text-[clamp(3.25rem,15vw,5.5rem)] md:text-[clamp(4rem,7.6vw,6.5rem)]">
            Meow<br />AI Agent
          </h1>

          {/* Cat: stacked on phones, floating right on iPad / desktop */}
          <div className="mx-auto w-[70%] max-w-[360px] my-5 md:my-0 md:absolute md:right-[-2%] md:bottom-6 md:w-[52%] md:max-w-[600px]">
            <CatMascot />
          </div>

          <div className="relative z-10 md:max-w-[40%]">
            <p className="text-[15px] leading-relaxed mb-8 max-w-sm">
              Your personal AI document assistant — capture handwriting, extract text and export instantly.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                onClick={() => setCurrentPage('workflow')}
                className="font-menu font-medium min-h-[48px] px-6 bg-ink text-paper text-sm rounded-[3px] hover:bg-neutral-700 active:scale-[0.98] transition"
              >
                Get Started
              </button>
              <button
                onClick={() => setCurrentPage('history')}
                className="font-menu min-h-[48px] text-sm inline-flex items-center gap-2 hover:underline underline-offset-4"
              >
                See History <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <main className="safe-x pb-28">
        <div className="max-w-6xl mx-auto border-t border-ink/15 pt-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-12">
            {actions.map((a) => (
              <button
                key={a.n}
                onClick={a.onClick}
                className="group text-left bg-white/60 border border-ink/15 rounded-[3px] p-4 md:p-5 min-h-[128px] flex flex-col justify-between hover:border-ink hover:bg-white active:bg-white transition"
              >
                <span className="text-xs text-ink/50">{a.n}</span>
                <span>
                  <span className="block font-pixel text-base md:text-lg uppercase leading-tight">{a.title}</span>
                  <span className="block text-xs text-ink/60 mt-1">{a.desc} <span className="inline-block transition-transform group-hover:translate-x-1">›</span></span>
                </span>
              </button>
            ))}

            <div className="bg-ink text-paper rounded-[3px] p-4 md:p-5 min-h-[128px] grid grid-cols-2 gap-2 content-between">
              <span className="col-span-2 text-xs text-paper/50">04</span>
              <div>
                <div className="font-pixel text-3xl md:text-4xl">{documents.length}</div>
                <div className="text-xs text-paper/60">Documents</div>
              </div>
              <div>
                <div className="font-pixel text-3xl md:text-4xl">{totalPages}</div>
                <div className="text-xs text-paper/60">Pages</div>
              </div>
            </div>
          </div>

          {documents.length > 0 && (
            <section>
              <h2 className="font-pixel text-xl md:text-2xl uppercase mb-5">Recent Documents</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {documents.slice(-3).reverse().map((doc) => (
                  <div key={doc.id} className="bg-white/60 border border-ink/15 rounded-[3px] p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-medium truncate">{doc.title}</h3>
                      <span className="text-xs text-ink/50 shrink-0">{doc.pages.length} pages</span>
                    </div>
                    <p className="text-xs text-ink/50 mb-4">
                      Updated {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                    <button
                      onClick={() => {
                        setEditDocId(doc.id);
                        setCurrentPage('workflow');
                      }}
                      className="font-menu w-full min-h-[44px] border border-ink text-sm rounded-[3px] hover:bg-ink hover:text-paper transition"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <FeatureRequest />
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
      {slidesDoc && <CreateSlidesModal document={slidesDoc} onClose={() => setSlidesDoc(null)} />}
    </div>
  );
}

