/**
 * Draf form di perangkat (localStorage) agar isian tidak hilang saat sinyal putus,
 * halaman tertutup, atau aplikasi dimatikan. Semua kunci berawalan `bq_draft_` supaya
 * bisa dihapus sekaligus saat keluar akun. Akses storage bisa gagal (mode privat,
 * storage diblokir) — semua fungsi aman dan diam bila gagal.
 */
export const AWALAN_DRAF = 'bq_draft_';

export type Draf<T> = { isi: T; savedAt: number };

export function simpanDraf<T>(kunci: string, isi: T): void {
  try { localStorage.setItem(AWALAN_DRAF + kunci, JSON.stringify({ isi, savedAt: Date.now() })); } catch { /* abaikan */ }
}

export function bacaDraf<T>(kunci: string): Draf<T> | null {
  try {
    const raw = localStorage.getItem(AWALAN_DRAF + kunci);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && typeof d === 'object' && 'isi' in d ? (d as Draf<T>) : null;
  } catch { return null; }
}

export function hapusDraf(kunci: string): void {
  try { localStorage.removeItem(AWALAN_DRAF + kunci); } catch { /* abaikan */ }
}

/** Dipanggil saat keluar akun: draf berisi data pribadi tidak boleh tertinggal di perangkat. */
export function hapusSemuaDraf(): void {
  try {
    const kunci: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(AWALAN_DRAF)) kunci.push(k);
    }
    kunci.forEach(k => localStorage.removeItem(k));
  } catch { /* abaikan */ }
}

/** "14.20" untuk hari ini, "23 Sep 14.20" untuk hari lain. */
export function labelWaktuDraf(savedAt: number, sekarang = new Date()): string {
  const t = new Date(savedAt);
  const jam = t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (t.toDateString() === sekarang.toDateString()) return jam;
  return `${t.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${jam}`;
}
