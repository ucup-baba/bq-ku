import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { generateStandardizedFileName } from '@/lib/utils/file-naming';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tahunMasuk = formData.get('tahunMasuk') as string | null;
    const jenisKelamin = formData.get('jenisKelamin') as string | null;
    const namaSantri = formData.get('namaSantri') as string | null;
    const kategori = formData.get('kategori') as string | null;
    const enhance = formData.get('enhance') === 'true' || formData.get('enhance') === '1';

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);
    const originalSize = originalBuffer.length;

    // Pastikan direktori public/uploads ada jika di lingkungan lokal
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (e) {
      // Abaikan jika read-only di platform serverless (seperti Vercel)
    }

    const originalExt = path.extname(file.name).toLowerCase() || '.jpg';
    const isImage = /\.(jpg|jpeg|png|webp|avif|tiff)$/i.test(originalExt) || (file.type && file.type.startsWith('image/'));
    const isPdf = originalExt === '.pdf' || file.type === 'application/pdf';

    let finalBuffer: Buffer = originalBuffer;
    let targetExt = originalExt;

    // 1. Image Optimization via Sharp (HD Compression & Optional Enhance)
    if (isImage) {
      try {
        let pipeline = sharp(originalBuffer).rotate(); // Auto-orient EXIF

        // Batasi resolusi maksimal 2048px (tetap sangat tajam/HD untuk teks dokumen, namun hemat ruang)
        pipeline = pipeline.resize({
          width: 2048,
          height: 2048,
          fit: 'inside',
          withoutEnlargement: true,
        });

        // Fitur Enhance Dokumen (meningkatkan kontras tulisan pudar & menajamkan huruf)
        if (enhance) {
          pipeline = pipeline.normalize().sharpen({
            sigma: 1.0,
            m1: 0.5,
            m2: 2.0,
          });
        }

        // Kompresi ke WebP kualitas 82 (kualitas HD jernih, hemat ruang 70-85%)
        finalBuffer = await pipeline
          .webp({ quality: 82, effort: 4 })
          .toBuffer();
        targetExt = '.webp';
      } catch (sharpError) {
        console.warn('Sharp image compression failed, using original buffer:', sharpError);
        finalBuffer = originalBuffer;
        targetExt = originalExt;
      }
    } 
    // 2. PDF Optimization via Ghostscript jika tersedia
    else if (isPdf) {
      targetExt = '.pdf';
      const tempId = Date.now();
      const tempDir = process.env.VERCEL ? '/tmp' : (fs.existsSync(uploadDir) ? uploadDir : '/tmp');
      const tempIn = path.join(tempDir, `_temp_in_${tempId}.pdf`);
      const tempOut = path.join(tempDir, `_temp_out_${tempId}.pdf`);

      try {
        fs.writeFileSync(tempIn, originalBuffer);

        // Kompresi PDF menggunakan Ghostscript dengan profil ebook (150-200 DPI, tajam & ringkas)
        await execFileAsync('gs', [
          '-sDEVICE=pdfwrite',
          '-dCompatibilityLevel=1.4',
          '-dPDFSETTINGS=/ebook',
          '-dNOPAUSE',
          '-dQUIET',
          '-dBATCH',
          `-sOutputFile=${tempOut}`,
          tempIn,
        ]);

        if (fs.existsSync(tempOut)) {
          const compressedPdf = fs.readFileSync(tempOut);
          // Hanya gunakan hasil kompresi jika ukurannya lebih kecil
          if (compressedPdf.length > 0 && compressedPdf.length < originalSize) {
            finalBuffer = compressedPdf;
          }
        }
      } catch (gsError) {
        // Ghostscript tidak tersedia atau gagal, gunakan dokumen asli
      } finally {
        if (fs.existsSync(tempIn)) try { fs.unlinkSync(tempIn); } catch (e) {}
        if (fs.existsSync(tempOut)) try { fs.unlinkSync(tempOut); } catch (e) {}
      }
    }

    // 3. Standarisasi Penamaan File: tahunmasuk_gender_nama_ketfile.ext
    const canCheckLocalDir = fs.existsSync(uploadDir);
    const fileName = generateStandardizedFileName({
      tahunMasuk,
      jenisKelamin,
      namaSantri,
      kategori,
      originalFileName: file.name,
      ext: targetExt,
    }, canCheckLocalDir ? uploadDir : undefined);

    const mimeType = isImage ? 'image/webp' : (isPdf ? 'application/pdf' : (file.type || 'application/octet-stream'));
    let fileUrl = `/uploads/${fileName}`;

    // 4. Upload ke Supabase Storage jika sudah dikonfigurasi, atau simpan lokal sebagai fallback
    const supabase = getSupabaseServerClient();
    if (supabase) {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'berkas';
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, finalBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        throw new Error(`Gagal upload ke Supabase Storage: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      fileUrl = publicUrlData.publicUrl;
    } else {
      // Local fallback
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, finalBuffer);
    }

    const compressedSize = finalBuffer.length;
    const savingsPercent = originalSize > compressedSize 
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      fileUrl,
      fileName,
      originalSize,
      compressedSize,
      savingsPercent,
      mimeType,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Gagal mengunggah file: ' + error.message }, { status: 500 });
  }
}
