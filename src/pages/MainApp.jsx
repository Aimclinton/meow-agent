import { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import DocumentWorkflow from './DocumentWorkflow';

export default function MainApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { documents, logout } = useDocumentStore();

  // Handle page routing
  if (currentPage === 'workflow') {
    return <DocumentWorkflow />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">🐱 MEOW Agent</h1>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {currentPage === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {/* New Document */}
              <div className="bg-white rounded-xl border border-gray-200 p-8 cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all">
                <div className="text-5xl mb-6">📄</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">New Document</h2>
                <p className="text-gray-600 text-sm mb-6">Start scanning a new case report</p>
                <button
                  onClick={() => setCurrentPage('workflow')}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Start Scanning
                </button>
              </div>

              {/* Recent Documents */}
              {documents.slice(-2).map((doc) => (
                <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-8 cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all">
                  <div className="text-5xl mb-6">📋</div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 truncate">{doc.title}</h2>
                  <p className="text-gray-600 text-sm mb-2">{doc.pages.length} pages</p>
                  <p className="text-gray-500 text-xs mb-6">
                    Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                  <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg text-sm transition-colors">
                    Continue
                  </button>
                </div>
              ))}

              {/* Create Slides */}
              <div className="bg-white rounded-xl border border-gray-200 p-8 cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all">
                <div className="text-5xl mb-6">🎬</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Create Slides</h2>
                <p className="text-gray-600 text-sm mb-6">Export to AI presentation tool</p>
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors">
                  Learn More
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-gray-200">
              <div className="p-6 text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">{documents.length}</div>
                <p className="text-gray-600 text-sm">Total Documents</p>
              </div>
              <div className="p-6 text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {documents.reduce((sum, doc) => sum + doc.pages.length, 0)}
                </div>
                <p className="text-gray-600 text-sm">Total Pages</p>
              </div>
              <div className="p-6 text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">📱</div>
                <p className="text-gray-600 text-sm">Mobile Optimized</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
