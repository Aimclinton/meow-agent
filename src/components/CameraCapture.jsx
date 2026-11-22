import { useRef, useState, useEffect } from 'react';
import Compressor from 'compressorjs';

export default function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraActive]);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError(
        'Camera access denied. Please check permissions or use the photo picker.'
      );
      setIsCameraActive(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    try {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      canvasRef.current.toBlob(async (blob) => {
        try {
          // Compress the image
          new Compressor(new File([blob], 'page.jpg', { type: 'image/jpeg' }), {
            quality: 0.85,
            maxWidth: 1280,
            maxHeight: 1920,
            success: async (compressedFile) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                setPreviewImage(e.target.result);
                setIsProcessing(false);
              };
              reader.readAsDataURL(compressedFile);
            },
            error: () => {
              setCameraError('Failed to compress image');
              setIsProcessing(false);
            },
          });
        } catch (err) {
          setCameraError('Failed to process image');
          setIsProcessing(false);
        }
      }, 'image/jpeg', 0.85);
    } catch (err) {
      setCameraError('Failed to capture photo');
      setIsProcessing(false);
    }
  };

  const handlePhotoPickerChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    new Compressor(file, {
      quality: 0.85,
      maxWidth: 1280,
      maxHeight: 1920,
      success: (compressedFile) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          setPreviewImage(event.target.result);
          setIsProcessing(false);
        };
        reader.readAsDataURL(compressedFile);
      },
      error: () => {
        setCameraError('Failed to process selected image');
        setIsProcessing(false);
      },
    });
  };

  const confirmCapture = () => {
    if (previewImage) {
      onCapture(previewImage);
      setPreviewImage(null);
      setCameraError(null);
    }
  };

  const retakePhoto = () => {
    setPreviewImage(null);
  };

  // Preview mode
  if (previewImage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full overflow-hidden">
          <div className="relative bg-black aspect-video flex items-center justify-center">
            <img src={previewImage} alt="Preview" className="max-h-full max-w-full" />
          </div>

          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-600 text-center">
              {isProcessing ? 'Processing image...' : 'Is this correct?'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={retakePhoto}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
              >
                Retake
              </button>
              <button
                onClick={confirmCapture}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition"
              >
                {isProcessing ? 'Processing...' : 'Add Page'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Camera/Photo picker mode
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full overflow-hidden">
        {/* Camera View */}
        {isCameraActive && !cameraError && (
          <div className="relative bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Error State */}
        {cameraError && (
          <div className="bg-red-50 p-4 text-red-700 text-sm text-center">
            {cameraError}
          </div>
        )}

        {/* Not Active State */}
        {!isCameraActive && !cameraError && (
          <div className="aspect-video bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-2">📱</div>
              <p className="text-gray-600 text-sm">Ready to capture</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 space-y-3">
          {!isCameraActive ? (
            <div className="space-y-2">
              <button
                onClick={() => setIsCameraActive(true)}
                className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition"
              >
                📷 Open Camera
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
              >
                📁 Choose Photo
              </button>

              <button
                onClick={onCancel}
                className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={capturePhoto}
                disabled={isProcessing}
                className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-lg transition flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin">⏳</span> Processing...
                  </>
                ) : (
                  <>📸 Capture Photo</>
                )}
              </button>

              <button
                onClick={() => setIsCameraActive(false)}
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
              >
                Close Camera
              </button>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoPickerChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
