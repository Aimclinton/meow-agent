import { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import DocumentWorkflow from './DocumentWorkflow';
import HistoryPage from './HistoryPage';
import ExportPage from './ExportPage';

export default function MainApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedDocForExport, setSelectedDocForExport] = useState(null);
  const { documents, logout } = useDocumentStore();

  // Handle page routing
  if (currentPage === 'workflow') {
    return <DocumentWorkflow />;
  }

  if (currentPage === 'history') {
    return (
      <HistoryPage
        onBack={() => setCurrentPage('dashboard')}
        onSelect={(doc) => {
          setSelectedDocForExport(doc);
          setCurrentPage('export');
        }}
      />
    );
  }

  if (currentPage === 'export' && selectedDocForExport) {
    return (
      <ExportPage
        document={selectedDocForExport}
        onBack={() => {
          setCurrentPage('dashboard');
          setSelectedDocForExport(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">🐱 MEOW Agent</h1>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 leading-tight">
              Document<br />Scanning<br />Made Easy
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Capture handwritten documents, extract text with AI, and export instantly.
            </p>
            <button
              onClick={() => setCurrentPage('workflow')}
              className="px-8 py-4 bg-black hover:bg-gray-900 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              📸 Start Scanning
            </button>
          </div>

          {/* Right Cat Mascot */}
          <div className="text-center">
            <div className="text-9xl animate-bounce" style={{animationDuration: '3s'}}>
              🐱
            </div>
            <p className="text-gray-500 mt-6 text-sm">Your AI Document Assistant</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'dashboard' && (
          <div>
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* New Document */}
              <button
                onClick={() => setCurrentPage('workflow')}
                className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-lg hover:border-gray-300 transition-all group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</div>
                <h3 className="font-bold text-gray-900 mb-1">New Document</h3>
                <p className="text-gray-600 text-sm">Start scanning</p>
              </button>

              {/* Document History */}
              <button
                onClick={() => setCurrentPage('history')}
                className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-lg hover:border-gray-300 transition-all group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">📚</div>
                <h3 className="font-bold text-gray-900 mb-1">History</h3>
                <p className="text-gray-600 text-sm">Past 7 days</p>
              </button>

              {/* Create Slides */}
              <button className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-lg hover:border-gray-300 transition-all group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🎬</div>
                <h3 className="font-bold text-gray-900 mb-1">AI Slides</h3>
                <p className="text-gray-600 text-sm">Export to AI</p>
              </button>

              {/* Stats */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">{documents.length}</div>
                <p className="text-gray-600 text-sm">Documents</p>
                <div className="mt-3 text-2xl font-bold text-gray-900">{documents.reduce((sum, doc) => sum + doc.pages.length, 0)}</div>
                <p className="text-gray-600 text-sm">Pages</p>
              </div>
            </div>

            {/* Recent Documents */}
            {documents.length > 0 && (
              <div className="mb-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Recent Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.slice(-3).map((doc) => (
                    <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900 truncate">{doc.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{doc.pages.length} pages</p>
                        </div>
                        <div className="text-2xl">📄</div>
                      </div>
                      <p className="text-xs text-gray-500 mb-4">
                        Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                      </p>
                      <button className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg text-sm transition-colors">
                        Open
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
