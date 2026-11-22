import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, LevelFormat,
  Packer, PageBreak, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { pageContents } from '../utils/docContent';
import { docFont, docFontSize } from '../utils/fonts';
import { t } from '../i18n';


function dataURLToBytes(dataURL) {
  const bin = atob(dataURL.split(',')[1] || '');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function imageSize(dataURL) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 800, h: 1100 });
    img.src = dataURL;
  });
}

export function safeFileName(name) {
  return (name || 'Document').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'Document';
}

const ALIGN = { left: AlignmentType.LEFT, center: AlignmentType.CENTER, right: AlignmentType.RIGHT, justify: AlignmentType.JUSTIFIED };
const HEADINGS = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 };

// Inline nodes → TextRuns, keeping bold / italic / underline / strike / superscript.
function runs(nodes = [], extra = {}) {
  return nodes.flatMap((n) => {
    if (n.type === 'hardBreak') return [new TextRun({ break: 1 })];
    if (n.type !== 'text') return [];
    const m = Object.fromEntries((n.marks || []).map((mk) => [mk.type, true]));
    return [new TextRun({
      text: n.text,
      bold: m.bold || extra.bold,
      boldComplexScript: m.bold || extra.bold,
      italics: m.italic || extra.italics,
      italicsComplexScript: m.italic || extra.italics,
      underline: m.underline ? {} : undefined,
      strike: m.strike,
      superScript: m.superscript,
      color: extra.color,
    })];
  });
}

let listCounter = 0;

function blocks(node, ctx = {}) {
  const align = ALIGN[node.attrs?.textAlign];
  switch (node.type) {
    case 'heading':
      return [new Paragraph({ heading: HEADINGS[node.attrs.level] || HeadingLevel.HEADING_2, alignment: align, children: runs(node.content) })];
    case 'paragraph':
      return [new Paragraph({
        alignment: align,
        indent: ctx.quote ? { left: 720 } : undefined,
        border: ctx.quote ? { left: { style: BorderStyle.SINGLE, size: 12, color: 'E2782A', space: 12 } } : undefined,
        children: runs(node.content, ctx.quote ? { italics: true, color: '444444' } : {}),
      })];
    case 'blockquote':
      return (node.content || []).flatMap((c) => blocks(c, { ...ctx, quote: true }));
    case 'horizontalRule':
      return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBBBBB', space: 4 } }, children: [] })];
    case 'bulletList':
    case 'orderedList': {
      const ordered = node.type === 'orderedList';
      const instance = ordered ? ++listCounter : 0;
      const level = ctx.level || 0;
      return (node.content || []).flatMap((item) =>
        (item.content || []).flatMap((child) => {
          if (child.type === 'bulletList' || child.type === 'orderedList') return blocks(child, { ...ctx, level: level + 1 });
          return [new Paragraph({
            numbering: ordered ? { reference: 'meow-numbers', level, instance } : { reference: 'meow-bullets', level },
            children: runs(child.content),
          })];
        })
      );
    }
    case 'table': {
      const rows = node.content || [];
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows.map((row) => new TableRow({
            tableHeader: row.content?.[0]?.type === 'tableHeader',
            children: (row.content || []).map((cell) => {
              const head = cell.type === 'tableHeader';
              return new TableCell({
                columnSpan: cell.attrs?.colspan || 1,
                rowSpan: cell.attrs?.rowspan || 1,
                shading: head ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F1F1EE' } : undefined,
                children: cellChildren(cell, head, ctx),
              });
            }),
          })),
        }),
        new Paragraph({ children: [] }),
      ];
    }
    default:
      return (node.content || []).flatMap((c) => blocks(c, ctx));
  }
}

// A Word table cell must contain at least one paragraph.
function cellChildren(cell, head, ctx) {
  const out = (cell.content || []).flatMap((c) =>
    c.type === 'paragraph'
      ? [new Paragraph({ alignment: ALIGN[c.attrs?.textAlign], children: runs(c.content, head ? { bold: true } : {}) })]
      : blocks(c, ctx)
  );
  return out.length ? out : [new Paragraph('')];
}

