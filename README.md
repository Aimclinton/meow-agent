# 📱 Document Scanner - Case Report Digitizer

A mobile-first web app for digitizing handwritten case reports using OCR and generating export files (DOCX, XLSX).

## ✨ Features

- 📷 **Camera Capture** - Capture pages from your phone/tablet camera
- 🧠 **OCR Processing** - Extract text using Tesseract.js (browser-based, no server needed)
- 📄 **Multi-Format Export** - Export as DOCX, XLSX, or send via email
- 🔐 **Password Protected** - Secure your documents with password
- 📊 **Smart AI Helper** - Generate AI prompts for creating presentation slides
- 📱 **Mobile Optimized** - Fully responsive design for phone and tablet
- ⚡ **100% Free** - Uses only free tier services

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd doc-scanner

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📋 Project Structure

```
src/
├── components/      # React components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── store/          # Zustand state management
├── utils/          # Utility functions
└── App.jsx         # Main app component
```

## 🔧 Tech Stack

- **Frontend**: React 19 + Vite
- **UI Framework**: TailwindCSS
- **State Management**: Zustand
- **OCR**: Tesseract.js (client-side)
- **Export**: docx-js (DOCX), ExcelJS (XLSX)
- **Storage**: IndexedDB (browser local storage)
- **Deployment**: Vercel (free tier)

## 📱 Browser Support

- iOS Safari 14.5+
- Android Chrome 90+
- Fully responsive on mobile and tablet devices

## 🌐 Deployment

Deploy to Vercel with one click - no configuration needed!

```bash
npm install -g vercel
vercel
```

---

**Made with ❤️ for students and professionals** | Free & Open Source
