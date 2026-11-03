import { describe, it, expect } from 'vitest';
import {
  uraiCsv, uraiRupiah, uraiTanggal, uraiBuku, uraiInfaq, uraiPengadaan, susunRencana, kunciJudul, type BukuSheet,
} from '@/lib/perpus/impor';

describe('uraiCsv', () => {
  it('kutip, koma & baris baru di dalam sel', () => {
    expect(uraiCsv('a,"b,c",d\n1,"x\r\n\r\ny",2\n')).toEqual([['a', 'b,c', 'd'], ['1', 'x\r\n\r\ny', '2']]);
    expect(uraiCsv('"a ""q"""')).toEqual([['a "q"']]);
  });
});

describe('nilai sel', () => {
  it('rupiah', () => {
    expect(uraiRupiah('Rp1.384.000')).toBe(1384000);
    expect(uraiRupiah(' Rp 256.015 ')).toBe(256015);
    expect(uraiRupiah('19 BUKU')).toBeNull();
  });
  it('tanggal', () => {
    expect(uraiTanggal('14/03/2025', null)).toBe('2025-03-14');
    expect(uraiTanggal('31/12/1899', null)).toBeNull();
    expect(uraiTanggal('07 Juni', 2025)).toBe('2025-06-07');
    expect(uraiTanggal('September', 2025)).toBeNull();
    expect(uraiTanggal('2025', 2025)).toBeNull();
  });
  it('kunci judul mengabaikan artikel & tanda baca', () => {
    expect(kunciJudul('The Psychology of Money')).toBe(kunciJudul('Psychology  of money'));
  });
});

describe('uraiBuku', () => {
  it('penulis diwariskan, sel dirapikan, baris kosong dilewati', () => {
    const csv = [',,,,', 'NO,Penulis,Daftar Buku ,Kode,', '1,Tere Liye,Bumi ,813 LIY b.01,', '2,,Bulan ,813 LIY b.02,',
      '3,(Herman Melville),Moby Dick ,813 MEL M,', '4,,,,'].join('\n');
    expect(uraiBuku(uraiCsv(csv))).toEqual([
      { no: 1, penulis: 'Tere Liye', judul: 'Bumi', kodeLama: '813 LIY b.01' },
      { no: 2, penulis: 'Tere Liye', judul: 'Bulan', kodeLama: '813 LIY b.02' },
      { no: 3, penulis: 'Herman Melville', judul: 'Moby Dick', kodeLama: '813 MEL M' },
    ]);
  });
});

describe('uraiInfaq', () => {
  it('donasi uang/buku dan daftar judul wakaf per donatur', () => {
    const csv = [
      'Total Infaq :,,,Rp16.000,,Pengadaan Buku,Rp0,,Saldo,Rp16.000',
      'No,Tanggal,Nama,Jumlah,,,,,,',
      '1,14/03/2025,Handoko,Rp6.000,,,,,Judul Buku,',
      '2,06/04/2025,Bu Siti,2 BUKU,,,Bu Siti,,Bumi,',
      '3,31/12/1899,Rongsokan,Rp10.000,,,,,Bulan,',
      ',,,,,,Bu Anis,,Munajat Cinta,',
    ].join('\n');
    const h = uraiInfaq(uraiCsv(csv));
    expect(h.donasi).toEqual([
      { kunci: 'infaq-1', tanggal: '2025-03-14', tanggalTeks: '14/03/2025', nama: 'Handoko', jenis: 'uang', jumlah: 6000, jumlahBuku: null },
      { kunci: 'infaq-2', tanggal: '2025-04-06', tanggalTeks: '06/04/2025', nama: 'Bu Siti', jenis: 'buku', jumlah: null, jumlahBuku: 2 },
      { kunci: 'infaq-3', tanggal: null, tanggalTeks: '31/12/1899', nama: 'Rongsokan', jenis: 'uang', jumlah: 10000, jumlahBuku: null },
    ]);
    expect(h.wakaf).toEqual([
      { donatur: 'Bu Siti', judul: 'Bumi' }, { donatur: 'Bu Siti', judul: 'Bulan' }, { donatur: 'Bu Anis', judul: 'Munajat Cinta' },
    ]);
  });
});

