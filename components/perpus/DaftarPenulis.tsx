'use client';
import { useEffect, useState } from 'react';
import { PencilSimple } from '@phosphor-icons/react';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { TombolIkon, TombolUtama } from '@/components/ui/Tombol';
import { kelasInput, kelasLabel } from '@/components/ui/kelas';
import type { JenisPenulis, PenulisAdmin } from '@/lib/perpus/tipe';

type Isi = { nama: string; jenis: JenisPenulis; bioId: string; bioEn: string; instagram: string; sumber: string };

export function DaftarPenulis() {
  const [daftar, setDaftar] = useState<PenulisAdmin[] | null>(null);
  const [edit, setEdit] = useState<Isi | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus/penulis');
    const d = await res.json();
    if (res.ok) setDaftar(d.data); else setGalat(d.error || 'Gagal memuat penulis');
  };
  useEffect(() => { muat(); }, []);

  const buka = ({ nama, profil: p }: PenulisAdmin) => setEdit({
    nama, jenis: p?.jenis ?? 'penulis', bioId: p?.bioId ?? '', bioEn: p?.bioEn ?? '', instagram: p?.instagram ?? '', sumber: p?.sumber ?? '',
  });

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault(); setGalat(null);
    const res = await fetch('/api/perpus/penulis', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit) });
    const d = await res.json();
    if (!res.ok) { setGalat(d.fields ? Object.values(d.fields).join(' · ') : d.error || 'Gagal menyimpan'); return; }
    setEdit(null);
    await muat();
  };

  const ubah = (k: keyof Isi) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setEdit(s => s && { ...s, [k]: e.target.value });

  return (
    <div className="space-y-4">
      <KepalaHalaman judul="Penulis" sub={daftar ? `${daftar.length} nama di katalog` : undefined} subTampilDiHp />
      {galat && !edit && <PesanGalat pesan={galat} />}
      {daftar?.map(p => (
        <Kartu key={p.nama} className="p-4 flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="font-extrabold text-bq-tinta truncate">{p.nama}{p.profil?.jenis === 'penerbit' ? ' (penerbit)' : ''}</p>
            <p className="text-bq-redup">{p.jumlahBuku} buku · {p.profil?.bioId ? 'ada bio' : 'belum ada bio'}{p.profil?.instagram ? ` · @${p.profil.instagram}` : ''}</p>
          </div>
          <TombolIkon ikon={PencilSimple} label={`Ubah profil ${p.nama}`} onClick={() => buka(p)} />
        </Kartu>
      ))}
      <LembarBawah buka={edit !== null} onTutup={() => setEdit(null)} judul={edit?.nama ?? 'Penulis'}>
        {edit && (
          <form onSubmit={simpan} className="space-y-3">
            {galat && <PesanGalat pesan={galat} />}
            <label className="block space-y-1"><span className={kelasLabel}>Jenis</span>
              <select className={kelasInput} value={edit.jenis} onChange={ubah('jenis')}><option value="penulis">Penulis</option><option value="penerbit">Penerbit (lewati di carousel)</option></select></label>
            <label className="block space-y-1"><span className={kelasLabel}>Bio (Indonesia)</span>
              <textarea className={`${kelasInput} h-24 py-2`} maxLength={600} value={edit.bioId} onChange={ubah('bioId')} /></label>
            <label className="block space-y-1"><span className={kelasLabel}>Bio (English)</span>
              <textarea className={`${kelasInput} h-24 py-2`} maxLength={600} value={edit.bioEn} onChange={ubah('bioEn')} /></label>
            <label className="block space-y-1"><span className={kelasLabel}>Instagram</span>
              <input className={kelasInput} placeholder="nama akun atau tautan" value={edit.instagram} onChange={ubah('instagram')} /></label>
            <label className="block space-y-1"><span className={kelasLabel}>Sumber</span>
              <input className={kelasInput} placeholder="tautan rujukan" value={edit.sumber} onChange={ubah('sumber')} /></label>
            <TombolUtama type="submit">Simpan</TombolUtama>
          </form>
        )}
      </LembarBawah>
    </div>
  );
}
