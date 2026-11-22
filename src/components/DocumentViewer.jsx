import { useState } from 'react';

export default function DocumentViewer({ pages, onReorder, onDelete, onDownload }) {
  const [draggedPage, setDraggedPage] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedPage(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedPage !== null && draggedPage !== targetIndex) {
      onReorder(draggedPage, targetIndex);
    }
    setDraggedPage(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Count */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-900 font-medium">
          📄 {pages.length} page{pages.length !== 1 ? 's' : ''} captured
        </p>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {pages.map((page, index) => (
          <div
            key={page.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => setSelectedPage(page.id)}
            className={`bg-white rounded-lg shadow-md overflow-hidden cursor-move hover:shadow-lg transition-all ${
              draggedPage === index ? 'opacity-50' : ''
            } ${selectedPage === page.id ? 'ring-2 ring-blue-500' : ''}`}
          >
            {/* Image */}
            <div className="relative aspect-video bg-gray-200 overflow-hidden">
              <img
                src={page.imageData}
                alt={`Page ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />

              {/* Page Number Badge */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {index + 1}
              </div>

              {/* Drag Handle */}
              <div className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium opacity-80 hover:opacity-100">
                ⋮⋮
              </div>
            </div>

            {/* Page Info */}
            <div className="p-3 space-y-2">
              <p className="text-xs text-gray-500">
                Confidence: {Math.round(page.confidence || 0)}%
              </p>

              {/* OCR Preview */}
              <p className="text-sm text-gray-700 line-clamp-2 h-10">
                {page.ocrText ? page.ocrText.substring(0, 80) + '...' : '(No text detected)'}
              </p>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPage(page.id);
                  }}
                  className="flex-1 text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded"
                >
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(page.id);
                  }}
                  className="text-xs px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Page Detail Modal */}
      {selectedPage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full overflow-hidden">
            <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
              <img
                src={pages.find((p) => p.id === selectedPage)?.imageData}
                alt="Selected"
                className="max-h-full max-w-full"
              />
              <button
                onClick={() => setSelectedPage(null)}
                className="absolute top-4 right-4 bg-white hover:bg-gray-200 text-gray-900 font-bold p-2 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* Text Overlay */}
            <div className="p-4 max-h-48 overflow-y-auto">
              <h3 className="font-semibold text-gray-900 mb-2">Extracted Text:</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {pages.find((p) => p.id === selectedPage)?.ocrText || '(No text detected)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {pages.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p>✓ Drag pages to reorder</p>
          <p>✓ Click to preview page content</p>
          <p>✓ Ready to export when done</p>
        </div>
      )}
    </div>
  );
}
