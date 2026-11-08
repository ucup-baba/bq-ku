import { describe, it, expect } from 'vitest';
import { catatPindai, hilangBeruntun, idDariQr, labelPeriode, periodeWib, ringkasCek, susunDaftarCek, type BukuCek, type ItemCek } from '@/lib/perpus/cek';

const buku = (id: string, nomorPanggil: string, eksemplar = 1): BukuCek => ({ id, judul: id, penulis: '', nomorPanggil, eksemplar });
const item = (bukuId: string, hasil: ItemCek['hasil'], jumlahAda = 1): ItemCek => ({ bukuId, hasil, jumlahAda, catatan: null, dicekAt: '2026-11-08T00:00:00Z' });

describe('periode', () => {
  it('menurut WIB', () => {
    expect(periodeWib(new Date('2026-11-30T18:00:00Z'))).toBe('2026-12');
    expect(periodeWib(new Date('2026-11-30T16:00:00Z'))).toBe('2026-11');
  });
  it('label bulan', () => {
    expect(labelPeriode('2026-11')).toBe('November 2026');
  });
});

describe('susunDaftarCek', () => {
  it('urut nomor panggil seperti rak, rak = eksemplar dikurangi pinjaman', () => {
    const r = susunDaftarCek([buku('b', '813 LIY r', 2), buku('a', '004 AND ap'), buku('c', '297 SAU b')], [item('b', 'ada')], { b: 1 });
    expect(r.map(x => x.buku.id)).toEqual(['a', 'c', 'b']);
    expect(r[2]).toMatchObject({ dipinjam: 1, diRak: 1, item: { hasil: 'ada' } });
    expect(r[0].item).toBeNull();
  });
  it('rak tidak negatif', () => {
    expect(susunDaftarCek([buku('a', 'x')], [], { a: 3 })[0].diRak).toBe(0);
  });
});

describe('ringkasCek', () => {
  it('menghitung hasil dan sisa', () => {
    const r = susunDaftarCek([buku('a', '1'), buku('b', '2'), buku('c', '3'), buku('d', '4')], [item('a', 'ada'), item('b', 'rusak'), item('c', 'hilang', 0)], {});
    expect(ringkasCek(r)).toEqual({ total: 4, dicek: 3, ada: 1, rusak: 1, hilang: 1, belum: 1, persen: 75 });
  });
  it('kosong = 0%', () => {
    expect(ringkasCek([]).persen).toBe(0);
  });
});

describe('hilangBeruntun', () => {
  it('menghitung dari sesi terbaru, berhenti saat tidak hilang', () => {
    const riwayat = [
      { periode: '2026-11', hasil: { a: 'hilang', b: 'hilang', c: 'ada' } },
      { periode: '2026-10', hasil: { a: 'hilang', b: 'ada' } },
      { periode: '2026-09', hasil: { a: 'hilang', b: 'hilang' } },
    ] as const;
    expect(hilangBeruntun(riwayat)).toEqual({ a: 3, b: 1 });
  });
  it('tidak dicek di bulan terbaru memutus hitungan', () => {
    expect(hilangBeruntun([{ periode: '2026-11', hasil: {} }, { periode: '2026-10', hasil: { a: 'hilang' } }])).toEqual({});
  });
});

describe('idDariQr', () => {
  it('dari tautan stiker atau kode mentah', () => {
    expect(idDariQr('https://perpusbq.vercel.app/b/abcd1234')).toBe('abcd1234');
    expect(idDariQr('abcd1234')).toBe('abcd1234');
  });
  it('menolak isi lain', () => {
    for (const s of ['https://evil.com/x', 'ABCD12345', '', 'https://x.id/b/abcd12']) expect(idDariQr(s)).toBeNull();
  });
});

describe('catatPindai', () => {
  it('pindai pertama = ada 1', () => {
    expect(catatPindai(buku('a', '1', 2), null)).toEqual({ hasil: 'ada', jumlahAda: 1 });
  });
  it('eksemplar berikutnya menambah, dibatasi jumlah eksemplar', () => {
    expect(catatPindai(buku('a', '1', 2), item('a', 'ada', 1))).toEqual({ hasil: 'ada', jumlahAda: 2 });
    expect(catatPindai(buku('a', '1', 2), item('a', 'ada', 2))).toEqual({ hasil: 'ada', jumlahAda: 2 });
  });
  it('yang tadinya hilang/rusak jadi ada 1', () => {
    expect(catatPindai(buku('a', '1', 2), item('a', 'hilang', 0))).toEqual({ hasil: 'ada', jumlahAda: 1 });
  });
});
