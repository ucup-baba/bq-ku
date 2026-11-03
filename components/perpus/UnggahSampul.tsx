'use client';
import { useState } from 'react';
import { ImageSquare } from '@phosphor-icons/react';
import type { Buku } from '@/lib/perpus/tipe';
import { urlSampul } from '@/lib/perpus/sampul';

/** Foto ponsel sering melebihi batas body, jadi diperkecil dulu di browser. */
async function kecilkan(berkas: File): Promise<Blob> {
  const gambar = await createImageBitmap(berkas);
  const skala = Math.min(1, 1000 / gambar.width);
  const kanvas = document.createElement('canvas');
  kanvas.width = Math.round(gambar.width * skala);
  kanvas.height = Math.round(gambar.height * skala);
  kanvas.getContext('2d')!.drawImage(gambar, 0, 0, kanvas.width, kanvas.height);
  return new Promise((ok, gagal) => kanvas.toBlob(b => (b ? ok(b) : gagal(new Error('Gambar gagal diproses'))), 'image/jpeg', 0.85));
}

export function UnggahSampul({ buku, onSimpan, onGalat }: { buku: Buku; onSimpan: (b: Buku) => void; onGalat: (pesan: string) => void }) {
  const [sibuk, setSibuk] = useState(false);

  const pilih = async (berkas: File | undefined) => {
    if (!berkas) return;
    setSibuk(true);
    try {
      const form = new FormData();
      form.set('berkas', new File([await kecilkan(berkas)], 'sampul.jpg', { type: 'image/jpeg' }));
      const res = await fetch(`/api/perpus/buku/${buku.id}/sampul`, { method: 'POST', body: form });
      const d = await res.json();
      if (res.ok) onSimpan(d.data);
      else onGalat(d.error || 'Gagal mengunggah sampul');
    } catch (e) {
      onGalat(e instanceof Error ? e.message : 'Gagal mengunggah sampul');
    }
    setSibuk(false);
  };

  return (
    <label className={`relative block h-14 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-bq-garis ${sibuk ? 'opacity-50' : ''}`}>
      <span className="sr-only">Unggah sampul {buku.judul}</span>
      {buku.sampulPath
        ? <img src={urlSampul(buku.sampulPath)} alt="" className="h-full w-full object-cover" />
        : <span className="grid h-full w-full place-items-center text-bq-redup"><ImageSquare size={18} aria-hidden /></span>}
      <input type="file" accept="image/*" className="sr-only" disabled={sibuk} onChange={e => pilih(e.target.files?.[0])} />
    </label>
  );
}
