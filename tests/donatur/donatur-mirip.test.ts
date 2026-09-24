import { describe, it, expect } from 'vitest';
import { cariDonaturMirip, kunciNama } from '@/lib/donatur/daftar';

const list = [
  { id: 'a', nama: 'Miftah Ribchi', noWa: '6281234567890' },
  { id: 'b', nama: 'Aris Eko', noWa: null },
];

describe('kunciNama', () => {
  it('mengabaikan huruf besar, sapaan/gelar, dan tanda baca', () => {
    expect(kunciNama('Bapak H. Miftah  Ribchi')).toBe('miftah ribchi');
  });
});

describe('cariDonaturMirip', () => {
  it('nama sama (beda penulisan) terdeteksi', () => {
    expect(cariDonaturMirip(list, { nama: 'miftah ribchi', noWa: '' }).map(d => d.id)).toEqual(['a']);
  });
  it('nomor WA sama (format 08…) terdeteksi meski nama beda', () => {
    expect(cariDonaturMirip(list, { nama: 'Pak Miftah', noWa: '0812-3456-7890' }).map(d => d.id)).toEqual(['a']);
  });
  it('dirinya sendiri tidak dihitung saat mengubah', () => {
    expect(cariDonaturMirip(list, { nama: 'Miftah Ribchi', noWa: '' }, 'a')).toEqual([]);
  });
  it('isian terlalu pendek tidak memicu apa pun', () => {
    expect(cariDonaturMirip(list, { nama: 'Ar', noWa: '08' })).toEqual([]);
  });
});
