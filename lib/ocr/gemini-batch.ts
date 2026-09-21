import fs from 'fs';
import path from 'path';
import { ExtractedDocumentData, parseIndonesianDate, extractBirthDateFromNik } from './parser';

/**
 * Auto-classify a document image/PDF and extract structured data in one Gemini Vision call.
 * Unlike processGeminiVisionOcr (which requires a kategori hint), this function
 * asks Gemini to DETECT the document type automatically.
 */
export async function classifyAndExtractDocument(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<{ kategori: string; rawText: string; data: ExtractedDocumentData } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const base64Data = imageBuffer.toString('base64');

    const prompt = `Anda adalah asisten OCR AI presisi tinggi untuk administrasi pendaftaran berkas santri di Pondok Pesantren Baitul Qowwam (Yogyakarta).

TUGAS UTAMA: Identifikasi OTOMATIS jenis dokumen Indonesia pada gambar ini, lalu ekstrak seluruh data identitas.

Langkah:
1. DETEKSI jenis dokumen: Apakah ini Kartu Keluarga (KK), KTP Orang Tua, Akta Kelahiran, SKL/Ijazah, KIP/PIP, KRM/PKH/KKS, atau SKTM?
2. EKSTRAK semua data yang relevan sesuai jenis dokumen.

Kembalikan HANYA JSON valid (tanpa markdown) dengan format:
{
  "kategori": "KARTU_KELUARGA" | "KTP_ORTU" | "AKTA_KELAHIRAN" | "SKL_IJAZAH" | "KIP_PIP" | "KRM_PKH_KKS" | "SKTM",
  "confidence": 0.0-1.0,
  "noKk": "16 digit nomor KK (jika KK)",
  "nik": "16 digit NIK calon santri atau pemilik berkas",
  "nisn": "10 digit NISN jika ada pada SKL/Ijazah/KIP",
  "namaLengkap": "Nama lengkap calon santri (jika KK, pilih anak usia sekolah, BUKAN kepala keluarga)",
  "tempatLahir": "Kota/Kabupaten kelahiran",
  "tanggalLahir": "YYYY-MM-DD",
  "jenisKelamin": "IKHWAN" (Laki-laki) atau "AKHWAT" (Perempuan),
  "namaAyah": "Nama lengkap ayah kandung",
  "namaIbu": "Nama lengkap ibu kandung",
  "pekerjaanOrtu": "Pekerjaan orang tua",
  "alamat": "Alamat lengkap termasuk Dusun/Jalan, RT/RW, Desa/Kelurahan, Kecamatan, Kab/Kota, Provinsi, dan Kode Pos",
  "asalSekolahSebelumnya": "Nama sekolah asal jika tercantum di SKL/ijazah/KIP",
  "jenjangTerdeteksi": "SMP" | "SMA" | "SMK" | "ALUMNI",
  "tahunLulus": "Tahun kelulusan 4 digit",
  "nomorDokumen": "Nomor surat/nomor akta/nomor KIP jika ada",
  "statusSosial": "REGULER" | "YATIM" | "PIATU" | "YATIM_PIATU" | "DHUAFA",
  "anggotaKeluarga": [
    {
      "nama": "Nama anggota keluarga",
      "nik": "16 digit NIK",
      "tempatLahir": "Kota/Kabupaten lahir",
      "tanggalLahir": "YYYY-MM-DD",
      "gender": "IKHWAN" | "AKHWAT",
      "hubungan": "KEPALA KELUARGA" | "ISTRI" | "ANAK"
    }
  ]
}

Catatan Khusus SKL / Ijazah:
- SMA/SMK/MA → jenjangTerdeteksi: "ALUMNI"
- SMP/MTs → jenjangTerdeteksi: "SMA" (santri baru masuk SMA)
- SD/MI → jenjangTerdeteksi: "SMP" (santri baru masuk SMP)

Catatan Khusus Kartu Keluarga (KK):
- "noKk" = 16 digit nomor KK di bagian atas dokumen.
- "namaAyah": nama AYAH KANDUNG, BUKAN otomatis kepala keluarga jika kepala keluarganya Ibu. Jika ayah meninggal, tulis '(Alm.)' dan set statusSosial: "YATIM".
- "namaIbu": nama IBU KANDUNG. JANGAN mengisi namaAyah sama dengan namaIbu.
- Daftarkan SELURUH anggota keluarga ke array "anggotaKeluarga".
- tanggalLahir wajib format YYYY-MM-DD.`;

    const candidateModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-flash-latest'];
    let candidate: string | null = null;

    for (const modelName of candidateModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inlineData: { mimeType, data: base64Data } }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (res.ok) {
          const d = await res.json();
          const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            candidate = text;
            break;
          }
        } else {
          const errText = await res.text();
          console.warn(`[batch] Model ${modelName} status ${res.status}: ${errText.slice(0, 80)}`);
        }
      } catch (mErr) {
        console.warn(`[batch] Model ${modelName} fetch error:`, mErr);
      }
    }

    if (!candidate) return null;

    const cleanJsonStr = candidate.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJsonStr);

    // Normalize dates
    const normalizeDate = (dStr: string | undefined, nik?: string) => {
      if (!dStr) return nik ? extractBirthDateFromNik(nik) || undefined : undefined;
      return parseIndonesianDate(dStr) || dStr;
    };

    const normalizeGender = (g: string | undefined): 'IKHWAN' | 'AKHWAT' | undefined => {
      if (!g) return undefined;
      if (/LAKI|IKHWAN|PRIA/i.test(g)) return 'IKHWAN';
      if (/PEREMPUAN|AKHWAT|WANITA/i.test(g)) return 'AKHWAT';
      return undefined;
    };

    const kategori = parsed.kategori || 'KARTU_KELUARGA';

    const data: ExtractedDocumentData = {
      kategori,
      namaLengkap: parsed.namaLengkap,
      nik: parsed.nik,
      noKk: parsed.noKk,
      nisn: parsed.nisn,
      tempatLahir: parsed.tempatLahir,
      tanggalLahir: normalizeDate(parsed.tanggalLahir, parsed.nik),
      jenisKelamin: normalizeGender(parsed.jenisKelamin),
      namaAyah: parsed.namaAyah,
      namaIbu: parsed.namaIbu,
      pekerjaanOrtu: parsed.pekerjaanOrtu,
      alamat: parsed.alamat,
      asalSekolahSebelumnya: parsed.asalSekolahSebelumnya,
      jenjangTerdeteksi: parsed.jenjangTerdeteksi,
      tahunLulus: parsed.tahunLulus,
      nomorDokumen: parsed.nomorDokumen,
      statusSosial: parsed.statusSosial,
      anggotaKeluarga: parsed.anggotaKeluarga?.map((m: any) => ({
        nama: m.nama,
        nik: m.nik,
        tempatLahir: m.tempatLahir,
        tanggalLahir: normalizeDate(m.tanggalLahir, m.nik),
        gender: normalizeGender(m.gender),
        hubungan: m.hubungan,
      })),
      rawText: candidate,
    };

    return { kategori, rawText: candidate, data };
  } catch (err) {
    console.error('[batch] classifyAndExtractDocument error:', err);
    return null;
  }
}

