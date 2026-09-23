'use client';
import { Drawer } from 'vaul';
import { X } from '@phosphor-icons/react';
import { TombolIkon } from './Tombol';

/** Lembar modal dari bawah (HP); di desktop tampil melayang di tengah bawah dengan lebar maks. 28rem. */
export function LembarBawah({ buka, onTutup, judul, children }: {
  buka: boolean; onTutup: () => void; judul: string; children: React.ReactNode;
}) {
  return (
    <Drawer.Root open={buka} onOpenChange={(o) => { if (!o) onTutup(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px]" />
        <Drawer.Content aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full flex-col rounded-t-[28px] border border-bq-garis bg-bq-surface shadow-angkat outline-none md:bottom-6 md:max-w-md md:rounded-[28px]">
          <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
          <div className="flex items-center justify-between gap-3 px-5 pt-3">
            <Drawer.Title className="text-base font-extrabold text-bq-tinta">{judul}</Drawer.Title>
            <TombolIkon ikon={X} label="Tutup" varian="polos" ukuran="sm" onClick={onTutup} />
          </div>
          <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export const SNAP_PANEL = [0.28, 0.6, 1] as const;

/** Panel non-modal yang selalu terbuka dengan 3 titik tarik (dipakai Buat Surat di HP). */
export function PanelTetap({ snap, onSnap, judul, children }: {
  snap: number; onSnap: (s: number) => void; judul: string; children: React.ReactNode;
}) {
  return (
    <Drawer.Root open modal={false} dismissible={false} snapPoints={[...SNAP_PANEL]}
      activeSnapPoint={snap} setActiveSnapPoint={(s) => { if (typeof s === 'number') onSnap(s); }}>
      <Drawer.Portal>
        <Drawer.Content aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-40 flex h-[100dvh] flex-col rounded-t-[28px] border-t border-bq-garis bg-bq-surface shadow-[0_-12px_30px_-12px_rgb(0_0_0/0.25)] outline-none">
          <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
          <Drawer.Title className="sr-only">{judul}</Drawer.Title>
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
