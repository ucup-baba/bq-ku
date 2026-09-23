import { describe, it, expect } from 'vitest';
import { bagianUntukGalat } from '@/lib/donatur/bagian-form';

describe('bagianUntukGalat', () => {
  it('galat donatur → bagian 0', () => {
    expect(bagianUntukGalat({}, { nama: 'wajib' })).toBe(0);
    expect(bagianUntukGalat({ donaturId: 'x' }, {})).toBe(0);
  });
  it('galat donasi → bagian 1', () => {
    expect(bagianUntukGalat({ nominal: 'harus > 0' }, {})).toBe(1);
    expect(bagianUntukGalat({ tanggal: 'x', deskripsiBarang: 'y' }, {})).toBe(1);
  });
  it('galat surat atau nomor bentrok → bagian 2', () => {
    expect(bagianUntukGalat({ nomorSurat: 'format' }, {})).toBe(2);
    expect(bagianUntukGalat({}, {}, true)).toBe(2);
  });
  it('urutan prioritas: bagian paling awal yang bermasalah', () => {
    expect(bagianUntukGalat({ nominal: 'x', nomorSurat: 'y' }, {})).toBe(1);
  });
  it('tanpa galat → null', () => {
    expect(bagianUntukGalat({}, {})).toBeNull();
  });
});
