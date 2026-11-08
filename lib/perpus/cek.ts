import { hariIniWib } from '@/lib/perpus/pinjaman';

export type HasilCek = 'ada' | 'rusak' | 'hilang';
export type BukuCek = { id: string; judul: string; penulis: string; nomorPanggil: string; eksemplar: number };
export type ItemCek = { bukuId: string; hasil: HasilCek; jumlahAda: number; catatan: string | null; dicekAt: string };
export type BarisCek = { buku: BukuCek; dipinjam: number; diRak: number; item: ItemCek | null };

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export const periodeWib = (sekarang = new Date()) => hariIniWib(sekarang).slice(0, 7);

export function labelPeriode(periode: string): string {
  const [tahun, bulan] = periode.split('-');
  return `${BULAN[Number(bulan) - 1]} ${tahun}`;
}

/** Urut nomor panggil supaya daftar mengikuti urutan rak. Buku yang dipinjam tidak diharapkan ada di rak. */
export function susunDaftarCek(buku: BukuCek[], item: ItemCek[], dipinjam: Record<string, number>): BarisCek[] {
  const hasil = new Map(item.map(i => [i.bukuId, i]));
  return [...buku]
    .sort((a, b) => a.nomorPanggil.localeCompare(b.nomorPanggil, 'id', { numeric: true }))
    .map(b => {
      const pinjam = dipinjam[b.id] ?? 0;
      return { buku: b, dipinjam: pinjam, diRak: Math.max(b.eksemplar - pinjam, 0), item: hasil.get(b.id) ?? null };
    });
}

export function ringkasCek(baris: BarisCek[]) {
  const hitung = (h: HasilCek) => baris.filter(b => b.item?.hasil === h).length;
  const dicek = baris.filter(b => b.item).length;
  return {
    total: baris.length, dicek, ada: hitung('ada'), rusak: hitung('rusak'), hilang: hitung('hilang'),
    belum: baris.length - dicek, persen: baris.length ? Math.round((dicek / baris.length) * 100) : 0,
  };
}

/** Riwayat terbaru dulu. Hitungan berhenti di bulan pertama yang tidak mencatat buku itu hilang. */
export function hilangBeruntun(riwayat: readonly { periode: string; hasil: Readonly<Record<string, HasilCek>> }[]): Record<string, number> {
  const out: Record<string, number> = {};
  const [terbaru, ...lama] = riwayat;
  if (!terbaru) return out;
  for (const [bukuId, h] of Object.entries(terbaru.hasil)) {
    if (h !== 'hilang') continue;
    let n = 1;
    for (const r of lama) { if (r.hasil[bukuId] !== 'hilang') break; n++; }
    out[bukuId] = n;
  }
  return out;
}

/** QR stiker berisi tautan `/b/<idPendek>`; kode mentah 8 karakter juga diterima. */
export function idDariQr(teks: string): string | null {
  const t = teks.trim();
  return /\/b\/([0-9a-f]{8})(?:[/?#]|$)/.exec(t)?.[1] ?? (/^[0-9a-f]{8}$/.test(t) ? t : null);
}

/** Tiap pindaian adalah satu eksemplar yang ditemukan. */
export function catatPindai(buku: BukuCek, sebelumnya: ItemCek | null): { hasil: 'ada'; jumlahAda: number } {
  const sudah = sebelumnya?.hasil === 'ada' ? sebelumnya.jumlahAda : 0;
  return { hasil: 'ada', jumlahAda: Math.min(sudah + 1, Math.max(buku.eksemplar, 1)) };
}
