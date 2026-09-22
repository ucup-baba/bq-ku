import { z } from 'zod';
export { zodFieldErrors } from './errors';

export function normalizeWa(s: string): string {
  const digits = s.replace(/[^\d+]/g, '');
  if (digits.startsWith('+62')) return '62' + digits.slice(3);
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  return digits.replace(/^\+/, '');
}

const optionalText = z.string().trim().transform(v => (v === '' ? null : v)).nullable().optional();
const digits = (n: number, label: string) =>
  z.string().trim().regex(new RegExp(`^\\d{${n}}$`), `${label} harus ${n} digit angka`);
const optionalDigits = (n: number, label: string) =>
  z.string().trim().transform(v => (v === '' ? null : v)).nullable().optional()
    .refine(v => v == null || new RegExp(`^\\d{${n}}$`).test(v), `${label} harus ${n} digit angka`);

const isoDateNotFuture = z.string().trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine(v => !Number.isNaN(Date.parse(v)), 'Tanggal tidak valid')
  .refine(v => Date.parse(v) <= Date.now(), 'Tanggal lahir tidak boleh di masa depan');

const kelasCocokJenjang = (d: { jenjang: string; kelas: string }) => {
  const n = parseInt(d.kelas, 10);
  if (d.jenjang === 'SMP') return n >= 7 && n <= 9;
  if (d.jenjang === 'SMA' || d.jenjang === 'SMK') return n >= 10 && n <= 12;
  return true; // ALUMNI bebas
};

const santriBase = z.object({
  namaLengkap: z.string().trim().min(3, 'Nama lengkap minimal 3 huruf'),
  namaPanggilan: optionalText,
  nik: digits(16, 'NIK'),
  noKk: optionalDigits(16, 'No. KK'),
  nisn: optionalDigits(10, 'NISN'),
  tempatLahir: z.string().trim().min(2, 'Tempat lahir wajib diisi'),
  tanggalLahir: isoDateNotFuture,
  jenisKelamin: z.enum(['IKHWAN', 'AKHWAT'], { message: 'Jenis kelamin wajib dipilih' }),
  tahunMasuk: z.coerce.number().int().min(2000).max(2100).optional(),
  jenjang: z.enum(['SMP', 'SMA', 'SMK', 'ALUMNI'], { message: 'Jenjang wajib dipilih' }),
  kelas: z.string().trim().min(1, 'Kelas wajib diisi'),
  sekolahSekarang: z.string().trim().min(2, 'Sekolah saat ini wajib diisi'),
  asalSekolahSebelumnya: optionalText,
  namaAyah: optionalText,
  namaIbu: optionalText,
  statusSosial: z.enum(['REGULER', 'YATIM', 'PIATU', 'YATIM_PIATU', 'DHUAFA']).optional(),
  kontakWali: z.string().trim().transform(v => (v === '' ? null : normalizeWa(v))).nullable().optional()
    .refine(v => v == null || /^62\d{8,13}$/.test(v), 'Nomor WhatsApp tidak valid'),
  pekerjaanOrtu: optionalText,
  alamat: optionalText,
  ringkasanTentang: optionalText,
  riwayatTahfidz: optionalText,
  keahlian: z.union([z.array(z.string()), z.string()]).nullable().optional(),
  // Client lama mengirim *Url (signed URL); server menyimpannya sebagai *Path (repo menormalisasi).
  fotoFormalUrl: optionalText,
  fotoProfilUrl: optionalText,
  fotoFormalPath: optionalText,
  fotoProfilPath: optionalText,
});

const mapFoto = <T extends { fotoFormalUrl?: string | null; fotoProfilUrl?: string | null; fotoFormalPath?: string | null; fotoProfilPath?: string | null }>(d: T) => {
  const { fotoFormalUrl, fotoProfilUrl, ...rest } = d;
  return {
    ...rest,
    fotoFormalPath: d.fotoFormalPath ?? fotoFormalUrl ?? undefined,
    fotoProfilPath: d.fotoProfilPath ?? fotoProfilUrl ?? undefined,
  };
};

export const santriInputSchema = santriBase
  .refine(kelasCocokJenjang, { path: ['kelas'], message: 'Kelas tidak sesuai jenjang (SMP 7–9, SMA/SMK 10–12)' })
  .transform(mapFoto);

export const santriUpdateSchema = santriBase.partial()
  .refine(d => (d.jenjang && d.kelas ? kelasCocokJenjang({ jenjang: d.jenjang, kelas: d.kelas }) : true),
    { path: ['kelas'], message: 'Kelas tidak sesuai jenjang (SMP 7–9, SMA/SMK 10–12)' })
  .transform(mapFoto);

export const documentInputSchema = z.object({
  kategori: z.enum(['KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH', 'KIP_PIP', 'KRM_PKH_KKS', 'SKTM', 'SERTIFIKAT_PRESTASI', 'LAINNYA']),
  nomorDokumen: optionalText,
  storagePath: z.string().trim().min(1).optional(),
  fileUrl: z.string().trim().min(1).optional(),
  rawOcrText: optionalText,
  extractedFields: z.unknown().optional(),
  statusVerifikasi: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'NEED_FIX']).optional(),
  catatanVerifikasi: optionalText,
}).refine(d => d.storagePath || d.fileUrl, { path: ['storagePath'], message: 'Berkas wajib ada' })
  .transform(d => ({ ...d, storagePath: (d.storagePath || d.fileUrl)! }));

export type SantriInputParsed = z.infer<typeof santriInputSchema>;

/** Dipakai SantriForm sebelum kirim: hanya field inti agar pesan muncul dini. */
export const santriClientSchema = santriBase
  .pick({ namaLengkap: true, nik: true, noKk: true, nisn: true, tempatLahir: true, tanggalLahir: true, jenisKelamin: true, jenjang: true, kelas: true, sekolahSekarang: true, kontakWali: true })
  .refine(kelasCocokJenjang, { path: ['kelas'], message: 'Kelas tidak sesuai jenjang (SMP 7–9, SMA/SMK 10–12)' });
