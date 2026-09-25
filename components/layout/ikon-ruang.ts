import { BookOpen, HandCoins, Buildings, type Icon } from '@phosphor-icons/react';
import type { WarnaUbin } from '@/components/ui/IkonUbin';
import type { Room } from '@/lib/auth/rooms';

/** Ikon & warna identitas tiap ruangan (header rail, tombol pindah ruangan). */
export const RUANG_TAMPILAN: Record<Room, { ikon: Icon; warna: WarnaUbin }> = {
  santri: { ikon: BookOpen, warna: 'hijau' },
  donatur: { ikon: HandCoins, warna: 'biru' },
  lembaga: { ikon: Buildings, warna: 'ungu' },
};
