'use client';
import { useEffect, useState } from 'react';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { Kartu } from '@/components/ui/Kartu';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput } from '@/components/ui/kelas';
import type { CatatanModerasi } from '@/lib/perpus/tipe';
import { tanggalPendek } from './format';

export function ModerasiCatatan() {
  const [daftar, setDaftar] = useState<CatatanModerasi[] | null>(null);
  const [alasan, setAlasan] = useState<Record<string, string>>({});
  const [galat, setGalat] = useState<string | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus/catatan');
    const d = await res.json();
    if (res.ok) setDaftar(d.data); else setGalat(d.error || 'Gagal memuat catatan');
  };
  useEffect(() => { muat(); }, []);

  const hapus = async (id: string) => {
    setGalat(null);
    const res = await fetch(`/api/perpus/catatan/${id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alasan: alasan[id] ?? '' }),
    });
    if (!res.ok) setGalat((await res.json()).error || 'Gagal menghapus catatan');
    await muat();
  };

  return (
    <div className="space-y-4">
      <KepalaHalaman judul="Catatan pembaca" sub="Catatan publik. Penulisnya diberi tahu bila catatan dihapus." subTampilDiHp />
      {galat && <PesanGalat pesan={galat} />}
      {daftar?.length === 0 && <Kartu className="p-4 text-sm text-bq-redup">Belum ada catatan publik.</Kartu>}
      {daftar?.map(c => (
        <Kartu key={c.id} className="p-4 space-y-2 text-sm">
          <p className="font-extrabold text-bq-tinta">{c.buku.judul}</p>
          <p className="whitespace-pre-line">{c.isi}</p>
          <p className="text-bq-redup">{c.anggota.nama} · {tanggalPendek(c.createdAt.slice(0, 10))}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${kelasInput} flex-1`} aria-label="Alasan penghapusan (opsional)" placeholder="Alasan (opsional)" value={alasan[c.id] ?? ''} onChange={e => setAlasan({ ...alasan, [c.id]: e.target.value })} />
            <button type="button" onClick={() => hapus(c.id)} className="tekan h-11 rounded-2xl border border-rose-300 px-4 font-bold text-rose-700">Hapus</button>
          </div>
        </Kartu>
      ))}
    </div>
  );
}
