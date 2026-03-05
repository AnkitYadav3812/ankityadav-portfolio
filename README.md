# PDF Toolkit

Professional SaaS-style PDF web application (inspired by ILovePDF) with a React + Tailwind frontend and Node.js + Express backend.

## Features
- Modern landing page with tool grid
- Drag and drop file uploads
- 12 PDF tools in dashboard layout
- Progress bar, success/error alerts, and download link
- 50MB per-file upload limit
- Dark mode support
- Privacy-focused: uploaded and processed files are auto-deleted after processing
- SEO-friendly metadata and multi-page sections (Home, PDF Tools, About, Contact, Privacy)

## Tools Included
1. PDF Watermark Remover
2. Add Watermark
3. Merge PDF
4. Split PDF
5. Compress PDF
6. PDF to Word
7. Word to PDF
8. PDF to JPG
9. JPG to PDF
10. Rotate PDF
11. Protect PDF
12. Unlock PDF

> Note: Merge, split, add watermark, and rotate are implemented with `pdf-lib`. Other tools are scaffolded with production-ready API shape and can be expanded.

## Run locally
```bash
npm install
npm start
```

Open `http://localhost:3000`

## Security behavior
- Max file size is enforced at 50MB.
- Uploaded files are written to `public/tmp` and removed quickly after processing.
- Output files are written to `public/processed` and cleaned up automatically.
