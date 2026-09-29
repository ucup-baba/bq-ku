import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { petakanTerbatas } from './konkurensi';
import { ExtractedDocumentData, parseIndonesianDate, extractBirthDateFromNik, extractGenderFromNik } from './parser';
import { bacaDokumenAi, type KonteksAi } from '@/lib/ai/baca';
import { AiBatasError } from '@/lib/ai/batas';

/**
 * Split a multi-page PDF into individual 1-page PDF buffers.
 */
export async function splitPdfPages(pdfBuffer: Buffer): Promise<Buffer[]> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    const pages: Buffer[] = [];

    for (let i = 0; i < pageCount; i++) {
      const subDoc = await PDFDocument.create();
      const [copiedPage] = await subDoc.copyPages(pdfDoc, [i]);
      subDoc.addPage(copiedPage);
      const pdfBytes = await subDoc.save();
      pages.push(Buffer.from(pdfBytes));
    }
    return pages;
  } catch (err) {
    console.error('Error splitting PDF pages:', err);
    return [pdfBuffer];
  }
}

/** Total waktu per dokumen, termasuk penyedia cadangan. */
export const BATAS_PER_DOKUMEN_MS = 50_000;

/**
 * Auto-classify a document image/PDF and extract structured data in one AI vision call
 * (penyedia utama/cadangan diatur di halaman AI & OCR).
 */

export async function classifyAndExtractDocument(
  imageBuffer: Buffer,
  mimeType: string,
  konteks: KonteksAi,
  batasTotalMs = BATAS_PER_DOKUMEN_MS,
): Promise<{ kategori: string; rawText: string; data: ExtractedDocumentData } | null> {

  try {
    const base64Data = imageBuffer.toString('base64');

    const prompt = `Anda adalah asisten OCR AI presisi tinggi untuk administrasi pendaftaran berkas santri di Pondok Pesantren Baitul Qowwam (Yogyakarta).

TUGAS UTAMA: Identifikasi OTOMATIS jenis dokumen Indonesia pada gambar ini, lalu ekstrak seluruh data identitas santri dan keluarga secara akurat.

ATURAN KETAT IDENTIFIKASI KATEGORI ("kategori"):
1. "KARTU_KELUARGA": Dokumen berlabel "KARTU KELUARGA" dari Dukcapil yang memuat tabel susunan anggota keluarga, nomor KK, dan NIK.
2. "AKTA_KELAHIRAN": Dokumen berlabel "KUTIPAN AKTA KELAHIRAN" / "SURAT KENAL LAHIR" dari Dinas Kependudukan dan Catatan Sipil.
3. "KTP_ORTU": Kartu Tanda Penduduk milik Ayah atau Ibu.
4. "SKL_IJAZAH": HANYA untuk dokumen resmi "SURAT KETERANGAN LULUS" atau "IJAZAH" yang diterbitkan oleh pihak sekolah dengan tanda tangan kepala sekolah, nilai kelulusan, atau cap/stempel resmi sekolah.
5. "LAINNYA": Untuk "Formulir Pendaftaran", "Angket Calon Santri", lembar biodata santri Yayasan Baitul Qowwam, surat pernyataan, dll.
   PERINGATAN PENTING: JANGAN sekali-kali menandai Formulir Pendaftaran / Angket sebagai "SKL_IJAZAH" meskipun di dalamnya tertulis nama sekolah asal (misal SMPN 1 Tempel) atau tahun lulus! Itu adalah Formulir Pendaftaran ("LAINNYA"), BUKAN Ijazah/SKL!
6. "KIP_PIP" / "KRM_PKH_KKS" / "SKTM" / "SERTIFIKAT_PRESTASI": Sesuai dokumen bansos/prestasi.

ATURAN KETAT JENIS KELAMIN ("jenisKelamin"):
- "AKHWAT": Untuk calon santri Perempuan / Wanita / Siswi.
  * PETUNJUK NIK: Di Indonesia, NIK perempuan memiliki 2 digit tanggal lahir bernilai LEBIH DARI 40 (misal NIK 34041455... angka 55 = 15 + 40, ini PASTI PEREMPUAN/AKHWAT).
  * Pada formulir atau KK jika tertulis "PEREMPUAN" atau pada Akta tertulis "ANAK PEREMPUAN", wajib isi "AKHWAT"!
- "IKHWAN": Untuk calon santri Laki-laki / Pria / Siswa (2 digit tanggal pada NIK bernilai 01-31).

Kembalikan HANYA JSON valid (tanpa markdown) dengan format:
{
  "kategori": "KARTU_KELUARGA" | "KTP_ORTU" | "AKTA_KELAHIRAN" | "SKL_IJAZAH" | "KIP_PIP" | "KRM_PKH_KKS" | "SKTM" | "LAINNYA",
  "confidence": 0.0-1.0,
  "noKk": "16 digit nomor KK (jika KK)",
  "nik": "16 digit NIK calon santri",
  "nisn": "10 digit NISN santri jika ada",
  "namaLengkap": "Nama lengkap calon santri (jika KK, pilih anak usia sekolah, BUKAN kepala keluarga)",
  "tempatLahir": "Kota/Kabupaten kelahiran",
  "tanggalLahir": "YYYY-MM-DD",
  "jenisKelamin": "IKHWAN" (Laki-laki) atau "AKHWAT" (Perempuan),
  "namaAyah": "Nama lengkap ayah kandung",
  "namaIbu": "Nama lengkap ibu kandung",
  "kontakWali": "Nomor WhatsApp/telepon orang tua atau santri jika tercantum",
  "pekerjaanOrtu": "Pekerjaan orang tua",
  "alamat": "Alamat lengkap termasuk Dusun/Jalan, RT/RW, Desa/Kelurahan, Kecamatan, Kab/Kota, Provinsi",
  "asalSekolahSebelumnya": "Nama sekolah asal santri",
  "jenjangTerdeteksi": "SMP" | "SMA" | "SMK" | "ALUMNI",
  "tahunLulus": "Tahun kelulusan 4 digit jika ada",
  "nomorDokumen": "Nomor surat/nomor akta jika ada",
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
}`;

    let candidate: string;
    try {
      candidate = (await bacaDokumenAi({ prompt, berkas: { base64: base64Data, mimeType }, konteks, batasTotalMs })).teks;
    } catch (e) {
      if (e instanceof AiBatasError) throw e;
      console.warn('[batch] AI gagal:', e instanceof Error ? e.message : e);
      return null;
    }

    const cleanJsonStr = candidate.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJsonStr);

    // Normalize dates
    const normalizeDate = (dStr: string | undefined, nik?: string) => {
      if (!dStr) return nik ? extractBirthDateFromNik(nik) || undefined : undefined;
      return parseIndonesianDate(dStr) || dStr;
    };

    // Smart Gender Normalization (checks parsed text + NIK mathematical formula)
    const normalizeGender = (g: string | undefined, nik?: string): 'IKHWAN' | 'AKHWAT' | undefined => {
      // 1. Check NIK first (most mathematically certain: day > 40 means female)
      if (nik) {
        const nikGender = extractGenderFromNik(nik);
        if (nikGender) return nikGender;
      }
      if (!g) return undefined;
      if (/PEREMPUAN|AKHWAT|WANITA|GIRL|FEMALE/i.test(g)) return 'AKHWAT';
      if (/LAKI|IKHWAN|PRIA|BOY|MALE/i.test(g)) return 'IKHWAN';
      return undefined;
    };

    const kategori = parsed.kategori || 'LAINNYA';

    const data: ExtractedDocumentData = {
      kategori,
      namaLengkap: parsed.namaLengkap,
      nik: parsed.nik,
      noKk: parsed.noKk,
      nisn: parsed.nisn,
      tempatLahir: parsed.tempatLahir,
      tanggalLahir: normalizeDate(parsed.tanggalLahir, parsed.nik),
      jenisKelamin: normalizeGender(parsed.jenisKelamin, parsed.nik),
      namaAyah: parsed.namaAyah,
      namaIbu: parsed.namaIbu,
      kontakWali: parsed.kontakWali,
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
        gender: normalizeGender(m.gender, m.nik),
        hubungan: m.hubungan,
      })),
      rawText: candidate,
    };

    return { kategori, rawText: candidate, data };
  } catch (err) {
    if (err instanceof AiBatasError) throw err;
    console.error('[batch] classifyAndExtractDocument error:', err);
    return null;
  }
}

