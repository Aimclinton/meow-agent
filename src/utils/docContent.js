import { ocrPagesToDoc, docToPlainText } from './ocrToDoc';

// TipTap content for every page, in the user's chosen order.
export function pageContents(document) {
  return (document.pages || []).map((p) => p.content || ocrPagesToDoc([p]));
}

const inline = (nodes = []) =>
  nodes.map((n) => {
    if (n.type === 'hardBreak') return '  \n';
    if (n.type !== 'text') return '';
    let t = n.text || '';
    const marks = (n.marks || []).map((m) => m.type);
    if (marks.includes('bold')) t = `**${t}**`;
    if (marks.includes('italic')) t = `*${t}*`;
    if (marks.includes('superscript')) t = `^${t}^`;
    return t;
  }).join('');

function block(node, depth = 0) {
  switch (node.type) {
    case 'heading': return `${'#'.repeat(node.attrs?.level || 2)} ${inline(node.content)}`;
    case 'paragraph': return inline(node.content);
    case 'blockquote': return (node.content || []).map((c) => `> ${block(c, depth)}`).join('\n');
    case 'horizontalRule': return '---';
    case 'bulletList':
    case 'orderedList':
      return (node.content || []).map((item, i) => {
        const [first, ...rest] = item.content || [];
        const bullet = node.type === 'orderedList' ? `${i + 1}.` : '-';
        const lines = [`${'  '.repeat(depth)}${bullet} ${first ? inline(first.content) : ''}`];
        rest.forEach((c) => lines.push(block(c, depth + 1)));
        return lines.join('\n');
      }).join('\n');
    case 'table': {
      const rows = (node.content || []).map((r) => (r.content || []).map((c) => (c.content || []).map((p) => inline(p.content)).join(' ').replace(/\|/g, '\\|')));
      if (!rows.length) return '';
      const cols = Math.max(...rows.map((r) => r.length));
      const pad = (r) => [...r, ...Array(cols - r.length).fill('')];
      return [pad(rows[0]), Array(cols).fill('---'), ...rows.slice(1).map(pad)].map((r) => `| ${r.join(' | ')} |`).join('\n');
    }
    default: return (node.content || []).map((c) => block(c, depth)).join('\n\n');
  }
}

export function contentToMarkdown(doc) {
  return (doc?.content || []).map((n) => block(n)).filter((s) => s.trim()).join('\n\n');
}

// Whole document as Markdown (used for copy / AI slide prompt).
export function documentToMarkdown(document) {
  const parts = [];
  if (document.header) parts.push(`_หัวกระดาษ: ${document.header}_`);
  pageContents(document).forEach((c, i) => {
    if (document.pages.length > 1) parts.push(`<!-- หน้า ${i + 1} -->`);
    parts.push(contentToMarkdown(c));
  });
  if (document.footer) parts.push(`_ท้ายกระดาษ: ${document.footer}_`);
  const refs = (document.references || []).filter((r) => r.trim());
  if (refs.length) parts.push(`## เอกสารอ้างอิง\n${refs.map((r, i) => `${i + 1}. ${r}`).join('\n')}`);
  return parts.filter(Boolean).join('\n\n');
}

// Plain text (no Markdown symbols) for pasting into LINE / Messenger / email.
export function documentToPlainText(document) {
  const parts = [];
  if (document.title) parts.push(document.title);
  if (document.header) parts.push(document.header);
  pageContents(document).forEach((c) => parts.push(docToPlainText(c).trim()));
  if (document.footer) parts.push(document.footer);
  const refs = (document.references || []).filter((r) => r.trim());
  if (refs.length) parts.push(refs.map((r, i) => `[${i + 1}] ${r}`).join('\n'));
  return parts.filter(Boolean).join('\n\n');
}
