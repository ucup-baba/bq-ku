import fs from 'fs';
import path from 'path';
import { ExtractedDocumentData, parseIndonesianDate, extractBirthDateFromNik } from './parser';

export async function processGeminiVisionOcr(
  imagePath: string,
  kategoriHint: string
): Promise<{ rawText: string; data: ExtractedDocumentData } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.pdf') mimeType = 'application/pdf';

    const base64Data = fs.readFileSync(imagePath).toString('base64');

    const prompt = `Anda adalah asisten OCR AI presisi tinggi untuk administrasi pendaftaran berkas santri di Pondok Pesantren Baitul Qowwam (Yogyakarta).
Tugas Anda:
1. Bacalah gambar dokumen Indonesia ini dengan sangat teliti (dokumen bisa berupa Kartu Keluarga, KTP Orang Tua, Akta Kelahiran, SKL/Ijazah, KIP/PIP, KRM/PKH/KKS, atau SKTM).
2. Ekstrak seluruh data identitas secara lengkap dan kembalikan HANYA format JSON valid tanpa tanda markdown (raw json):
{
  "kategori": "KARTU_KELUARGA" | "KTP_ORTU" | "AKTA_KELAHIRAN" | "SKL_IJAZAH" | "KIP_PIP" | "KRM_PKH_KKS" | "SKTM",
  "noKk": "16 digit nomor KK",
  "nik": "16 digit NIK calon santri atau pemilik berkas",
  "nisn": "10 digit NISN jika ada pada SKL/Ijazah/KIP",
  "namaLengkap": "Nama lengkap calon santri (jika KK, pilih anak usia sekolah/calon santri, BUKAN nama kepala keluarga/ayah)",
  "tempatLahir": "Kota/Kabupaten kelahiran",
  "tanggalLahir": "YYYY-MM-DD (Wajib format standar ISO YYYY-MM-DD, contoh: 2007-01-23)",
  "jenisKelamin": "IKHWAN" (Laki-laki) atau "AKHWAT" (Perempuan),
  "namaAyah": "Nama lengkap ayah / kepala keluarga",
  "namaIbu": "Nama lengkap ibu kandung / istri",
  "pekerjaanOrtu": "Pekerjaan orang tua",
  "alamat": "Alamat lengkap termasuk Dusun/Jalan, RT/RW, Desa/Kelurahan, Kecamatan, Kab/Kota, Provinsi, dan Kode Pos",
  "asalSekolahSebelumnya": "Nama sekolah asal jika tercantum di SKL/ijazah/KIP",
  "jenjangTerdeteksi": "SMP" | "SMA" | "SMK" | "ALUMNI",
  "tahunLulus": "Tahun kelulusan 4 digit (contoh: 2024)",
  "nomorDokumen": "Nomor surat/nomor akta/nomor KIP jika ada",
  "anggotaKeluarga": [
    {
      "nama": "Nama anggota keluarga",
      "nik": "16 digit NIK",
      "tempatLahir": "Kota/Kabupaten lahir",
      "tanggalLahir": "YYYY-MM-DD (Wajib format YYYY-MM-DD, contoh: 2007-01-23)",
      "gender": "IKHWAN" | "AKHWAT",
      "hubungan": "KEPALA KELUARGA" | "ISTRI" | "ANAK"
    }
  ]
}
Catatan Khusus SKL / Ijazah:
- Jika berkas adalah SKL / Ijazah tingkat SMA / SMK / MA:
  - Wajib set "jenjangTerdeteksi": "ALUMNI" (di Baitul Qowwam, lulusan SMA/SMK adalah santri purna / alumni BQ).
  - Tulis nama SMA/SMK tersebut di "asalSekolahSebelumnya".
  - Ambil tahun kelulusan ke "tahunLulus" (misal: "2024").
- Jika berkas adalah SKL / Ijazah tingkat SMP / MTs:
  - Set "jenjangTerdeteksi": "SMA" (santri baru masuk jenjang SMA).
  - Tulis nama SMP/MTs tersebut di "asalSekolahSebelumnya".
- Jika berkas adalah SKL / Ijazah tingkat SD / MI:
  - Set "jenjangTerdeteksi": "SMP" (santri baru masuk jenjang SMP).
  - Tulis nama SD/MI tersebut di "asalSekolahSebelumnya".
Catatan Khusus Kartu Keluarga (KK):
- "noKk" adalah 16 digit nomor KK di bagian atas dokumen.
- "namaAyah": Perhatikan kolom 'Nama Orang Tua (Ayah / Ibu)' di tabel bawah untuk calon santri. Tulis nama AYAH KANDUNG calon santri (BUKAN otomatis nama Kepala Keluarga jika kepala keluarganya wanita/Ibu). Jika ayah sudah meninggal (misal status perkawinan ibu CERAI MATI atau ada keterangan almarhum), tulis namanya (contoh: 'Dwi Sriyana (Alm.)') dan set "statusSosial": "YATIM".
- "namaIbu": Tulis nama IBU KANDUNG calon santri (lihat kolom 'Nama Ibu', contoh: 'Siti Komariyah'). JANGAN PERNAH mengisi namaAyah sama dengan namaIbu jika kepala keluarganya adalah seorang Ibu.
- "statusSosial": "REGULER" | "YATIM" | "PIATU" | "YATIM_PIATU" | "DHUAFA".
- Daftarkan SELURUH anggota keluarga pada tabel KK ke dalam array "anggotaKeluarga" secara lengkap dengan NIK, TTL, gender, dan status hubungan.
- "tanggalLahir" SEMUA anggota keluarga wajib berformat YYYY-MM-DD agar dapat dibaca oleh input date browser.
- "namaLengkap" dan "nik" di root default-kan ke calon santri (anak usia sekolah, contoh: Rahmat Kurniawan).`;

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
          console.warn(`Model ${modelName} returned status ${res.status}: ${errText.slice(0, 80)}, mencoba model berikutnya...`);
        }
      } catch (mErr) {
        console.warn(`Model ${modelName} fetch error:`, mErr);
      }
    }

    if (!candidate) return null;

    const cleanJsonStr = candidate.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJsonStr);

    const kepala = parsed.anggotaKeluarga?.find((m: any) => m.hubungan === 'KEPALA KELUARGA');
    const istri = parsed.anggotaKeluarga?.find((m: any) => m.hubungan === 'ISTRI');

    // Normalize dates to ISO YYYY-MM-DD
    const normalizeDate = (dStr: string | undefined, nik?: string) => {
      if (!dStr) return nik ? extractBirthDateFromNik(nik) || undefined : undefined;
      return parseIndonesianDate(dStr) || dStr;
    };

    const normalizeGender = (g: string | undefined) => {
      if (!g) return undefined;
      if (/LAKI|IKHWAN|PRIA/i.test(g)) return 'IKHWAN';
      if (/PEREMPUAN|AKHWAT|WANITA/i.test(g)) return 'AKHWAT';
      return g as 'IKHWAN' | 'AKHWAT';
    };

    const normalizedMembers = parsed.anggotaKeluarga?.map((m: any) => ({
      ...m,
      tempatLahir: m.tempatLahir || parsed.tempatLahir,
      tanggalLahir: normalizeDate(m.tanggalLahir, m.nik),
      gender: normalizeGender(m.gender) || 'IKHWAN',
    }));

    const finalTanggalLahir = normalizeDate(parsed.tanggalLahir, parsed.nik);
    const finalGender = normalizeGender(parsed.jenisKelamin);

    let finalNamaAyah = parsed.namaAyah;
    let finalNamaIbu = parsed.namaIbu;

    if (!finalNamaAyah && kepala && kepala.gender === 'IKHWAN') {
      finalNamaAyah = kepala.nama;
    }

    if (!finalNamaIbu) {
      if (istri) {
        finalNamaIbu = istri.nama;
      } else if (kepala && kepala.gender === 'AKHWAT') {
        finalNamaIbu = kepala.nama;
      }
    }

    // Hindari namaAyah sama dengan namaIbu
    if (finalNamaAyah && finalNamaIbu && finalNamaAyah.trim().toLowerCase() === finalNamaIbu.trim().toLowerCase()) {
      if (kepala && kepala.gender === 'AKHWAT') {
        finalNamaAyah = undefined;
      }
    }

    // Deteksi status yatim jika ayah almarhum atau cerai mati
    let finalStatusSosial = parsed.statusSosial;
    if (finalNamaAyah && (finalNamaAyah.includes('(Alm') || candidate.includes('CERAI MATI'))) {
      finalStatusSosial = 'YATIM';
      if (!finalNamaAyah.includes('(Alm.)') && !finalNamaAyah.includes('(Alm)')) {
        finalNamaAyah = `${finalNamaAyah} (Alm.)`;
      }
    } else if (!finalNamaAyah && candidate.includes('CERAI MATI')) {
      finalStatusSosial = 'YATIM';
    }

    const data: ExtractedDocumentData = {
      kategori: parsed.kategori || kategoriHint,
      noKk: parsed.noKk || undefined,
      nik: parsed.nik || undefined,
      nisn: parsed.nisn || undefined,
      namaLengkap: parsed.namaLengkap || undefined,
      tempatLahir: parsed.tempatLahir || undefined,
      tanggalLahir: finalTanggalLahir,
      jenisKelamin: finalGender,
      namaAyah: finalNamaAyah || undefined,
      namaIbu: finalNamaIbu || undefined,
      statusSosial: finalStatusSosial || undefined,
      pekerjaanOrtu: parsed.pekerjaanOrtu || undefined,
      alamat: parsed.alamat || undefined,
      asalSekolahSebelumnya: parsed.asalSekolahSebelumnya || undefined,
      jenjangTerdeteksi: parsed.jenjangTerdeteksi || undefined,
      tahunLulus: parsed.tahunLulus || undefined,
      nomorDokumen: parsed.nomorDokumen || undefined,
      anggotaKeluarga: normalizedMembers || undefined,
      rawText: candidate,
    };

    return {
      rawText: candidate,
      data,
    };
  } catch (error) {
    console.error('Gemini Vision OCR error:', error);
    return null;
  }
}
