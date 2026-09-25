'use client';
import { useEffect, useState } from 'react';
import { FolderSimple } from '@phosphor-icons/react';
import { IkonUbin } from '@/components/ui/IkonUbin';

/**
 * Saklar Superadmin: "Pengurus boleh mengelola berkas lembaga". Ditegakkan RLS (migrasi 0011);
 * bila pengaturan belum tersedia (migrasi belum jalan), saklar tidak ditampilkan.
 */
export function SaklarKelolaBerkas() {
  const [nyala, setNyala] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    fetch('/api/lembaga/pengaturan').then(r => (r.ok ? r.json() : null))
      .then(j => { if (!batal && j?.data) setNyala(!!j.data.pengurusKelolaBerkas); })
      .catch(() => {});
    return () => { batal = true; };
  }, []);

  if (nyala === null) return null;

  const ubah = async () => {
    const baru = !nyala;
    setBusy(true); setGalat(null); setNyala(baru);
    try {
      const r = await fetch('/api/lembaga/pengaturan', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pengurusKelolaBerkas: baru }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Gagal menyimpan');
    } catch (e) { setNyala(!baru); setGalat(e instanceof Error ? e.message : 'Gagal menyimpan'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-bq-garis p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          <IkonUbin ikon={FolderSimple} warna="ungu" />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-bq-tinta">Pengurus boleh mengelola berkas lembaga</span>
            <span className="block text-xs text-bq-redup">{nyala ? 'Pengurus bisa unggah, ganti versi & bagikan' : 'Pengurus hanya bisa melihat & mengunduh'}</span>
          </span>
        </span>
        <button type="button" role="switch" aria-checked={nyala} aria-label="Pengurus boleh mengelola berkas lembaga" onClick={ubah} disabled={busy}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-60 ${nyala ? 'bg-[#0E9F54]' : 'bg-slate-300 dark:bg-slate-700'}`}>
          <span aria-hidden="true" className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${nyala ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
      {galat && <p role="alert" className="mt-2 text-xs text-rose-600">{galat}</p>}
    </div>
  );
}
