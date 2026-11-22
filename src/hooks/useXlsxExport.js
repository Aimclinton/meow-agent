import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export function useXlsxExport() {
  const generateXlsx = async (document) => {
    try {
      const workbook = new ExcelJS.Workbook();

      // Add worksheet
      const worksheet = workbook.addWorksheet('Pages');

      // Add headers
      worksheet.columns = [
        { header: 'Page #', key: 'pageNumber', width: 10 },
        { header: 'Extracted Text', key: 'text', width: 50 },
        { header: 'Confidence %', key: 'confidence', width: 15 },
        { header: 'Timestamp', key: 'timestamp', width: 20 },
      ];

      // Style header row
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0066CC' },
      };
      worksheet.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };

      // Add data rows
      document.pages.forEach((page, index) => {
        worksheet.addRow({
          pageNumber: index + 1,
          text: page.ocrText || '(No text detected)',
          confidence: Math.round(page.confidence || 0),
          timestamp: new Date(page.timestamp).toLocaleString(),
        });
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        column.width = Math.min(column.width, 50);
      });

      // Add summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 20 },
        { header: 'Value', key: 'value', width: 30 },
      ];

      summarySheet.addRows([
        { metric: 'Document Title', value: document.title || 'Untitled' },
        { metric: 'Total Pages', value: document.pages.length },
        { metric: 'Average Confidence', value: `${Math.round(
          document.pages.reduce((sum, p) => sum + (p.confidence || 0), 0) / document.pages.length
        )}%` },
        { metric: 'Generated Date', value: new Date().toLocaleString() },
        { metric: 'Total Text Length', value: document.pages.reduce((sum, p) => sum + (p.ocrText?.length || 0), 0) + ' characters' },
      ]);

      summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00AA00' },
      };
      summarySheet.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };

      // Generate blob and download
      const blob = await workbook.xlsx.writeBuffer();
      const fileName = `${document.title || 'Document'}_${Date.now()}.xlsx`;
      saveAs(new Blob([blob]), fileName);

      return { success: true, fileName };
    } catch (error) {
      console.error('XLSX generation failed:', error);
      return { success: false, error: error.message };
    }
  };

  return { generateXlsx };
}
