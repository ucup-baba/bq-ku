import type { HargaModel } from './model';

export function hargaTerisi(harga?: HargaModel): boolean {
  return !!harga && (harga.masukPerJuta > 0 || harga.keluarPerJuta > 0);
}

/** Perkiraan biaya (Rp) dari token × harga per 1 juta token; null bila harga belum diisi. */
export function hitungBiaya(tokenMasuk: number, tokenKeluar: number, harga?: HargaModel): number | null {
  if (!harga || !hargaTerisi(harga)) return null;
  return Math.round(((tokenMasuk * harga.masukPerJuta + tokenKeluar * harga.keluarPerJuta) / 1_000_000) * 100) / 100;
}
