import { genreDari } from '@/lib/perpus/ddc';
import { hariIniWib } from '@/lib/perpus/pinjaman';
import type { Pinjamanku } from '@/lib/perpus/tipe';
import { PALET, type Warna } from '@/lib/perpus/warna';

export type KunciBadge = 'pertama' | 'kutu_buku' | 'pelahap' | 'tepat_waktu' | 'penjelajah' | 'penulis_catatan';
export type Badge = { kunci: KunciBadge; didapat: boolean; kemajuan: number; target: number; warna: Warna };

type Riwayat = Pick<Pinjamanku, 'status' | 'jatuhTempo' | 'dikembalikanAt' | 'kelasDdc'>;

const terlambatKembali = (p: Riwayat) =>
  !!p.jatuhTempo && !!p.dikembalikanAt && hariIniWib(new Date(p.dikembalikanAt)) > p.jatuhTempo;

export function hitungBadge(riwayat: Riwayat[], catatanPublik: number): Badge[] {
  const selesai = riwayat.filter(p => p.status === 'dikembalikan');
  const telat = selesai.filter(terlambatKembali).length;
  const genre = new Set(selesai.map(p => genreDari(p.kelasDdc))).size;
  const buat = (kunci: KunciBadge, nilai: number, target: number, warna: Warna, syarat = true): Badge => ({
    kunci, kemajuan: Math.min(nilai, target), target, warna, didapat: nilai >= target && syarat,
  });
  return [
    buat('pertama', selesai.length, 1, PALET.lime),
    buat('kutu_buku', selesai.length, 5, PALET.amber),
    buat('pelahap', selesai.length, 10, PALET.terracotta),
    buat('tepat_waktu', selesai.length - telat, 3, PALET.teal, telat === 0),
    buat('penjelajah', genre, 3, PALET.periwinkle),
    buat('penulis_catatan', catatanPublik, 1, PALET.lavender),
  ];
}

export function ringkasPinjaman(riwayat: Pick<Pinjamanku, 'status'>[]) {
  return {
    berjalan: riwayat.filter(p => p.status === 'dipinjam' || p.status === 'menunggu_verifikasi').length,
    selesai: riwayat.filter(p => p.status === 'dikembalikan').length,
  };
}
