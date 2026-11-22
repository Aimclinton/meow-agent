import { useState } from 'react';
import { Button, Card } from './ui';

export default function DocumentViewer({ pages, onReorder, onDelete, onEditText }) {
  const [dragged, setDragged] = useState(null);
  const [openId, setOpenId] = useState(null);
  const open = pages.find((p) => p.id === openId);
  const openIndex = pages.indexOf(open);

  if (pages.length === 0) {
    return <p className="text-sm text-ink/60 py-12 text-center">ไม่มีหน้าแล้ว — กลับไปสแกนเพิ่มได้</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {pages.map((page, i) => (
          <Card
            key={page.id}
            draggable
            onDragStart={() => setDragged(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (dragged !== null && dragged !== i) onReorder(dragged, i); setDragged(null); }}
            className={`overflow-hidden transition ${dragged === i ? 'opacity-40' : ''}`}
          >
            <button onClick={() => setOpenId(page.id)} className="block w-full text-left">
              <div className="relative aspect-[3/4] bg-ink/5 scanlines overflow-hidden">
                <img src={page.imageData} alt={`Page ${i + 1}`} className="w-full h-full object-contain bg-white" />
                <span className="absolute top-2 left-2 bg-ink text-paper font-pixel text-xs px-2 py-1">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <p className="px-3 pt-3 text-xs line-clamp-2 min-h-[2.5rem] text-ink/80">{page.ocrText || '(ไม่พบข้อความ)'}</p>
            </button>
            <div className="flex items-center gap-1 p-2">
              <button disabled={i === 0} onClick={() => onReorder(i, i - 1)} aria-label="Move left" className="w-10 h-10 grid place-items-center hover:bg-ink/5 disabled:opacity-25">‹</button>
              <button disabled={i === pages.length - 1} onClick={() => onReorder(i, i + 1)} aria-label="Move right" className="w-10 h-10 grid place-items-center hover:bg-ink/5 disabled:opacity-25">›</button>
              <button onClick={() => onDelete(i)} aria-label="Delete page" className="ml-auto w-10 h-10 grid place-items-center text-red-700 hover:bg-red-50">✕</button>
            </div>
          </Card>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6" onClick={() => setOpenId(null)}>
          <div
            className="rise bg-paper w-full md:max-w-4xl max-h-[92vh] overflow-y-auto rounded-t-[10px] md:rounded-[3px] grid md:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-ink/5 scanlines max-h-[40vh] md:max-h-none">
              <img src={open.imageData} alt="" className="w-full h-full object-contain max-h-[40vh] md:max-h-[80vh]" />
            </div>
            <div className="p-5 flex flex-col gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between">
                <span className="font-pixel uppercase">Page {String(openIndex + 1).padStart(2, '0')}</span>
                <span className="text-xs text-ink/50">แม่นยำ {Math.round(open.confidence || 0)}%</span>
              </div>
              <textarea
                value={open.ocrText || ''}
                onChange={(e) => onEditText(open.id, e.target.value)}
                rows={12}
                placeholder="พิมพ์ข้อความของหน้านี้"
                className="w-full flex-1 min-h-[200px] p-3 bg-white/70 border border-ink/20 rounded-[3px] text-sm leading-relaxed outline-none focus:border-ink focus:bg-white"
              />
              <Button onClick={() => setOpenId(null)}>เสร็จ</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
