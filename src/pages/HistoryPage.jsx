import { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';

export default function HistoryPage({ onBack, onSelect }) {
  const { documents, deleteDocument } = useDocumentStore();
  const [expandedId, setExpandedId] = useState(null);

  // Get documents within 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentDocs = documents.filter((doc) => new Date(doc.updatedAt) > sevenDaysAgo);

  const handleDelete = (docId) => {
    if (window.confirm('Delete this document permanently?')) {
      deleteDocument(docId);
    }
  };

  const getDaysAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">📚 Document History</h1>
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {recentDocs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Documents Yet</h2>
            <p className="text-gray-600 mb-6">Documents are kept for 7 days. Start by creating a new document!</p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-black hover:bg-gray-900 text-white font-bold rounded-xl transition-all"
            >
              Create Document
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-900 font-medium text-sm">
                📌 Showing {recentDocs.length} document{recentDocs.length !== 1 ? 's' : ''} from the past 7 days.
                Older documents are automatically removed.
              </p>
            </div>

            {/* Documents List */}
            <div className="space-y-4">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{doc.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {doc.pages.length} page{doc.pages.length !== 1 ? 's' : ''} • Updated {getDaysAgo(doc.updatedAt)}
                      </p>
                    </div>
                    <div className="text-3xl">📄</div>
                  </div>

                  {/* Page Preview */}
                  {doc.pages.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">First page preview:</p>
                      <img
                        src={doc.pages[0]?.imageData}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-lg bg-gray-100"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => onSelect(doc)}
                      className="flex-1 px-6 py-3 bg-black hover:bg-gray-900 text-white font-bold rounded-lg transition-all"
                    >
                      📤 Export
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-medium rounded-lg transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-gray-50 rounded-xl p-8 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-4">💡 7-Day History:</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>✓ All documents are kept for 7 days maximum</li>
            <li>✓ You can re-export documents during this period</li>
            <li>✓ Documents older than 7 days are automatically deleted</li>
            <li>✓ Password protection keeps your history secure</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
