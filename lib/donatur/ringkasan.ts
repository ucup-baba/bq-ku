import type { Rekap } from '@/lib/db/donatur-repo';

export type Ringkasan = {
  totalUang: number;
  jumlahDonasi: number;
  jumlahBarang: number;
  suratTerkirim: number;
};

/**
 * Menyusun angka ringkasan beranda ruang donatur dari respons rekap
 * (`GET /api/donatur/rekap`) dan jumlah surat terkirim bulan berjalan
 * (panjang array `GET /api/donatur/surat?...&terkirim=true`).
 */
export function susunRingkasan(rekap: Rekap, suratTerkirim: number): Ringkasan {
  return {
    totalUang: rekap.totalUang,
    jumlahDonasi: rekap.jumlahDonasiUang,
    jumlahBarang: rekap.barang.length,
    suratTerkirim,
  };
}
