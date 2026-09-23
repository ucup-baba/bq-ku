import { describe, it, expect } from 'vitest';
import { toCsv } from '@/lib/utils/csv';

describe('toCsv', () => {
  it('menulis header dari kunci baris pertama', () => {
    expect(toCsv([{ nama: 'Ani', total: 1000 }])).toBe('nama,total\nAni,1000');
  });
  it('mengutip nilai yang mengandung koma atau kutip', () => {
    expect(toCsv([{ nama: 'Ani, S.Pd', ket: 'dia bilang "ya"' }]))
      .toBe('nama,ket\n"Ani, S.Pd","dia bilang ""ya"""');
  });
  it('mengembalikan string kosong untuk data kosong', () => {
    expect(toCsv([])).toBe('');
  });
  it('membubuhkan apostrof di depan nilai yang berpotensi jadi formula (CSV injection)', () => {
    expect(toCsv([{ nama: '=SUM(A1:A2)', ket: '+cmd', lain: '-1', at: '@user' }]))
      .toBe("nama,ket,lain,at\n'=SUM(A1:A2),'+cmd,'-1,'@user");
  });
  it('tidak membubuhkan apostrof pada angka meski nilainya negatif', () => {
    expect(toCsv([{ total: -1000 }])).toBe('total\n-1000');
  });
  it('tetap mengutip nilai berawalan tanda formula yang juga mengandung koma', () => {
    expect(toCsv([{ nama: '=SUM(A1,A2)' }])).toBe('nama\n"\'=SUM(A1,A2)"');
  });
});
