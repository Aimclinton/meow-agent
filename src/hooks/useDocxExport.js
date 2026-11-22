export function useDocxExport() {
  const generateDocx = async (document) => {
    try {
      // Generate HTML content
      let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${document.title || 'Document'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #0066cc; margin-top: 20px; }
    .page { page-break-after: always; margin-bottom: 30px; }
    img { max-width: 100%; height: auto; }
    .metadata { font-size: 12px; color: #666; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>${document.title || 'Untitled Document'}</h1>
  <p class="metadata">Generated on ${new Date().toLocaleString()}</p>
  <hr>
`;

      // Add pages
      for (let i = 0; i < document.pages.length; i++) {
        const page = document.pages[i];
        htmlContent += `
  <div class="page">
    <h2>Page ${i + 1}</h2>
    <img src="${page.imageData}" alt="Page ${i + 1}">
    ${
      page.ocrText
        ? `
    <h3>Extracted Text:</h3>
    <p>${page.ocrText.replace(/\n/g, '<br>')}</p>
    <p class="metadata">OCR Confidence: ${Math.round(page.confidence || 0)}%</p>
    `
        : '<p><em>(No text detected)</em></p>'
    }
  </div>
`;
      }

      htmlContent += `
</body>
</html>
`;

      // Convert HTML to DOCX using a simple approach
      // For now, export as HTML which can be opened in Word
      const blob = new Blob([htmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${document.title || 'Document'}_${Date.now()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true, fileName: link.download };
    } catch (error) {
      console.error('DOCX generation failed:', error);
      return { success: false, error: error.message };
    }
  };

  return { generateDocx };
}