export interface MultiPagePdfResult {
  halaman: number;
  kategori: string;
  rawText: string;
  data: ExtractedDocumentData;
  pageBuffer: Buffer;
}

/**
 * Process a multi-page PDF: splits into 1-page buffers and classifies each page individually.
 * This guarantees each document has its OWN single-page file URL and distinct categorization!
 */
export async function classifyMultiPagePdf(
  pdfBuffer: Buffer,
  konteks: KonteksAi,
): Promise<MultiPagePdfResult[]> {
  try {
    const pageBuffers = await splitPdfPages(pdfBuffer);
    // Halaman diproses paralel (maks. 4 sekaligus): total waktu ≈ halaman terlama, bukan jumlahnya.
    const perHalaman = await petakanTerbatas(pageBuffers, 4, async (pageBuf, pageIdx) => {
      const pageResult = await classifyAndExtractDocument(pageBuf, 'application/pdf', konteks);
      return pageResult ? {
        halaman: pageIdx + 1,
        kategori: pageResult.kategori,
        rawText: pageResult.rawText,
        data: pageResult.data,
        pageBuffer: pageBuf,
      } : null;
    });
    return perHalaman.filter((r): r is MultiPagePdfResult => r !== null);
  } catch (err) {
    if (err instanceof AiBatasError) throw err;
    console.error('[batch] classifyMultiPagePdf error:', err);
    return [];
  }
}
