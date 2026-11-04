import type { Room } from '@/lib/auth/rooms';

export type KunciIkon = 'beranda' | 'donatur' | 'surat' | 'direktori' | 'berkas' | 'pengguna' | 'tambah' | 'folder' | 'keuangan' | 'buku' | 'audit' | 'pinjaman' | 'anggota' | 'penulis' | 'catatan';
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
const BERANDA_LEMBAGA: ItemMenu = { href: '/lembaga', label: 'Beranda', labelPendek: 'Beranda', ikon: 'beranda', warna: 'hijau' };
const SANTRI_LEMBAGA: ItemMenu = { href: '/lembaga/santri', label: 'Santri', labelPendek: 'Santri', ikon: 'direktori', warna: 'biru' };
const DONATUR_LEMBAGA: ItemMenu = { href: '/lembaga/donatur', label: 'Donatur', labelPendek: 'Donatur', ikon: 'donatur', warna: 'biru' };
const SURAT_LEMBAGA: ItemMenu = { href: '/lembaga/surat', label: 'Surat', labelPendek: 'Surat', ikon: 'surat', warna: 'jingga' };
const BERKAS_LEMBAGA: ItemMenu = { href: '/lembaga/berkas', label: 'Berkas lembaga', labelPendek: 'Berkas', ikon: 'folder', warna: 'ungu' };
const KEUANGAN_LEMBAGA: ItemMenu = { href: '/lembaga/keuangan', label: 'Keuangan', labelPendek: 'Keuangan', ikon: 'keuangan', warna: 'hijau' };

const BERANDA_PERPUS: ItemMenu = { href: '/perpus', label: 'Beranda', labelPendek: 'Beranda', ikon: 'beranda', warna: 'hijau' };
const BUKU_PERPUS: ItemMenu = { href: '/perpus/buku', label: 'Buku', labelPendek: 'Buku', ikon: 'buku', warna: 'jingga' };
const DONASI_PERPUS: ItemMenu = { href: '/perpus/donasi', label: 'Donasi & pengadaan', labelPendek: 'Donasi', ikon: 'donatur', warna: 'biru' };
const AUDIT_PERPUS: ItemMenu = { href: '/perpus/audit', label: 'Audit kode', labelPendek: 'Audit', ikon: 'audit', warna: 'ungu' };
const PINJAMAN_PERPUS: ItemMenu = { href: '/perpus/pinjaman', label: 'Pinjaman', labelPendek: 'Pinjaman', ikon: 'pinjaman', warna: 'biru' };
const PENULIS_PERPUS: ItemMenu = { href: '/perpus/penulis', label: 'Penulis', labelPendek: 'Penulis', ikon: 'penulis', warna: 'jingga' };
const CATATAN_PERPUS: ItemMenu = { href: '/perpus/catatan', label: 'Catatan pembaca', labelPendek: 'Catatan', ikon: 'catatan', warna: 'hijau' };
const ANGGOTA_PERPUS: ItemMenu = { href: '/perpus/anggota', label: 'Anggota', labelPendek: 'Anggota', ikon: 'anggota', warna: 'ungu' };

const SURAT_SANTRI: ItemMenu = { href: '/surat', label: 'Surat Santri', labelPendek: 'Surat', ikon: 'surat', warna: 'ungu' };

/**
 * Item rail desktop. Ruang Donatur sengaja tanpa "Buat Surat": aksi utama itu tampil
 * sebagai tombol di header halaman (spec §5.1) agar tidak ganda di satu layar.
 */
export function menuRail(room: Room, o: OpsiMenu): ItemMenu[] {
  if (room === 'perpus') {
    return [BERANDA_PERPUS, PINJAMAN_PERPUS, BUKU_PERPUS, ANGGOTA_PERPUS, PENULIS_PERPUS, DONASI_PERPUS, AUDIT_PERPUS, ...(o.canManageUsers ? [CATATAN_PERPUS] : [])];
  }
  if (room === 'lembaga') return [BERANDA_LEMBAGA, SANTRI_LEMBAGA, DONATUR_LEMBAGA, SURAT_LEMBAGA, BERKAS_LEMBAGA, KEUANGAN_LEMBAGA];
  if (room === 'donatur') return [BERANDA_DONATUR, DAFTAR_DONATUR, DAFTAR_SURAT];
  return [BERANDA_SANTRI, DIREKTORI, INPUT_BERKAS, SURAT_SANTRI];
}

export type SlotHp =
  | { jenis: 'tautan'; item: ItemMenu; utama: boolean }
  | { jenis: 'akun' };

/**
 * Susunan bottom nav HP (selalu 5 slot): 2 tautan, tombol utama di tengah, slot ke-4, lalu Akun.
 * Pindah ruangan, tema & kelola pengguna ada di halaman Akun, jadi slot ke-4 dipakai tujuan
 * yang sering dibuka: Daftar Surat (donatur) atau Surat Santri (santri).
 * Ruang Lembaga: Beranda, Santri, Berkas lembaga (tengah), Donatur, Akun.
 */
export function slotHp(room: Room, o: OpsiMenu): SlotHp[] {
  const tautan = (item: ItemMenu, utama = false): SlotHp => ({ jenis: 'tautan', item, utama });
  if (room === 'lembaga') {
    return [tautan(BERANDA_LEMBAGA), tautan(SANTRI_LEMBAGA), tautan(BERKAS_LEMBAGA, true), tautan(DONATUR_LEMBAGA), { jenis: 'akun' }];
  }
  if (room === 'perpus') {
    // Penulis, Donasi, Audit, & Catatan tetap terjangkau dari ubin Beranda.
    return [tautan(BERANDA_PERPUS), tautan(PINJAMAN_PERPUS), tautan(BUKU_PERPUS, true), tautan(ANGGOTA_PERPUS), { jenis: 'akun' }];
  }
  const [a, b, tengah] = room === 'donatur'
    ? [BERANDA_DONATUR, DAFTAR_DONATUR, BUAT_SURAT]
    : [BERANDA_SANTRI, DIREKTORI, TAMBAH_BERKAS];
  const keempat = room === 'donatur' ? DAFTAR_SURAT : SURAT_SANTRI;
  return [tautan(a), tautan(b), tautan(tengah, true), tautan(keempat), { jenis: 'akun' }];
}

const BERANDA = new Set(['/', '/donatur', '/lembaga', '/perpus']);

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
