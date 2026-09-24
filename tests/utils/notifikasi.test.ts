import { describe, it, expect } from 'vitest';
import { susunNotifikasi, totalNotifikasi, labelLencana } from '@/lib/notifikasi/jenis';

describe('susunNotifikasi', () => {
  it('hanya hitungan > 0 yang tampil, dengan tautan tindak lanjut', () => {
    const n = susunNotifikasi({ suratBelumTerkirim: 3, donaturTanpaWa: 0, akunMenunggu: 1 });
    expect(n.map(x => x.id)).toEqual(['surat-belum-terkirim', 'akun-menunggu']);
    expect(n[0]).toMatchObject({ href: '/donatur/surat?status=BELUM', judul: '3 surat belum dikirim' });
    expect(totalNotifikasi(n)).toBe(4);
  });
  it('tanpa hak apa pun → kosong', () => {
    expect(susunNotifikasi({})).toEqual([]);
  });
});

describe('labelLencana', () => {
  it('dibatasi 9+', () => {
    expect(labelLencana(3)).toBe('3');
    expect(labelLencana(10)).toBe('9+');
  });
});
