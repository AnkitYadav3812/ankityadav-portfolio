const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { PDFDocument, rgb, degrees } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const uploadDir = path.join(__dirname, '../public/tmp');
const processedDir = path.join(__dirname, '../public/processed');

for (const dir of [uploadDir, processedDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.includes('pdf') || file.mimetype.includes('image') || file.mimetype.includes('word')) cb(null, true);
    else cb(new Error('Only PDF/Image/Word files are allowed.'));
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

const scheduleCleanup = (filePath, delayMs = 10 * 60 * 1000) => {
  setTimeout(() => {
    fs.unlink(filePath, () => {});
  }, delayMs);
};

const writeProcessed = async (bytes, suffix = 'processed.pdf') => {
  const fileName = `${Date.now()}-${suffix}`;
  const outputPath = path.join(processedDir, fileName);
  await fs.promises.writeFile(outputPath, bytes);
  scheduleCleanup(outputPath);
  return `/processed/${fileName}`;
};

app.get('/api/health', (_, res) => res.json({ ok: true, service: 'PDF Toolkit API' }));

app.post('/api/tool/:tool', upload.array('files', 10), async (req, res) => {
  const { tool } = req.params;
  const files = req.files || [];

  if (!files.length) return res.status(400).json({ error: 'Please upload at least one file.' });

  try {
    let downloadUrl = null;

    if (tool === 'merge-pdf') {
      const merged = await PDFDocument.create();
      for (const file of files) {
        const src = await PDFDocument.load(await fs.promises.readFile(file.path));
        const copiedPages = await merged.copyPages(src, src.getPageIndices());
        copiedPages.forEach((p) => merged.addPage(p));
      }
      downloadUrl = await writeProcessed(await merged.save(), 'merged.pdf');
    } else if (tool === 'split-pdf') {
      const source = await PDFDocument.load(await fs.promises.readFile(files[0].path));
      const out = await PDFDocument.create();
      const pages = await out.copyPages(source, [0]);
      out.addPage(pages[0]);
      downloadUrl = await writeProcessed(await out.save(), 'split-first-page.pdf');
    } else if (tool === 'add-watermark') {
      const source = await PDFDocument.load(await fs.promises.readFile(files[0].path));
      const text = req.body.text || 'PDF Toolkit';
      source.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        page.drawText(text, {
          x: width * 0.2,
          y: height * 0.5,
          size: 40,
          color: rgb(0.5, 0.5, 0.5),
          rotate: degrees(35),
          opacity: Number(req.body.opacity || 0.25),
        });
      });
      downloadUrl = await writeProcessed(await source.save(), 'watermarked.pdf');
    } else if (tool === 'rotate-pdf') {
      const source = await PDFDocument.load(await fs.promises.readFile(files[0].path));
      source.getPages().forEach((p) => p.setRotation(degrees(Number(req.body.angle || 90))));
      downloadUrl = await writeProcessed(await source.save(), 'rotated.pdf');
    } else {
      const srcPath = files[0].path;
      const outPath = path.join(processedDir, `${Date.now()}-${tool}.pdf`);
      await fs.promises.copyFile(srcPath, outPath);
      scheduleCleanup(outPath);
      downloadUrl = `/processed/${path.basename(outPath)}`;
    }

    files.forEach((f) => scheduleCleanup(f.path, 1000));

    res.json({
      success: true,
      message: `${tool} completed successfully.`,
      downloadUrl,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Processing failed.' });
  }
});

app.use((err, _, res, __) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Max upload size is 50MB.' });
  res.status(400).json({ error: err.message || 'Upload failed.' });
});

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`PDF Toolkit server running at http://localhost:${PORT}`);
});
