'use client';
import type { PDFDocumentProxy } from 'pdfjs-dist';

type Pdfjs = typeof import('pdfjs-dist');
let janji: Promise<Pdfjs> | null = null;

/** pdf.js dimuat hanya saat PDF dipilih (bukan di bundle awal); worker dibundel lewat `new URL(..., import.meta.url)`. */
export function muatPdfjs(): Promise<Pdfjs> {
  janji ??= import('pdfjs-dist').then(pdfjs => {
    if (!pdfjs.GlobalWorkerOptions.workerPort) {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' });
    }
    return pdfjs;
  });
  return janji;
}

export async function bukaPdf(berkas: File): Promise<PDFDocumentProxy> {
  const pdfjs = await muatPdfjs();
  return pdfjs.getDocument({ data: new Uint8Array(await berkas.arrayBuffer()) }).promise;
}

/** Gambar halaman ke JPEG data URL selebar `lebar` px (gambar kecil / pratinjau besar). Semua di browser — berkas tidak dikirim ke mana pun. */
export async function gambarHalaman(doc: PDFDocumentProxy, nomor: number, lebar: number): Promise<string> {
  const halaman = await doc.getPage(nomor);
  const asli = halaman.getViewport({ scale: 1 });
  const viewport = halaman.getViewport({ scale: lebar / asli.width });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await halaman.render({ canvas, viewport }).promise;
  const url = canvas.toDataURL('image/jpeg', 0.8);
  halaman.cleanup();
  return url;
}
