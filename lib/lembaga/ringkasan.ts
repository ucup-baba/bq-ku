import { statusBerkas, type DokRingkas } from '@/lib/santri/ringkasan';
import { isiBulanKosong, type PerBulan } from '@/lib/utils/rekap';
import { toCsv } from '@/lib/utils/csv';

export type PeriodeLembaga = 'bulan-ini' | '3-bulan' | '12-bulan' | 'tahun-ini';
export const PERIODE_LEMBAGA: PeriodeLembaga[] = ['bulan-ini', '3-bulan', '12-bulan', 'tahun-ini'];

const dua = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${dua(d.getMonth() + 1)}-${dua(d.getDate())}`;

/** Rentang tanggal lokal (bukan UTC) untuk pilihan periode. */
export function rentangLembaga(p: PeriodeLembaga, hariIni: Date): { dari: string; sampai: string } {
  const y = hariIni.getFullYear();
  const m = hariIni.getMonth();
  const akhir = iso(new Date(y, m + 1, 0));
  if (p === 'bulan-ini') return { dari: iso(new Date(y, m, 1)), sampai: akhir };
  if (p === '3-bulan') return { dari: iso(new Date(y, m - 2, 1)), sampai: akhir };
  if (p === '12-bulan') return { dari: iso(new Date(y, m - 11, 1)), sampai: akhir };
  return { dari: `${y}-01-01`, sampai: `${y}-12-31` };
}

/** Periode tepat sebelum [dari, sampai] dengan jumlah bulan yang sama. */
export function rentangSebelumnya(dari: string, sampai: string): { dari: string; sampai: string } {
  const [y1, m1] = dari.split('-').map(Number);
  const [y2, m2] = sampai.split('-').map(Number);
  const bulan = (y2 * 12 + m2) - (y1 * 12 + m1) + 1;
  return { dari: iso(new Date(y1, m1 - 1 - bulan, 1)), sampai: iso(new Date(y1, m1 - 1, 0)) };
}

export type BarisSantriRingkas = { id: string; namaLengkap: string; jenjang: string; jenisKelamin: string; statusSosial: string | null };
export type BarisDonasiRingkas = { donaturId: string; tanggal: string; bentuk: 'UANG' | 'BARANG'; nominal: number | null; jenis: string };
export type BarisSuratRingkas = { tanggalSurat: string; terkirimWa: boolean };

export type InputRingkasan = {
  hariIni: Date;
  periode: { dari: string; sampai: string };
  santri: BarisSantriRingkas[];
  statusBerkas: Map<string, DokRingkas[]> | null;
  donasi: BarisDonasiRingkas[];
  jumlahDonatur: number;
  surat: BarisSuratRingkas[];
};

export type Ringkasan = {
  periode: { dari: string; sampai: string };
  santri: {
    total: number; aktif: number;
    perJenjang: Record<'SMP' | 'SMA' | 'SMK' | 'ALUMNI', number>;
    perGender: Record<'IKHWAN' | 'AKHWAT', number>;
    perStatusSosial: Record<string, number>;
  };
  berkas: { lengkap: number; total: number; persen: number; belumLengkap: Array<{ id: string; namaLengkap: string; kurang: string[] }> } | null;
  donasi: {
    totalUang: number; totalUangSebelumnya: number; persenPerubahan: number | null;
    jumlahBarang: number; perJenis: Array<{ jenis: string; total: number; jumlah: number }>; tren: PerBulan[];
  };
  donatur: { total: number; baru: number; rutin: number };
  surat: { terbit: number; belumTerkirim: number };
};

const dalam = (t: string, r: { dari: string; sampai: string }) => t >= r.dari && t <= r.sampai;
const persen = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

/** Semua angka beranda Ruang Lembaga dari baris mentah (fungsi murni). */
export function hitungRingkasan(i: InputRingkasan): Ringkasan {
  // ── Santri
  const aktif = i.santri.filter(s => s.jenjang !== 'ALUMNI');
  const perJenjang = { SMP: 0, SMA: 0, SMK: 0, ALUMNI: 0 };
  const perGender = { IKHWAN: 0, AKHWAT: 0 };
  const perStatusSosial: Record<string, number> = {};
  for (const s of i.santri) {
    if (s.jenjang in perJenjang) perJenjang[s.jenjang as keyof typeof perJenjang] += 1;
    if (s.jenisKelamin in perGender) perGender[s.jenisKelamin as keyof typeof perGender] += 1;
    const st = s.statusSosial || 'REGULER';
    perStatusSosial[st] = (perStatusSosial[st] ?? 0) + 1;
  }

  // ── Kelengkapan berkas (santri aktif saja; alumni tidak dihitung)
  let berkas: Ringkasan['berkas'] = null;
  if (i.statusBerkas) {
    const peta = i.statusBerkas;
    const hasil = aktif.map(s => ({ s, st: statusBerkas(peta.get(s.id)) }));
    const lengkap = hasil.filter(h => h.st.lengkap).length;
    berkas = {
      lengkap, total: aktif.length, persen: persen(lengkap, aktif.length),
      belumLengkap: hasil.filter(h => !h.st.lengkap)
        .sort((a, b) => a.s.namaLengkap.localeCompare(b.s.namaLengkap, 'id'))
        .slice(0, 5)
        .map(h => ({ id: h.s.id, namaLengkap: h.s.namaLengkap, kurang: [...h.st.kurang, ...h.st.perluPerbaikan.map(k => `${k} (perbaiki)`)] })),
    };
  }

  // ── Donasi
  const sebelum = rentangSebelumnya(i.periode.dari, i.periode.sampai);
  const uang = i.donasi.filter(d => d.bentuk === 'UANG');
  const jumlahUang = (r: { dari: string; sampai: string }) =>
    uang.filter(d => dalam(d.tanggal, r)).reduce((a, d) => a + (d.nominal ?? 0), 0);
  const totalUang = jumlahUang(i.periode);
  const totalUangSebelumnya = jumlahUang(sebelum);
  const diPeriode = i.donasi.filter(d => dalam(d.tanggal, i.periode));
  const perJenisMap = new Map<string, { total: number; jumlah: number }>();
  for (const d of diPeriode) {
    const x = perJenisMap.get(d.jenis) ?? { total: 0, jumlah: 0 };
    x.jumlah += 1;
    if (d.bentuk === 'UANG') x.total += d.nominal ?? 0;
    perJenisMap.set(d.jenis, x);
  }
  const perJenis = [...perJenisMap].map(([jenis, v]) => ({ jenis, ...v }))
    .sort((a, b) => b.jumlah - a.jumlah || a.jenis.localeCompare(b.jenis));

  const duaBelas = rentangLembaga('12-bulan', i.hariIni);
  const perBulan = new Map<string, number>();
  for (const d of uang) {
    if (!dalam(d.tanggal, duaBelas)) continue;
    const b = d.tanggal.slice(0, 7);
    perBulan.set(b, (perBulan.get(b) ?? 0) + (d.nominal ?? 0));
  }
  const tren = isiBulanKosong([...perBulan].map(([bulan, total]) => ({ bulan, total })), duaBelas.dari, duaBelas.sampai);

  // ── Donatur: baru = donasi pertamanya di periode; rutin = ≥ 3 bulan berbeda dalam 12 bulan terakhir
  const pertama = new Map<string, string>();
  const bulanAktif = new Map<string, Set<string>>();
  for (const d of i.donasi) {
    const p = pertama.get(d.donaturId);
    if (!p || d.tanggal < p) pertama.set(d.donaturId, d.tanggal);
    if (dalam(d.tanggal, duaBelas)) {
      const set = bulanAktif.get(d.donaturId) ?? new Set<string>();
      set.add(d.tanggal.slice(0, 7));
      bulanAktif.set(d.donaturId, set);
    }
  }
  const baru = [...pertama.values()].filter(t => dalam(t, i.periode)).length;
  const rutin = [...bulanAktif.values()].filter(s => s.size >= 3).length;

  return {
    periode: i.periode,
    santri: { total: i.santri.length, aktif: aktif.length, perJenjang, perGender, perStatusSosial },
    berkas,
    donasi: {
      totalUang, totalUangSebelumnya,
      persenPerubahan: totalUangSebelumnya > 0 ? Math.round(((totalUang - totalUangSebelumnya) / totalUangSebelumnya) * 100) : null,
      jumlahBarang: diPeriode.filter(d => d.bentuk === 'BARANG').length,
      perJenis, tren,
    },
    donatur: { total: i.jumlahDonatur, baru, rutin },
    surat: {
      terbit: i.surat.filter(s => dalam(s.tanggalSurat, i.periode)).length,
      belumTerkirim: i.surat.filter(s => !s.terkirimWa).length,
    },
  };
}

/** Ringkasan sebagai CSV dua kolom (Indikator, Nilai) untuk lampiran laporan. */
export function csvRingkasan(r: Ringkasan): string {
  const baris: Array<{ Indikator: string; Nilai: string | number }> = [
    { Indikator: 'Periode', Nilai: `${r.periode.dari} s.d. ${r.periode.sampai}` },
    { Indikator: 'Santri total', Nilai: r.santri.total },
    { Indikator: 'Santri aktif', Nilai: r.santri.aktif },
    ...Object.entries(r.santri.perJenjang).map(([k, v]) => ({ Indikator: `Santri ${k}`, Nilai: v })),
    { Indikator: 'Santri ikhwan', Nilai: r.santri.perGender.IKHWAN },
    { Indikator: 'Santri akhwat', Nilai: r.santri.perGender.AKHWAT },
    ...Object.entries(r.santri.perStatusSosial).map(([k, v]) => ({ Indikator: `Status sosial ${k}`, Nilai: v })),
    ...(r.berkas ? [
      { Indikator: 'Santri aktif berkas lengkap', Nilai: r.berkas.lengkap },
      { Indikator: 'Kelengkapan berkas (%)', Nilai: r.berkas.persen },
    ] : []),
    { Indikator: 'Total donasi uang', Nilai: r.donasi.totalUang },
    { Indikator: 'Total donasi uang periode sebelumnya', Nilai: r.donasi.totalUangSebelumnya },
    { Indikator: 'Jumlah donasi barang', Nilai: r.donasi.jumlahBarang },
    ...r.donasi.perJenis.map(j => ({ Indikator: `Donasi ${j.jenis} (Rp / catatan)`, Nilai: `${j.total} / ${j.jumlah}` })),
    { Indikator: 'Donatur total', Nilai: r.donatur.total },
    { Indikator: 'Donatur baru', Nilai: r.donatur.baru },
    { Indikator: 'Donatur rutin', Nilai: r.donatur.rutin },
    { Indikator: 'Surat terbit', Nilai: r.surat.terbit },
    { Indikator: 'Surat belum terkirim', Nilai: r.surat.belumTerkirim },
  ];
  return toCsv(baris);
}
