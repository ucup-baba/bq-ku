/** Ukuran huruf terkecil yang masih terbaca untuk isian tulisan tangan di surat (px, kanvas 1240). */
export const UKURAN_MINIMUM = 16;

/**
 * Menyesuaikan isian agar muat di satu garis: `kapasitas` = jumlah huruf yang muat pada ukuran `ukuranDasar`.
 * Lebih panjang → huruf dikecilkan sebanding (minimal UKURAN_MINIMUM); masih tak muat → dipotong dengan "…".
 */
export function pasIsian(teks: string, kapasitas: number, ukuranDasar: number): { teks: string; ukuran: number } {
  const t = teks.trim().replace(/\s+/g, ' ');
  if (t.length <= kapasitas) return { teks: t, ukuran: ukuranDasar };
  const ukuran = Math.max(UKURAN_MINIMUM, Math.floor((ukuranDasar * kapasitas) / t.length));
  const muatMaks = Math.floor((kapasitas * ukuranDasar) / UKURAN_MINIMUM);
  return { teks: t.length > muatMaks ? `${t.slice(0, muatMaks - 1).trimEnd()}…` : t, ukuran };
}
