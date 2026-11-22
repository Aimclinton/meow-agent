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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">🐱 MEOW Agent</h1>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New Document */}
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">📄</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">New Document</h2>
              <p className="text-gray-600 text-sm">Start scanning a new case report</p>
              <button
                onClick={() => setCurrentPage('workflow')}
                className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg"
              >
                Start Scanning
              </button>
            </div>

            {/* Recent Documents */}
            {documents.slice(-2).map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">📋</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1 truncate">{doc.title}</h2>
                <p className="text-gray-600 text-sm mb-2">{doc.pages.length} pages</p>
                <p className="text-gray-500 text-xs mb-4">
                  Updated: {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
                <button className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg text-sm">
                  Continue
                </button>
              </div>
            ))}

            {/* Create Slides */}
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🎬</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Slides</h2>
              <p className="text-gray-600 text-sm">Export to AI presentation tool</p>
              <button className="mt-4 w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg">
                Learn More
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{documents.length}</div>
            <p className="text-gray-600 text-sm">Total Documents</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {documents.reduce((sum, doc) => sum + doc.pages.length, 0)}
            </div>
            <p className="text-gray-600 text-sm">Total Pages</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">📱</div>
            <p className="text-gray-600 text-sm">Mobile Optimized</p>
          </div>
        </div>
      </main>
    </div>
  );
}
