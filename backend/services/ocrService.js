const path = require('path');
const { createWorker } = require('tesseract.js');

// eng.traineddata sits in the backend root, so we point tesseract there (no download needed)
const LANG_DIR = path.join(__dirname, '..');

async function extractTextFromImage(filePath) {
  let worker;
  try {
    worker = await createWorker('eng', 1, { langPath: LANG_DIR, cachePath: LANG_DIR, gzip: false });
    const { data } = await worker.recognize(filePath);
    return (data.text || '').trim();
  } catch (err) {
    console.error('OCR failed:', err.message);
    return '';
  } finally {
    if (worker) await worker.terminate();
  }
}

module.exports = { extractTextFromImage };