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

// The model sometimes returns list items as rows/cells or a single runs array.
function listItems(b) {
  if (b.items?.length) return b.items;
  if (b.rows?.length) return b.rows.map((r) => ({ runs: (r.cells || []).flatMap((c) => c.runs || []) }));
  if (b.runs?.length) return [{ runs: b.runs }];
  return [];
}

export function structuredToContent(page) {
  const out = [];
  for (const b of page?.blocks || []) {
    if (b.type === 'heading') {
      const level = Math.min(3, Math.max(1, b.level || 2));
      out.push({ type: 'heading', attrs: { level, ...(ALIGNS.includes(b.align) ? { textAlign: b.align } : {}) }, content: textNodes(b.runs) });
    } else if (b.type === 'list') {
      const items = listItems(b).filter((it) => it?.runs?.length);
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
    if (b.type === 'list') listItems(b).forEach((it, i) => lines.push(`${b.ordered ? `${i + 1}.` : '•'} ${runsText(it.runs)}`));
    else if (b.type === 'table') (b.rows || []).forEach((r) => lines.push(r.cells.map((c) => runsText(c.runs)).join('\t')));
    else lines.push(runsText(b.runs));
  }
  if (page?.footer) lines.push(page.footer);
  return lines.join('\n');
}

// ---------- TipTap → structured page (reverse) ----------
const runsFrom = (nodes = []) =>
  nodes.filter((n) => n.type === 'text').map((n) => {
    const m = new Set((n.marks || []).map((x) => x.type));
    const r = { text: n.text };
    if (m.has('bold')) r.bold = true;
    if (m.has('italic')) r.italic = true;
    if (m.has('underline')) r.underline = true;
    return r;
  });

export function contentToStructured(doc) {
  const blocks = [];
  for (const n of doc?.content || []) {
    const align = n.attrs?.textAlign && n.attrs.textAlign !== 'left' ? n.attrs.textAlign : undefined;
    if (n.type === 'heading') blocks.push({ type: 'heading', level: n.attrs?.level || 2, runs: runsFrom(n.content), ...(align ? { align } : {}) });
    else if (n.type === 'paragraph') blocks.push({ type: 'paragraph', runs: runsFrom(n.content), ...(align ? { align } : {}) });
    else if (n.type === 'bulletList' || n.type === 'orderedList') {
      blocks.push({ type: 'list', ordered: n.type === 'orderedList', items: (n.content || []).map((li) => ({ runs: runsFrom(li.content?.[0]?.content) })) });
    } else if (n.type === 'table') {
      blocks.push({
        type: 'table',
        rows: (n.content || []).map((tr) => ({
          cells: (tr.content || []).map((c) => ({
            runs: (c.content || []).flatMap((p) => runsFrom(p.content)),
            ...(c.attrs?.colspan > 1 ? { colspan: c.attrs.colspan } : {}),
            ...(c.attrs?.rowspan > 1 ? { rowspan: c.attrs.rowspan } : {}),
            ...(c.type === 'tableHeader' ? { header: true } : {}),
          })),
        })),
      });
    }
  }
  return { blocks };
}

const runsText = (runs = []) => runs.map((r) => r.text || '').join('').trim();
// A label is short text ending with ":" (e.g. "ชื่อผู้ป่วย:") — kept in templates.
const isLabel = (t) => /[:：]\s*$/.test(t) || /^[^:：]{1,40}[:：]/.test(t);

// Keep the form's skeleton, drop the filled-in content:
// headings stay, table header rows/cells and first-column row labels stay,
// other cells are emptied; paragraphs keep only "Label:" parts.
export function makeTemplate(structured) {
  const blocks = [];
  for (const b of structured.blocks || []) {
    if (b.type === 'heading') blocks.push({ type: 'heading', level: b.level, runs: [{ text: runsText(b.runs) }] });
    else if (b.type === 'table') {
      const rows = b.rows || [];
      const headerRows = rows.filter((r) => r.cells.every((c) => c.header)).length || 1;
      blocks.push({
        type: 'table',
        rows: rows.map((r, ri) => ({
          cells: r.cells.map((c, ci) => {
            const keep = ri < headerRows || c.header || (ci === 0 && runsText(c.runs) && !/^\d+([.,]\d+)?$/.test(runsText(c.runs)) && isLabelColumn(rows, headerRows));
            return { ...c, runs: keep ? [{ text: runsText(c.runs), ...(ri < headerRows || c.header ? { bold: true } : {}) }] : [] };
          }),
        })),
      });
    } else if (b.type === 'paragraph') {
      const t = runsText(b.runs);
      if (isLabel(t)) blocks.push({ type: 'paragraph', runs: [{ text: `${t.split(/[:：]/)[0]}: ` }] });
    } else if (b.type === 'list') {
      const labels = (b.items || []).map((it) => runsText(it.runs)).filter(isLabel);
      if (labels.length) blocks.push({ type: 'list', ordered: b.ordered, items: labels.map((l) => ({ runs: [{ text: `${l.split(/[:：]/)[0]}: ` }] })) });
    }
  }
  return { blocks };
}

// First column looks like row labels (text that repeats as a list of names like "ซี่ 11", "BOP")?
function isLabelColumn(rows, headerRows) {
  const body = rows.slice(headerRows).map((r) => runsText(r.cells[0]?.runs));
  if (body.length < 2) return false;
  const textual = body.filter((t) => t && !/^\d+([.,]\d+)?$/.test(t)).length;
  return textual / body.length >= 0.6 && rows[0]?.cells?.length > 1;
}
