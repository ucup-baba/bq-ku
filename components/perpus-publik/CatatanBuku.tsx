'use client';
import { useEffect, useState } from 'react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { tanggalPublik } from '@/lib/perpus/format-publik';
import { t, type KunciTeks } from '@/lib/perpus/i18n';
import type { KodeGalat } from '@/lib/perpus/pinjaman';
import type { CatatanBukuData } from '@/lib/perpus/tipe';

export function CatatanBuku({ lang, bukuId }: { lang: Bahasa; bukuId: string }) {
  const [data, setData] = useState<CatatanBukuData | null>(null);
  const [isi, setIsi] = useState('');
  const [publik, setPublik] = useState(true);
  const [sibuk, setSibuk] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);
  const [galat, setGalat] = useState<KunciTeks | null>(null);

  const muat = async () => {
    const res = await fetch(`/api/perpus-publik/catatan?buku=${bukuId}`);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setData(d.data);
    setIsi(d.data.milikku?.isi ?? '');
    setPublik(d.data.milikku?.publik ?? true);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { muat(); }, [bukuId]);

  const kirim = async (permintaan: Promise<Response>) => {
    setSibuk(true); setGalat(null); setTersimpan(false);
    const res = await permintaan;
    const d = await res.json().catch(() => ({}));
    setSibuk(false);
    if (!res.ok) { setGalat(d.kode ? `galat.${d.kode as KodeGalat}` : 'catatan.gagal'); return false; }
    await muat();
    return true;
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await kirim(fetch('/api/perpus-publik/catatan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bukuId, isi, publik }),
    }));
    setTersimpan(ok);
  };
  const hapus = () => data?.milikku && kirim(fetch(`/api/perpus-publik/catatan/${data.milikku.id}`, { method: 'DELETE' }));

  if (!data) return null;
  const orangLain = data.publik.filter(c => c.id !== data.milikku?.id);
  const daftar = data.milikku?.publik ? data.publik : orangLain;
  return (
    <section id="catatan" className="space-y-3 scroll-mt-6">
      <h2 className="p-h2">{t(lang, 'catatan.judul')}</h2>
      {data.bolehTulis && (
        <form onSubmit={simpan} className="p-kartu space-y-3 p-4">
          <label className="block space-y-1">
            <span className="text-xs font-bold">{t(lang, 'catatan.label')}</span>
            <textarea className="p-input min-h-24 py-2" maxLength={1000} required value={isi} onChange={e => { setIsi(e.target.value); setTersimpan(false); }} />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" className="h-5 w-5" checked={publik} onChange={e => { setPublik(e.target.checked); setTersimpan(false); }} />
            {t(lang, 'catatan.publik')}
          </label>
          {!publik && <p className="text-sm text-perpus-tinta-lembut">{t(lang, 'catatan.privatInfo')}</p>}
          {galat && <p role="alert" className="font-bold">{t(lang, galat)}</p>}
          {tersimpan && <p role="status" className="font-bold">{t(lang, 'catatan.tersimpan')}</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={sibuk} className="p-tombol">{t(lang, 'catatan.simpan')}</button>
            {data.milikku && <button type="button" disabled={sibuk} onClick={hapus} className="p-pil">{t(lang, 'catatan.hapus')}</button>}
          </div>
        </form>
      )}
      {daftar.length === 0 && !data.bolehTulis && <p className="text-perpus-tinta-lembut">{t(lang, 'catatan.kosong')}</p>}
      <ul className="space-y-3">
        {daftar.map(c => (
          <li key={c.id} className="p-kartu space-y-1 p-4">
            <p className="whitespace-pre-line">{c.isi}</p>
            <p className="text-xs font-bold text-perpus-tinta-lembut">{c.namaSingkat} · {tanggalPublik(lang, c.updatedAt.slice(0, 10))}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
