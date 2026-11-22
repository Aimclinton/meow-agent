import { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { AppHeader, Button, Card, PageTitle } from '../components/ui';
import CalicoCat from '../components/CalicoCat';
import FeatureRequest from '../components/FeatureRequest';

const DAY = 24 * 60 * 60 * 1000;

function ago(date) {
  const days = Math.floor((Date.now() - new Date(date)) / DAY);
  if (days <= 0) return 'วันนี้';
  if (days === 1) return 'เมื่อวาน';
  return `${days} วันก่อน`;
}

export default function HistoryPage({ onBack, onSelect, onExport, onNew }) {
  const { getRecentDocuments, deleteDocument } = useDocumentStore();
  const [query, setQuery] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const docs = getRecentDocuments()
    .slice()
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .filter((d) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return d.title.toLowerCase().includes(q) || d.pages.some((p) => p.ocrText?.toLowerCase().includes(q));
    });

  return (
    <div className="min-h-screen bg-paper text-ink font-mono overflow-x-hidden">
      <AppHeader onBack={onBack} backLabel="Home" />
      <FeatureRequest />
      <div className="safe-x pb-28">
        <div className="max-w-6xl mx-auto pt-8">
          <PageTitle kicker="Last 7 days" title="History">
            เอกสารเก็บไว้ในเครื่องนี้ 7 วัน แล้วลบอัตโนมัติ
          </PageTitle>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 ค้นหาชื่อหรือข้อความในเอกสาร"
            className="w-full max-w-md min-h-[52px] px-4 mb-8 bg-white/70 border border-ink/20 rounded-[3px] outline-none focus:border-ink focus:bg-white transition"
          />

          {docs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-32 mx-auto mb-6"><CalicoCat mood="closed" backdrop={false} blink={false} /></div>
              <p className="font-pixel text-lg uppercase mb-2">{query ? 'Not found' : 'Zzz... empty'}</p>
              <p className="text-sm text-ink/60 mb-6">{query ? 'ไม่พบเอกสารที่ตรงกับคำค้น' : 'ยังไม่มีเอกสาร แมวเลยนอนรอ'}</p>
              {!query && <Button onClick={onNew}>เริ่มสแกน</Button>}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {docs.map((doc) => {
                const left = Math.max(0, 7 - Math.floor((Date.now() - new Date(doc.updatedAt)) / DAY));
                return (
                  <Card key={doc.id} className="rise overflow-hidden flex flex-col">
                    <button onClick={() => onSelect(doc)} className="text-left">
                      <div className="relative h-40 bg-ink/5 scanlines overflow-hidden">
                        {doc.pages[0]?.imageData && (
                          <img src={doc.pages[0].imageData} alt="" className="w-full h-full object-cover object-top" />
                        )}
                        <span className="absolute top-2 left-2 bg-ink text-paper font-pixel text-xs px-2 py-1">{doc.pages.length}P</span>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium truncate">{doc.title}</h3>
                        <p className="text-xs text-ink/50 mt-1">อัปเดต{ago(doc.updatedAt)}</p>
                      </div>
                    </button>
                    {/* days-left meter */}
                    <div className="px-4 pb-1 flex items-center gap-2">
                      <div className="flex gap-[2px] flex-1">
                        {Array.from({ length: 7 }, (_, i) => (
                          <span key={i} className={`h-1.5 flex-1 ${i < left ? (left <= 2 ? 'bg-[#e2782a]' : 'bg-ink') : 'bg-ink/10'}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-ink/50 whitespace-nowrap">เหลือ {left} วัน</span>
                    </div>
                    <div className="p-3 flex gap-2 mt-auto">
                      {confirmId === doc.id ? (
                        <>
                          <Button variant="danger" className="flex-1" onClick={() => { deleteDocument(doc.id); setConfirmId(null); }}>ยืนยันลบ</Button>
                          <Button variant="soft" onClick={() => setConfirmId(null)}>ยกเลิก</Button>
                        </>
                      ) : (
                        <>
                          <Button className="flex-1" onClick={() => onSelect(doc)}>✎ แก้ไข</Button>
                          <Button variant="ghost" onClick={() => onExport(doc)}>ส่งออก</Button>
                          <Button variant="soft" aria-label="Delete" onClick={() => setConfirmId(doc.id)}>🗑</Button>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
