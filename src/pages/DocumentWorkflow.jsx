import { useState, useEffect } from 'react';
import { useDocumentStore } from '../store/documentStore';
import CapturePage from './CapturePage';
import ReviewPage from './ReviewPage';
import ExportPage from './ExportPage';
import CreateSlidesModal from '../components/CreateSlidesModal';

export default function DocumentWorkflow() {
  const [step, setStep] = useState('capture');
  const [document, setDocument] = useState(null);
  const [showSlidesModal, setShowSlidesModal] = useState(false);
  const { documents, createDocument } = useDocumentStore();

  const handleCaptureComplete = (doc) => {
    setDocument(doc);
    setStep('review');
  };

  const handleReviewComplete = (reviewed) => {
    setDocument(reviewed);
    setStep('export');
  };

  const handleExportComplete = () => {
    setDocument(null);
    setStep('capture');
  };

  const handleCancel = () => {
    setDocument(null);
    setStep('capture');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className={`flex items-center gap-2 ${step === 'capture' ? 'text-blue-600' : 'text-gray-500'}`}>
                <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold">1</div>
                <span className="hidden sm:inline text-sm">Capture</span>
              </div>
              <div className="text-gray-300">→</div>
              <div className={`flex items-center gap-2 ${step === 'review' ? 'text-blue-600' : 'text-gray-500'}`}>
                <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold">2</div>
                <span className="hidden sm:inline text-sm">Review</span>
              </div>
              <div className="text-gray-300">→</div>
              <div className={`flex items-center gap-2 ${step === 'export' ? 'text-blue-600' : 'text-gray-500'}`}>
                <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold">3</div>
                <span className="hidden sm:inline text-sm">Export</span>
              </div>
            </div>
            {document && (
              <button
                onClick={() => setShowSlidesModal(true)}
                className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg"
              >
                🎬 Slides
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {step === 'capture' && (
        <CapturePage onCapture={(pages) => {
          const doc = createDocument('New Document');
          pages.forEach(p => useDocumentStore.getState().addPage(doc.id, p));
          handleCaptureComplete(doc);
        }} />
      )}

      {step === 'review' && document && (
        <ReviewPage 
          documentId={document.id}
          onExport={handleReviewComplete}
          onCancel={handleCancel}
        />
      )}

      {step === 'export' && document && (
        <ExportPage
          document={documents.find(d => d.id === document.id) || document}
          onBack={handleExportComplete}
        />
      )}

      {/* Create Slides Modal */}
      {showSlidesModal && document && (
        <CreateSlidesModal
          document={documents.find(d => d.id === document.id) || document}
          onClose={() => setShowSlidesModal(false)}
        />
      )}
    </div>
  );
}
