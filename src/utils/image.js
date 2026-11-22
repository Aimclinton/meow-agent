// Downscale with a canvas: width <= 1600px, JPEG quality 0.8 (keeps uploads
// small enough for the serverless function and fast on mobile data).
export const MAX_WIDTH = 1600;
export const JPEG_QUALITY = 0.8;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('ไม่สามารถเปิดรูปนี้ได้'));
    img.src = src;
  });
}

export async function compressToDataURL(fileOrBlob) {
  const url = URL.createObjectURL(fileOrBlob);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // flatten transparent PNGs
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(url);
  }
}
