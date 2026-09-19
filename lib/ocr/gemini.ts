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
Catatan Khusus Kartu Keluarga (KK):
- "noKk" adalah 16 digit nomor KK di bagian atas dokumen.
- "namaAyah" adalah Kepala Keluarga pada dokumen KK tersebut.
- "namaIbu" adalah Istri / Ibu Kandung pada dokumen KK tersebut (wajib terisi).
- Daftarkan SELURUH anggota keluarga pada tabel KK ke dalam array "anggotaKeluarga" secara lengkap dengan NIK, TTL, gender, dan status hubungan.
- "tanggalLahir" SEMUA anggota keluarga wajib berformat YYYY-MM-DD agar dapat dibaca oleh input date browser.
- "namaLengkap" dan "nik" di root default-kan ke salah satu anak usia sekolah.`;

    const candidateModels = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3-flash-preview'];
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

    const data: ExtractedDocumentData = {
      kategori: parsed.kategori || kategoriHint,
      noKk: parsed.noKk || undefined,
      nik: parsed.nik || undefined,
      nisn: parsed.nisn || undefined,
      namaLengkap: parsed.namaLengkap || undefined,
      tempatLahir: parsed.tempatLahir || undefined,
      tanggalLahir: finalTanggalLahir,
      jenisKelamin: finalGender,
      namaAyah: kepala?.nama || parsed.namaAyah || undefined,
      namaIbu: istri?.nama || parsed.namaIbu || undefined,
      pekerjaanOrtu: parsed.pekerjaanOrtu || undefined,
      alamat: parsed.alamat || undefined,
      asalSekolahSebelumnya: parsed.asalSekolahSebelumnya || undefined,
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
