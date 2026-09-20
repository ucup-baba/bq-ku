import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ExtractedDocumentData, parseOcrText } from './parser';
import { processGeminiVisionOcr } from './gemini';

const execFileAsync = promisify(execFile);

export async function processOcrImage(
  imageBufferOrUrl: string | Buffer,
  kategori: string
): Promise<{ rawText: string; data: ExtractedDocumentData }> {
  let rawText = '';
  let imagePathToRecognize: string | null = null;
  const tempFilesToCleanup: string[] = [];

  try {
    if (Buffer.isBuffer(imageBufferOrUrl)) {
      let ext = '.png';
      if (imageBufferOrUrl.length >= 4) {
        if (imageBufferOrUrl.subarray(0, 4).toString() === '%PDF') {
          ext = '.pdf';
        } else if (imageBufferOrUrl[0] === 0xff && imageBufferOrUrl[1] === 0xd8) {
          ext = '.jpg';
        } else if (imageBufferOrUrl.subarray(0, 4).toString('ascii') === '\x89PNG') {
          ext = '.png';
        } else if (imageBufferOrUrl.length >= 12 && imageBufferOrUrl.subarray(8, 12).toString('ascii') === 'WEBP') {
          ext = '.webp';
        }
      }

      const tempUploadDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(tempUploadDir)) {
        try { fs.mkdirSync(tempUploadDir, { recursive: true }); } catch (e) {}
      }
      const tempPath = path.join(tempUploadDir, `ocr_temp_${Date.now()}${ext}`);
      fs.writeFileSync(tempPath, imageBufferOrUrl);
      tempFilesToCleanup.push(tempPath);
      imagePathToRecognize = tempPath;
    } else if (typeof imageBufferOrUrl === 'string') {
      if (imageBufferOrUrl.startsWith('http://') || imageBufferOrUrl.startsWith('https://')) {
        try {
          const resp = await fetch(imageBufferOrUrl);
          if (resp.ok) {
            const arrBuf = await resp.arrayBuffer();
            const buf = Buffer.from(arrBuf);
            const urlPath = new URL(imageBufferOrUrl).pathname;
            const ext = path.extname(urlPath).toLowerCase() || '.jpg';
            const tempDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'public', 'uploads');
            if (!fs.existsSync(tempDir)) {
              try { fs.mkdirSync(tempDir, { recursive: true }); } catch (e) {}
            }
            const tempPath = path.join(tempDir, `remote_ocr_${Date.now()}${ext}`);
            fs.writeFileSync(tempPath, buf);
            tempFilesToCleanup.push(tempPath);
            imagePathToRecognize = tempPath;
          }
        } catch (fetchErr) {
          console.error('Failed to download remote file for OCR:', fetchErr);
        }
      } else if (
        imageBufferOrUrl.includes('\n') || 
        imageBufferOrUrl.startsWith('KARTU') || 
        imageBufferOrUrl.startsWith('NIK') || 
        imageBufferOrUrl.startsWith('REPUBLIK') ||
        imageBufferOrUrl.startsWith('PROVINSI') ||
        imageBufferOrUrl.startsWith('SURAT')
      ) {
        rawText = imageBufferOrUrl;
      } else {
        // Resolve local file path
        let resolvedPath = imageBufferOrUrl;
        if (resolvedPath.startsWith('/uploads/')) {
          resolvedPath = path.join(process.cwd(), 'public', resolvedPath);
        } else if (resolvedPath.startsWith('uploads/')) {
          resolvedPath = path.join(process.cwd(), 'public', resolvedPath);
        } else if (!path.isAbsolute(resolvedPath)) {
          resolvedPath = path.join(process.cwd(), resolvedPath);
        }

        if (fs.existsSync(resolvedPath)) {
          imagePathToRecognize = resolvedPath;
        } else {
          rawText = imageBufferOrUrl;
        }
      }
    }

    // 1. Try Gemini AI Vision OCR first for high-accuracy Indonesian document extraction (supports Images & PDF)
    if (imagePathToRecognize && fs.existsSync(imagePathToRecognize)) {
      try {
        const geminiResult = await processGeminiVisionOcr(imagePathToRecognize, kategori);
        if (geminiResult && geminiResult.data && (geminiResult.data.namaLengkap || geminiResult.data.noKk || geminiResult.data.nik)) {
          return geminiResult;
        }
      } catch (geminiErr) {
        console.warn('Gemini OCR failed, falling back to local OCR:', geminiErr);
      }
    }

    // 2. Fallback for PDF if Gemini didn't return data: pdftotext or render with pdftoppm
    if (imagePathToRecognize && fs.existsSync(imagePathToRecognize)) {
      const ext = path.extname(imagePathToRecognize).toLowerCase();
      if (ext === '.pdf') {
        const outputDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'public', 'uploads');
        try {
          const { stdout: directText } = await execFileAsync('pdftotext', [imagePathToRecognize, '-']);
          if (directText && directText.trim().length > 50) {
            rawText = directText;
          }
        } catch (e) {
          // ignore
        }

        if (!rawText) {
          try {
            const prefix = path.join(outputDir, `extracted_pdf_${Date.now()}`);
            await execFileAsync('pdftoppm', ['-png', '-r', '300', '-f', '1', '-l', '1', imagePathToRecognize, prefix]);
            const imgPath = `${prefix}-1.png`;
            if (fs.existsSync(imgPath)) {
              imagePathToRecognize = imgPath;
              tempFilesToCleanup.push(imgPath);
            }
          } catch (ppmErr) {
            console.error('pdftoppm extraction failed, falling back to python3:', ppmErr);
            const scriptPath = path.join(process.cwd(), 'lib', 'ocr', 'extract_pdf.py');
            try {
              const { stdout } = await execFileAsync('python3', [scriptPath, imagePathToRecognize, outputDir]);
              const res = JSON.parse(stdout.trim());
              if (res.type === 'text' && res.text) {
                rawText = res.text;
              } else if (res.type === 'images' && res.images && res.images.length > 0) {
                imagePathToRecognize = res.images[0];
                tempFilesToCleanup.push(res.images[0]);
              }
            } catch (pyErr) {
              console.error('PDF extraction failed completely:', pyErr);
            }
          }
        }
      }
    }

    // 3. Fallback to Tesseract OCR via standalone runner
    if (!rawText && imagePathToRecognize && fs.existsSync(imagePathToRecognize)) {
      const runnerScript = path.join(process.cwd(), 'lib', 'ocr', 'run_ocr.js');
      try {
        const { stdout } = await execFileAsync(process.execPath, [runnerScript, imagePathToRecognize, kategori]);
        const parsed = JSON.parse(stdout.trim());
        if (parsed.success && parsed.text) {
          rawText = parsed.text;
        }
      } catch (runErr) {
        console.error('OCR runner execution error:', runErr);
      }
    }
  } catch (err) {
    console.error('OCR Processing error:', err);
    if (!rawText && typeof imageBufferOrUrl === 'string' && !imageBufferOrUrl.includes('/')) {
      rawText = imageBufferOrUrl;
    }
  } finally {
    // Cleanup any temporary buffers created
    for (const f of tempFilesToCleanup) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (e) {
        // ignore cleanup error
      }
    }
  }

  const data = parseOcrText(rawText, kategori);

  return {
    rawText,
    data,
  };
}
