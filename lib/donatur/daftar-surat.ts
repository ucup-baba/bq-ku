import type { SuratWithRelasi } from '@/lib/db/donatur-repo';

export type StatusFilter = 'SEMUA' | 'BELUM' | 'SUDAH';

export function statusDariParam(v: string | null): StatusFilter {
  return v === 'BELUM' || v === 'SUDAH' ? v : 'SEMUA';
}

const dua = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM' dari waktu lokal (bukan UTC). */
export function bulanDari(d: Date): string {
  return `${d.getFullYear()}-${dua(d.getMonth() + 1)}`;
}

export function rentangBulan(bulan: string): { dari: string; sampai: string } {
  const [tahun, bln] = bulan.split('-').map(Number);
  const akhir = new Date(tahun, bln, 0).getDate();
  return { dari: `${bulan}-01`, sampai: `${bulan}-${dua(akhir)}` };
}

export function hitungStatus(list: SuratWithRelasi[]): { semua: number; belum: number; sudah: number } {
  const sudah = list.filter(s => s.terkirimWa).length;
  return { semua: list.length, belum: list.length - sudah, sudah };
}

export function saringSurat(list: SuratWithRelasi[], status: StatusFilter, cari: string): SuratWithRelasi[] {
  const q = cari.trim().toLowerCase();
  return list
    .filter(s => status === 'SEMUA' || (status === 'SUDAH' ? s.terkirimWa : !s.terkirimWa))
    .filter(s => !q
      || s.nomorSurat.toLowerCase().includes(q)
      || s.donasi.donatur.nama.toLowerCase().includes(q)
      || (s.donasi.donatur.noWa ?? '').includes(q));
}
