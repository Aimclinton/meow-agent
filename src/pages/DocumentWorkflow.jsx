import { useState } from 'react';
import { useDocumentStore } from '../store/documentStore';
import CapturePage from './CapturePage';
import ReviewPage from './ReviewPage';
import ExportPage from './ExportPage';
import CreateSlidesModal from '../components/CreateSlidesModal';
import { AppHeader, StepBar } from '../components/ui';
import FeatureRequest from '../components/FeatureRequest';

export default function DocumentWorkflow({ onExit, initialDocId = null }) {
  const [step, setStep] = useState(initialDocId ? 'review' : 'capture');
  const [docId, setDocId] = useState(initialDocId);
  const [showSlides, setShowSlides] = useState(false);
  const { documents, createDocument } = useDocumentStore();
  const document = documents.find((d) => d.id === docId);

  const back = () => {
    if (step === 'export') setStep('review');
    else if (step === 'review' && !initialDocId) setStep('capture');
    else onExit();
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-mono overflow-x-hidden">
      <AppHeader
        onBack={back}
        backLabel={step === 'capture' || (step === 'review' && initialDocId) ? 'Home' : 'Back'}
        right={
          <>
            {step !== 'export' && <FeatureRequest variant="header" />}
            {document && step !== 'capture' && (
              <button onClick={() => setShowSlides(true)} className="min-h-[44px] px-2 hover:underline underline-offset-4">🎬<span className="hidden sm:inline"> Slides</span></button>
            )}
          </>
        }
      >
        <StepBar step={step} />
      </AppHeader>

      {step === 'capture' && (
        <CapturePage
          onCapture={(pages, title) => {
            const doc = createDocument(title, pages);
            setDocId(doc.id);
            setStep('review');
          }}
        />
      )}

      {step === 'review' && document && (
        <ReviewPage document={document} onExport={() => setStep('export')} />
      )}

      {step === 'export' && document && <ExportPage document={document} onDone={onExit} embedded />}

      {showSlides && document && <CreateSlidesModal document={document} onClose={() => setShowSlides(false)} />}
    </div>
  );
}
