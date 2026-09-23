import { parseNomorSurat } from '@/lib/utils/nomor-surat';

/**
 * Naikkan bila tampilan SuratTemplate berubah: PNG yang tersimpan dengan versi
 * lama tidak lagi cocok dengan path yang diharapkan sehingga dirender ulang.
 */
export const VERSI_TEMPLATE = 'v4';

/** Path PNG surat di bucket privat (prefix `surat/` khusus ruang donatur). */
export function pathPngSurat(nomorSurat: string, tanggalSurat: string): string {
  const parsed = parseNomorSurat(nomorSurat);
  const tahun = parsed?.tahun ?? new Date(tanggalSurat).getFullYear();
  return `surat/${tahun}/${nomorSurat.replace(/\//g, '-')}-${VERSI_TEMPLATE}.png`;
}
