import { describe, it, expect } from 'vitest';
import type { DonaturWithDonasi } from '@/lib/db/donatur-repo';

describe('Daftar Donatur Metrics & Filtering', () => {
  const donaturMock: DonaturWithDonasi[] = [
    {
      id: 'd-1',
      nama: 'Aris Eko',
      sapaan: 'BAPAK',
      noWa: '6281510006527',
      alamat: 'Sleman',
      catatan: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      donasi: [
        { id: 'don-1', nominal: 500000, bentuk: 'UANG', tanggal: '2026-09-20' },
        { id: 'don-2', nominal: 250000, bentuk: 'UANG', tanggal: '2026-08-15' },
      ],
    },
    {
      id: 'd-2',
      nama: 'Yusuf Syaifulloh',
      sapaan: 'BAPAK',
      noWa: null,
      alamat: null,
      catatan: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      donasi: [
        { id: 'don-3', nominal: null, bentuk: 'BARANG', tanggal: '2026-09-10' },
      ],
    },
  ];

  it('menghitung total akumulasi donasi uang donatur', () => {
    const d1 = donaturMock[0];
    const totalUang = (d1.donasi || []).reduce((acc, curr) => curr.bentuk === 'UANG' ? acc + (curr.nominal || 0) : acc, 0);
    expect(totalUang).toBe(750000);
    expect(d1.donasi?.length).toBe(2);
  });

  it('mendeteksi donatur aktif pada bulan tertentu', () => {
    const bulan = '2026-09';
    const aktif = donaturMock.filter(d => d.donasi && d.donasi.some(x => x.tanggal.startsWith(bulan)));
    expect(aktif).toHaveLength(2);

    const bulanLalu = '2026-08';
    const aktifBulanLalu = donaturMock.filter(d => d.donasi && d.donasi.some(x => x.tanggal.startsWith(bulanLalu)));
    expect(aktifBulanLalu).toHaveLength(1);
    expect(aktifBulanLalu[0].id).toBe('d-1');
  });

  it('menghitung donatur yang memiliki nomor WhatsApp', () => {
    const terhubungWa = donaturMock.filter(d => Boolean(d.noWa));
    expect(terhubungWa).toHaveLength(1);
    expect(terhubungWa[0].nama).toBe('Aris Eko');
  });
});
