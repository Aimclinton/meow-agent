import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const processImage = useCallback(async (imageData) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const worker = await Tesseract.createWorker({
        logger: (m) => {
          if (m.status === 'recognizing') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const result = await worker.recognize(imageData);

      await worker.terminate();

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        lines: result.data.lines,
        paragraphs: result.data.paragraphs,
      };
    } catch (err) {
      const errorMsg = `OCR Error: ${err.message}`;
      setError(errorMsg);
      console.error(errorMsg, err);
      return null;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, []);

  return {
    processImage,
    isProcessing,
    progress,
    error,
  };
}
