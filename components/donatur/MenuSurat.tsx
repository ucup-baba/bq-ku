'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DotsThreeVertical, DownloadSimple, CheckCircle, PencilSimple, Trash } from '@phosphor-icons/react';
import { TombolIkon } from '@/components/ui/Tombol';
import { DialogHapusSurat } from './DialogHapusSurat';
import { tandaiTerkirim } from '@/lib/donatur/tandai-terkirim';

const kelasItem = 'flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-bq-tinta hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800';

/** Menu "⋯" di Detail Surat: Unduh PNG, Tandai terkirim, Edit (sebelum terkirim), Hapus (dengan peringatan). */
export function MenuSurat({ suratId, nomorSurat, terkirim, namaDonatur, nilai }: {
  suratId: string; nomorSurat: string; terkirim: boolean; namaDonatur: string; nilai: string;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [menandai, setMenandai] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;
    const tutupLuar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setBuka(false); };
    document.addEventListener('mousedown', tutupLuar);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', tutupLuar); document.removeEventListener('keydown', esc); };
  }, [buka]);

  const tandai = async () => {
    setMenandai(true);
    setGalat(null);
    const g = await tandaiTerkirim(suratId);
    setMenandai(false);
    if (g) { setGalat(g); return; }
    setBuka(false);
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <TombolIkon ikon={DotsThreeVertical} label="Menu surat" aria-haspopup="menu" aria-expanded={buka} onClick={() => setBuka(b => !b)} />
      {buka && (
        <div role="menu" className="animate-halaman absolute right-0 top-full z-40 mt-2 w-60 rounded-2xl border border-bq-garis bg-bq-surface p-1.5 shadow-angkat">
          <a role="menuitem" href={`/api/donatur/surat/${suratId}/png`} download={`${nomorSurat.replace(/\//g, '-')}.png`} className={kelasItem}>
            <DownloadSimple size={18} weight="bold" aria-hidden="true" /> Unduh gambar PNG
          </a>
          {!terkirim && (
            <>
              <button role="menuitem" type="button" onClick={tandai} disabled={menandai} className={kelasItem}>
                <CheckCircle size={18} weight="bold" aria-hidden="true" /> {menandai ? 'Menandai…' : 'Tandai sudah terkirim'}
              </button>
              <Link role="menuitem" href={`/donatur/surat/${suratId}/edit`} className={kelasItem}>
                <PencilSimple size={18} weight="bold" aria-hidden="true" /> Edit surat
              </Link>
            </>
          )}
          <div className="my-1 border-t border-bq-garis" />
          <button role="menuitem" type="button" onClick={() => { setBuka(false); setKonfirmasi(true); }}
            className={`${kelasItem} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40`}>
            <Trash size={18} weight="bold" aria-hidden="true" /> Hapus surat
          </button>
          {galat && <p role="alert" className="px-3 py-1 text-xs text-rose-600">{galat}</p>}
        </div>
      )}

      <DialogHapusSurat
        surat={konfirmasi ? { id: suratId, nomorSurat, namaDonatur, nilai, terkirim } : null}
        onTutup={() => setKonfirmasi(false)}
        onTerhapus={() => { setKonfirmasi(false); router.push('/donatur/surat'); router.refresh(); }}
      />
    </div>
  );
}
