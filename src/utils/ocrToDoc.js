// Turn raw OCR text from scanned pages into a structured TipTap document:
// headings, paragraphs, bullet / numbered lists and tables.

const BULLET = /^\s*([-•*·▪●○◦–])\s+/;
const NUMBERED = /^\s*(\d{1,3}|[a-zA-Z]|[ก-ฮ])[.)]\s+/;
const COLS_SPLIT = /\s*\|\s*|\t+| {3,}/;

const text = (t) => ({ type: 'text', text: t });
const para = (t) => ({ type: 'paragraph', content: t ? [text(t)] : [] });
const heading = (level, t) => ({ type: 'heading', attrs: { level }, content: [text(t)] });

function cells(line) {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split(COLS_SPLIT).map((c) => c.trim()).filter(Boolean);
}

function looksLikeTable(lines) {
  if (lines.length < 2) return false;
  const counts = lines.map((l) => cells(l).length);
  const cols = counts[0];
  return cols >= 2 && counts.filter((c) => c === cols).length >= Math.ceil(lines.length * 0.7);
}

function makeTable(lines) {
  const rows = lines.map(cells);
  const cols = Math.max(...rows.map((r) => r.length));
  return {
    type: 'table',
    content: rows.map((r, ri) => ({
      type: 'tableRow',
      content: Array.from({ length: cols }, (_, ci) => ({
        type: ri === 0 ? 'tableHeader' : 'tableCell',
        content: [para(r[ci] || '')],
      })),
    })),
  };
}

function looksLikeHeading(block) {
  if (block.length !== 1) return false;
  const t = block[0].trim();
  if (t.length < 2 || t.length > 70) return false;
  if (/[.,;]$/.test(t)) return false;
  const latin = t.replace(/[^A-Za-z]/g, '');
  const allCaps = latin.length >= 3 && latin === latin.toUpperCase();
  return allCaps || /:$/.test(t) || /^(บทที่|ส่วนที่|หมวด|chapter|section)\b/i.test(t) || /^\d+(\.\d+)*\s+\S/.test(t) || (t.length <= 40 && t.split(/\s+/).length <= 6);
}

function blockToNodes(block, isFirst) {
  // Table
  if (looksLikeTable(block)) return [makeTable(block)];

  // Lists (all lines are items, or continuation lines get appended)
  const isBullet = BULLET.test(block[0]);
  const isNumber = !isBullet && NUMBERED.test(block[0]);
  if (isBullet || isNumber) {
    const re = isBullet ? BULLET : NUMBERED;
    const items = [];
    block.forEach((line) => {
      if (re.test(line)) items.push(line.replace(re, '').trim());
      else if (items.length) items[items.length - 1] += ` ${line.trim()}`;
    });
    return [{
      type: isBullet ? 'bulletList' : 'orderedList',
      content: items.map((it) => ({ type: 'listItem', content: [para(it)] })),
    }];
  }

  if (looksLikeHeading(block)) {
    const t = block[0].trim().replace(/:$/, '');
    return [heading(isFirst ? 1 : /^\d+\.\d+/.test(t) ? 3 : 2, t)];
  }

  // Paragraph: join wrapped lines.
  return [para(block.map((l) => l.trim()).join(' ').replace(/\s{2,}/g, ' '))];
}

const median = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 0;
};

