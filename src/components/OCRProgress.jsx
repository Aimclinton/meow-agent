export default function OCRProgress({ progress, isProcessing, error }) {
  if (!isProcessing && !error) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
        {error ? (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">OCR Failed</h2>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <div className="mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Reading Text...</h2>

            <div className="mb-4">
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-gray-600 text-sm mt-2">{progress}%</p>
            </div>

            <p className="text-gray-500 text-xs">
              This may take 15-30 seconds per page. Please wait...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