export function useDocxExport() {
  const generateDocx = async (doc, { includeImages = false, pageBreaks = true, download = true } = {}) => {
    try {
      listCounter = 0;
      const rich = {
        header: doc.header || '',
        footer: doc.footer || '',
        references: doc.references || [],
        pageNumbers: doc.pageNumbers !== false,
      };
      const name = docFont(doc);
      // One font for everything: Latin (ascii/hAnsi) and Thai (complex script).
      const FONT = { ascii: name, hAnsi: name, cs: name, eastAsia: name };
      const SIZE = docFontSize(doc) * 2;

      const children = [];
      pageContents(doc).forEach((content, i) => {
        if (i > 0) children.push(pageBreaks ? new Paragraph({ children: [new PageBreak()] }) : new Paragraph({ children: [] }));
        children.push(...blocks(content));
      });

      const refs = (rich.references || []).filter((r) => r.trim());
      if (refs.length) {
        children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t('เอกสารอ้างอิง'))] }));
        refs.forEach((r, i) => children.push(new Paragraph({
          indent: { left: 720, hanging: 720 },
          children: [new TextRun(`[${i + 1}]\t${r}`)],
        })));
      }

      if (includeImages) {
        for (let i = 0; i < doc.pages.length; i++) {
          const page = doc.pages[i];
          if (!page.imageData?.startsWith('data:image')) continue;
          const { w, h } = await imageSize(page.imageData);
          const width = 450;
          children.push(new Paragraph({ children: [new PageBreak()] }));
          children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t('ภาพต้นฉบับ หน้า {n}', { n: i + 1 }))] }));
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({
              type: page.imageData.includes('image/png') ? 'png' : 'jpg',
              data: dataURLToBytes(page.imageData),
              transformation: { width, height: Math.round((h / w) * width) },
            })],
          }));
        }
      }

      const headers = rich.header?.trim()
        ? { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: rich.header, color: '777777', size: Math.round(SIZE * 0.75), sizeComplexScript: Math.round(SIZE * 0.75) })] })] }) }
        : undefined;

      const footerRuns = [];
      if (rich.footer?.trim()) footerRuns.push(new TextRun({ text: rich.footer, color: '777777', size: Math.round(SIZE * 0.75), sizeComplexScript: Math.round(SIZE * 0.75) }));
      if (rich.pageNumbers !== false) {
        if (footerRuns.length) footerRuns.push(new TextRun({ text: '    ', size: 24 }));
        footerRuns.push(new TextRun({ children: [`${t('หน้า')} `, PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], color: '777777', size: Math.round(SIZE * 0.75), sizeComplexScript: Math.round(SIZE * 0.75) }));
      }
      const footers = footerRuns.length
        ? { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: footerRuns })] }) }
        : undefined;

      const levels = (format, texts) => texts.map((text, level) => ({
        level,
        format,
        text,
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
      }));

      const file = new Document({
        creator: 'MEOW AI Agent',
        title: doc.title,
        styles: {
          default: {
            document: { run: { font: FONT, size: SIZE, sizeComplexScript: SIZE } },
            heading1: { run: { font: FONT, size: Math.round(SIZE * 1.6), sizeComplexScript: Math.round(SIZE * 1.6), bold: true, boldComplexScript: true, color: '111111' }, paragraph: { spacing: { before: 240, after: 120 } } },
            heading2: { run: { font: FONT, size: Math.round(SIZE * 1.3), sizeComplexScript: Math.round(SIZE * 1.3), bold: true, boldComplexScript: true, color: '111111' }, paragraph: { spacing: { before: 240, after: 120 } } },
            heading3: { run: { font: FONT, size: Math.round(SIZE * 1.12), sizeComplexScript: Math.round(SIZE * 1.12), bold: true, boldComplexScript: true, color: '111111' }, paragraph: { spacing: { before: 200, after: 80 } } },
          },
        },
        numbering: {
          config: [
            { reference: 'meow-bullets', levels: levels(LevelFormat.BULLET, ['•', '◦', '▪']) },
            { reference: 'meow-numbers', levels: levels(LevelFormat.DECIMAL, ['%1.', '%2.', '%3.']) },
          ],
        },
        sections: [{ headers, footers, children: children.length ? children : [new Paragraph('')] }],
      });

      const blob = await Packer.toBlob(file);
      const fileName = `${safeFileName(doc.title)}.docx`;
      if (download) saveAs(blob, fileName);
      return { success: true, fileName, blob };
    } catch (error) {
      console.error('DOCX generation failed:', error);
      return { success: false, error: error.message };
    }
  };

  return { generateDocx };
}
