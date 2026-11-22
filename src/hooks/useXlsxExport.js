import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { safeFileName } from './useDocxExport';
import { pageContents } from '../utils/docContent';
import { docFont } from '../utils/fonts';
import { t } from '../i18n';

// Inline TipTap nodes → Excel rich text (keeps bold / italic / underline).
function rich(nodes = [], font, extra = {}) {
  const parts = nodes
    .filter((n) => n.type === 'text' || n.type === 'hardBreak')
    .map((n) => {
      if (n.type === 'hardBreak') return { text: '\n', font };
      const m = new Set((n.marks || []).map((x) => x.type));
      return {
        text: n.text,
        font: { ...font, ...extra, bold: m.has('bold') || extra.bold, italic: m.has('italic'), underline: m.has('underline'), vertAlign: m.has('superscript') ? 'superscript' : undefined },
      };
    });
  return parts.length ? { richText: parts } : '';
}

const textOf = (nodes = []) => nodes.map((n) => n.text || '').join('');

export function useXlsxExport() {
  const generateXlsx = async (doc) => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'MEOW AI Agent';
      const fontName = docFont(doc);
      const base = { name: fontName, size: 12 };
      const ws = wb.addWorksheet('Document', {
        pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
      });
      ws.headerFooter.oddHeader = doc.header ? `&C${doc.header.replace(/&/g, '&&')}` : '';
      const footer = doc.footer ? `&L${doc.footer.replace(/&/g, '&&')}` : '';
      ws.headerFooter.oddFooter = `${footer}${doc.pageNumbers !== false ? `&R${t('หน้า')} &P / &N` : ''}`;

      const contents = pageContents(doc);
      // Column count = widest table (min 1).
      let cols = 1;
      contents.forEach((c) => (c.content || []).forEach((n) => {
        if (n.type === 'table') (n.content || []).forEach((r) => {
          cols = Math.max(cols, (r.content || []).reduce((s, cell) => s + (cell.attrs?.colspan || 1), 0));
        });
      }));
      ws.columns = Array.from({ length: cols }, () => ({ width: cols === 1 ? 100 : Math.max(18, Math.floor(100 / cols)) }));

      let row = 1;
      const full = (value, font, opts = {}) => {
        const r = ws.getRow(row);
        r.getCell(1).value = value;
        r.getCell(1).font = font;
        r.getCell(1).alignment = { wrapText: true, vertical: 'top', horizontal: opts.align };
        if (cols > 1) ws.mergeCells(row, 1, row, cols);
        row++;
      };

      if (doc.title) full(doc.title, { ...base, size: 18, bold: true });
      contents.forEach((content, pi) => {
        if (pi > 0 && contents.length > 1) row++;
        (content.content || []).forEach((n) => {
          const align = n.attrs?.textAlign;
          if (n.type === 'heading') {
            const size = { 1: 16, 2: 14, 3: 13 }[n.attrs?.level] || 14;
            full(rich(n.content, { ...base, size }, { bold: true }), { ...base, size, bold: true }, { align });
          } else if (n.type === 'paragraph') {
            if (textOf(n.content).trim()) full(rich(n.content, base), base, { align });
          } else if (n.type === 'bulletList' || n.type === 'orderedList') {
            (n.content || []).forEach((item, i) => {
              const p = (item.content || [])[0];
              const prefix = n.type === 'orderedList' ? `${i + 1}. ` : '• ';
              const v = rich(p?.content, base);
              full(v ? { richText: [{ text: prefix, font: base }, ...v.richText] } : prefix, base);
            });
          } else if (n.type === 'blockquote') {
            (n.content || []).forEach((p) => full(rich(p.content, base, { italic: true }), { ...base, italic: true }));
          } else if (n.type === 'table') {
            const occupied = new Set();
            const startRow = row;
            (n.content || []).forEach((tr, ri) => {
              let c = 1;
              (tr.content || []).forEach((cell) => {
                while (occupied.has(`${startRow + ri}:${c}`)) c++;
                const cs = cell.attrs?.colspan || 1;
                const rs = cell.attrs?.rowspan || 1;
                const head = cell.type === 'tableHeader';
                const xl = ws.getCell(startRow + ri, c);
                const text = (cell.content || []).map((p) => p.content || []).flat();
                xl.value = rich(text, base, head ? { bold: true } : {});
                xl.alignment = { wrapText: true, vertical: 'top' };
                xl.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                if (head) xl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F1EE' } };
                if (cs > 1 || rs > 1) ws.mergeCells(startRow + ri, c, startRow + ri + rs - 1, c + cs - 1);
                for (let y = 0; y < rs; y++) for (let x = 0; x < cs; x++) occupied.add(`${startRow + ri + y}:${c + x}`);
                c += cs;
              });
            });
            row = startRow + (n.content || []).length + 1;
          }
        });
      });

      const refs = (doc.references || []).filter((r) => r.trim());
      if (refs.length) {
        row++;
        full(t('เอกสารอ้างอิง'), { ...base, size: 14, bold: true });
        refs.forEach((r, i) => full(`[${i + 1}] ${r}`, base));
      }

      const buf = await wb.xlsx.writeBuffer();
      const fileName = `${safeFileName(doc.title)}.xlsx`;
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
      return { success: true, fileName };
    } catch (error) {
      console.error('XLSX generation failed:', error);
      return { success: false, error: error.message };
    }
  };

  return { generateXlsx };
}
