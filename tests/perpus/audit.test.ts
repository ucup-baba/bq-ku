import { describe, it, expect } from 'vitest';
import { rencanakanNomorBaru, barisLabel, keCsv } from '@/lib/perpus/audit';

const buku = (id: string, judul: string, penulis: string, nomorPanggil: string, seri: { kode: string; no: number } | null = null) => ({
  id, judul, penulis, kodePengarang: '', kodeJudul: seri?.kode ?? '', noSeri: seri?.no ?? null, nomorPanggil,
});

describe('rencanakanNomorBaru', () => {
  it('kode pengarang dihitung ulang, bentrok antarbuku diselesaikan berurutan', () => {
    const semua = [
      buku('a', 'Rembulan Tenggelam di Wajahmu', 'Tere Liye', '813 LIY R'),
      buku('b', 'Rasa', 'Tere Liye', 'TMP-0035'),
      buku('c', 'Bumi', 'Tere Liye', '813 LIY b.01', { kode: 'b', no: 1 }),
      buku('d', 'Hujan', 'Tere Liye', '899.221 LIY h'),
    ];
    const h = rencanakanNomorBaru(semua, [{ id: 'a', kelasDdc: '899.221' }, { id: 'b', kelasDdc: '899.221' }, { id: 'c', kelasDdc: '899.221' }]);
    expect(h.map(x => [x.id, x.nomorPanggil])).toEqual([
      ['c', '899.221 LIY b.01'], ['b', '899.221 LIY r'], ['a', '899.221 LIY re'],
    ]);
    expect(h[0]).toMatchObject({ kodePengarang: 'LIY', kodeJudul: 'b', noSeri: 1 });
  });
  it('nomor buku yang tidak diaudit tetap dihormati', () => {
    const semua = [buku('x', 'Hujan', 'Tere Liye', '899.221 LIY h'), buku('y', 'Hello', 'Tere Liye', '813 LIY HE')];
    expect(rencanakanNomorBaru(semua, [{ id: 'y', kelasDdc: '899.221' }])[0].nomorPanggil).toBe('899.221 LIY he');
  });
  it('id tak dikenal diabaikan', () => {
    expect(rencanakanNomorBaru([], [{ id: 'z', kelasDdc: '297' }])).toEqual([]);
  });
});

describe('barisLabel & CSV', () => {
  it('hanya buku baku yang nomornya berubah; satu baris per eksemplar', () => {
    const h = barisLabel([
      { judul: 'Sapu Bersih', nomorPanggil: '510 AND s', nomorPanggilLama: '500 AND Sa', eksemplar: 2, statusKode: 'baku' },
      { judul: 'Tetap', nomorPanggil: '297 SIA k', nomorPanggilLama: '297 SIA k', eksemplar: 1, statusKode: 'baku' },
      { judul: 'Belum', nomorPanggil: 'TMP-0001', nomorPanggilLama: null, eksemplar: 1, statusKode: 'perlu_audit' },
      { judul: 'Baru', nomorPanggil: '158 CLE a', nomorPanggilLama: null, eksemplar: 1, statusKode: 'baku' },
    ]);
    expect(h).toEqual([
      { judul: 'Sapu Bersih', lama: '500 AND Sa', baru: '510 AND s c.1' },
      { judul: 'Sapu Bersih', lama: '500 AND Sa', baru: '510 AND s c.2' },
      { judul: 'Baru', lama: '', baru: '158 CLE a' },
    ]);
  });
  it('CSV meng-escape koma & kutip', () => {
    expect(keCsv([['Judul', 'Nomor'], ['Kau,Aku "Angpau"', '899.221 LIY k']]))
      .toBe('Judul,Nomor\r\n"Kau,Aku ""Angpau""",899.221 LIY k\r\n');
  });
});
