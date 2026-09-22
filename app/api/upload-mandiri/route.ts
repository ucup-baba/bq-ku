import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getUploadTokenRecord, incrementUploadTokenUsage, getSantriById, saveDocument } from '@/lib/db/santri-repo';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { uploadToBucket } from '@/lib/storage/upload';
import { generateStandardizedFileName } from '@/lib/utils/file-naming';
import { processOcrImage } from '@/lib/ocr/engine';
import { checkNameMatch } from '@/lib/utils/formatters';

// GET: Validate token & return santri information and existing documents
export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminSupabase();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
    }

    const tokenRecord = await getUploadTokenRecord(supabase, token);
    if (!tokenRecord) {
      return NextResponse.json({ error: 'Tautan upload tidak ditemukan atau tidak valid' }, { status: 404 });
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expiresAt);
    if (now > expiresAt) {
      return NextResponse.json({ error: 'Tautan upload telah kedaluwarsa. Silakan minta tautan baru ke panitia.' }, { status: 410 });
    }

    const santri = await getSantriById(supabase, tokenRecord.santriId);
    if (!santri) {
      return NextResponse.json({ error: 'Data santri tidak ditemukan' }, { status: 404 });
    }

    // Only return safe public info needed for upload
    return NextResponse.json({
      success: true,
      santri: {
        id: santri.id,
        namaLengkap: santri.namaLengkap,
        namaPanggilan: santri.namaPanggilan,
        jenisKelamin: santri.jenisKelamin,
        jenjang: santri.jenjang,
        kelas: santri.kelas,
        sekolahSekarang: santri.sekolahSekarang,
        fotoProfilUrl: santri.fotoProfilUrl || santri.fotoFormalUrl,
        documents: (santri.documents || []).map(d => ({
          kategori: d.kategori,
          statusVerifikasi: d.statusVerifikasi,
          fileUrl: d.fileUrl,
        })),
      },
      expiresAt: tokenRecord.expiresAt,
    });
  } catch (error: any) {
    console.error('Error fetching upload-mandiri data:', error);
    return NextResponse.json({ error: 'Gagal memuat data: ' + error.message }, { status: 500 });
  }
}

// POST: Upload document from wali self-service link
export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminSupabase();
    const formData = await req.formData();
    const token = formData.get('token') as string | null;
    const kategori = formData.get('kategori') as string | null;
    const file = formData.get('file') as File | null;

    if (!token || !kategori || !file) {
      return NextResponse.json({ error: 'Data tidak lengkap (token, kategori, dan file wajib diisi)' }, { status: 400 });
    }

    const tokenRecord = await getUploadTokenRecord(supabase, token);
    if (!tokenRecord) {
      return NextResponse.json({ error: 'Tautan upload tidak valid' }, { status: 404 });
    }

    const now = new Date();
    if (now > new Date(tokenRecord.expiresAt)) {
      return NextResponse.json({ error: 'Tautan upload telah kedaluwarsa' }, { status: 410 });
    }

    const santri = await getSantriById(supabase, tokenRecord.santriId);
    if (!santri) {
      return NextResponse.json({ error: 'Data santri tidak ditemukan' }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);
    const mimeType = file.type || 'application/octet-stream';
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    let finalBuffer = originalBuffer;
    let targetExt = '.' + (file.name.split('.').pop() || 'jpg');
    let uploadMime = mimeType;

    // Optimize image
    if (isImage) {
      try {
        let pipeline = sharp(originalBuffer).rotate();
        pipeline = pipeline.resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true });
        pipeline = pipeline.normalize().sharpen({ sigma: 1.0, m1: 0.5, m2: 2.0 });
        finalBuffer = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
        targetExt = '.webp';
        uploadMime = 'image/webp';
      } catch (err) {
        console.warn('Sharp optimization error:', err);
      }
    }

    // Generate standardized file name
    const fileName = generateStandardizedFileName({
      tahunMasuk: santri.tahunMasuk ? String(santri.tahunMasuk) : '2026',
      jenisKelamin: santri.jenisKelamin,
      namaSantri: santri.namaLengkap,
      kategori,
      originalFileName: file.name,
      ext: targetExt,
    });

    const { storagePath } = await uploadToBucket(supabase, fileName, finalBuffer, uploadMime);

    // Process OCR for verification
    let ocrResult: any = null;
    try {
      ocrResult = await processOcrImage(finalBuffer, kategori);

      // Strict validation: if document has a detected student name, check against santri.namaLengkap
      if (
        kategori !== 'KARTU_KELUARGA' &&
        ocrResult?.data?.namaLengkap &&
        santri.namaLengkap
      ) {
        const match = checkNameMatch(santri.namaLengkap, ocrResult.data.namaLengkap);
        if (!match.isMatch) {
          return NextResponse.json({
            error: `Nama pada berkas (${ocrResult.data.namaLengkap}) tidak sesuai dengan nama santri (${santri.namaLengkap}). Mohon periksa kembali berkas yang diunggah.`,
            mismatch: true,
            detectedName: ocrResult.data.namaLengkap,
          }, { status: 422 });
        }
      }
    } catch (ocrErr) {
      console.warn('OCR verification warning:', ocrErr);
    }

    // Save document to database
    const savedDoc = await saveDocument(supabase, {
      santriId: santri.id,
      kategori,
      nomorDokumen: ocrResult?.data?.nomorDokumen || ocrResult?.data?.nik || null,
      storagePath,
      rawOcrText: ocrResult?.rawText || null,
      extractedFields: ocrResult?.data ? JSON.stringify(ocrResult.data) : null,
      statusVerifikasi: 'VERIFIED',
      catatanVerifikasi: 'Diunggah mandiri oleh wali via tautan WhatsApp',
    });

    // Increment usage
    await incrementUploadTokenUsage(supabase, token);

    return NextResponse.json({
      success: true,
      message: 'Berkas berhasil diunggah dan diverifikasi',
      document: savedDoc,
    });
  } catch (error: any) {
    console.error('Error handling upload-mandiri upload:', error);
    return NextResponse.json({ error: 'Gagal mengunggah berkas: ' + error.message }, { status: 500 });
  }
}
