/** Dinding foto hero Beranda: baru tampil bila cukup santri berfoto, agar tidak terlihat berulang-ulang. */
export const MIN_FOTO_DINDING = 6;

type Berfoto = { fotoProfilUrl?: string | null; fotoFormalUrl?: string | null };

/** URL foto unik (profil, lalu formal) — kosong bila kurang dari MIN_FOTO_DINDING. */
export function fotoDinding(santri: Berfoto[], maks = 20): string[] {
  const unik = [...new Set(santri.map(s => s.fotoProfilUrl || s.fotoFormalUrl).filter((u): u is string => !!u))];
  return unik.length < MIN_FOTO_DINDING ? [] : unik.slice(0, maks);
}

/**
 * Bagi foto ke `jumlahKolom` kolom secara bergiliran (kolom ke-i mulai dari foto ke-i),
 * lalu ulangi sampai tiap kolom berisi minimal `minPerKolom` ubin.
 */
export function susunKolom(foto: string[], jumlahKolom: number, minPerKolom: number): string[][] {
  const n = foto.length;
  const panjang = Math.max(minPerKolom, Math.ceil(n / jumlahKolom));
  return Array.from({ length: jumlahKolom }, (_, k) =>
    Array.from({ length: panjang }, (_, j) => foto[(k + j * jumlahKolom) % n]));
}
