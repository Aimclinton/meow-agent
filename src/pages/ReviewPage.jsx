import { useState, useEffect } from 'react';
import { useDocumentStore } from '../store/documentStore';
import DocumentViewer from '../components/DocumentViewer';

export default function ReviewPage({ documentId, onExport, onCancel }) {
  const { documents, reorderPages, deletePage, updateDocumentTitle } = useDocumentStore();
  const [document, setDocument] = useState(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    const doc = documents.find((d) => d.id === documentId);
    if (doc) {
      setDocument(doc);
      setTitle(doc.title);
    }
  }, [documentId, documents]);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Document not found</p>
      </div>
    );
  }

  const handleReorder = (oldIndex, newIndex) => {
    reorderPages(documentId, oldIndex, newIndex);
  };

  const handleDelete = (pageId) => {
    setDocument((prev) => ({
      ...prev,
      pages: prev.pages.filter((p) => p.id !== pageId),
    }));
    // Also update in store
    const pageIndex = document.pages.findIndex((p) => p.id === pageId);
    if (pageIndex !== -1) {
      deletePage(documentId, pageIndex);
    }
  };

  const handleTitleChange = (newTitle) => {
    setTitle(newTitle);
    updateDocumentTitle(documentId, newTitle);
  };

  const handleProceed = () => {
    if (document.pages.length === 0) {
      alert('Please add at least one page');
      return;
    }
    onExport(document);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">📋 Review Document</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Title
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Case Report 001"
            />
          </div>
        </div>

        {/* Document Viewer */}
        <DocumentViewer
          pages={document.pages}
          onReorder={handleReorder}
          onDelete={handleDelete}
          onDownload={() => {}}
        />

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 flex-wrap">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
          >
            ← Back
          </button>

          <button
            onClick={handleProceed}
            disabled={document.pages.length === 0}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-lg transition"
          >
            ✓ Continue to Export
          </button>
        </div>
      </main>
    </div>
  );
}
