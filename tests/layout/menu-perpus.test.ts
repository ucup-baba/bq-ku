import { describe, it, expect } from 'vitest';
import { menuRail, slotHp, itemAktif } from '@/lib/nav/menu';

const o = { canManageUsers: false, jumlahRuang: 1 };

describe('menu Ruang Perpus', () => {
  it('rail pustakawan tanpa moderasi catatan', () => {
    expect(menuRail('perpus', o).map(i => i.href)).toEqual(['/perpus', '/perpus/pinjaman', '/perpus/buku', '/perpus/anggota', '/perpus/penulis', '/perpus/donasi', '/perpus/audit', '/perpus/cek']);
  });
  it('super admin mendapat moderasi catatan', () => {
    expect(menuRail('perpus', { ...o, canManageUsers: true }).at(-1)?.href).toBe('/perpus/catatan');
  });
  it('HP: 5 slot, Buku di tengah, pinjaman & anggota mengapit', () => {
    const s = slotHp('perpus', o);
    expect(s).toHaveLength(5);
    expect(s[1]).toMatchObject({ jenis: 'tautan', item: { href: '/perpus/pinjaman' } });
    expect(s[2]).toMatchObject({ jenis: 'tautan', utama: true, item: { href: '/perpus/buku' } });
    expect(s[3]).toMatchObject({ jenis: 'tautan', item: { href: '/perpus/anggota' } });
    expect(s[4]).toEqual({ jenis: 'akun' });
  });
  it('beranda perpus hanya aktif persis di /perpus', () => {
    expect(itemAktif('/perpus/buku', '/perpus')).toBe(false);
    expect(itemAktif('/perpus', '/perpus')).toBe(true);
  });
});
