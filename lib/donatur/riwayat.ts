import { formatRupiah } from '@/lib/utils/terbilang';
import type { Donasi, JenisDonasi } from '@/lib/db/donatur-repo';

const LABEL_JENIS: Record<JenisDonasi, string> = {
  ZAKAT: 'Zakat',
  INFAQ: 'Infaq',
  SHADAQAH: 'Shadaqah',
  LAINNYA: 'Lainnya',
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
