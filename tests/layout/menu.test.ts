import { describe, it, expect } from 'vitest';
import { menuRail, slotHp, itemAktif, sembunyikanNavHp, type SlotHp } from '@/lib/nav/menu';

const hrefSlot = (s: SlotHp[]) => s.flatMap(x => (x.jenis === 'tautan' ? [x.item.href] : []));
const dua = { canManageUsers: true, jumlahRuang: 2 };

describe('menuRail', () => {
  it('ruang donatur: Beranda, Donatur, Surat — tanpa Buat Surat (aksi utama ada di header halaman)', () => {
    expect(menuRail('donatur', dua).map(i => i.href)).toEqual(['/donatur', '/donatur/daftar', '/donatur/surat']);
  });
  it('ruang santri menampilkan Pengguna hanya untuk pengelola akun', () => {
    expect(menuRail('santri', dua).map(i => i.href)).toEqual(['/', '/santri', '/tambah', '/pengguna']);
    expect(menuRail('santri', { canManageUsers: false, jumlahRuang: 1 }).map(i => i.href)).toEqual(['/', '/santri', '/tambah']);
  });
});

describe('slotHp', () => {
  it('donatur: 5 slot, tombol tengah Buat Surat, slot ke-4 Daftar Surat (pindah ruangan di halaman Akun)', () => {
    for (const jumlahRuang of [1, 2]) {
      const s = slotHp('donatur', { canManageUsers: false, jumlahRuang });
      expect(s.map(x => x.jenis)).toEqual(['tautan', 'tautan', 'tautan', 'tautan', 'akun']);
      expect(s[2]).toMatchObject({ jenis: 'tautan', utama: true, item: { href: '/donatur/surat/baru' } });
      expect(s[3]).toMatchObject({ jenis: 'tautan', utama: false, item: { href: '/donatur/surat' } });
    }
  });
  it('santri: slot ke-4 Pengguna untuk pengelola akun, selain itu tombol tema', () => {
    expect(slotHp('santri', dua)[3]).toMatchObject({ jenis: 'tautan', item: { href: '/pengguna' } });
    const s = slotHp('santri', { canManageUsers: false, jumlahRuang: 1 });
    expect(s.map(x => x.jenis)).toEqual(['tautan', 'tautan', 'tautan', 'tema', 'akun']);
    expect(s[2]).toMatchObject({ utama: true, item: { href: '/tambah' } });
  });
  it('tidak ada tujuan ganda dalam satu bottom nav', () => {
    for (const room of ['donatur', 'santri', 'lembaga'] as const) {
      for (const jumlahRuang of [1, 2]) {
        const h = hrefSlot(slotHp(room, { canManageUsers: true, jumlahRuang }));
        expect(new Set(h).size).toBe(h.length);
      }
    }
  });
  it('label pendek muat di HP dan tidak berawalan "+"', () => {
    for (const room of ['donatur', 'santri', 'lembaga'] as const) {
      for (const x of slotHp(room, dua)) {
        if (x.jenis !== 'tautan') continue;
        expect(x.item.labelPendek.length).toBeLessThanOrEqual(9);
        expect(x.item.labelPendek.startsWith('+')).toBe(false);
      }
    }
  });
});

describe('itemAktif', () => {
  it('beranda hanya aktif pada path persis', () => {
    expect(itemAktif('/donatur', '/donatur')).toBe(true);
    expect(itemAktif('/donatur/daftar', '/donatur')).toBe(false);
    expect(itemAktif('/', '/')).toBe(true);
    expect(itemAktif('/santri', '/')).toBe(false);
  });
  it('prefix dengan batas segmen', () => {
    expect(itemAktif('/donatur/daftar/abc', '/donatur/daftar')).toBe(true);
    expect(itemAktif('/santrikhusus', '/santri')).toBe(false);
  });
  it('Daftar Surat tidak aktif di halaman Buat Surat, tetapi aktif di detail surat', () => {
    expect(itemAktif('/donatur/surat/baru', '/donatur/surat')).toBe(false);
    expect(itemAktif('/donatur/surat/123', '/donatur/surat')).toBe(true);
  });
});

describe('sembunyikanNavHp', () => {
  it('di Buat Surat dan wizard santri saja', () => {
    expect(sembunyikanNavHp('/donatur/surat/baru')).toBe(true);
    expect(sembunyikanNavHp('/donatur/surat')).toBe(false);
    expect(sembunyikanNavHp('/tambah')).toBe(true);
    expect(sembunyikanNavHp('/santri/abc/edit')).toBe(true);
    expect(sembunyikanNavHp('/santri/abc')).toBe(false);
    expect(sembunyikanNavHp('/donatur/surat/abc/edit')).toBe(true);
  });
  it('label Ruang Santri: Santri baru', () => {
    expect(menuRail('santri', dua).find(i => i.href === '/tambah')?.label).toBe('Santri baru');
    expect(slotHp('santri', dua)[2]).toMatchObject({ item: { labelPendek: 'Santri' } });
  });
});

describe('Ruang Lembaga', () => {
  it('rail: Beranda, Santri, Donatur, Surat, Berkas lembaga, Keuangan', () => {
    expect(menuRail('lembaga', dua).map(i => i.href)).toEqual(
      ['/lembaga', '/lembaga/santri', '/lembaga/donatur', '/lembaga/surat', '/lembaga/berkas', '/lembaga/keuangan']);
  });
  it('bottom nav: 5 slot, tombol tengah Berkas lembaga', () => {
    const s = slotHp('lembaga', dua);
    expect(s.map(x => x.jenis)).toEqual(['tautan', 'tautan', 'tautan', 'tautan', 'akun']);
    expect(s[2]).toMatchObject({ utama: true, item: { href: '/lembaga/berkas' } });
    expect(s[3]).toMatchObject({ utama: false, item: { href: '/lembaga/donatur' } });
  });
  it('beranda lembaga hanya aktif di path persis', () => {
    expect(itemAktif('/lembaga', '/lembaga')).toBe(true);
    expect(itemAktif('/lembaga/santri', '/lembaga')).toBe(false);
  });
});
