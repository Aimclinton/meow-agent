import { useState } from 'react';
import { useDocxExport } from '../hooks/useDocxExport';
import { useXlsxExport } from '../hooks/useXlsxExport';

export default function ExportPage({ document, onBack }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const { generateDocx } = useDocxExport();
  const { generateXlsx } = useXlsxExport();

  const handleExport = async (format) => {
    setIsExporting(true);
    setExportMessage('');

    try {
      let result;
      if (format === 'docx') {
        result = await generateDocx(document);
      } else if (format === 'xlsx') {
        result = await generateXlsx(document);
      }

      if (result.success) {
        setExportMessage(`✅ Exported as ${format.toUpperCase()}`);
        setTimeout(() => onBack(), 2000);
      } else {
        setExportMessage(`❌ Export failed: ${result.error}`);
      }
    } catch (err) {
      setExportMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">📤 Export Document</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-blue-900 font-medium">
            📄 {document.title || 'Untitled'} ({document.pages.length} pages)
          </p>
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* DOCX Option */}
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-transparent hover:border-blue-500 transition">
            <div className="text-5xl mb-4">📄</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Microsoft Word</h2>
            <p className="text-gray-600 text-sm mb-4">
              Export as .docx format with images and OCR text
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ Editable document</li>
              <li>✓ Full formatting</li>
              <li>✓ All pages included</li>
            </ul>
            <button
              onClick={() => handleExport('docx')}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition"
            >
              {isExporting ? 'Exporting...' : 'Export as DOCX'}
            </button>
          </div>

          {/* XLSX Option */}
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-transparent hover:border-green-500 transition">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Microsoft Excel</h2>
            <p className="text-gray-600 text-sm mb-4">
              Export as .xlsx format with OCR data organized in tables
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li>✓ Structured data</li>
              <li>✓ Easy analysis</li>
              <li>✓ All pages as rows</li>
            </ul>
            <button
              onClick={() => handleExport('xlsx')}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-lg transition"
            >
              {isExporting ? 'Exporting...' : 'Export as XLSX'}
            </button>
          </div>
        </div>

        {/* Message */}
        {exportMessage && (
          <div className={`p-4 rounded-lg text-center font-medium mb-4 ${
            exportMessage.startsWith('✅')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {exportMessage}
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={onBack}
          disabled={isExporting}
          className="w-full md:w-auto px-6 py-3 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
        >
          ← Back to Review
        </button>

        {/* Info Section */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">💡 Tips:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Choose DOCX for documents with narrative content</li>
            <li>• Choose XLSX for data-heavy documents with tables</li>
            <li>• Both formats preserve OCR text and page images</li>
            <li>• Files are saved to your Downloads folder</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
