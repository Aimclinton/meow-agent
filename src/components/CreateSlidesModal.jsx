import { useState } from 'react';

export default function CreateSlidesModal({ document, onClose }) {
  const [copiedSection, setCopiedSection] = useState(null);

  // Generate smart prompt based on document
  const generatePrompt = () => {
    const text = document.pages
      .map((p) => p.ocrText)
      .join('\n')
      .substring(0, 1000);

    return `I have a document called "${document.title}" with ${document.pages.length} pages.

Here's a summary of the content:
${text}${text.length >= 1000 ? '...' : ''}

Please create a professional presentation (slides) from this content. Focus on:
1. Main themes and key points
2. Clear structure with logical sections
3. Recommended number of slides
4. Title, bullet points, and any visual suggestions

Please suggest a compelling presentation outline.`;
  };

  const prompt = generatePrompt();

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  const tools = [
    ['Claude', 'https://claude.ai/new'],
    ['ChatGPT', 'https://chatgpt.com/'],
    ['Gemini', 'https://gemini.google.com/app'],
  ];

  return (
    <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6 font-mono" onClick={onClose}>
      <div
        className="rise bg-paper text-ink w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-[10px] md:rounded-[3px] p-5 md:p-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink/50 mb-2">AI Slides</p>
            <h2 className="font-pixel text-2xl md:text-3xl uppercase leading-tight">Make slides</h2>
            <p className="text-sm text-ink/60 mt-2">คัดลอก prompt แล้ววางใน AI ที่ชอบ เพื่อให้ช่วยทำสไลด์จากเอกสารนี้</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-11 h-11 grid place-items-center hover:bg-ink/5 shrink-0">✕</button>
        </div>

        <div className="bg-white/70 border border-ink/15 rounded-[3px] p-4 text-xs leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto mb-4">
          {prompt}
        </div>

        <button
          onClick={() => copyToClipboard(prompt, 'prompt')}
          className="font-menu font-medium w-full min-h-[52px] bg-ink text-paper rounded-[3px] hover:bg-neutral-700 transition mb-6"
        >
          {copiedSection === 'prompt' ? '✓ คัดลอกแล้ว' : 'คัดลอก prompt'}
        </button>

        <p className="text-xs uppercase tracking-wider text-ink/50 mb-3">แล้วเปิด</p>
        <div className="grid grid-cols-3 gap-2">
          {tools.map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noreferrer" className="font-menu min-h-[48px] grid place-items-center border border-ink rounded-[3px] text-sm hover:bg-ink hover:text-paper transition">
              {name} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
