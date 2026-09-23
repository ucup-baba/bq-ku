import { describe, it, expect, vi } from 'vitest';

// FormSurat.tsx (via PratinjauSurat.tsx) memuat font Kalam/Patrick Hand lewat
// next/font/google, yang bergantung pada transformasi kompiler Next saat
// build. Di bawah Vitest (esbuild/Vite biasa) modul itu kosong, jadi
// dipalsukan di sini agar impor tidak melempar galat saat modul dimuat.
vi.mock('next/font/google', () => ({
  Kalam: () => ({ className: 'font-kalam-mock' }),
  Patrick_Hand: () => ({ className: 'font-patrick-mock' }),
}));

import { hitungPratinjau, petakanErrorField } from '@/components/donatur/FormSurat';

describe('hitungPratinjau', () => {
  it('menyusun data pratinjau donasi uang tanpa memanggil server', () => {
    const p = hitungPratinjau({
      nama: 'pradana', sapaan: 'BAPAK', bentuk: 'UANG', nominal: 2500000,
      deskripsiBarang: '', tanggalSurat: '2026-09-21', nomorSurat: '271/PBQ/IX/2026', keterangan: '',
      gayaTulisan: 'KALAM',
    });
    expect(p.namaDonatur).toBe('Pradana');
    expect(p.barisNilai).toEqual({ tipe: 'UANG', rupiah: '2.500.000', terbilang: 'Dua Juta Lima Ratus Ribu' });
    expect(p.nomorUrut).toBe('271');
    expect(p.nomorBulanRomawi).toBe('IX');
    expect(p.nomorTahunDuaDigit).toBe('26');
  });
  it('menyusun data pratinjau donasi barang', () => {
    const p = hitungPratinjau({
      nama: 'Ibu Sri', sapaan: 'IBU', bentuk: 'BARANG', nominal: 0,
      deskripsiBarang: '50 kg beras', tanggalSurat: '2026-09-21', nomorSurat: '272/PBQ/IX/2026', keterangan: '',
      gayaTulisan: 'PATRICK',
    });
    expect(p.barisNilai).toEqual({ tipe: 'BARANG', deskripsi: '50 kg beras' });
    expect(p.gayaTulisan).toBe('PATRICK');
  });
  it('nomor belum lengkap/valid -> bagian nomor kosong tanpa melempar galat', () => {
    const p = hitungPratinjau({
      nama: '', sapaan: 'BAPAK', bentuk: 'UANG', nominal: 0,
      deskripsiBarang: '', tanggalSurat: '2026-09-21', nomorSurat: '27', keterangan: '',
      gayaTulisan: 'KALAM',
    });
    expect(p.nomorUrut).toBe('');
    expect(p.nomorBulanRomawi).toBe('');
    expect(p.nomorTahunDuaDigit).toBe('');
  });
});

describe('petakanErrorField', () => {
  it('melepas prefix "donasi." dari kunci field', () => {
    const { field, umum } = petakanErrorField({ 'donasi.nominal': 'x' });
    expect(field.nominal).toBe('x');
    expect(umum).toBeNull();
  });

  it('membiarkan kunci tanpa prefix apa adanya', () => {
    const { field, umum } = petakanErrorField({ noWa: 'y' });
    expect(field.noWa).toBe('y');
    expect(umum).toBeNull();
  });

  it('mengumpulkan kunci "donasi" (tanpa titik) ke pesan umum', () => {
    const { field, umum } = petakanErrorField({ donasi: 'z' });
    expect(field.donasi).toBeUndefined();
    expect(umum).toBe('z');
  });
});
