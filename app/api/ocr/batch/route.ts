import { NextRequest, NextResponse } from 'next/server';
import { requireUser, authErrorResponse } from '@/lib/auth/session';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadToBucket } from '@/lib/storage/upload';
import { generateStandardizedFileName } from '@/lib/utils/file-naming';
import { classifyAndExtractDocument, classifyMultiPagePdf } from '@/lib/ocr/gemini-batch';
import { matchBestFamilyMember } from '@/lib/utils/formatters';
import { parseIndonesianDate, extractBirthDateFromNik, extractGenderFromNik } from '@/lib/ocr/parser';

export const maxDuration = 60; // Allow up to 60s for batch processing

interface BatchResult {
  index: number;
  kategori: string;
  /** Signed URL (1 jam) untuk preview/OCR di client */
  fileUrl: string;
  /** Path di bucket; dipakai saat menyimpan dokumen */
  storagePath?: string;
  fileName: string;
  extracted: any;
  error?: string;
}

async function optimizeAndUpload(
  client: SupabaseClient,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  namaSantri: string | null,
  tahunMasuk: string | null,
  jenisKelamin: string | null,
  kategori: string,
  suffix?: string | null,
): Promise<{ fileUrl: string; storagePath: string; fileName: string; finalBuffer: Buffer; finalMime: string }> {
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';

  let finalBuffer = fileBuffer;
  let targetExt = '.' + (originalName.split('.').pop() || 'jpg');
  let finalMime = mimeType;

  // Image optimization via Sharp
  if (isImage) {
    try {
      let pipeline = sharp(fileBuffer).rotate();
      pipeline = pipeline.resize({
        width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true,
      });
      pipeline = pipeline.normalize().sharpen({ sigma: 1.0, m1: 0.5, m2: 2.0 });
      finalBuffer = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
      targetExt = '.webp';
      finalMime = 'image/webp';
    } catch {
      // Use original if Sharp fails
    }
  }

  const fileName = generateStandardizedFileName({
    tahunMasuk,
    jenisKelamin,
    namaSantri,
    kategori,
    originalFileName: originalName,
    ext: targetExt,
    suffix,
  });

  const { storagePath, fileUrl } = await uploadToBucket(client, fileName, finalBuffer, finalMime);

  return { fileUrl, storagePath, fileName, finalBuffer, finalMime };
}

