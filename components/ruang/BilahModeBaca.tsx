'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '@/components/auth/AuthProvider';
import { ROOM_LABEL } from '@/lib/auth/rooms';
import { padananKerja } from '@/lib/ruang/mode';

/** Bilah tipis di atas konten Ruang Lembaga: penanda baca saja + jalan pintas ke ruang kerja. */
export function BilahModeBaca() {
  const pathname = usePathname();
  const { rooms } = useAuth();
  const padanan = padananKerja(pathname);
  const bisaUbah = padanan && rooms.includes(padanan.room);
  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:bg-violet-950/40 dark:text-violet-100 print:hidden">
      <span className="inline-flex items-center gap-1.5 font-bold">
        <Eye size={15} weight="bold" aria-hidden="true" /> Mode baca
      </span>
      {bisaUbah && (
        <Link href={padanan.href} className="inline-flex items-center gap-1 font-bold underline-offset-2 hover:underline">
          Ubah di {ROOM_LABEL[padanan.room]} <ArrowRight size={13} weight="bold" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
