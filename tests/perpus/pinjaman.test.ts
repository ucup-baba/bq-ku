import { describe, it, expect } from 'vitest';
import {
  ATURAN, PinjamanError, bukanPeminjam, galatDariRpc, hariIniWib, jatuhTempoBawaan,
  pesanPengingatWa, susunAntrian, tambahHari, tampilanPinjam, terlambat, transisi,
} from '@/lib/perpus/pinjaman';
import type { AksiPinjaman, StatusPinjaman } from '@/lib/perpus/tipe';

const SEMUA: StatusPinjaman[] = ['diajukan', 'dipinjam', 'menunggu_verifikasi', 'dikembalikan', 'ditolak', 'dibatalkan'];

describe('transisi', () => {
  const sah: [StatusPinjaman, AksiPinjaman, StatusPinjaman][] = [
    ['diajukan', 'acc', 'dipinjam'],
    ['diajukan', 'tolak', 'ditolak'],
    ['diajukan', 'batal', 'dibatalkan'],
    ['dipinjam', 'klaim', 'menunggu_verifikasi'],
    ['dipinjam', 'tandai_kembali', 'dikembalikan'],
    ['dipinjam', 'perpanjang', 'dipinjam'],
    ['menunggu_verifikasi', 'verifikasi', 'dikembalikan'],
  ];
  it.each(sah)('%s + %s → %s', (dari, aksi, ke) => {
    expect(transisi(dari, aksi)).toBe(ke);
  });
  it('kombinasi lain tidak sah', () => {
    for (const status of SEMUA) for (const aksi of Object.keys(ATURAN) as AksiPinjaman[]) {
      if (!sah.some(([d, a]) => d === status && a === aksi)) expect(transisi(status, aksi)).toBeNull();
    }
  });
});

describe('tanggal WIB', () => {
  it('pukul 18.00 UTC sudah besok menurut WIB', () => {
    expect(hariIniWib(new Date('2026-11-04T18:00:00Z'))).toBe('2026-11-05');
    expect(hariIniWib(new Date('2026-11-04T16:59:00Z'))).toBe('2026-11-04');
  });
  it('tambahHari melewati batas bulan', () => {
    expect(tambahHari('2026-11-25', 14)).toBe('2026-12-09');
  });
  it('jatuh tempo bawaan 14 hari', () => {
    expect(jatuhTempoBawaan(new Date('2026-11-04T01:00:00Z'))).toBe('2026-11-18');
  });
});

describe('terlambat', () => {
  it('hanya bila dipinjam dan melewati jatuh tempo', () => {
    expect(terlambat({ status: 'dipinjam', jatuhTempo: '2026-11-03' }, '2026-11-04')).toBe(true);
    expect(terlambat({ status: 'dipinjam', jatuhTempo: '2026-11-04' }, '2026-11-04')).toBe(false);
    expect(terlambat({ status: 'menunggu_verifikasi', jatuhTempo: '2026-11-03' }, '2026-11-04')).toBe(false);
    expect(terlambat({ status: 'dipinjam', jatuhTempo: null }, '2026-11-04')).toBe(false);
  });
});

describe('susunAntrian', () => {
  it('memisah pengajuan, klaim, terlambat', () => {
    const r = [
      { id: '1', status: 'diajukan', jatuhTempo: null },
      { id: '2', status: 'menunggu_verifikasi', jatuhTempo: '2026-11-01' },
      { id: '3', status: 'dipinjam', jatuhTempo: '2026-11-01' },
      { id: '4', status: 'dipinjam', jatuhTempo: '2026-12-01' },
    ] as never[];
    const a = susunAntrian(r, '2026-11-04');
    expect(a.pengajuan.map((p: { id: string }) => p.id)).toEqual(['1']);
    expect(a.klaim.map((p: { id: string }) => p.id)).toEqual(['2']);
    expect(a.terlambat.map((p: { id: string }) => p.id)).toEqual(['3']);
  });
});

describe('galatDariRpc', () => {
  it('mengurai kode dan status saat ini', () => {
    const g = galatDariRpc('perpus:status_tidak_sah:dipinjam');
    expect(g).toBeInstanceOf(PinjamanError);
    expect(g).toMatchObject({ kode: 'status_tidak_sah', statusSaatIni: 'dipinjam' });
    expect(galatDariRpc('perpus:stok_habis').message).toBe('Semua eksemplar sedang dipinjam');
  });
  it('pesan lain tetap Error biasa', () => {
    const g = galatDariRpc('koneksi putus');
    expect(g).not.toBeInstanceOf(PinjamanError);
    expect(g.message).toContain('koneksi putus');
  });
});

describe('pesanPengingatWa', () => {
  const dasar = { nama: 'Aisyah', judul: 'Rembulan', jatuhTempo: '2026-11-18' };
  it('sebelum jatuh tempo menyebut tanggal', () => {
    const p = pesanPengingatWa(dasar, '2026-11-10');
    expect(p).toContain('Aisyah');
    expect(p).toContain('Rembulan');
    expect(p).toContain('18 Nov 2026');
    expect(p).not.toContain('terlewat');
  });
  it('terlambat disebutkan', () => {
    expect(pesanPengingatWa(dasar, '2026-11-20')).toContain('terlewat');
  });
});

describe('bukanPeminjam', () => {
  it('membuang akun nonaktif yang terdaftar anggota', () => {
    const rows = [{ id: 'a', aktif: false }, { id: 'b', aktif: false }, { id: 'c', aktif: true }];
    expect(bukanPeminjam(rows, new Set(['a', 'c'])).map(r => r.id)).toEqual(['b', 'c']);
  });
});

describe('tampilanPinjam', () => {
  const dasar = { masuk: true, anggota: 'aktif', pinjamanAktif: null, tersedia: 1 } as const;
  it('belum dimuat', () => {
    expect(tampilanPinjam(null)).toBe('memuat');
  });
  it('tamu ke masuk, walau stok habis', () => {
    expect(tampilanPinjam({ ...dasar, masuk: false, anggota: null, tersedia: 0 })).toBe('masuk');
  });
  it('sesi tanpa anggota ke daftar', () => {
    expect(tampilanPinjam({ ...dasar, anggota: null })).toBe('daftar');
  });
  it('pinjaman aktif didahulukan dari stok habis & blokir', () => {
    expect(tampilanPinjam({ ...dasar, pinjamanAktif: 'dipinjam', tersedia: 0 })).toBe('sudah_ada');
    expect(tampilanPinjam({ ...dasar, anggota: 'diblokir', pinjamanAktif: 'diajukan' })).toBe('sudah_ada');
  });
  it('diblokir didahulukan dari stok habis', () => {
    expect(tampilanPinjam({ ...dasar, anggota: 'diblokir', tersedia: 0 })).toBe('diblokir');
  });
  it('stok habis atau buku tidak ada', () => {
    expect(tampilanPinjam({ ...dasar, tersedia: 0 })).toBe('habis');
    expect(tampilanPinjam({ ...dasar, tersedia: null })).toBe('habis');
  });
  it('anggota aktif dan stok ada', () => {
    expect(tampilanPinjam(dasar)).toBe('bisa');
  });
});
