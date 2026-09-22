import { describe, it, expect } from 'vitest';
import { hitungPratinjau } from '@/components/donatur/FormSurat';

describe('hitungPratinjau', () => {
  it('menyusun data pratinjau donasi uang tanpa memanggil server', () => {
    const p = hitungPratinjau({
      nama: 'pradana', sapaan: 'BAPAK', bentuk: 'UANG', nominal: 2500000,
      deskripsiBarang: '', tanggalSurat: '2026-09-21', nomorSurat: '271/PBQ/IX/2026', keterangan: '',
    });
    expect(p.namaDonatur).toBe('Pradana');
    expect(p.barisNilai).toEqual({ tipe: 'UANG', rupiah: '2.500.000', terbilang: 'Dua Juta Lima Ratus Ribu' });
  });
  it('menyusun data pratinjau donasi barang', () => {
    const p = hitungPratinjau({
      nama: 'Ibu Sri', sapaan: 'IBU', bentuk: 'BARANG', nominal: 0,
      deskripsiBarang: '50 kg beras', tanggalSurat: '2026-09-21', nomorSurat: '272/PBQ/IX/2026', keterangan: '',
    });
    expect(p.barisNilai).toEqual({ tipe: 'BARANG', deskripsi: '50 kg beras' });
  });
});
