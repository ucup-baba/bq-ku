'use client';
import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, Plus, EyeSlash } from '@phosphor-icons/react';
import type { Buku } from '@/lib/perpus/tipe';
import { LABEL_ASAL } from '@/lib/perpus/tipe';
import { genreDari, LABEL_GENRE } from '@/lib/perpus/ddc';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { TombolUtama } from '@/components/ui/Tombol';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput } from '@/components/ui/kelas';
import { FormBuku } from './FormBuku';
import { UnggahSampul } from './UnggahSampul';

export function DaftarBuku() {
  const [q, setQ] = useState('');
  const [buku, setBuku] = useState<Buku[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [tambah, setTambah] = useState(false);
  const permintaan = useRef(0);

  useEffect(() => {
    const t = setTimeout(async () => {
      const id = ++permintaan.current;
      const res = await fetch(`/api/perpus/buku?q=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (id !== permintaan.current) return;
      if (!res.ok) { setGalat(d.error || 'Gagal memuat buku'); return; }
      setBuku(d.data);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const nonaktifkan = async (b: Buku) => {
    if (!confirm(`Sembunyikan "${b.judul}" dari katalog?`)) return;
    const res = await fetch(`/api/perpus/buku/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aktif: false }) });
    if (res.ok) setBuku(prev => prev?.map(x => (x.id === b.id ? { ...x, aktif: false } : x)) ?? null);
  };

  return (
    <div className="space-y-4">
      <KepalaHalaman judul="Buku" sub={buku ? `${buku.length} judul` : undefined} aksi={<TombolUtama ikon={Plus} onClick={() => setTambah(true)}>Tambah</TombolUtama>} />
      <label className="relative block">
        <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-bq-redup" aria-hidden />
        <input className={`${kelasInput} pl-11`} placeholder="Cari judul, penulis, atau nomor panggil" aria-label="Cari judul, penulis, atau nomor panggil" value={q} onChange={e => setQ(e.target.value)} />
      </label>
      {galat && <PesanGalat pesan={galat} />}
      <div className="space-y-2">
        {buku?.map(b => (
          <Kartu key={b.id} className={`p-3 flex items-center gap-3 ${b.aktif ? '' : 'opacity-50'}`}>
            <UnggahSampul buku={b} onGalat={setGalat} onSimpan={baru => setBuku(prev => prev?.map(x => (x.id === baru.id ? baru : x)) ?? null)} />
            <span className="font-mono text-xs font-bold w-32 shrink-0 text-bq-tinta">{b.nomorPanggil}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-bq-tinta truncate">{b.judul}</p>
              <p className="text-xs text-bq-redup truncate">
                {b.penulis || '—'} · {LABEL_GENRE[genreDari(b.kelasDdc)].id} · {LABEL_ASAL[b.asal]}{b.eksemplar > 1 ? ` · ${b.eksemplar} eks` : ''}
                {b.statusKode === 'perlu_audit' ? ' · perlu audit' : ''}
              </p>
            </div>
            {b.aktif && <button type="button" onClick={() => nonaktifkan(b)} aria-label={`Sembunyikan ${b.judul}`} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><EyeSlash size={18} /></button>}
          </Kartu>
        ))}
      </div>
      <LembarBawah buka={tambah} onTutup={() => setTambah(false)} judul="Tambah buku">
        <FormBuku onSimpan={b => { setTambah(false); setBuku(prev => [b, ...(prev ?? [])]); }} />
      </LembarBawah>
    </div>
  );
}
