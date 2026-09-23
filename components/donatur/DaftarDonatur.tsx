'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MagnifyingGlass, UserPlus, WhatsappLogo, X, Check, ArrowClockwise, Users } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import type { Donatur, DonaturWithDonasi, Sapaan } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { statistikDonatur, ringkasDonatur } from '@/lib/donatur/daftar';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { InisialUbin } from '@/components/ui/InisialUbin';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { TombolIkon, TombolUtama } from '@/components/ui/Tombol';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasField, kelasInput, kelasLabel } from '@/components/ui/kelas';

const OPSI_SAPAAN: Array<{ value: Sapaan; label: string }> = [
  { value: 'BAPAK', label: 'Bapak' },
  { value: 'IBU', label: 'Ibu' },
  { value: 'SDR', label: 'Sdr.' },
  { value: 'SDRI', label: 'Sdri.' },
  { value: 'BAPAK_IBU', label: 'Bapak/Ibu' },
];

const Galat = ({ pesan }: { pesan?: string }) => (pesan ? <span className="text-xs text-rose-600">{pesan}</span> : null);

function FormDonaturBaru({ onSelesai }: { onSelesai: (d: Donatur) => void }) {
  const [nama, setNama] = useState('');
  const [sapaan, setSapaan] = useState<Sapaan>('BAPAK');
  const [noWa, setNoWa] = useState('');
  const [alamat, setAlamat] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null); setFields({});
    try {
      const res = await fetch('/api/donatur', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, sapaan, noWa: noWa || undefined, alamat: alamat || undefined }),
      });
      const data = await res.json();
      if (res.status === 400 && data.fields) { setFields(data.fields); return; }
      if (!res.ok) { setError(data.error || 'Gagal menyimpan donatur.'); return; }
      onSelesai(data.data);
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <PesanGalat pesan={error} />}
      <label className="block space-y-1">
        <span className={kelasLabel}>Nama</span>
        <input autoFocus value={nama} onChange={e => setNama(e.target.value)} required placeholder="Nama lengkap" className={kelasField(fields.nama)} />
        <Galat pesan={fields.nama} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className={kelasLabel}>Sapaan</span>
          <select value={sapaan} onChange={e => setSapaan(e.target.value as Sapaan)} className={kelasField(fields.sapaan)}>
            {OPSI_SAPAAN.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Galat pesan={fields.sapaan} />
        </label>
        <label className="block space-y-1">
          <span className={kelasLabel}>No. WhatsApp</span>
          <input value={noWa} onChange={e => setNoWa(e.target.value)} inputMode="tel" placeholder="08…" className={kelasField(fields.noWa)} />
          <Galat pesan={fields.noWa} />
        </label>
      </div>
      <label className="block space-y-1">
        <span className={kelasLabel}>Alamat (opsional)</span>
        <input value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Alamat donatur" className={kelasField(fields.alamat)} />
        <Galat pesan={fields.alamat} />
      </label>
      <TombolUtama type="submit" ikon={Check} disabled={busy} className="h-12 w-full">{busy ? 'Menyimpan…' : 'Simpan donatur'}</TombolUtama>
    </form>
  );
}

export function DaftarDonatur() {
  const [q, setQ] = useState('');
  const [donatur, setDonatur] = useState<DonaturWithDonasi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tambahBuka, setTambahBuka] = useState(false);
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
          <p className="truncate px-1 text-xs text-bq-redup">
            {stat.total} donatur · {stat.aktifBulanIni} aktif bulan ini · {stat.punyaWa} punya WA
          </p>
        )}
      </div>

      {error && <PesanGalat pesan={error} />}

      {donatur === null && !error && (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60" />)}
        </div>
      )}

      {donatur !== null && donatur.length === 0 && (
        <Kartu className="flex flex-col items-center gap-3 p-8 text-center">
          <IkonUbin ikon={Users} warna="biru" ukuran="lg" doodle="lingkaran" />
          <p className="text-sm font-semibold text-bq-tinta">
            {q.trim() ? `Tidak ada donatur dengan kata kunci "${q}".` : 'Belum ada donatur tersimpan.'}
          </p>
          <p className="text-xs text-bq-redup">
            {q.trim() ? 'Periksa ejaan nama atau nomor WhatsApp.' : 'Tekan tombol tambah di kanan atas untuk menambahkan donatur pertama.'}
          </p>
        </Kartu>
      )}

      {donatur !== null && donatur.length > 0 && (
        <ul data-audit-daftar className="bergilir grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {donatur.map((d, i) => (
            <li key={d.id}>
              <Kartu className="flex items-center gap-3 p-3">
                <InisialUbin nama={d.nama} indeks={i} />
                <Link href={`/donatur/daftar/${d.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-bq-tinta">{labelSapaan(d.sapaan)} {d.nama}</p>
                  <p className="truncate text-xs text-bq-redup">{ringkasDonatur(d)}</p>
                </Link>
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
        <FormDonaturBaru onSelesai={tambahDonaturBaru} />
      </LembarBawah>
    </div>
  );
}
