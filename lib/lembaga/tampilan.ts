import { formatRupiah } from '@/lib/utils/terbilang';
import { labelBulan } from '@/lib/utils/rekap';
import { MODE_LEMBAGA } from '@/lib/ruang/mode';
import type { Ringkasan } from './ringkasan';

/** "Rp 850.000", "Rp 12,5 jt", "Rp 1,25 M" — ringkas untuk kalimat ringkasan. */
export function rupiahRingkas(n: number): string {
  const desimal = (x: number) => x.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  if (n >= 1_000_000_000) return `Rp ${desimal(n / 1_000_000_000)} M`;
  if (n >= 1_000_000) return `Rp ${desimal(Math.round(n / 100_000) / 10)} jt`;
  return `Rp ${formatRupiah(n)}`;
}

/** Label rentang periode: "Sep 2026", "Jul – Sep 2026", "Okt 2025 – Sep 2026", "Tahun 2026". */
export function labelPeriode(p: { dari: string; sampai: string }): string {
  const a = p.dari.slice(0, 7);
  const b = p.sampai.slice(0, 7);
  if (a === b) return labelBulan(a);
  if (p.dari.endsWith('-01-01') && p.sampai.endsWith('-12-31') && a.slice(0, 4) === b.slice(0, 4)) return `Tahun ${a.slice(0, 4)}`;
  if (a.slice(0, 4) === b.slice(0, 4)) return `${labelBulan(a).split(' ')[0]} – ${labelBulan(b)}`;
  return `${labelBulan(a)} – ${labelBulan(b)}`;
}

/** "Donasi ▲ 12% dari periode sebelumnya", atau null bila periode sebelumnya kosong. */
export function keteranganDonasi(r: Ringkasan): string | null {
  const p = r.donasi.persenPerubahan;
  if (p === null) return null;
  if (p === 0) return 'Donasi sama dengan periode sebelumnya';
  return `Donasi ${p > 0 ? '▲' : '▼'} ${Math.abs(p)}% dari periode sebelumnya`;
}

export type ItemPerhatian = { id: 'berkas-lembaga' | 'berkas-santri' | 'surat-belum'; jumlah: number; judul: string; sub: string; href: string };

/** Hal yang perlu ditindaklanjuti pengurus (hanya yang jumlahnya > 0). */
export function daftarPerhatian(r: Ringkasan): ItemPerhatian[] {
  const out: ItemPerhatian[] = [];
  const bl = r.berkasLembaga ?? [];
  if (bl.length > 0) {
    const u = bl[0];
    const kata = u.status === 'kedaluwarsa' ? 'kedaluwarsa' : u.status === 'mendesak' ? `mendesak (${u.sisaHari} hari lagi)` : `segera urus (${u.sisaHari} hari lagi)`;
    out.push({
      id: 'berkas-lembaga', jumlah: bl.length,
      judul: bl.length === 1 ? `${u.label} perlu diperpanjang` : `${bl.length} berkas lembaga perlu diperpanjang`,
      sub: `${u.label} · ${kata}`, href: '/lembaga/berkas',
    });
  }
  const belumLengkap = r.berkas ? r.berkas.total - r.berkas.lengkap : 0;
  if (belumLengkap > 0) out.push({
    id: 'berkas-santri', jumlah: belumLengkap, judul: `${belumLengkap} santri berkasnya belum lengkap`,
    sub: 'KK, akta, KTP orang tua, atau ijazah', href: MODE_LEMBAGA.rute.santriDaftar,
  });
  if (r.surat.belumTerkirim > 0) out.push({
    id: 'surat-belum', jumlah: r.surat.belumTerkirim, judul: `${r.surat.belumTerkirim} surat belum terkirim`,
    sub: 'Ucapan terima kasih ke donatur', href: `${MODE_LEMBAGA.rute.suratDaftar}?status=BELUM`,
  });
  return out;
}

/** Segmen batang komposisi: hanya kelompok berisi, persen dibulatkan. */
export function segmen(data: Record<string, number>): Array<{ kunci: string; nilai: number; persen: number }> {
  const total = Object.values(data).reduce((a, v) => a + v, 0);
  return Object.entries(data).filter(([, v]) => v > 0)
    .map(([kunci, nilai]) => ({ kunci, nilai, persen: Math.round((nilai / total) * 100) }));
}
