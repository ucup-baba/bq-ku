import { describe, it, expect } from 'vitest';
import { inisial } from '@/lib/ui/inisial';

describe('inisial', () => {
  it('mengambil huruf pertama kata pertama & terakhir', () => {
    expect(inisial('Aris Eko Prasetyo')).toBe('AP');
  });
  it('satu kata → dua huruf pertama', () => {
    expect(inisial('yusuf')).toBe('YU');
  });
  it('kosong → ?', () => {
    expect(inisial('   ')).toBe('?');
  });
});
