import { House, HandHeart, Scroll, Users, FilePlus, ShieldCheck, Plus, FolderSimple, Wallet, Books, ListChecks, BookBookmark, UserList, PenNib, ChatCircleText, type Icon } from '@phosphor-icons/react';
import type { KunciIkon } from '@/lib/nav/menu';

export const IKON_MENU: Record<KunciIkon, Icon> = {
  beranda: House,
  donatur: HandHeart,
  surat: Scroll,
  direktori: Users,
  berkas: FilePlus,
  pengguna: ShieldCheck,
  tambah: Plus,
  folder: FolderSimple,
  keuangan: Wallet,
  buku: Books,
  audit: ListChecks,
  pinjaman: BookBookmark,
  anggota: UserList,
  penulis: PenNib,
  catatan: ChatCircleText,
};
