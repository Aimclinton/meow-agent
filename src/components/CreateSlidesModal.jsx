import { t } from '../i18n';
import { useMemo, useState } from 'react';
import { documentToMarkdown } from '../utils/docContent';

const STYLES = [
  {
    id: 'clinical',
    name: 'Professional Clinical',
    th: 'ม่วงเข้ม-ขาว คลีน ทางการ',
    use: 'นำเสนอเคสผู้ป่วย / รายงานวิจัย',
    palette: { primary: '#3B0764', accent: '#7C3AED', bg: '#FFFFFF', soft: '#F5F3FF' },
    brief: `Style: "Professional Clinical" — deep purple (#3B0764) and white, clean and formal, conveys trust and credibility.
- Title slides: solid deep-purple background, white bold title, thin violet (#7C3AED) accent line.
- Content slides: white background, deep-purple headings, dark-grey body text, generous margins, one idea per slide.
- Use a clear clinical structure: Patient/Case info → Chief complaint & history → Clinical/radiographic findings → Diagnosis → Treatment plan → Outcome/Follow-up → Discussion & references (adapt to the content).
- Tables with deep-purple header row and light-lavender (#F5F3FF) zebra rows; numbers right-aligned.
- Minimal icons only (tooth, chart, calendar); no clip-art, no stock photos with text.`,
  },
  {
    id: 'student',
    name: 'Dental Student Minimal',
    th: 'ม่วงพาสเทล-ขาว มินิมอล อ่านง่าย',
    use: 'สรุปเลกเชอร์ สำหรับนักศึกษาทันตแพทย์',
    palette: { primary: '#6D28D9', accent: '#C4B5FD', bg: '#FFFFFF', soft: '#F3E8FF' },
    brief: `Style: "Dental Student Minimal" — pastel purple (#C4B5FD / #F3E8FF) and white, minimal and very easy to read.
- Big clear headings in purple (#6D28D9), lots of white space, max 5 short bullets per slide.
- Start with "Learning objectives", end with "Key takeaways" and a short self-check quiz (3-5 questions) from the content.
- Highlight key terms in bold purple; definitions in rounded pastel boxes.
- Use simple numbered steps for procedures and mnemonic-style summaries where the content allows.
- Friendly, calm look suitable for revision before exams.`,
  },
  {
    id: 'infographic',
    name: 'Modern Academic Infographic',
    th: 'ม่วงไล่เฉด-เทาอ่อน ทันสมัย',
    use: 'เปรียบเทียบข้อมูล ตาราง และแผนภาพ',
    palette: { primary: '#5B21B6', accent: '#A78BFA', bg: '#F4F4F5', soft: '#EDE9FE' },
    brief: `Style: "Modern Academic Infographic" — purple gradient (#5B21B6 → #A78BFA) with light grey (#F4F4F5) backgrounds, modern and data-forward.
- Turn lists and tables into visuals: comparison columns, timelines, flow diagrams, simple bar/donut charts with the exact numbers from the content.
- Section divider slides with a purple gradient; content slides on light grey with white cards.
- Each slide has a one-line takeaway headline (insight, not just a topic).
- Keep tables when they are the clearest format, styled with a gradient header and clean grid.
- Consistent icon set, 2-3 font sizes only, strong visual hierarchy.`,
  },
];

