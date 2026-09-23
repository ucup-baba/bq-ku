import type { Room } from '@/lib/auth/rooms';

export type KunciIkon = 'beranda' | 'donatur' | 'surat' | 'direktori' | 'berkas' | 'pengguna' | 'tambah';
export type WarnaMenu = 'hijau' | 'biru' | 'jingga' | 'ungu';
export type ItemMenu = { href: string; label: string; labelPendek: string; ikon: KunciIkon; warna: WarnaMenu };
export type OpsiMenu = { canManageUsers: boolean; jumlahRuang: number };

const BERANDA_DONATUR: ItemMenu = { href: '/donatur', label: 'Beranda', labelPendek: 'Beranda', ikon: 'beranda', warna: 'hijau' };
const DAFTAR_DONATUR: ItemMenu = { href: '/donatur/daftar', label: 'Daftar Donatur', labelPendek: 'Donatur', ikon: 'donatur', warna: 'biru' };
const DAFTAR_SURAT: ItemMenu = { href: '/donatur/surat', label: 'Daftar Surat', labelPendek: 'Surat', ikon: 'surat', warna: 'jingga' };
const BUAT_SURAT: ItemMenu = { href: '/donatur/surat/baru', label: 'Buat Surat', labelPendek: 'Surat', ikon: 'tambah', warna: 'hijau' };

const BERANDA_SANTRI: ItemMenu = { href: '/', label: 'Beranda', labelPendek: 'Beranda', ikon: 'beranda', warna: 'hijau' };
const DIREKTORI: ItemMenu = { href: '/santri', label: 'Direktori Santri', labelPendek: 'Direktori', ikon: 'direktori', warna: 'biru' };
const INPUT_BERKAS: ItemMenu = { href: '/tambah', label: 'Santri baru', labelPendek: 'Santri', ikon: 'berkas', warna: 'jingga' };
const TAMBAH_BERKAS: ItemMenu = { ...INPUT_BERKAS, ikon: 'tambah', warna: 'hijau' };
const PENGGUNA: ItemMenu = { href: '/pengguna', label: 'Akun & Pengguna', labelPendek: 'Pengguna', ikon: 'pengguna', warna: 'ungu' };

/**
 * Item rail desktop. Ruang Donatur sengaja tanpa "Buat Surat": aksi utama itu tampil
 * sebagai tombol di header halaman (spec §5.1) agar tidak ganda di satu layar.
 */
export function menuRail(room: Room, o: OpsiMenu): ItemMenu[] {
  if (room === 'donatur') return [BERANDA_DONATUR, DAFTAR_DONATUR, DAFTAR_SURAT];
  return [BERANDA_SANTRI, DIREKTORI, INPUT_BERKAS, ...(o.canManageUsers ? [PENGGUNA] : [])];
}

export type SlotHp =
  | { jenis: 'tautan'; item: ItemMenu; utama: boolean }
  | { jenis: 'pindah' }
  | { jenis: 'tema' }
  | { jenis: 'akun' };

/**
 * Susunan bottom nav HP (selalu 5 slot): 2 tautan, tombol utama di tengah, lalu Pindah ruangan
 * bila akun punya 2 ruangan — bila hanya 1 ruangan, slot itu menjadi tombol mode gelap/terang — dan Akun.
 */
export function slotHp(room: Room, o: OpsiMenu): SlotHp[] {
  const tautan = (item: ItemMenu, utama = false): SlotHp => ({ jenis: 'tautan', item, utama });
  const [a, b, tengah] = room === 'donatur'
    ? [BERANDA_DONATUR, DAFTAR_DONATUR, BUAT_SURAT]
    : [BERANDA_SANTRI, DIREKTORI, TAMBAH_BERKAS];
  const keempat: SlotHp = o.jumlahRuang > 1 ? { jenis: 'pindah' } : { jenis: 'tema' };
  return [tautan(a), tautan(b), tautan(tengah, true), keempat, { jenis: 'akun' }];
}

const BERANDA = new Set(['/', '/donatur']);

export function itemAktif(pathname: string, href: string): boolean {
  if (BERANDA.has(href)) return pathname === href;
  if (href === '/donatur/surat' && (pathname === '/donatur/surat/baru' || pathname.startsWith('/donatur/surat/baru/'))) return false;
  return pathname === href || pathname.startsWith(href + '/');
}

/** Layar satu tugas (Buat Surat, wizard santri) punya tombol aksi menempel di bawah sendiri. */
export function sembunyikanNavHp(pathname: string): boolean {
  return pathname === '/donatur/surat/baru' || pathname === '/tambah'
    || /^\/santri\/[^/]+\/edit$/.test(pathname) || /^\/donatur\/surat\/[^/]+\/edit$/.test(pathname);
}
