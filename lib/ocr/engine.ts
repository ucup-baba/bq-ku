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
      // Write buffer to temporary file for Tesseract/Python processing
      const tempUploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(tempUploadDir)) {
        fs.mkdirSync(tempUploadDir, { recursive: true });
      }
      const tempPath = path.join(tempUploadDir, `ocr_temp_${Date.now()}.png`);
      fs.writeFileSync(tempPath, imageBufferOrUrl);
      tempFilesToCleanup.push(tempPath);
      imagePathToRecognize = tempPath;
    } else if (typeof imageBufferOrUrl === 'string') {
      // Check if it's mock raw text (e.g. from tests)
      if (
        imageBufferOrUrl.includes('\n') || 
        imageBufferOrUrl.startsWith('KARTU') || 
        imageBufferOrUrl.startsWith('NIK') || 
        imageBufferOrUrl.startsWith('REPUBLIK') ||
        imageBufferOrUrl.startsWith('PROVINSI') ||
        imageBufferOrUrl.startsWith('SURAT')
      ) {
        rawText = imageBufferOrUrl;
      } else {
        // Resolve file path
        let resolvedPath = imageBufferOrUrl;
        if (resolvedPath.startsWith('/uploads/')) {
          resolvedPath = path.join(process.cwd(), 'public', resolvedPath);
        } else if (resolvedPath.startsWith('uploads/')) {
          resolvedPath = path.join(process.cwd(), 'public', resolvedPath);
        } else if (!path.isAbsolute(resolvedPath)) {
          resolvedPath = path.join(process.cwd(), resolvedPath);
        }

        if (fs.existsSync(resolvedPath)) {
          const ext = path.extname(resolvedPath).toLowerCase();
          if (ext === '.pdf') {
            // Extract from PDF using python helper
            const scriptPath = path.join(process.cwd(), 'lib', 'ocr', 'extract_pdf.py');
            const outputDir = path.join(process.cwd(), 'public', 'uploads');
            try {
              const { stdout } = await execFileAsync('python', [scriptPath, resolvedPath, outputDir]);
              const res = JSON.parse(stdout.trim());
              if (res.type === 'text' && res.text) {
                rawText = res.text;
              } else if (res.type === 'images' && res.images && res.images.length > 0) {
                imagePathToRecognize = res.images[0];
              }
            } catch (pyErr) {
              console.error('Python PDF extraction failed:', pyErr);
            }
          } else {
            imagePathToRecognize = resolvedPath;
          }
        } else {
          // If file not found, use string as-is
          rawText = imageBufferOrUrl;
        }
      }
    }

    // 1. Try Gemini AI Vision OCR first for high-accuracy Indonesian document extraction
    if (imagePathToRecognize && fs.existsSync(imagePathToRecognize)) {
      try {
        const geminiResult = await processGeminiVisionOcr(imagePathToRecognize, kategori);
        if (geminiResult && geminiResult.data && (geminiResult.data.namaLengkap || geminiResult.data.noKk || geminiResult.data.nik)) {
          return geminiResult;
        }
      } catch (geminiErr) {
        console.warn('Gemini OCR failed, falling back to local Tesseract:', geminiErr);
      }
    }

    // 2. Fallback to Tesseract OCR via standalone runner
    if (!rawText && imagePathToRecognize && fs.existsSync(imagePathToRecognize)) {
      const runnerScript = path.join(process.cwd(), 'lib', 'ocr', 'run_ocr.js');
      try {
        const { stdout } = await execFileAsync('node', [runnerScript, imagePathToRecognize]);
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
