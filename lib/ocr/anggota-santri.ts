import { matchBestFamilyMember } from '@/lib/utils/formatters';
import { parseIndonesianDate, extractBirthDateFromNik, type FamilyMemberCandidate } from '@/lib/ocr/parser';

type DataKk = {
  anggotaKeluarga?: FamilyMemberCandidate[];
  namaLengkap?: string; nik?: string; tempatLahir?: string; tanggalLahir?: string; jenisKelamin?: string;
};

/**
 * Data pribadi hasil OCR KK disesuaikan ke santri yang namanya diketik: diambil dari anggota
 * keluarga yang cocok. Bila tidak ada yang cocok, data pribadi pilihan OCR (biasanya anak lain)
 * dikosongkan agar tidak menimpa nama yang diketik; data keluarga (No. KK, ayah/ibu, alamat) tetap.
 */
export function sesuaikanDenganSantri<T extends DataKk>(namaSantri: string | null | undefined, data: T): T {
  if (!namaSantri?.trim() || !data?.anggotaKeluarga?.length) return data;
  const cocok = matchBestFamilyMember(namaSantri, data.anggotaKeluarga);
  if (!cocok) {
    return { ...data, namaLengkap: undefined, nik: undefined, tempatLahir: undefined, tanggalLahir: undefined, jenisKelamin: undefined } as T;
  }

  let tanggalLahir = cocok.tanggalLahir || data.tanggalLahir;
  if (tanggalLahir) tanggalLahir = parseIndonesianDate(tanggalLahir) || tanggalLahir;
  else if (cocok.nik) tanggalLahir = extractBirthDateFromNik(cocok.nik) || undefined;

  let jenisKelamin = cocok.gender || data.jenisKelamin;
  if (/LAKI|IKHWAN|PRIA/i.test(jenisKelamin || '')) jenisKelamin = 'IKHWAN';
  else if (/PEREMPUAN|AKHWAT|WANITA/i.test(jenisKelamin || '')) jenisKelamin = 'AKHWAT';

  return {
    ...data,
    namaLengkap: cocok.nama,
    nik: cocok.nik || data.nik,
    tempatLahir: cocok.tempatLahir || data.tempatLahir,
    tanggalLahir,
    jenisKelamin,
  } as T;
}
