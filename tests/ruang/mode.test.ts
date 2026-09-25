import { describe, it, expect } from 'vitest';
import { MODE_KERJA, MODE_LEMBAGA, modeDari } from '@/lib/ruang/mode';

describe('mode ruang', () => {
  it('mode kerja = alamat yang sudah ada', () => {
    expect(MODE_KERJA.bacaSaja).toBe(false);
    expect(MODE_KERJA.rute.santri('s1')).toBe('/santri/s1');
    expect(MODE_KERJA.rute.donatur('p1')).toBe('/donatur/daftar/p1');
    expect(MODE_KERJA.rute.surat('x')).toBe('/donatur/surat/x');
    expect(MODE_KERJA.api.donatur).toBe('/api/donatur');
    expect(MODE_KERJA.api.pngSurat('x')).toBe('/api/donatur/surat/x/png');
  });
  it('mode lembaga = baca saja, alamat /lembaga', () => {
    expect(MODE_LEMBAGA.bacaSaja).toBe(true);
    expect(MODE_LEMBAGA.rute.santriDaftar).toBe('/lembaga/santri');
    expect(MODE_LEMBAGA.rute.donatur('p1')).toBe('/lembaga/donatur/p1');
    expect(MODE_LEMBAGA.api.surat).toBe('/api/lembaga/surat');
    expect(MODE_LEMBAGA.api.pngSurat('x')).toBe('/api/lembaga/surat/x/png');
    expect(modeDari('lembaga')).toBe(MODE_LEMBAGA);
    expect(modeDari('kerja')).toBe(MODE_KERJA);
  });
});
