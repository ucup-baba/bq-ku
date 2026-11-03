import { describe, it, expect } from 'vitest';
import { bacaSaringan, bukuTerbaru, daftarGenre, daftarPengarang, saringKatalog, urlKatalog } from '@/lib/perpus/katalog';
import { rupiahPublik, tanggalPublik } from '@/lib/perpus/format-publik';
import type { BukuPublik } from '@/lib/perpus/tipe';

const b = (o: Partial<BukuPublik>): BukuPublik => ({
  id: 'x', idPendek: 'x', judul: '', penulis: '', nomorPanggil: null, kelasDdc: '', eksemplar: 1, tersedia: 1,
  sampulPath: null, asal: 'koleksi_awal', namaDonatur: null, createdAt: '2026-01-01T00:00:00Z', ...o,
});
const data = [
  b({ id: '1', judul: 'Bumi', penulis: 'Tere Liye', kelasDdc: '899.221' }),
  b({ id: '2', judul: 'Rasa', penulis: 'Tere Liye', kelasDdc: '899.221', tersedia: 0 }),
  b({ id: '3', judul: 'Fiqih Muyassar', penulis: 'Sa‘id', kelasDdc: '297.4' }),
  b({ id: '4', judul: 'Café Lama', penulis: '', kelasDdc: '' }),
];
const id = (x: BukuPublik[]) => x.map(y => y.id);

describe('saringKatalog', () => {
  it('cari judul/penulis tanpa peka huruf & diakritik', () => {
    expect(id(saringKatalog(data, { q: 'tere' }))).toEqual(['1', '2']);
    expect(id(saringKatalog(data, { q: 'CAFE' }))).toEqual(['4']);
  });
  it('filter genre lalu pengarang', () => {
    expect(id(saringKatalog(data, { genre: 'islam' }))).toEqual(['3']);
    expect(id(saringKatalog(data, { genre: 'sastra', pengarang: 'Tere Liye' }))).toEqual(['1', '2']);
  });
  it('hanya tersedia', () => {
    expect(id(saringKatalog(data, { tersedia: true }))).toEqual(['1', '3', '4']);
  });
});

describe('daftar & saringan', () => {
  it('genre urut terbanyak', () => {
    expect(daftarGenre(data)[0]).toEqual({ genre: 'sastra', jumlah: 2 });
  });
  it('pengarang unik, tanpa kosong, mengikuti genre', () => {
    expect(daftarPengarang(data, 'sastra')).toEqual(['Tere Liye']);
    expect(daftarPengarang(data)).toHaveLength(2);
  });
  it('bacaSaringan membuang genre tak dikenal', () => {
    expect(bacaSaringan({ q: ' bumi ', genre: 'ngawur', tersedia: '1' })).toEqual({ q: 'bumi', tersedia: true });
    expect(bacaSaringan({ genre: 'islam', pengarang: ['a', 'b'] })).toEqual({ genre: 'islam', pengarang: 'a' });
  });
  it('urlKatalog hanya memuat isian terisi', () => {
    expect(urlKatalog('en', {})).toBe('/en/katalog');
    expect(urlKatalog('id', { q: 'a b', genre: 'islam', tersedia: true })).toBe('/id/katalog?q=a+b&genre=islam&tersedia=1');
  });
  it('bukuTerbaru urut createdAt menurun', () => {
    const baru = b({ id: '9', createdAt: '2026-06-01T00:00:00Z' });
    expect(id(bukuTerbaru([...data, baru], 1))).toEqual(['9']);
  });
});

describe('format', () => {
  it('rupiah per bahasa', () => {
    expect(rupiahPublik('id', 1500000)).toBe('Rp1.500.000');
    expect(rupiahPublik('en', 1500000)).toBe('Rp1,500,000');
  });
  it('tanggal per bahasa dengan cadangan teks', () => {
    expect(tanggalPublik('id', '2026-03-05')).toBe('5 Mar 2026');
    expect(tanggalPublik('en', '2026-03-05')).toBe('Mar 5, 2026');
    expect(tanggalPublik('id', null, 'Ramadhan 2024')).toBe('Ramadhan 2024');
    expect(tanggalPublik('id', null)).toBe('—');
  });
});