export async function POST(req: NextRequest) {
  try {
    const { supabase } = await requireUser(['SUPERADMIN', 'ADMIN_SANTRI']);
    const contentType = req.headers.get('content-type') || '';

    // SUPPORT 1: JSON Payload (fileUrls already uploaded to Supabase Storage - avoids Vercel 4.5MB limit)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const items = (body.items || []) as Array<{ fileUrl: string; storagePath?: string; fileName: string; kategori?: string }>;
      const allowedOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const namaSantri = body.namaSantri as string | null;
      const tahunMasuk = body.tahunMasuk as string | null;
      const jenisKelamin = body.jenisKelamin as string | null;

      if (!items || items.length === 0) {
        return NextResponse.json({ error: 'Tidak ada berkas yang disediakan' }, { status: 400 });
      }

      const results: BatchResult[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          if (!allowedOrigin || !item.fileUrl.startsWith(allowedOrigin)) {
            throw new Error('URL berkas tidak dikenal (bukan dari storage aplikasi)');
          }
          const fetchRes = await fetch(item.fileUrl);
          if (!fetchRes.ok) {
            throw new Error(`Gagal mengunduh berkas dari URL: HTTP ${fetchRes.status}`);
          }
          const arrayBuf = await fetchRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const isPdf = item.fileName.toLowerCase().endsWith('.pdf') || item.fileUrl.toLowerCase().includes('.pdf');

          if (isPdf) {
            const pdfResults = await classifyMultiPagePdf(buffer);
            if (pdfResults.length === 0) {
              results.push({
                index: i,
                kategori: 'UNKNOWN',
                fileUrl: item.fileUrl,
                storagePath: item.storagePath,
                fileName: item.fileName,
                extracted: null,
                error: 'Gagal mengklasifikasi dokumen PDF',
              });
              continue;
            }

            for (const pdfResult of pdfResults) {
              let finalExtracted = pdfResult.data;
              if (namaSantri && pdfResult.data?.anggotaKeluarga && pdfResult.data.anggotaKeluarga.length > 0) {
                const matched = matchBestFamilyMember(namaSantri, pdfResult.data.anggotaKeluarga);
                if (matched) {
                  let bDate = matched.tanggalLahir || pdfResult.data.tanggalLahir;
                  if (bDate) bDate = parseIndonesianDate(bDate) || bDate;
                  else if (matched.nik) bDate = extractBirthDateFromNik(matched.nik) || undefined;

                  let gender = matched.gender || pdfResult.data.jenisKelamin;
                  if (/LAKI|IKHWAN|PRIA/i.test(gender || '')) gender = 'IKHWAN';
                  else if (/PEREMPUAN|AKHWAT|WANITA/i.test(gender || '')) gender = 'AKHWAT';

                  finalExtracted = {
                    ...pdfResult.data,
                    namaLengkap: matched.nama,
                    nik: matched.nik || pdfResult.data.nik,
                    tempatLahir: matched.tempatLahir || pdfResult.data.tempatLahir,
                    tanggalLahir: bDate,
                    jenisKelamin: gender,
                  };
                }
              }

              // Determine gender for naming & state
              let itemGender = finalExtracted?.jenisKelamin || jenisKelamin;
              if (!itemGender && finalExtracted?.nik) {
                const gNik = extractGenderFromNik(finalExtracted.nik);
                if (gNik) itemGender = gNik;
              }

              let pageFileUrl = item.fileUrl;
              let pageStoragePath = item.storagePath;
              let pageFileName = item.fileName;

              // Upload individual 1-page PDF if split so preview opens ONLY this single page!
              if (pdfResult.pageBuffer) {
                const sameCategoryCount = pdfResults.filter(r => r.kategori === pdfResult.kategori).length;
                const pageSuffix = sameCategoryCount > 1 ? `hal${pdfResult.halaman}` : undefined;
                try {
                  const uploadedPage = await optimizeAndUpload(
                    supabase,
                    pdfResult.pageBuffer,
                    `${item.fileName.replace(/\.pdf$/i, '')}.pdf`,
                    'application/pdf',
                    namaSantri || finalExtracted?.namaLengkap || null,
                    tahunMasuk,
                    itemGender || null,
                    pdfResult.kategori,
                    pageSuffix,
                  );
                  pageFileUrl = uploadedPage.fileUrl;
                  pageStoragePath = uploadedPage.storagePath;
                  pageFileName = uploadedPage.fileName;
                } catch (uploadErr) {
                  console.warn(`[batch] Gagal upload halaman terpisah ${pdfResult.halaman}:`, uploadErr);
                }
              }

              results.push({
                index: i,
                kategori: pdfResult.kategori,
                fileUrl: pageFileUrl,
                storagePath: pageStoragePath,
                fileName: pageFileName,
                extracted: finalExtracted,
              });
            }
          } else {
            // Image
            const mimeType = item.fileUrl.endsWith('.png') ? 'image/png' : item.fileUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
            const result = await classifyAndExtractDocument(buffer, mimeType);
            if (!result) {
              results.push({
                index: i,
                kategori: 'UNKNOWN',
                fileUrl: item.fileUrl,
                storagePath: item.storagePath,
                fileName: item.fileName,
                extracted: null,
                error: 'Gagal mengklasifikasi dokumen gambar',
              });
              continue;
            }

            let finalExtracted = result.data;
            if (namaSantri && result.data?.anggotaKeluarga && result.data.anggotaKeluarga.length > 0) {
              const matched = matchBestFamilyMember(namaSantri, result.data.anggotaKeluarga);
              if (matched) {
                let bDate = matched.tanggalLahir || result.data.tanggalLahir;
                if (bDate) bDate = parseIndonesianDate(bDate) || bDate;
                else if (matched.nik) bDate = extractBirthDateFromNik(matched.nik) || undefined;

                let gender = matched.gender || result.data.jenisKelamin;
                if (/LAKI|IKHWAN|PRIA/i.test(gender || '')) gender = 'IKHWAN';
                else if (/PEREMPUAN|AKHWAT|WANITA/i.test(gender || '')) gender = 'AKHWAT';

                finalExtracted = {
                  ...result.data,
                  namaLengkap: matched.nama,
                  nik: matched.nik || result.data.nik,
                  tempatLahir: matched.tempatLahir || result.data.tempatLahir,
                  tanggalLahir: bDate,
                  jenisKelamin: gender,
                };
              }
            }

            results.push({
              index: i,
              kategori: result.kategori,
              fileUrl: item.fileUrl,
              storagePath: item.storagePath,
              fileName: item.fileName,
              extracted: finalExtracted,
            });
          }
        } catch (itemErr: any) {
          results.push({
            index: i,
            kategori: 'ERROR',
            fileUrl: item.fileUrl,
            storagePath: item.storagePath,
            fileName: item.fileName,
            extracted: null,
            error: itemErr.message || 'Gagal memproses berkas',
          });
        }
      }

      return NextResponse.json({
        success: true,
        totalFiles: items.length,
        totalResults: results.length,
        results,
      });
    }

    // SUPPORT 2: Multipart Form-Data (Direct file uploads)
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const namaSantri = formData.get('namaSantri') as string | null;
    const tahunMasuk = formData.get('tahunMasuk') as string | null;
    const jenisKelamin = formData.get('jenisKelamin') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah' }, { status: 400 });
    }

    if (files.length > 10) {
      return NextResponse.json({ error: 'Maksimal 10 file sekaligus' }, { status: 400 });
    }

    const results: BatchResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
          // Multi-page PDF: classify each page as potentially different document
          const pdfResults = await classifyMultiPagePdf(buffer);

          if (pdfResults.length === 0) {
            results.push({
              index: i,
              kategori: 'UNKNOWN',
              fileUrl: '',
              fileName: file.name,
              extracted: null,
              error: 'Gagal mengklasifikasi PDF',
            });
            continue;
          }

          // Return each detected document from the PDF with its own page upload
          for (const pdfResult of pdfResults) {
            let finalExtracted = pdfResult.data;

            // Smart auto-match family member for KK
            if (namaSantri && pdfResult.data?.anggotaKeluarga && pdfResult.data.anggotaKeluarga.length > 0) {
              const matched = matchBestFamilyMember(namaSantri, pdfResult.data.anggotaKeluarga);
              if (matched) {
                let bDate = matched.tanggalLahir || pdfResult.data.tanggalLahir;
                if (bDate) bDate = parseIndonesianDate(bDate) || bDate;
                else if (matched.nik) bDate = extractBirthDateFromNik(matched.nik) || undefined;

                let gender = matched.gender || pdfResult.data.jenisKelamin;
                if (/LAKI|IKHWAN|PRIA/i.test(gender || '')) gender = 'IKHWAN';
                else if (/PEREMPUAN|AKHWAT|WANITA/i.test(gender || '')) gender = 'AKHWAT';

                finalExtracted = {
                  ...pdfResult.data,
                  namaLengkap: matched.nama,
                  nik: matched.nik || pdfResult.data.nik,
                  tempatLahir: matched.tempatLahir || pdfResult.data.tempatLahir,
                  tanggalLahir: bDate,
                  jenisKelamin: gender,
                };
              }
            }

            // Determine gender for naming & state
            let itemGender = finalExtracted?.jenisKelamin || jenisKelamin;
            if (!itemGender && finalExtracted?.nik) {
              const gNik = extractGenderFromNik(finalExtracted.nik);
              if (gNik) itemGender = gNik;
            }

            let pageFileUrl = '';
            let pageStoragePath: string | undefined;
            let pageFileName = file.name;

            if (pdfResult.pageBuffer) {
              const sameCategoryCount = pdfResults.filter(r => r.kategori === pdfResult.kategori).length;
              const pageSuffix = sameCategoryCount > 1 ? `hal${pdfResult.halaman}` : undefined;
              try {
                const pageUpload = await optimizeAndUpload(
                  supabase,
                  pdfResult.pageBuffer,
                  `${file.name.replace(/\.pdf$/i, '')}.pdf`,
                  'application/pdf',
                  namaSantri || finalExtracted?.namaLengkap || null,
                  tahunMasuk,
                  itemGender || null,
                  pdfResult.kategori,
                  pageSuffix,
                );
                pageFileUrl = pageUpload.fileUrl;
                pageStoragePath = pageUpload.storagePath;
                pageFileName = pageUpload.fileName;
              } catch (uploadErr) {
                console.warn(`[batch] Gagal upload halaman terpisah ${pdfResult.halaman}:`, uploadErr);
              }
            }

            results.push({
              index: i,
              kategori: pdfResult.kategori,
              fileUrl: pageFileUrl,
              storagePath: pageStoragePath,
              fileName: pageFileName,
              extracted: finalExtracted,
            });
          }
        } else {
          // Single image: classify and extract
          const mimeType = file.type || 'image/jpeg';

          // Upload first (optimized)
          const { fileUrl, storagePath, fileName, finalBuffer, finalMime } = await optimizeAndUpload(
            supabase, buffer, file.name, mimeType,
            namaSantri, tahunMasuk, jenisKelamin, 'AUTO',
          );

          // Classify and extract via Gemini
          const result = await classifyAndExtractDocument(finalBuffer, finalMime);

          if (!result) {
            results.push({
              index: i,
              kategori: 'UNKNOWN',
              fileUrl,
              storagePath,
              fileName,
              extracted: null,
              error: 'Gagal mengklasifikasi dokumen',
            });
            continue;
          }

          let finalExtracted = result.data;

          // Smart auto-match family member for KK
          if (namaSantri && result.data?.anggotaKeluarga && result.data.anggotaKeluarga.length > 0) {
            const matched = matchBestFamilyMember(namaSantri, result.data.anggotaKeluarga);
            if (matched) {
              let bDate = matched.tanggalLahir || result.data.tanggalLahir;
              if (bDate) bDate = parseIndonesianDate(bDate) || bDate;
              else if (matched.nik) bDate = extractBirthDateFromNik(matched.nik) || undefined;

              let gender = matched.gender || result.data.jenisKelamin;
              if (/LAKI|IKHWAN|PRIA/i.test(gender || '')) gender = 'IKHWAN';
              else if (/PEREMPUAN|AKHWAT|WANITA/i.test(gender || '')) gender = 'AKHWAT';

              finalExtracted = {
                ...result.data,
                namaLengkap: matched.nama,
                nik: matched.nik || result.data.nik,
                tempatLahir: matched.tempatLahir || result.data.tempatLahir,
                tanggalLahir: bDate,
                jenisKelamin: gender,
              };
            }
          }

          results.push({
            index: i,
            kategori: result.kategori,
            fileUrl,
            storagePath,
            fileName,
            extracted: finalExtracted,
          });
        }
      } catch (fileErr: any) {
        results.push({
          index: i,
          kategori: 'ERROR',
          fileUrl: '',
          fileName: file.name,
          extracted: null,
          error: fileErr.message || 'Gagal memproses file',
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalFiles: files.length,
      totalResults: results.length,
      results,
    });
  } catch (error: any) {
    const authRes = authErrorResponse(error); if (authRes) return authRes;
    console.error('Batch OCR error:', error);
    return NextResponse.json({ error: 'Gagal memproses batch OCR: ' + error.message }, { status: 500 });
  }
}
