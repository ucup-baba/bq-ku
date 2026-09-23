import type { DonaturWithDonasi } from '@/lib/db/donatur-repo';
import { formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian } from '@/lib/utils/formatters';

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
