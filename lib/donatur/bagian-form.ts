export type Bagian = 0 | 1 | 2;

const DONATUR = new Set(['nama', 'sapaan', 'noWa', 'donaturId']);
const DONASI = new Set(['jenis', 'bentuk', 'tanggal', 'nominal', 'deskripsiBarang', 'keterangan']);
const SURAT = new Set(['nomorSurat', 'tanggalSurat', 'gayaTulisan']);

/** Bagian form Buat Surat (0 Donatur, 1 Donasi, 2 Surat) yang pertama kali bermasalah. */
export function bagianUntukGalat(fieldSurat: Record<string, string>, fieldDonatur: Record<string, string>, nomorBentrok = false): Bagian | null {
  const kunci = Object.keys(fieldSurat);
  if (Object.keys(fieldDonatur).length > 0 || kunci.some(k => DONATUR.has(k))) return 0;
  if (kunci.some(k => DONASI.has(k))) return 1;
  if (nomorBentrok || kunci.some(k => SURAT.has(k))) return 2;
  return null;
}
