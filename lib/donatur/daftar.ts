import type { DonaturWithDonasi } from '@/lib/db/donatur-repo';
import { formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import { normalizeWa } from '@/lib/validation/santri';

export type StatistikDonatur = { total: number; aktifBulanIni: number; punyaWa: number };

/** `bulanIni` berformat 'YYYY-MM'. */
export function statistikDonatur(list: DonaturWithDonasi[], bulanIni: string): StatistikDonatur {
  return {
    total: list.length,
    aktifBulanIni: list.filter(d => (d.donasi ?? []).some(x => x.tanggal.startsWith(bulanIni))).length,
    punyaWa: list.filter(d => Boolean(d.noWa)).length,
  };
}

/** Satu baris ringkas untuk kartu donatur, mis. "Rp 750.000 · 2 donasi · 20 September 2026". */
export function ringkasDonatur(d: DonaturWithDonasi): string {
  const donasi = d.donasi ?? [];
  if (donasi.length === 0) return 'Belum ada donasi';
  const uang = donasi.reduce((a, x) => (x.bentuk === 'UANG' ? a + (x.nominal ?? 0) : a), 0);
  const nilai = uang > 0 ? `Rp ${formatRupiah(uang)}` : 'Donasi barang';
  const terakhir = donasi.reduce((m, x) => (x.tanggal > m ? x.tanggal : m), donasi[0].tanggal);
  return `${nilai} · ${donasi.length} donasi · ${formatDateIndonesian(terakhir)}`;
}

/** Nama untuk dibandingkan: huruf kecil, tanpa gelar/sapaan umum & tanda baca, spasi dirapikan. */
export function kunciNama(nama: string): string {
  return nama.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(k => k && !['bapak', 'bpk', 'pak', 'ibu', 'bu', 'sdr', 'sdri', 'h', 'hj', 'hajah', 'haji'].includes(k))
    .join(' ');
}

/**
 * Donatur tersimpan yang kemungkinan orang yang sama dengan isian form: nama sama (setelah
 * dirapikan) atau nomor WA sama. `kecualiId` untuk form ubah (dirinya sendiri tidak dihitung).
 */
export function cariDonaturMirip<T extends { id: string; nama: string; noWa: string | null }>(
  list: T[], isian: { nama: string; noWa: string }, kecualiId?: string,
): T[] {
  const nama = kunciNama(isian.nama);
  const wa = normalizeWa(isian.noWa);
  return list.filter(d => d.id !== kecualiId && (
    (nama.length >= 3 && kunciNama(d.nama) === nama) || (wa.length >= 10 && d.noWa === wa)
  ));
}