describe('uraiPengadaan', () => {
  it('mengelompokkan per pembelian; tahun diwariskan', () => {
    const csv = ['  ,,,Rp500,,', 'No,Tanggal,Nama Buku,Karangan,Harga,Ollshop', '1,28/03/2025,Bulan,Tere Liye,Rp300,',
      '2,,Moby Dick,,,', '3,07 Juni,The Psychology of Money,Morgan Housel, Rp 200 ,', '4,,,,,'].join('\n');
    expect(uraiPengadaan(uraiCsv(csv))).toEqual([
      { kunci: 'pengadaan-1', tanggal: '2025-03-28', tanggalTeks: '28/03/2025', total: 300, judul: ['Bulan', 'Moby Dick'] },
      { kunci: 'pengadaan-2', tanggal: '2025-06-07', tanggalTeks: '07 Juni', total: 200, judul: ['The Psychology of Money'] },
    ]);
  });
});

describe('susunRencana', () => {
  const buku: BukuSheet[] = [
    { no: 1, penulis: 'Tere Liye', judul: 'Bumi', kodeLama: '813 LIY b.01' },
    { no: 2, penulis: 'Tere Liye', judul: 'Bulan', kodeLama: '813 LIY b.02' },
    { no: 3, penulis: 'Tere Liye', judul: 'Rasa', kodeLama: '813 LIY R' },
    { no: 4, penulis: 'Tere Liye', judul: 'Rembulan', kodeLama: '813 LIY R' },
    { no: 5, penulis: 'Penerbit Andi', judul: 'Sapu Bersih', kodeLama: '500 AND Sa' },
    { no: 6, penulis: 'Penerbit Andi', judul: 'Sapu Bersih', kodeLama: '500 AND Sa' },
    { no: 7, penulis: 'Salim A Fillah', judul: 'Sang Pangeran', kodeLama: '' },
    { no: 8, penulis: 'Morgan Housel', judul: 'The Psychology of Money', kodeLama: '158 HOU T' },
  ];
  const infaq = {
    donasi: [
      { kunci: 'infaq-18', tanggal: '2025-06-01', tanggalTeks: '', nama: 'Bu Lestari', jenis: 'buku' as const, jumlah: null, jumlahBuku: 1 },
      { kunci: 'infaq-28', tanggal: '2025-10-10', tanggalTeks: '', nama: 'Bu Lestari', jenis: 'buku' as const, jumlah: null, jumlahBuku: 2 },
    ],
    wakaf: [{ donatur: 'Bu Lestari', judul: 'Judul Hilang' }, { donatur: 'Bu Lestari', judul: 'Bulan' }, { donatur: 'Bu Lestari', judul: 'Bumi' }],
  };
  const pengadaan = [{ kunci: 'pengadaan-1', tanggal: null, tanggalTeks: 'September', total: 200, judul: ['Psychology of Money', 'Bumi'] }];
  const r = susunRencana({ buku, infaq, pengadaan });
  const cari = (judul: string) => r.buku.find(b => b.judul === judul)!;

  it('buku kembar judul+penulis digabung jadi eksemplar', () => {
    expect(r.buku).toHaveLength(7);
    expect(cari('Sapu Bersih').eksemplar).toBe(2);
  });
  it('kode kembar & kosong → TMP + catatan audit', () => {
    expect(cari('Rasa').nomorPanggil).toBe('813 LIY r');
    expect(cari('Rembulan')).toMatchObject({ nomorPanggil: 'TMP-0004', catatanAudit: 'Kode kembar: 813 LIY r' });
    expect(cari('Sang Pangeran')).toMatchObject({ nomorPanggil: 'TMP-0007', catatanAudit: 'Belum berkode', kelasDdc: '' });
  });
  it('seri dari kode lama dipertahankan', () => {
    expect(cari('Bumi')).toMatchObject({ nomorPanggil: '813 LIY b.01', noSeri: 1, kodeJudul: 'b' });
  });
  it('judul wakaf tak cocok tetap memakai jatah donasi', () => {
    expect(cari('Bulan')).toMatchObject({ asal: 'wakaf', donasiKunci: 'infaq-28' });
    expect(r.tidakCocok).toContainEqual({ sumber: 'wakaf', judul: 'Judul Hilang' });
  });
  it('pengadaan: artikel diabaikan; wakaf tidak ditimpa', () => {
    expect(cari('The Psychology of Money')).toMatchObject({ asal: 'pengadaan', pengadaanKunci: 'pengadaan-1' });
    expect(cari('Bumi')).toMatchObject({ asal: 'wakaf', pengadaanKunci: 'pengadaan-1' });
    expect(r.tidakCocok).toContainEqual({ sumber: 'pengadaan', judul: 'Bumi (juga tercatat wakaf)' });
    expect(r.pengadaan).toEqual([{ kunci: 'pengadaan-1', tanggal: null, tanggalTeks: 'September', total: 200 }]);
  });
});
