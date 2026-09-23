import { labelBulan, type PerBulan, type PilihanPeriode } from '@/lib/utils/rekap';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import type { JenisDonasi } from '@/lib/db/donatur-repo';

const dua = (n: number) => String(n).padStart(2, '0');
const bulat1 = (n: number) => Math.round(n * 10) / 10;

/** Rentang 6 bulan terakhir (termasuk bulan berjalan) untuk sparkline & grafik tren, dihitung lokal. */
export function rentangTren(hariIni: Date): { dari: string; sampai: string } {
  const awal = new Date(hariIni.getFullYear(), hariIni.getMonth() - 5, 1);
  const akhir = new Date(hariIni.getFullYear(), hariIni.getMonth() + 1, 0);
  return {
    dari: `${awal.getFullYear()}-${dua(awal.getMonth() + 1)}-01`,
    sampai: `${akhir.getFullYear()}-${dua(akhir.getMonth() + 1)}-${dua(akhir.getDate())}`,
  };
}

/** Atribut `points` polyline: nilai terendah di bawah, tertinggi di atas. */
export function titikSparkline(nilai: number[], lebar = 200, tinggi = 28, pad = 3): string {
  if (nilai.length === 0) return '';
  if (nilai.length === 1) return `0,${tinggi / 2} ${lebar},${tinggi / 2}`;
  const max = Math.max(...nilai);
  const min = Math.min(...nilai);
  const rentang = max - min || 1;
  const langkah = lebar / (nilai.length - 1);
  return nilai
    .map((v, i) => `${bulat1(i * langkah)},${bulat1(tinggi - pad - ((v - min) / rentang) * (tinggi - 2 * pad))}`)
    .join(' ');
}

export type Perbandingan = { arah: 'naik' | 'turun' | 'sama'; bulanLalu: string };

/** Membandingkan dua bulan terakhir pada deret tren yang sudah dilengkapi (isiBulanKosong). */
export function bandingkanBulan(tren: PerBulan[]): Perbandingan | null {
  if (tren.length < 2) return null;
  const kini = tren[tren.length - 1];
  const lalu = tren[tren.length - 2];
  const arah = kini.total > lalu.total ? 'naik' : kini.total < lalu.total ? 'turun' : 'sama';
  return { arah, bulanLalu: labelBulan(lalu.bulan).split(' ')[0] };
}

export type PilihanBeranda = PilihanPeriode | 'manual';

export function keteranganPeriode(pilihan: PilihanBeranda, dari: string, sampai: string, perbandingan: Perbandingan | null): string {
  if (pilihan === 'bulan-ini') {
    const bulan = labelBulan(dari.slice(0, 7));
    if (!perbandingan) return bulan;
    const kata = perbandingan.arah === 'naik' ? 'naik dari' : perbandingan.arah === 'turun' ? 'turun dari' : 'sama seperti';
    return `${bulan} · ${kata} ${perbandingan.bulanLalu}`;
  }
  if (pilihan === '3-bulan') return '3 bulan terakhir';
  if (pilihan === 'tahun-ini') return `Tahun ${dari.slice(0, 4)}`;
  return `${formatDateIndonesian(dari)} – ${formatDateIndonesian(sampai)}`;
}

export type PorsiAkad = { jenis: JenisDonasi; total: number; jumlah: number; persen: number };

export function porsiAkad(perJenis: Array<{ jenis: JenisDonasi; total: number; jumlah: number }> | undefined): PorsiAkad[] {
  const data = perJenis ?? [];
  const total = data.reduce((a, p) => a + p.total, 0);
  return [...data]
    .sort((a, b) => b.total - a.total)
    .map(p => ({ ...p, persen: total > 0 ? Math.round((p.total / total) * 100) : 0 }));
}

export const OPSI_PERIODE: Array<{ value: PilihanPeriode; label: string; labelPendek: string }> = [
  { value: 'bulan-ini', label: 'Bulan ini', labelPendek: 'Bulan' },
  { value: '3-bulan', label: '3 bulan', labelPendek: '3 bln' },
  { value: 'tahun-ini', label: 'Tahun ini', labelPendek: 'Tahun' },
];
