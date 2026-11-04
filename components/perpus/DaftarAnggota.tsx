'use client';
import { useEffect, useState } from 'react';
import { PencilSimple, WhatsappLogo } from '@phosphor-icons/react';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { TombolIkon, TombolUtama } from '@/components/ui/Tombol';
import { kelasInput, kelasLabel } from '@/components/ui/kelas';
import type { AnggotaAdmin } from '@/lib/perpus/tipe';
import type { UbahAnggotaInput } from '@/lib/validation/perpus';

const AKTIF = new Set(['diajukan', 'dipinjam', 'menunggu_verifikasi']);

export function DaftarAnggota() {
  const [daftar, setDaftar] = useState<AnggotaAdmin[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ userId: string; nama: string; noWa: string } | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus/anggota');
    const d = await res.json();
    if (res.ok) setDaftar(d.data); else setGalat(d.error || 'Gagal memuat anggota');
  };
  useEffect(() => { muat(); }, []);

  const ubah = async (id: string, patch: UbahAnggotaInput) => {
    setGalat(null);
    const res = await fetch(`/api/perpus/anggota/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    const d = await res.json();
    if (!res.ok) setGalat(d.fields ? Object.values(d.fields).join(' · ') : d.error || 'Gagal mengubah anggota');
    await muat();
    return res.ok;
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (edit && await ubah(edit.userId, { nama: edit.nama, noWa: edit.noWa })) setEdit(null);
  };

  return (
    <div className="space-y-4">
      <KepalaHalaman judul="Anggota" sub={daftar ? `${daftar.length} peminjam terdaftar` : undefined} subTampilDiHp />
      {galat && <PesanGalat pesan={galat} />}
      {daftar?.length === 0 && <Kartu className="p-4 text-sm text-bq-redup">Belum ada anggota.</Kartu>}
      {daftar?.map(a => (
        <Kartu key={a.userId} className="p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="font-extrabold text-bq-tinta">{a.nama}{a.status === 'diblokir' ? ' (diblokir)' : ''}</p>
            <p className="text-bq-redup">{a.noWa}</p>
            <p className="text-bq-redup">{a.pinjaman.filter(p => AKTIF.has(p.status)).length} pinjaman aktif · {a.pinjaman.length} total</p>
          </div>
          <div className="flex items-center gap-2">
            <TombolIkon ikon={PencilSimple} label={`Ubah data ${a.nama}`} onClick={() => setEdit({ userId: a.userId, nama: a.nama, noWa: a.noWa })} />
            <a href={`https://wa.me/${a.noWa}`} target="_blank" rel="noopener" aria-label={`WhatsApp ${a.nama}`}
              className="tekan inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-bq-garis bg-bq-surface text-emerald-600">
              <WhatsappLogo size={20} weight="bold" aria-hidden />
            </a>
            <button type="button" onClick={() => ubah(a.userId, { status: a.status === 'aktif' ? 'diblokir' : 'aktif' })}
              className="tekan h-11 rounded-2xl border border-bq-garis bg-bq-surface px-4 font-bold text-bq-tinta">
              {a.status === 'aktif' ? 'Blokir' : 'Aktifkan'}
            </button>
          </div>
        </Kartu>
      ))}
      <LembarBawah buka={edit !== null} onTutup={() => setEdit(null)} judul="Ubah data anggota">
        {edit && (
          <form onSubmit={simpan} className="space-y-3">
            {galat && <PesanGalat pesan={galat} />}
            <label className="block space-y-1"><span className={kelasLabel}>Nama</span>
              <input className={kelasInput} required value={edit.nama} onChange={e => setEdit({ ...edit, nama: e.target.value })} /></label>
            <label className="block space-y-1"><span className={kelasLabel}>Nomor WhatsApp</span>
              <input className={kelasInput} type="tel" required value={edit.noWa} onChange={e => setEdit({ ...edit, noWa: e.target.value })} /></label>
            <TombolUtama type="submit">Simpan</TombolUtama>
          </form>
        )}
      </LembarBawah>
    </div>
  );
}
