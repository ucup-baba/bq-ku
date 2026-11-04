'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Bahasa } from '@/lib/perpus/ddc';
import { tanggalPublik } from '@/lib/perpus/format-publik';
import { t, type KunciTeks } from '@/lib/perpus/i18n';
import { hariIniWib, terlambat, type KodeGalat } from '@/lib/perpus/pinjaman';
import type { Pinjamanku } from '@/lib/perpus/tipe';
import { createBrowserSupabase } from '@/lib/supabase/client';

export function PinjamankuKlien({ lang }: { lang: Bahasa }) {
  const [daftar, setDaftar] = useState<Pinjamanku[] | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [galat, setGalat] = useState<KunciTeks | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus-publik/pinjaman');
    if (res.status === 401) { window.location.assign(`/${lang}/masuk?next=${encodeURIComponent(`/${lang}/pinjamanku`)}`); return; }
    const d = await res.json().catch(() => ({}));
    if (res.ok) setDaftar(d.data); else setGalat('pinjamanku.gagal');
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { muat(); }, []);

  const aksi = async (id: string, jenis: 'batal' | 'klaim') => {
    setSibuk(id); setGalat(null);
    const res = await fetch(`/api/perpus-publik/pinjaman/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aksi: jenis }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setGalat(d.kode ? `galat.${d.kode as KodeGalat}` : 'pinjamanku.gagal');
    await muat();
    setSibuk(null);
  };

  const keluar = async () => {
    await createBrowserSupabase().auth.signOut();
    window.location.assign(`/${lang}`);
  };

  const hari = hariIniWib();
  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <h1 className="p-h1">{t(lang, 'pinjamanku.judul')}</h1>
        <button type="button" onClick={keluar} className="p-pil">{t(lang, 'pinjamanku.keluar')}</button>
      </header>
      {galat && <p role="alert" className="font-bold">{t(lang, galat)}</p>}
      {daftar?.length === 0 && (
        <section className="p-kartu space-y-3 p-6 text-center">
          <p>{t(lang, 'pinjamanku.kosong')}</p>
          <Link href={`/${lang}/katalog`} className="p-tombol">{t(lang, 'pinjamanku.keKatalog')}</Link>
        </section>
      )}
      <ul className="space-y-3">
        {daftar?.map(p => (
          <li key={p.id} className="p-kartu space-y-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Link href={`/${lang}/buku/${p.idPendek}`} className="min-w-0 font-bold underline-offset-2 hover:underline">{p.judul}</Link>
              <span className="p-label">{t(lang, `status.${p.status}`)}</span>
            </div>
            {p.jatuhTempo && p.status === 'dipinjam' && (
              <p className="text-sm">
                {t(lang, 'pinjamanku.jatuhTempo', { tanggal: tanggalPublik(lang, p.jatuhTempo) })}
                {terlambat(p, hari) && <b> · {t(lang, 'pinjamanku.terlambat')}</b>}
              </p>
            )}
            {p.dikembalikanAt && <p className="text-sm">{t(lang, 'pinjamanku.dikembalikan', { tanggal: tanggalPublik(lang, p.dikembalikanAt.slice(0, 10)) })}</p>}
            {p.catatan && <p className="text-sm">{t(lang, 'pinjamanku.catatan', { isi: p.catatan })}</p>}
            {p.status === 'diajukan' && <button type="button" disabled={sibuk === p.id} onClick={() => aksi(p.id, 'batal')} className="p-pil">{t(lang, 'pinjamanku.batal')}</button>}
            {p.status === 'dipinjam' && <button type="button" disabled={sibuk === p.id} onClick={() => aksi(p.id, 'klaim')} className="p-tombol">{t(lang, 'pinjamanku.klaim')}</button>}
          </li>
        ))}
      </ul>
    </>
  );
}
