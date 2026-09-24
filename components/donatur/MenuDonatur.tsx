'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DotsThreeVertical, PencilSimple, Trash, GitMerge, MagnifyingGlass, Check } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import type { Donatur, DonaturWithDonasi } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { ringkasDonatur } from '@/lib/donatur/daftar';
import { TombolIkon } from '@/components/ui/Tombol';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput } from '@/components/ui/kelas';
import { FormDonatur } from './FormDonatur';

const kelasItem = 'flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold text-bq-tinta hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800';
const kelasBatal = 'tekan h-11 rounded-2xl border border-bq-garis text-sm font-bold text-bq-tinta';
const kelasBahaya = 'tekan inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60';

type Mode = null | 'ubah' | 'hapus' | 'gabung';

/**
 * Menu "⋯" di Detail Donatur: Ubah data, lalu Hapus (bila belum ada donasi) atau
 * Gabungkan ke donatur lain (bila sudah ada donasi — donasi & suratnya dipindah, lalu
 * donatur ini dihapus). `?ubah=1` di URL langsung membuka form ubah.
 */
export function MenuDonatur({ donatur, jumlahDonasi }: { donatur: Donatur; jumlahDonasi: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [buka, setBuka] = useState(false);
  const mintaUbah = sp.get('ubah') === '1';
  const [mode, setMode] = useState<Mode>(mintaUbah ? 'ubah' : null);
  // Chip "Tambah nomor WhatsApp" menautkan ke ?ubah=1 di halaman yang sama → buka form lagi.
  useEffect(() => { if (mintaUbah) setMode('ubah'); }, [mintaUbah]);
  const ref = useRef<HTMLDivElement>(null);
  const nama = `${labelSapaan(donatur.sapaan)} ${donatur.nama}`;

  useEffect(() => {
    if (!buka) return;
    const tutupLuar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setBuka(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setBuka(false); };
    document.addEventListener('mousedown', tutupLuar);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', tutupLuar); document.removeEventListener('keydown', esc); };
  }, [buka]);

  const pilih = (m: Mode) => { setBuka(false); setMode(m); };
  const tutup = () => {
    setMode(null);
    if (mintaUbah) router.replace(`/donatur/daftar/${donatur.id}`, { scroll: false });
  };

  return (
    <div ref={ref} className="relative">
      <TombolIkon ikon={DotsThreeVertical} label="Menu donatur" aria-haspopup="menu" aria-expanded={buka} onClick={() => setBuka(b => !b)} />
      {buka && (
        <div role="menu" className="animate-halaman absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-bq-garis bg-bq-surface p-1.5 shadow-angkat">
          <button role="menuitem" type="button" onClick={() => pilih('ubah')} className={kelasItem}>
            <PencilSimple size={18} weight="bold" aria-hidden="true" /> Ubah data donatur
          </button>
          <div className="my-1 border-t border-bq-garis" />
          {jumlahDonasi > 0 ? (
            <button role="menuitem" type="button" onClick={() => pilih('gabung')} className={kelasItem}>
              <GitMerge size={18} weight="bold" aria-hidden="true" /> Gabungkan ke donatur lain
            </button>
          ) : (
            <button role="menuitem" type="button" onClick={() => pilih('hapus')}
              className={`${kelasItem} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40`}>
              <Trash size={18} weight="bold" aria-hidden="true" /> Hapus donatur
            </button>
          )}
        </div>
      )}

      <LembarBawah buka={mode === 'ubah'} onTutup={tutup} judul="Ubah donatur">
        {mode === 'ubah' && <FormDonatur awal={donatur} onSelesai={() => { tutup(); router.refresh(); }} />}
      </LembarBawah>

      <DialogHapusDonatur buka={mode === 'hapus'} donaturId={donatur.id} nama={nama} onTutup={tutup}
        onTerhapus={() => { router.push('/donatur/daftar'); router.refresh(); }} />

      <LembarBawah buka={mode === 'gabung'} onTutup={tutup} judul="Gabungkan donatur">
        {mode === 'gabung' && (
          <FormGabung dari={donatur} nama={nama} jumlahDonasi={jumlahDonasi}
            onSelesai={keId => { router.push(`/donatur/daftar/${keId}`); router.refresh(); }} />
        )}
      </LembarBawah>
    </div>
  );
}

function DialogHapusDonatur({ buka, donaturId, nama, onTutup, onTerhapus }: {
  buka: boolean; donaturId: string; nama: string; onTutup: () => void; onTerhapus: () => void;
}) {
  const [menghapus, setMenghapus] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const tutup = () => { if (!menghapus) { setGalat(null); onTutup(); } };

  const hapus = async () => {
    setMenghapus(true); setGalat(null);
    try {
      const res = await fetch(`/api/donatur/${encodeURIComponent(donaturId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setGalat(data?.error || 'Gagal menghapus donatur');
        return;
      }
      onTerhapus();
    } catch {
      setGalat('Tidak dapat terhubung ke server.');
    } finally { setMenghapus(false); }
  };

  return (
    <LembarBawah buka={buka} onTutup={tutup} judul="Hapus donatur ini?">
      <div className="space-y-4">
        <p className="text-sm text-bq-tinta">
          <strong>{nama}</strong> akan dihapus permanen dari daftar. Donatur ini belum punya catatan donasi, jadi rekap tidak berubah.
        </p>
        {galat && <PesanGalat pesan={galat} />}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={tutup} disabled={menghapus} className={kelasBatal}>Batal</button>
          <button type="button" onClick={hapus} disabled={menghapus} className={kelasBahaya}>
            <Trash size={18} weight="bold" aria-hidden="true" /> {menghapus ? 'Menghapus…' : 'Ya, hapus'}
          </button>
        </div>
      </div>
    </LembarBawah>
  );
}

function FormGabung({ dari, nama, jumlahDonasi, onSelesai }: {
  dari: Donatur; nama: string; jumlahDonasi: number; onSelesai: (keId: string) => void;
}) {
  const [q, setQ] = useState(dari.nama);
  const [hasil, setHasil] = useState<DonaturWithDonasi[] | null>(null);
  const [tujuan, setTujuan] = useState<DonaturWithDonasi | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    const t = setTimeout(async () => {
      const id = ++reqId.current;
      try {
        const res = await fetch(`/api/donatur?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        if (id !== reqId.current) return;
        if (!res.ok) { setGalat(data.error || 'Gagal memuat donatur.'); return; }
        setHasil((data.data as DonaturWithDonasi[]).filter(d => d.id !== dari.id));
      } catch {
        if (id === reqId.current) setGalat('Tidak dapat terhubung ke server.');
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, dari.id]);

  const gabung = async () => {
    if (!tujuan) return;
    setBusy(true); setGalat(null);
    try {
      const res = await fetch(`/api/donatur/${encodeURIComponent(dari.id)}/gabung`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keId: tujuan.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setGalat(data.error || 'Gagal menggabungkan donatur.'); return; }
      onSelesai(tujuan.id);
    } catch {
      setGalat('Tidak dapat terhubung ke server.');
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-bq-tinta">
        {jumlahDonasi} donasi milik <strong>{nama}</strong> (beserta suratnya) dipindah ke donatur yang kamu pilih, lalu {nama} dihapus.
        Pakai ini untuk donatur yang tercatat dobel.
      </p>
      <div className="relative">
        <MagnifyingGlass size={18} weight="bold" aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bq-redup" />
        <input type="search" value={q} onChange={e => { setQ(e.target.value); setTujuan(null); }} placeholder="Cari donatur tujuan…"
          aria-label="Cari donatur tujuan" className={twMerge(kelasInput, 'pl-11')} />
      </div>
      <ul className="max-h-64 space-y-1.5 overflow-y-auto" aria-label="Pilih donatur tujuan">
        {hasil === null && <li className="h-14 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />}
        {hasil?.length === 0 && <li className="px-1 text-sm text-bq-redup">Tidak ada donatur lain yang cocok.</li>}
        {hasil?.map(d => {
          const dipilih = tujuan?.id === d.id;
          return (
            <li key={d.id}>
              <button type="button" onClick={() => setTujuan(d)} aria-pressed={dipilih}
                className={`tekan flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${dipilih ? 'border-[#0E9F54] bg-emerald-50 dark:bg-emerald-950/40' : 'border-bq-garis hover:border-bq-biru'}`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-bq-tinta">{labelSapaan(d.sapaan)} {d.nama}</span>
                  <span className="block truncate text-xs text-bq-redup">{d.noWa || 'Tanpa WA'} · {ringkasDonatur(d)}</span>
                </span>
                {dipilih && <Check size={18} weight="bold" className="shrink-0 text-[#0E9F54]" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
      {galat && <PesanGalat pesan={galat} />}
      <button type="button" onClick={gabung} disabled={!tujuan || busy} className={twMerge(kelasBahaya, 'w-full bg-[#0B5FA5] hover:bg-[#094d86]')}>
        <GitMerge size={18} weight="bold" aria-hidden="true" />
        {busy ? 'Menggabungkan…' : tujuan ? `Gabungkan ke ${tujuan.nama}` : 'Pilih donatur tujuan'}
      </button>
    </div>
  );
}
