import { formatRupiah } from '@/lib/utils/terbilang';

export function formatAngka(n: number, format: 'angka' | 'rupiah'): string {
  return format === 'rupiah' ? `Rp ${formatRupiah(n)}` : formatRupiah(n);
}
