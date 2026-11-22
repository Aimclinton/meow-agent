import { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { useOCR } from '../hooks/useOCR';
import CameraCapture from '../components/CameraCapture';
import OCRProgress from '../components/OCRProgress';

export default function CapturePage() {
  const [showCamera, setShowCamera] = useState(true);
  const [pages, setPages] = useState([]);
  const [currentDocTitle, setCurrentDocTitle] = useState('New Document');
  const { createDocument, addPage } = useDocumentStore();
  const { processImage, isProcessing, progress, error } = useOCR();

  const handleCapture = async (imageData) => {
    setShowCamera(false);

    // Process OCR
    const ocrResult = await processImage(imageData);

    // Add page to state
    const newPage = {
      id: Date.now().toString(),
      imageData,
      ocrText: ocrResult?.text || '',
      confidence: ocrResult?.confidence || 0,
      pageNumber: pages.length + 1,
      timestamp: new Date(),
    };

    setPages([...pages, newPage]);
  };

  const removePage = (pageId) => {
    setPages(pages.filter((p) => p.id !== pageId));
  };

  const handleNext = () => {
    if (pages.length === 0) {
      alert('Please capture at least one page');
      return;
    }

    // Create document and add pages
    const doc = createDocument(currentDocTitle);
    pages.forEach((page) => {
      addPage(doc.id, page);
    });

    // Go to review page
    // This will be handled by MainApp routing
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}

      {/* OCR Progress */}
      <OCRProgress isProcessing={isProcessing} progress={progress} error={error} />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">📸 Capture Pages</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Title
          </label>
          <input
            type="text"
            value={currentDocTitle}
            onChange={(e) => setCurrentDocTitle(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Case Report 001"
          />
        </div>

        {/* Pages Grid */}
        {pages.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Captured Pages ({pages.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pages.map((page) => (
                <div key={page.id} className="relative bg-white rounded-lg shadow-md overflow-hidden">
                  {/* Image */}
                  <div className="aspect-video bg-gray-200 relative">
                    <img
                      src={page.imageData}
                      alt={`Page ${page.pageNumber}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Page {page.pageNumber}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-3">
                      Confidence: {Math.round(page.confidence)}%
                    </p>
                    <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                      {page.ocrText ? page.ocrText.substring(0, 100) + '...' : 'No text detected'}
                    </p>
                    <button
                      onClick={() => removePage(page.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add More / Continue */}
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => setShowCamera(true)}
            disabled={isProcessing}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition"
          >
            ➕ Add More Pages
          </button>

          {pages.length > 0 && (
            <button
              onClick={handleNext}
              disabled={isProcessing}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-lg transition"
            >
              ✓ Continue to Review
            </button>
          )}
        </div>

        {pages.length === 0 && !showCamera && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No pages captured yet</p>
            <button
              onClick={() => setShowCamera(true)}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg"
            >
              Start Capturing
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
