import Compressor from 'compressorjs';

// Compress a File/Blob and return a data URL (keeps OCR quality, saves storage).
export function compressToDataURL(file) {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.85,
      maxWidth: 1600,
      maxHeight: 2200,
      success: (out) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(out);
      },
      error: reject,
    });
  });
}
