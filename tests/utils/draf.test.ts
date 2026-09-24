import { describe, it, expect, beforeEach } from 'vitest';
import { simpanDraf, bacaDraf, hapusDraf, hapusSemuaDraf, labelWaktuDraf } from '@/lib/draf';
import { drafBermakna } from '@/components/donatur/form-surat/useFormSurat';

function storagePalsu() {
  const m = new Map<string, string>();
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => m.clear(),
  };
}

beforeEach(() => { Object.defineProperty(globalThis, 'localStorage', { value: storagePalsu(), configurable: true }); });

describe('draf', () => {
  it('simpan → baca → hapus', () => {
    simpanDraf('surat_baru', { a: 1 });
    expect(bacaDraf<{ a: number }>('surat_baru')?.isi).toEqual({ a: 1 });
    hapusDraf('surat_baru');
    expect(bacaDraf('surat_baru')).toBeNull();
  });
  it('keluar akun menghapus semua draf (termasuk draf santri lama), kunci lain dibiarkan', () => {
    simpanDraf('surat_baru', { a: 1 });
    localStorage.setItem('bq_draft_santri_form', '{}');
    localStorage.setItem('bq_rail_pin', '1');
    hapusSemuaDraf();
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem('bq_rail_pin')).toBe('1');
  });
  it('isi rusak / storage gagal tidak melempar', () => {
    localStorage.setItem('bq_draft_x', '{rusak');
    expect(bacaDraf('x')).toBeNull();
    Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('diblokir'); }, configurable: true });
    expect(() => simpanDraf('x', 1)).not.toThrow();
    expect(bacaDraf('x')).toBeNull();
    expect(() => hapusSemuaDraf()).not.toThrow();
  });
  it('label waktu: jam saja untuk hari ini, dengan tanggal untuk hari lain', () => {
    const sekarang = new Date(2026, 8, 24, 15, 0);
    expect(labelWaktuDraf(new Date(2026, 8, 24, 14, 20).getTime(), sekarang)).toMatch(/^14.20$/);
    expect(labelWaktuDraf(new Date(2026, 8, 23, 9, 5).getTime(), sekarang)).toMatch(/^23 Sep 09.05$/);
  });
});

describe('drafBermakna', () => {
  const kosong = { donatur: { donaturId: undefined, nama: '', sapaan: 'BAPAK' as const, noWa: '' }, nominal: 0, deskripsiBarang: '' };
  it('form kosong bawaan tidak disimpan', () => { expect(drafBermakna(kosong)).toBe(false); });
  it('ada nama/nominal/barang → disimpan', () => {
    expect(drafBermakna({ ...kosong, nominal: 50000 })).toBe(true);
    expect(drafBermakna({ ...kosong, donatur: { ...kosong.donatur, nama: 'Aris' } })).toBe(true);
  });
});
