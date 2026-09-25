import { describe, it, expect } from 'vitest';
import { rentangLembaga, rentangSebelumnya, hitungRingkasan, csvRingkasan, type InputRingkasan } from '@/lib/lembaga/ringkasan';

const hariIni = new Date(2026, 8, 25); // 25 Sep 2026

describe('rentang periode', () => {
  it('bulan ini, 3 bulan, 12 bulan, tahun ini', () => {
    expect(rentangLembaga('bulan-ini', hariIni)).toEqual({ dari: '2026-09-01', sampai: '2026-09-30' });
    expect(rentangLembaga('3-bulan', hariIni)).toEqual({ dari: '2026-07-01', sampai: '2026-09-30' });
    expect(rentangLembaga('12-bulan', hariIni)).toEqual({ dari: '2025-10-01', sampai: '2026-09-30' });
    expect(rentangLembaga('tahun-ini', hariIni)).toEqual({ dari: '2026-01-01', sampai: '2026-12-31' });
  });
  it('periode sebelumnya sama panjang (dalam bulan)', () => {
    expect(rentangSebelumnya('2026-09-01', '2026-09-30')).toEqual({ dari: '2026-08-01', sampai: '2026-08-31' });
    expect(rentangSebelumnya('2026-07-01', '2026-09-30')).toEqual({ dari: '2026-04-01', sampai: '2026-06-30' });
    expect(rentangSebelumnya('2026-01-01', '2026-12-31')).toEqual({ dari: '2025-01-01', sampai: '2025-12-31' });
  });
});

const dasar: InputRingkasan = {
  hariIni,
  periode: { dari: '2026-09-01', sampai: '2026-09-30' },
  santri: [
    { id: 's1', namaLengkap: 'Budi', jenjang: 'SMP', jenisKelamin: 'IKHWAN', statusSosial: 'YATIM' },
    { id: 's2', namaLengkap: 'Aisyah', jenjang: 'SMA', jenisKelamin: 'AKHWAT', statusSosial: null },
    { id: 's3', namaLengkap: 'Cahya', jenjang: 'ALUMNI', jenisKelamin: 'IKHWAN', statusSosial: 'DHUAFA' },
  ],
  statusBerkas: new Map([
    ['s1', ['KARTU_KELUARGA', 'AKTA_KELAHIRAN', 'KTP_ORTU', 'SKL_IJAZAH'].map(k => ({ kategori: k, statusVerifikasi: 'VERIFIED' }))],
    ['s2', [{ kategori: 'KARTU_KELUARGA', statusVerifikasi: 'VERIFIED' }]],
  ]),
  donasi: [
    { donaturId: 'p1', tanggal: '2026-09-05', bentuk: 'UANG', nominal: 100000, jenis: 'ZIS' },
    { donaturId: 'p1', tanggal: '2026-07-05', bentuk: 'UANG', nominal: 50000, jenis: 'ZIS' },
    { donaturId: 'p1', tanggal: '2026-05-05', bentuk: 'UANG', nominal: 50000, jenis: 'INFAQ' },
    { donaturId: 'p2', tanggal: '2026-09-10', bentuk: 'BARANG', nominal: null, jenis: 'LAINNYA' },
    { donaturId: 'p3', tanggal: '2026-08-10', bentuk: 'UANG', nominal: 200000, jenis: 'WAKAF' },
  ],
  jumlahDonatur: 4,
  surat: [
    { tanggalSurat: '2026-09-05', terkirimWa: true },
    { tanggalSurat: '2026-09-10', terkirimWa: false },
    { tanggalSurat: '2026-06-01', terkirimWa: false },
  ],
};

describe('hitungRingkasan', () => {
  const r = hitungRingkasan(dasar);
  it('santri: aktif tanpa alumni, pengelompokan, status sosial kosong = Reguler', () => {
    expect(r.santri).toMatchObject({ total: 3, aktif: 2 });
    expect(r.santri.perJenjang).toEqual({ SMP: 1, SMA: 1, SMK: 0, ALUMNI: 1 });
    expect(r.santri.perGender).toEqual({ IKHWAN: 2, AKHWAT: 1 });
    expect(r.santri.perStatusSosial).toMatchObject({ REGULER: 1, YATIM: 1, DHUAFA: 1 });
  });
  it('kelengkapan berkas: hanya santri aktif', () => {
    expect(r.berkas).toMatchObject({ lengkap: 1, total: 2, persen: 50 });
    expect(r.berkas?.belumLengkap).toEqual([{ id: 's2', namaLengkap: 'Aisyah', kurang: ['Akta', 'KTP Ortu', 'SKL'] }]);
  });
  it('status berkas gagal dimuat → berkas null', () => {
    expect(hitungRingkasan({ ...dasar, statusBerkas: null }).berkas).toBeNull();
  });
  it('donasi periode, pembanding bulan lalu, per jenis, tren 12 bulan', () => {
    expect(r.donasi.totalUang).toBe(100000);
    expect(r.donasi.totalUangSebelumnya).toBe(200000);
    expect(r.donasi.persenPerubahan).toBe(-50);
    expect(r.donasi.jumlahBarang).toBe(1);
    expect(r.donasi.perJenis).toEqual([
      { jenis: 'LAINNYA', total: 0, jumlah: 1 },
      { jenis: 'ZIS', total: 100000, jumlah: 1 },
    ]);
    expect(r.donasi.tren).toHaveLength(12);
    expect(r.donasi.tren[11]).toEqual({ bulan: '2026-09', total: 100000 });
  });
  it('donatur: baru = donasi pertamanya di periode; rutin = ≥3 bulan berbeda dalam 12 bulan', () => {
    expect(r.donatur).toEqual({ total: 4, baru: 1, rutin: 1 });
  });
  it('surat: terbit periode ini; belum terkirim semua waktu', () => {
    expect(r.surat).toEqual({ terbit: 2, belumTerkirim: 2 });
  });
  it('data kosong tidak membagi nol', () => {
    const k = hitungRingkasan({ ...dasar, santri: [], statusBerkas: new Map(), donasi: [], jumlahDonatur: 0, surat: [] });
    expect(k.berkas).toMatchObject({ lengkap: 0, total: 0, persen: 0 });
    expect(k.donasi.persenPerubahan).toBeNull();
  });
});

describe('csvRingkasan', () => {
  it('berisi bagian utama dan angka', () => {
    const csv = csvRingkasan(hitungRingkasan(dasar));
    expect(csv).toContain('Periode,2026-09-01 s.d. 2026-09-30');
    expect(csv).toContain('Santri aktif,2');
    expect(csv).toContain('Total donasi uang,100000');
  });
});
