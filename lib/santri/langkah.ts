import { skemaLangkahSantri, zodFieldErrors } from '@/lib/validation/santri';

export const LANGKAH = [
  { id: 1, label: 'Berkas', judul: 'Nama & berkas', field: ['namaLengkap'] },
  { id: 2, label: 'Santri', judul: 'Data diri & foto', field: ['nik', 'noKk', 'nisn', 'tempatLahir', 'tanggalLahir', 'jenisKelamin'] },
  { id: 3, label: 'Keluarga', judul: 'Orang tua & domisili', field: ['kontakWali'] },
  { id: 4, label: 'Sekolah', judul: 'Sekolah & profil CV', field: ['jenjang', 'kelas', 'sekolahSekarang'] },
] as const;

export type IdLangkah = 1 | 2 | 3 | 4;

/** Galat isian untuk satu langkah saja (skema zod yang sama dengan server). */
export function validasiLangkah(id: IdLangkah, form: Record<string, unknown>): Record<string, string> {
  const hasil = skemaLangkahSantri[id].safeParse(form);
  return hasil.success ? {} : zodFieldErrors(hasil.error);
}

/** Langkah paling awal yang memuat salah satu field bergalat (mis. dari respons 400 server). */
export function langkahUntukGalat(fields: Record<string, string>): IdLangkah | null {
  const kunci = Object.keys(fields);
  const l = LANGKAH.find(x => x.field.some(f => kunci.includes(f)));
  return l ? (l.id as IdLangkah) : null;
}

/** Wizard harus urut: langkah di depan hanya terbuka setelah langkah sebelumnya valid (kecuali mode edit). */
export function bolehBuka(target: IdLangkah, tertinggi: IdLangkah, modeEdit: boolean): boolean {
  return modeEdit || target <= tertinggi;
}