// Use OCR geometry: taller lines → headings, column gaps → tables,
// tesseract paragraphs → paragraphs.
function layoutToNodes(layout, isFirstPage) {
  const lines = layout.lines.filter((l) => l.t.trim());
  if (!lines.length) return [];
  const medH = median(lines.map((l) => l.h));
  const out = [];
  let i = 0;
  let first = isFirstPage;

  while (i < lines.length) {
    const l = lines[i];

    // Table: 2+ consecutive lines with the same number (>=2) of cells.
    if (l.cells.length >= 2) {
      let j = i + 1;
      while (j < lines.length && lines[j].cells.length === l.cells.length) j++;
      if (j - i >= 2) {
        out.push(makeTable(lines.slice(i, j).map((x) => x.cells.join(' | '))));
        i = j;
        first = false;
        continue;
      }
    }

    // Heading: noticeably taller text, short line.
    const ratio = medH ? l.h / medH : 1;
    if (ratio >= 1.3 && l.t.length <= 90) {
      out.push(heading(first && ratio >= 1.6 ? 1 : ratio >= 1.6 ? 2 : first ? 1 : 2, l.t.replace(/:$/, '')));
      i++;
      first = false;
      continue;
    }

    // Lists
    if (BULLET.test(l.t) || NUMBERED.test(l.t)) {
      const re = BULLET.test(l.t) ? BULLET : NUMBERED;
      const items = [];
      while (i < lines.length && (re.test(lines[i].t) || (items.length && lines[i].p === lines[i - 1].p && !BULLET.test(lines[i].t) && !NUMBERED.test(lines[i].t) && lines[i].cells.length < 2))) {
        if (re.test(lines[i].t)) items.push(lines[i].t.replace(re, '').trim());
        else items[items.length - 1] += ` ${lines[i].t.trim()}`;
        i++;
      }
      out.push({
        type: re === BULLET ? 'bulletList' : 'orderedList',
        content: items.map((it) => ({ type: 'listItem', content: [para(it)] })),
      });
      first = false;
      continue;
    }

    // Short line ending with ':' on its own paragraph → heading too.
    const alone = (lines[i + 1]?.p !== l.p) && (i === 0 || lines[i - 1].p !== l.p);
    if (alone && /:$/.test(l.t.trim()) && l.t.length <= 60) {
      out.push(heading(first ? 1 : 2, l.t.trim().replace(/:$/, '')));
      i++;
      first = false;
      continue;
    }

    // Paragraph: lines of the same tesseract paragraph and similar height.
    const parts = [l.t.trim()];
    let j = i + 1;
    while (
      j < lines.length && lines[j].p === l.p && lines[j].cells.length < 2 &&
      !BULLET.test(lines[j].t) && !NUMBERED.test(lines[j].t) && (!medH || lines[j].h / medH < 1.3)
    ) {
      parts.push(lines[j].t.trim());
      j++;
    }
    out.push(para(parts.join(' ')));
    i = j;
    first = false;
  }
  return out;
}

export function ocrPagesToDoc(pages, title) {
  const content = [];
  if (title) content.push(heading(1, title));

  pages.forEach((page, pi) => {
    if (page.layout?.lines?.length) {
      if (pi > 0 && content.length) content.push({ type: 'horizontalRule' });
      content.push(...layoutToNodes(page.layout, !title && pi === 0));
      return;
    }
    const raw = (page.ocrText || '').replace(/\r/g, '');
    if (!raw.trim()) return;
    if (pi > 0 && content.length) content.push({ type: 'horizontalRule' });

    // Split into blocks on blank lines; also split where line type changes.
    const blocks = [];
    let cur = [];
    const flush = () => { if (cur.length) blocks.push(cur); cur = []; };
    raw.split('\n').forEach((line) => {
      if (!line.trim()) return flush();
      const listLine = BULLET.test(line) || NUMBERED.test(line);
      const prevList = cur.length && (BULLET.test(cur[0]) || NUMBERED.test(cur[0]));
      if (cur.length && listLine !== !!prevList && !prevList) flush();
      cur.push(line);
    });
    flush();

    blocks.forEach((b, bi) => content.push(...blockToNodes(b, !title && pi === 0 && bi === 0)));
  });

  if (!content.length) content.push(para(''));
  return { type: 'doc', content };
}

// Plain text of a TipTap JSON doc (for copy / share / search).
export function docToPlainText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  const inner = (node.content || []).map(docToPlainText);
  if (node.type === 'tableRow') return inner.join('\t');
  if (['doc', 'bulletList', 'orderedList', 'table', 'blockquote'].includes(node.type)) return inner.join('\n');
  if (node.type === 'listItem') return `• ${inner.join(' ')}`;
  if (node.type === 'horizontalRule') return '———';
  if (node.type === 'hardBreak') return '\n';
  return inner.join('');
}
