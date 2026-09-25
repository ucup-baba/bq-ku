'use client';
import { useState } from 'react';
import { FileText, CaretRight } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import { Kartu } from '@/components/ui/Kartu';
import { IkonUbin, type WarnaUbin } from '@/components/ui/IkonUbin';
import { TautanUtama } from '@/components/ui/Tombol';
import { DocumentPreviewModal } from '@/components/ui/DocumentPreviewModal';
import { BERKAS_WAJIB, BERKAS_PENDUKUNG, statusBerkas } from '@/lib/santri/ringkasan';
import type { SantriDocument } from '@/lib/db/santri-repo';
import { useModeRuang } from '@/components/ruang/ModeRuang';

const STATUS: Record<string, { label: string; warna: WarnaUbin; teks: string }> = {
  VERIFIED: { label: 'Terverifikasi', warna: 'hijau', teks: 'text-[#0E9F54]' },
  PENDING: { label: 'Menunggu verifikasi', warna: 'biru', teks: 'text-bq-biru' },
  NEED_FIX: { label: 'Perlu perbaikan', warna: 'jingga', teks: 'text-bq-jingga' },
  REJECTED: { label: 'Ditolak', warna: 'abu', teks: 'text-rose-600' },
};
const BELUM = { label: 'Belum ada', warna: 'abu' as WarnaUbin, teks: 'text-bq-redup' };

type Dok = Pick<SantriDocument, 'kategori' | 'fileUrl' | 'statusVerifikasi' | 'catatanVerifikasi'>;

function BarisBerkas({ label, dok, onBuka }: { label: string; dok?: Dok; onBuka?: (d: Dok) => void }) {
  const st = dok ? STATUS[dok.statusVerifikasi] ?? STATUS.PENDING : BELUM;
  const isi = (
    <>
      <IkonUbin ikon={FileText} warna={st.warna} ukuran="sm" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-bold text-bq-tinta">{label}</span>
        <span className={twMerge('block truncate text-xs font-semibold', st.teks)}>{st.label}</span>
        {dok?.catatanVerifikasi && <span className="block truncate text-xs text-bq-redup">{dok.catatanVerifikasi}</span>}
      </span>
      {dok && onBuka && <CaretRight size={16} weight="bold" className="shrink-0 text-bq-redup" aria-hidden="true" />}
    </>
  );
  return dok && onBuka
    ? <button type="button" onClick={() => onBuka(dok)} aria-label={`Lihat ${label}`} className="tekan flex w-full items-center gap-3 rounded-2xl p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60">{isi}</button>
    : <div className="flex items-center gap-3 p-2.5">{isi}</div>;
}

export function TabBerkas({ santri }: { santri: { id: string; namaLengkap: string; documents?: Dok[] } }) {
  const docs = santri.documents ?? [];
  const [pratinjau, setPratinjau] = useState<{ judul: string; dok: Dok } | null>(null);
  const st = statusBerkas(docs);
  const cari = (kategori: string) => docs.find(d => d.kategori === kategori);
  const pendukung = BERKAS_PENDUKUNG.filter(b => cari(b.kategori));
  const { bacaSaja } = useModeRuang();
  // Mode baca (Ruang Lembaga): status saja — file scan tidak bisa dibuka.
  const buka = (label: string) => (bacaSaja ? undefined : (d: Dok) => setPratinjau({ judul: `${label} - ${santri.namaLengkap}`, dok: d }));

  return (
    <div className="space-y-4">
      {!st.lengkap && !bacaSaja && (
        <TautanUtama href={`/santri/${santri.id}/edit?langkah=1`} className="w-full sm:w-auto">Lengkapi berkas</TautanUtama>
      )}
      <Kartu className="p-2">
        <h2 className="px-2.5 pt-2 text-sm font-extrabold text-bq-tinta">Berkas wajib <span className="font-bold text-bq-redup">({st.ada}/{st.total})</span></h2>
        <div className="divide-y divide-bq-garis">
          {BERKAS_WAJIB.map(b => <BarisBerkas key={b.kategori} label={b.label} dok={cari(b.kategori)} onBuka={buka(b.label)} />)}
        </div>
      </Kartu>
      <Kartu className="p-2">
        <h2 className="px-2.5 pt-2 text-sm font-extrabold text-bq-tinta">Berkas pendukung</h2>
        {pendukung.length === 0
          ? <p className="px-2.5 pb-2.5 pt-1 text-xs text-bq-redup">Belum ada berkas pendukung (KIP, KRM/PKH, SKTM, sertifikat).</p>
          : <div className="divide-y divide-bq-garis">{pendukung.map(b => <BarisBerkas key={b.kategori} label={b.label} dok={cari(b.kategori)} onBuka={buka(b.label)} />)}</div>}
      </Kartu>
      {!bacaSaja && <DocumentPreviewModal isOpen={!!pratinjau} onClose={() => setPratinjau(null)} title={pratinjau?.judul ?? ''}
        fileUrl={pratinjau?.dok.fileUrl ?? ''} badge={pratinjau ? (STATUS[pratinjau.dok.statusVerifikasi] ?? STATUS.PENDING).label : undefined} />}
    </div>
  );
}
