import { describe, it, expect } from 'vitest';
import { menuRail, slotHp, itemAktif } from '@/lib/nav/menu';

const o = { canManageUsers: false, jumlahRuang: 1 };

describe('menu Ruang Perpus', () => {
  it('rail berisi beranda, buku, donasi, audit', () => {
    expect(menuRail('perpus', o).map(i => i.href)).toEqual(['/perpus', '/perpus/buku', '/perpus/donasi', '/perpus/audit']);
  });
  it('HP: 5 slot, Buku di tengah', () => {
    const s = slotHp('perpus', o);
    expect(s).toHaveLength(5);
    expect(s[2]).toMatchObject({ jenis: 'tautan', utama: true, item: { href: '/perpus/buku' } });
    expect(s[4]).toEqual({ jenis: 'akun' });
  });
  it('beranda perpus hanya aktif persis di /perpus', () => {
    expect(itemAktif('/perpus/buku', '/perpus')).toBe(false);
    expect(itemAktif('/perpus', '/perpus')).toBe(true);
  });
});
