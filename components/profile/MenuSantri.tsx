'use client';
import { useEffect, useRef, useState } from 'react';
import { DotsThreeVertical, ShareNetwork, Printer } from '@phosphor-icons/react';
import { TombolIkon } from '@/components/ui/Tombol';

const kelasItem = 'flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-bq-tinta hover:bg-slate-100 dark:hover:bg-slate-800';

/** Menu "⋯" Detail Santri: Bagikan tautan profil & Cetak CV. */
export function MenuSantri({ nama }: { nama: string }) {
  const [buka, setBuka] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;
    const luar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setBuka(false); };
    document.addEventListener('mousedown', luar);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', luar); document.removeEventListener('keydown', esc); };
  }, [buka]);

  const bagikan = async () => {
    const url = window.location.href.split('?')[0];
    if (navigator.share) {
      navigator.share({ title: `Profil Santri - ${nama}`, text: `Profil santri ${nama}`, url }).catch(() => {});
      setBuka(false);
      return;
    }
    try { await navigator.clipboard.writeText(url); setInfo('Tautan profil disalin'); } catch { setInfo('Gagal menyalin tautan'); }
  };

  return (
    <div ref={ref} className="relative print:hidden">
      <TombolIkon ikon={DotsThreeVertical} label="Menu santri" aria-haspopup="menu" aria-expanded={buka} onClick={() => { setInfo(null); setBuka(b => !b); }} />
      {buka && (
        <div role="menu" className="animate-halaman absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-bq-garis bg-bq-surface p-1.5 shadow-angkat">
          <button role="menuitem" type="button" onClick={bagikan} className={kelasItem}>
            <ShareNetwork size={18} weight="bold" aria-hidden="true" /> Bagikan profil
          </button>
          <button role="menuitem" type="button" onClick={() => { setBuka(false); window.print(); }} className={kelasItem}>
            <Printer size={18} weight="bold" aria-hidden="true" /> Cetak CV
          </button>
          {info && <p role="status" className="px-3 py-1 text-xs text-bq-redup">{info}</p>}
        </div>
      )}
    </div>
  );
}
