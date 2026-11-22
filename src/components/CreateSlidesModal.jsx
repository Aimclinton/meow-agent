import { useState } from 'react';

export default function CreateSlidesModal({ document, onClose }) {
  const [copiedSection, setCopiedSection] = useState(null);

  // Generate smart prompt based on document
  const generatePrompt = () => {
    const text = document.pages
      .map((p) => p.ocrText)
      .join('\n')
      .substring(0, 1000);

    return `I have a document called "${document.title}" with ${document.pages.length} pages.

Here's a summary of the content:
${text}${text.length >= 1000 ? '...' : ''}

Please create a professional presentation (slides) from this content. Focus on:
1. Main themes and key points
2. Clear structure with logical sections
3. Recommended number of slides
4. Title, bullet points, and any visual suggestions

Please suggest a compelling presentation outline.`;
  };

  const prompt = generatePrompt();

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-8 text-white">
          <div className="text-5xl mb-4">🎬</div>
          <h2 className="text-3xl font-bold mb-2">Create Presentation Slides</h2>
          <p>Export your document to AI presentation tool</p>
        </div>

        {/* Content */}
        <div className="px-6 py-8 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📢 How to use:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Download your document file (DOCX or XLSX) first</li>
              <li>Copy the prompt below (click copy button)</li>
              <li>Go to Claude.ai, ChatGPT, or your favorite AI tool</li>
              <li>Paste the prompt and your document link</li>
              <li>Generate professional slides</li>
            </ol>
          </div>

          {/* Prompt Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">🤖 Smart AI Prompt:</h3>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-3">
              {/* Document Info */}
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">📄 Document Info:</p>
                <div className="text-sm space-y-1 text-gray-600">
                  <p><span className="font-medium">Title:</span> {document.title}</p>
                  <p><span className="font-medium">Pages:</span> {document.pages.length}</p>
                  <p><span className="font-medium">Total Text:</span> {document.pages.reduce((sum, p) => sum + (p.ocrText?.length || 0), 0)} characters</p>
                </div>
                <button
                  onClick={() => copyToClipboard(`Document: "${document.title}" (${document.pages.length} pages)`, 'info')}
                  className="mt-2 text-xs px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition"
                >
                  {copiedSection === 'info' ? '✓ Copied!' : 'Copy Info'}
                </button>
              </div>

              {/* Main Prompt */}
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">📝 Main Prompt:</p>
                <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 max-h-40 overflow-y-auto font-mono whitespace-pre-wrap">
                  {prompt}
                </div>
                <button
                  onClick={() => copyToClipboard(prompt, 'prompt')}
                  className="mt-2 text-xs px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded transition font-medium"
                >
                  {copiedSection === 'prompt' ? '✓ Copied!' : '📋 Copy Full Prompt'}
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-white p-3 rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">📌 Format Tips:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Include document title and page count</li>
                  <li>• Reference key themes from OCR text</li>
                  <li>• Ask for specific slide structure</li>
                  <li>• Request design recommendations</li>
                </ul>
                <button
                  onClick={() => copyToClipboard(
                    'Format Tips:\n• Include document title and page count\n• Reference key themes from OCR text\n• Ask for specific slide structure\n• Request design recommendations',
                    'tips'
                  )}
                  className="mt-2 text-xs px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded transition"
                >
                  {copiedSection === 'tips' ? '✓ Copied!' : 'Copy Tips'}
                </button>
              </div>
            </div>
          </div>

          {/* Supported AI Tools */}
          <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
            <h3 className="font-semibold text-purple-900 mb-2">✨ Supported AI Tools:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <span className="text-purple-800">Claude.ai</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔵</span>
                <span className="text-purple-800">ChatGPT</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔺</span>
                <span className="text-purple-800">Gemini</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🌐</span>
                <span className="text-purple-800">Any LLM</span>
              </div>
            </div>
          </div>

          {/* Quick Link */}
          <div className="text-center">
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition"
            >
              🚀 Open Claude.ai
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t px-6 py-4 flex gap-4 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
          >
            Close
          </button>
          <button
            onClick={() => copyToClipboard(prompt, 'full')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition"
          >
            {copiedSection === 'full' ? '✓ Copied!' : '📋 Copy Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}
