// Structured page JSON (from Gemini) ⇄ TipTap document content.
export const UNCLEAR = '[ไม่ชัดเจน]';

const ALIGNS = ['left', 'center', 'right', 'justify'];

function textNodes(runs = []) {
  return runs
    .filter((r) => r && typeof r.text === 'string' && r.text.length)
    .map((r) => {
      const marks = [];
      if (r.bold) marks.push({ type: 'bold' });
      if (r.italic) marks.push({ type: 'italic' });
      if (r.underline) marks.push({ type: 'underline' });
      return marks.length ? { type: 'text', text: r.text, marks } : { type: 'text', text: r.text };
    });
}

const paragraph = (runs, align) => ({
  type: 'paragraph',
  attrs: ALIGNS.includes(align) ? { textAlign: align } : undefined,
  content: textNodes(runs),
});

export function structuredToContent(page) {
  const out = [];
  for (const b of page?.blocks || []) {
    if (b.type === 'heading') {
      const level = Math.min(3, Math.max(1, b.level || 2));
      out.push({ type: 'heading', attrs: { level, ...(ALIGNS.includes(b.align) ? { textAlign: b.align } : {}) }, content: textNodes(b.runs) });
    } else if (b.type === 'list') {
      const items = (b.items || []).filter((it) => it?.runs?.length);
      if (!items.length) continue;
      out.push({
        type: b.ordered ? 'orderedList' : 'bulletList',
        content: items.map((it) => ({ type: 'listItem', content: [paragraph(it.runs)] })),
      });
    } else if (b.type === 'table') {
      const rows = (b.rows || []).filter((r) => r?.cells?.length);
      if (!rows.length) continue;
      out.push({
        type: 'table',
        content: rows.map((r) => ({
          type: 'tableRow',
          content: r.cells.map((c) => ({
            type: c.header ? 'tableHeader' : 'tableCell',
            attrs: { colspan: Math.max(1, c.colspan || 1), rowspan: Math.max(1, c.rowspan || 1), colwidth: null },
            content: [paragraph(c.runs)],
          })),
        })),
      });
    } else {
      out.push(paragraph(b.runs, b.align));
    }
  }
  if (!out.length) out.push({ type: 'paragraph' });
  return { type: 'doc', content: out };
}

export function structuredToText(page) {
  const runsText = (runs = []) => runs.map((r) => r.text || '').join('');
  const lines = [];
  if (page?.header) lines.push(page.header);
  for (const b of page?.blocks || []) {
    if (b.type === 'list') (b.items || []).forEach((it, i) => lines.push(`${b.ordered ? `${i + 1}.` : '•'} ${runsText(it.runs)}`));
    else if (b.type === 'table') (b.rows || []).forEach((r) => lines.push(r.cells.map((c) => runsText(c.runs)).join('\t')));
    else lines.push(runsText(b.runs));
  }
  if (page?.footer) lines.push(page.footer);
  return lines.join('\n');
}