function Mockup({ style, active }) {
  const p = style.palette;
  const grad = style.id === 'infographic' ? `linear-gradient(135deg, ${p.primary}, ${p.accent})` : p.primary;
  return (
    <div className={`aspect-video rounded-[4px] overflow-hidden border ${active ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]' : 'border-ink/15'}`} style={{ background: p.bg }} aria-hidden="true">
      {style.id === 'clinical' && (
        <div className="h-full flex">
          <div className="w-[38%] h-full p-2 flex flex-col justify-end" style={{ background: grad }}>
            <div className="h-1.5 w-3/4 bg-white rounded-sm mb-1" />
            <div className="h-1 w-1/2 bg-white/60 rounded-sm mb-1" />
            <div className="h-0.5 w-6" style={{ background: p.accent }} />
          </div>
          <div className="flex-1 p-2 space-y-1">
            <div className="h-1.5 w-2/3 rounded-sm" style={{ background: p.primary }} />
            {[0, 1, 2].map((i) => <div key={i} className="h-1 w-full rounded-sm bg-zinc-300" />)}
            <div className="grid grid-cols-3 gap-[2px] pt-1">
              {Array.from({ length: 9 }, (_, i) => <div key={i} className="h-1.5" style={{ background: i < 3 ? p.primary : i % 2 ? p.soft : '#fff', outline: '1px solid #eee' }} />)}
            </div>
          </div>
        </div>
      )}
      {style.id === 'student' && (
        <div className="h-full p-2.5 flex flex-col gap-1.5">
          <div className="h-2 w-1/2 rounded-full" style={{ background: p.primary }} />
          <div className="flex gap-1.5 flex-1">
            <div className="flex-1 space-y-1.5 pt-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ background: p.accent }} /><div className="h-1 flex-1 rounded-sm bg-zinc-200" /></div>
              ))}
            </div>
            <div className="w-[38%] rounded-md p-1.5 space-y-1" style={{ background: p.soft }}>
              <div className="h-1 w-3/4 rounded-sm" style={{ background: p.primary }} />
              <div className="h-1 w-full rounded-sm bg-white" />
              <div className="h-1 w-2/3 rounded-sm bg-white" />
            </div>
          </div>
        </div>
      )}
      {style.id === 'infographic' && (
        <div className="h-full p-2 flex flex-col gap-1.5">
          <div className="h-2 w-2/3 rounded-sm" style={{ background: grad }} />
          <div className="flex-1 grid grid-cols-3 gap-1.5">
            <div className="bg-white rounded-sm p-1 flex items-end gap-[2px]">
              {[40, 70, 55, 90].map((h, i) => <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: grad }} />)}
            </div>
            <div className="bg-white rounded-sm grid place-items-center">
              <div className="w-6 h-6 rounded-full" style={{ background: `conic-gradient(${p.primary} 0 65%, ${p.soft} 0)` }} />
            </div>
            <div className="bg-white rounded-sm p-1 space-y-1">
              {[0, 1, 2].map((i) => <div key={i} className="h-1 rounded-sm" style={{ background: i ? '#e4e4e7' : p.accent }} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildPrompt(document, style) {
  const content = documentToMarkdown(document);
  return `You are an expert presentation designer for dentistry and health-science education.
Create a complete, professional slide deck from the scanned document below. Write the slides in the same language as the document (Thai and/or English; keep dental/medical terms as written).

Document title: ${document.title || 'Untitled'}
Pages scanned: ${document.pages.length}

${style.brief}

Deck requirements:
- Colour theme: clean purple and white only (primary ${style.palette.primary}, accent ${style.palette.accent}, background ${style.palette.bg}); high contrast and accessible.
- Font: Google Sans (or Noto Sans Thai / Sarabun for Thai so tone marks don't float).
- Structure: 1 title slide → agenda → content slides grouped by the document's headings → summary → references (if any).
- 8-15 slides depending on the amount of content. One key message per slide, max ~6 bullets, short phrases.
- Preserve every fact, number, unit and table value exactly; do not invent data. Where the source says [ไม่ชัดเจน], flag it as "needs verification".
- Recreate tables as clean styled tables; suggest a chart only when the numbers support it.
- For each slide give: slide title, on-slide content, suggested visual/layout, and brief speaker notes.

=== SCANNED CONTENT (Markdown) ===
${content || '(no text)'}
=== END ===`;
}

export default function CreateSlidesModal({ document, onClose }) {
  const [styleId, setStyleId] = useState(STYLES[0].id);
  const [copied, setCopied] = useState(false);
  const style = STYLES.find((s) => s.id === styleId);
  const prompt = useMemo(() => buildPrompt(document, style), [document, style]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const ta = window.document.createElement('textarea');
      ta.value = prompt;
      window.document.body.appendChild(ta);
      ta.select();
      window.document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6 font-mono" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="rise bg-paper text-ink w-full md:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-[10px] md:rounded-[3px] p-5 md:p-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#7C3AED] mb-2">Export as Slide</p>
            <h2 className="font-menu font-bold text-xl md:text-2xl leading-snug">
              {t("ว้ายยยยยย ยังไม่เปิด แต่ว่าสามารถเอา prompt นี้ไปให้ AI สร้างสไลด์ให้ได้เลยนะ")}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-11 h-11 grid place-items-center hover:bg-ink/5 shrink-0">✕</button>
        </div>

        <p className="text-xs uppercase tracking-wider text-ink/50 mb-3">{t("เลือกสไตล์สไลด์")}</p>
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          {STYLES.map((s) => (
            <button key={s.id} onClick={() => setStyleId(s.id)} aria-pressed={s.id === styleId} className="text-left group">
              <Mockup style={s} active={s.id === styleId} />
              <span className="block font-menu font-medium text-sm mt-2">{s.name}</span>
              <span className="block text-xs text-ink/60">{t(s.th)}</span>
              <span className="block text-[11px] text-ink/40">{t(s.use)}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-ink/50">Prompt · {style.name}</p>
          <span className="text-[11px] text-ink/40">{t('{n} ตัวอักษร', { n: prompt.length.toLocaleString() })}</span>
        </div>
        <textarea
          readOnly
          value={prompt}
          className="w-full h-56 bg-white/80 border border-ink/15 rounded-[3px] p-3 text-xs leading-relaxed outline-none mb-4"
          onFocus={(e) => e.target.select()}
        />

        <button
          onClick={copy}
          className="font-menu font-medium w-full min-h-[52px] rounded-[3px] text-white transition mb-5"
          style={{ background: copied ? '#16a34a' : 'linear-gradient(135deg,#5B21B6,#7C3AED)' }}
        >
          {copied ? t('✓ คัดลอกแล้ว') : 'Copy Prompt'}
        </button>

        <p className="text-xs uppercase tracking-wider text-ink/50 mb-3">{t("แล้ววางใน")}</p>
        <div className="grid grid-cols-3 gap-2">
          {[['Gemini', 'https://gemini.google.com/app'], ['Claude', 'https://claude.ai/new'], ['ChatGPT', 'https://chatgpt.com/']].map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noreferrer" className="font-menu min-h-[48px] grid place-items-center border border-ink rounded-[3px] text-sm hover:bg-ink hover:text-paper transition">
              {name} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