/**
 * Process a multi-page PDF: asks Gemini to classify and extract each page as a separate document.
 * Returns array of results, one per detected document.
 */
export async function classifyMultiPagePdf(
  pdfBuffer: Buffer,
): Promise<Array<{ kategori: string; rawText: string; data: ExtractedDocumentData }>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  try {
    const base64Data = pdfBuffer.toString('base64');

    const prompt = `Anda adalah asisten OCR AI presisi tinggi untuk administrasi pendaftaran berkas santri di Pondok Pesantren Baitul Qowwam.

PDF ini mungkin mengandung BEBERAPA dokumen berbeda (misalnya halaman 1 = Kartu Keluarga, halaman 2 = Akta Kelahiran, dll).

TUGAS: Identifikasi SETIAP halaman sebagai dokumen terpisah, deteksi jenisnya, dan ekstrak data masing-masing.

Kembalikan HANYA JSON array valid (tanpa markdown):
[
  {
    "halaman": 1,
    "kategori": "KARTU_KELUARGA" | "KTP_ORTU" | "AKTA_KELAHIRAN" | "SKL_IJAZAH" | "KIP_PIP" | "KRM_PKH_KKS" | "SKTM",
    "confidence": 0.0-1.0,
    "noKk": "16 digit nomor KK",
    "nik": "16 digit NIK",
    "nisn": "10 digit NISN jika ada",
    "namaLengkap": "Nama lengkap calon santri",
    "tempatLahir": "Kota/Kabupaten",
    "tanggalLahir": "YYYY-MM-DD",
    "jenisKelamin": "IKHWAN" | "AKHWAT",
    "namaAyah": "Nama ayah kandung",
    "namaIbu": "Nama ibu kandung",
    "pekerjaanOrtu": "Pekerjaan orang tua",
    "alamat": "Alamat lengkap",
    "asalSekolahSebelumnya": "Nama sekolah asal",
    "jenjangTerdeteksi": "SMP" | "SMA" | "SMK" | "ALUMNI",
    "tahunLulus": "2024",
    "nomorDokumen": "Nomor surat/akta/KIP",
    "statusSosial": "REGULER" | "YATIM" | "PIATU" | "YATIM_PIATU" | "DHUAFA",
    "anggotaKeluarga": [...]
  }
]

Jika seluruh halaman adalah dokumen YANG SAMA (misal KK multi-halaman), kembalikan 1 elemen saja dengan data lengkap.

Catatan: SKL SMA/SMK → jenjangTerdeteksi "ALUMNI", SKL SMP → "SMA", SKL SD → "SMP".
Untuk KK: namaLengkap = anak usia sekolah (BUKAN kepala keluarga). tanggalLahir wajib YYYY-MM-DD.`;

    const candidateModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview', 'gemini-flash-latest'];
    let candidate: string | null = null;

    for (const modelName of candidateModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'application/pdf', data: base64Data } }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (res.ok) {
          const d = await res.json();
          const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            candidate = text;
            break;
          }
        }
      } catch (mErr) {
        console.warn(`[batch-pdf] Model ${modelName} error:`, mErr);
      }
    }

    if (!candidate) return [];

    const cleanJsonStr = candidate.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    let parsed = JSON.parse(cleanJsonStr);

    // Ensure it's an array
    if (!Array.isArray(parsed)) parsed = [parsed];

    const normalizeDate = (dStr: string | undefined, nik?: string) => {
      if (!dStr) return nik ? extractBirthDateFromNik(nik) || undefined : undefined;
      return parseIndonesianDate(dStr) || dStr;
    };

    const normalizeGender = (g: string | undefined): 'IKHWAN' | 'AKHWAT' | undefined => {
      if (!g) return undefined;
      if (/LAKI|IKHWAN|PRIA/i.test(g)) return 'IKHWAN';
      if (/PEREMPUAN|AKHWAT|WANITA/i.test(g)) return 'AKHWAT';
      return undefined;
    };

    return parsed.map((item: any) => {
      const kategori = item.kategori || 'KARTU_KELUARGA';
      const data: ExtractedDocumentData = {
        kategori,
        namaLengkap: item.namaLengkap,
        nik: item.nik,
        noKk: item.noKk,
        nisn: item.nisn,
        tempatLahir: item.tempatLahir,
        tanggalLahir: normalizeDate(item.tanggalLahir, item.nik),
        jenisKelamin: normalizeGender(item.jenisKelamin),
        namaAyah: item.namaAyah,
        namaIbu: item.namaIbu,
        pekerjaanOrtu: item.pekerjaanOrtu,
        alamat: item.alamat,
        asalSekolahSebelumnya: item.asalSekolahSebelumnya,
        jenjangTerdeteksi: item.jenjangTerdeteksi,
        tahunLulus: item.tahunLulus,
        nomorDokumen: item.nomorDokumen,
        statusSosial: item.statusSosial,
        anggotaKeluarga: item.anggotaKeluarga?.map((m: any) => ({
          nama: m.nama,
          nik: m.nik,
          tempatLahir: m.tempatLahir,
          tanggalLahir: normalizeDate(m.tanggalLahir, m.nik),
          gender: normalizeGender(m.gender),
          hubungan: m.hubungan,
        })),
        rawText: candidate!,
      };
      return { kategori, rawText: candidate!, data };
    });
  } catch (err) {
    console.error('[batch-pdf] classifyMultiPagePdf error:', err);
    return [];
  }
}
