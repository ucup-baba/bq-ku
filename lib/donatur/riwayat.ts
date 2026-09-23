import { formatRupiah } from '@/lib/utils/terbilang';
import type { Donasi, JenisDonasi } from '@/lib/db/donatur-repo';

const LABEL_JENIS: Record<JenisDonasi, string> = {
  ZIS: 'ZIS',
  WAKAF: 'Wakaf',
  LAINNYA: 'Lainnya',
  ZAKAT: 'Zakat',
  INFAQ: 'Infaq',
  SHADAQAH: 'Shadaqah',
};

/** Label Indonesia untuk jenis donasi (Zakat/Infaq/Shadaqah/Lainnya). */
export function labelJenis(jenis: JenisDonasi): string {
  return LABEL_JENIS[jenis] ?? jenis;
}

/**
 * Format nilai satu donasi untuk ditampilkan di riwayat:
 * - UANG -> "Rp 2.500.000"
 * - BARANG -> deskripsi barang (atau "-" bila kosong)
 */
export function formatNilaiDonasi(donasi: Pick<Donasi, 'bentuk' | 'nominal' | 'deskripsiBarang'>): string {
  if (donasi.bentuk === 'UANG') {
    return `Rp ${formatRupiah(donasi.nominal ?? 0)}`;
  }
  return donasi.deskripsiBarang || '-';
}

/** Ringkasan riwayat untuk profil donatur: total uang, jumlah donasi, tanggal terakhir (YYYY-MM-DD). */
export function ringkasRiwayat(donasi: Array<Pick<Donasi, 'bentuk' | 'nominal' | 'tanggal'>>): { totalUang: number; jumlah: number; terakhir: string | null } {
  let totalUang = 0;
  let terakhir: string | null = null;
  for (const d of donasi) {
    if (d.bentuk === 'UANG') totalUang += d.nominal ?? 0;
    if (terakhir === null || d.tanggal > terakhir) terakhir = d.tanggal;
  }
  return { totalUang, jumlah: donasi.length, terakhir };
}
