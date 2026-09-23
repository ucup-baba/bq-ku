import { describe, it, expect } from 'vitest';
import { buildSuratData } from '@/lib/surat/data';

const dasar = {
  id: 's1', donasiId: 'x', nomorSurat: '271/PBQ/IX/2026', tanggalSurat: '2026-09-21',
  storagePath: null, terkirimWa: false, dikirimAt: null, createdAt: '', createdBy: null,
  donasi: {
    id: 'x', donaturId: 'd', tanggal: '2026-09-21', jenis: 'INFAQ', bentuk: 'UANG',
    nominal: 2500000, deskripsiBarang: null, keterangan: null, createdAt: '', createdBy: null,
    donatur: { id: 'd', nama: 'pradana', sapaan: 'BAPAK', noWa: '628123', alamat: null, catatan: null, createdAt: '', updatedAt: '' },
  },
} as any;

describe('buildSuratData', () => {
  it('menyusun baris nilai untuk donasi uang', () => {
    const d = buildSuratData(dasar);
    expect(d.namaDonatur).toBe('Pradana');
    expect(d.barisNilai).toEqual({ tipe: 'UANG', rupiah: '2.500.000', terbilang: 'Dua Juta Lima Ratus Ribu' });
    expect(d.tanggalTeks).toMatch(/September 2026/);
  });
  it('menyusun baris nilai untuk donasi barang', () => {
    const barang = { ...dasar, donasi: { ...dasar.donasi, bentuk: 'BARANG', nominal: null, deskripsiBarang: '50 kg beras' } };
    expect(buildSuratData(barang as any).barisNilai).toEqual({ tipe: 'BARANG', deskripsi: '50 kg beras' });
  });

  it('memecah nomor surat menjadi urut, bulan romawi, dan dua digit tahun', () => {
    const d = buildSuratData(dasar);
    expect(d.nomorUrut).toBe('271');
    expect(d.nomorBulanRomawi).toBe('IX');
    expect(d.nomorTahunDuaDigit).toBe('26');
  });

  it('mengisi gayaTulisan dari kolom surat', () => {
    const d = buildSuratData({ ...dasar, gayaTulisan: 'PATRICK' } as any);
    expect(d.gayaTulisan).toBe('PATRICK');
  });

  it('gayaTulisan default KALAM bila kolom null/undefined', () => {
    expect(buildSuratData({ ...dasar, gayaTulisan: null } as any).gayaTulisan).toBe('KALAM');
    expect(buildSuratData({ ...dasar, gayaTulisan: undefined } as any).gayaTulisan).toBe('KALAM');
    expect(buildSuratData(dasar).gayaTulisan).toBe('KALAM');
  });
});
