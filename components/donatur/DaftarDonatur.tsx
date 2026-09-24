'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { MagnifyingGlass, UserPlus, WhatsappLogo, X, ArrowClockwise, Users } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import type { Donatur, DonaturWithDonasi } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { statistikDonatur, ringkasDonatur } from '@/lib/donatur/daftar';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { InisialUbin } from '@/components/ui/InisialUbin';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { TombolIkon } from '@/components/ui/Tombol';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput } from '@/components/ui/kelas';
import { FormDonatur } from './FormDonatur';

export function DaftarDonatur() {
  const [q, setQ] = useState('');
  const [donatur, setDonatur] = useState<DonaturWithDonasi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tambahBuka, setTambahBuka] = useState(false);
  const router = useRouter();
  const tanpaWa = useSearchParams().get('tanpaWa') === '1';
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const id = ++requestIdRef.current;
      setError(null);
      try {
        const res = await fetch(`/api/donatur?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (id !== requestIdRef.current) return;
        if (!res.ok) { setError(data.error || 'Gagal memuat donatur.'); return; }
        setDonatur(data.data || []);
      } catch {
        if (id !== requestIdRef.current) return;
        setError('Tidak dapat terhubung ke server.');
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  const tambahDonaturBaru = (d: Donatur) => {
    setTambahBuka(false);
    if (q.trim() !== '') { setQ(''); return; }
    setDonatur(prev => (prev ? [d, ...prev] : [d]));
  };

  const stat = donatur ? statistikDonatur(donatur, new Date().toISOString().slice(0, 7)) : null;
  const tampil = donatur && tanpaWa ? donatur.filter(d => !d.noWa) : donatur;

  return (
    <div className="space-y-3 md:space-y-5">
      <KepalaHalaman judul="Donatur" sub="Cari donatur, lihat riwayat, atau tambahkan baru."
        aksi={<TombolIkon ikon={UserPlus} label="Tambah donatur" varian="utama" onClick={() => setTambahBuka(true)} />} />

      <div className="sticky top-0 z-20 -mx-4 space-y-1.5 bg-bq-bg/90 px-4 py-2 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="relative">
          <MagnifyingGlass size={18} weight="bold" aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bq-redup" />
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama atau nomor WA…"
            aria-label="Cari donatur" className={twMerge(kelasInput, 'pl-11 pr-12')} />
          {q && (
            <TombolIkon ikon={X} label="Hapus pencarian" ukuran="sm" varian="polos" onClick={() => setQ('')}
              className="absolute right-1 top-1/2 -translate-y-1/2" />
          )}
        </div>
        {stat && (
          <div className="flex items-center gap-2 px-1">
            <p className="min-w-0 flex-1 truncate text-xs text-bq-redup">
              {stat.total} donatur · {stat.aktifBulanIni} aktif bulan ini · {stat.punyaWa} punya WA
            </p>
            {tanpaWa && (
              <button type="button" onClick={() => router.replace('/donatur/daftar', { scroll: false })}
                className="tekan inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                Hanya tanpa WA <X size={12} weight="bold" aria-hidden="true" /><span className="sr-only">(hapus saringan)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {error && <PesanGalat pesan={error} />}

      {donatur === null && !error && (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60" />)}
        </div>
      )}

      {tampil !== null && tampil.length === 0 && (
        <Kartu className="flex flex-col items-center gap-3 p-8 text-center">
          <IkonUbin ikon={Users} warna="biru" ukuran="lg" doodle="lingkaran" />
          <p className="text-sm font-semibold text-bq-tinta">
            {q.trim() ? `Tidak ada donatur dengan kata kunci "${q}".` : tanpaWa ? 'Semua donatur sudah punya nomor WA.' : 'Belum ada donatur tersimpan.'}
          </p>
          <p className="text-xs text-bq-redup">
            {q.trim() ? 'Periksa ejaan nama atau nomor WhatsApp.' : 'Tekan tombol tambah di kanan atas untuk menambahkan donatur pertama.'}
          </p>
        </Kartu>
      )}

      {tampil !== null && tampil.length > 0 && (
        <ul data-audit-daftar className="bergilir grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {tampil.map((d, i) => (
            <li key={d.id}>
              <Kartu className="flex items-center gap-3 p-3">
                <InisialUbin nama={d.nama} indeks={i} />
                <Link href={`/donatur/daftar/${d.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-bq-tinta">{labelSapaan(d.sapaan)} {d.nama}</p>
                  <p className="truncate text-xs text-bq-redup">{ringkasDonatur(d)}</p>
                </Link>
                {!d.noWa && (
                  <Link href={`/donatur/daftar/${d.id}?ubah=1`} aria-label={`Lengkapi nomor WhatsApp ${d.nama}`} title="Nomor WA belum ada — lengkapi"
                    className="tekan inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/40">
                    <WhatsappLogo size={18} weight="bold" aria-hidden="true" />
                  </Link>
                )}
                {d.noWa && (
                  <a href={`https://wa.me/${d.noWa}`} target="_blank" rel="noopener noreferrer" aria-label={`Buka WhatsApp ${d.nama}`}
                    title={d.noWa} className="tekan inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                    <WhatsappLogo size={18} weight="fill" aria-hidden="true" />
                  </a>
                )}
                <TombolIkon ikon={ArrowClockwise} label={`Donasi lagi dari ${d.nama}`} href={`/donatur/surat/baru?donaturId=${d.id}`} ukuran="sm" varian="polos" />
              </Kartu>
            </li>
          ))}
        </ul>
      )}

      <LembarBawah buka={tambahBuka} onTutup={() => setTambahBuka(false)} judul="Donatur baru">
        <FormDonatur daftar={donatur ?? undefined} onSelesai={tambahDonaturBaru} />
      </LembarBawah>
    </div>
  );
}
