import { describe, it, expect } from 'vitest';
import { rupiahRingkas, labelPeriode, daftarPerhatian, segmen, keteranganDonasi } from '@/lib/lembaga/tampilan';
import { hitungRingkasan } from '@/lib/lembaga/ringkasan';

const r = hitungRingkasan({
  hariIni: new Date(2026, 8, 25),
  periode: { dari: '2026-09-01', sampai: '2026-09-30' },
  santri: [
    { id: 's1', namaLengkap: 'A', jenjang: 'SMP', jenisKelamin: 'IKHWAN', statusSosial: null },
    { id: 's2', namaLengkap: 'B', jenjang: 'SMA', jenisKelamin: 'AKHWAT', statusSosial: 'YATIM' },
  ],
  statusBerkas: new Map(),
  donasi: [
    { donaturId: 'p1', tanggal: '2026-09-05', bentuk: 'UANG', nominal: 150000, jenis: 'ZIS' },
    { donaturId: 'p1', tanggal: '2026-08-05', bentuk: 'UANG', nominal: 100000, jenis: 'ZIS' },
  ],
  jumlahDonatur: 3,
  surat: [{ tanggalSurat: '2026-09-05', terkirimWa: false }],
});

describe('rupiahRingkas', () => {
  it('ringkas untuk jutaan & miliaran, lengkap di bawah sejuta', () => {
    expect(rupiahRingkas(0)).toBe('Rp 0');
    expect(rupiahRingkas(850000)).toBe('Rp 850.000');
    expect(rupiahRingkas(12_500_000)).toBe('Rp 12,5 jt');
    expect(rupiahRingkas(3_000_000)).toBe('Rp 3 jt');
    expect(rupiahRingkas(1_250_000_000)).toBe('Rp 1,25 M');
  });
});

describe('labelPeriode', () => {
  it('satu bulan, rentang dalam setahun, lintas tahun, setahun penuh', () => {
    expect(labelPeriode({ dari: '2026-09-01', sampai: '2026-09-30' })).toBe('Sep 2026');
    expect(labelPeriode({ dari: '2026-07-01', sampai: '2026-09-30' })).toBe('Jul – Sep 2026');
    expect(labelPeriode({ dari: '2025-10-01', sampai: '2026-09-30' })).toBe('Okt 2025 – Sep 2026');
    expect(labelPeriode({ dari: '2026-01-01', sampai: '2026-12-31' })).toBe('Tahun 2026');
  });
});

describe('keteranganDonasi', () => {
  it('naik/turun dari periode sebelumnya; null bila tak ada pembanding', () => {
    expect(keteranganDonasi(r)).toBe('Donasi ▲ 50% dari periode sebelumnya');
    expect(keteranganDonasi({ ...r, donasi: { ...r.donasi, persenPerubahan: null } })).toBeNull();
  });
});

describe('daftarPerhatian', () => {
  it('berkas belum lengkap & surat belum terkirim, dengan tautan Lembaga', () => {
    const d = daftarPerhatian(r);
    expect(d.map(x => x.id)).toEqual(['berkas-santri', 'surat-belum']);
    expect(d[0]).toMatchObject({ jumlah: 2, href: '/lembaga/santri', judul: '2 santri berkasnya belum lengkap' });
    expect(d[1]).toMatchObject({ jumlah: 1, href: '/lembaga/surat?status=BELUM', judul: '1 surat belum terkirim' });
  });
  it('kosong bila semua beres; status berkas gagal dimuat tidak dihitung', () => {
    const beres = { ...r, berkas: { lengkap: 2, total: 2, persen: 100, belumLengkap: [] }, surat: { terbit: 1, belumTerkirim: 0 } };
    expect(daftarPerhatian(beres)).toEqual([]);
    expect(daftarPerhatian({ ...beres, berkas: null })).toEqual([]);
  });
});

describe('segmen', () => {
  it('hanya kelompok berisi, dengan persen', () => {
    expect(segmen({ SMP: 1, SMA: 3, SMK: 0 })).toEqual([
      { kunci: 'SMP', nilai: 1, persen: 25 },
      { kunci: 'SMA', nilai: 3, persen: 75 },
    ]);
    expect(segmen({ SMP: 0 })).toEqual([]);
  });
});
