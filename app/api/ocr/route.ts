import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import { processOcrImage } from '@/lib/ocr/engine';
import { parseOcrText } from '@/lib/ocr/parser';

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN', 'PANITIA']);
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { rawText, kategori, fileUrl } = body;

      if (!kategori) {
        return NextResponse.json({ error: 'Kategori berkas harus ditentukan' }, { status: 400 });
      }

      if (rawText) {
        const extracted = parseOcrText(rawText, kategori);
        return NextResponse.json({
          success: true,
          rawText,
          extracted,
        });
      }

      if (fileUrl) {
        const result = await processOcrImage(fileUrl, kategori);
        return NextResponse.json({
          success: true,
          rawText: result.rawText,
          extracted: result.data,
        });
      }

      return NextResponse.json({ error: 'fileUrl atau rawText harus disediakan' }, { status: 400 });
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const kategori = (formData.get('kategori') as string) || 'KARTU_KELUARGA';

      if (!file) {
        return NextResponse.json({ error: 'File gambar wajib diunggah' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await processOcrImage(buffer, kategori);

      return NextResponse.json({
        success: true,
        rawText: result.rawText,
        extracted: result.data,
      });
    }

    return NextResponse.json({ error: 'Format permintaan tidak didukung' }, { status: 400 });
  } catch (error: any) {
    const authRes = authErrorResponse(error); if (authRes) return authRes;
    console.error('OCR processing error:', error);
    return NextResponse.json({ error: 'Gagal memproses OCR: ' + error.message }, { status: 500 });
  }
}
