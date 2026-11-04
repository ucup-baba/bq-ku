'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Bahasa } from '@/lib/perpus/ddc';
import { nextAman } from '@/lib/perpus/domain';
import { t, type KunciTeks } from '@/lib/perpus/i18n';

export function FormDaftar({ lang }: { lang: Bahasa }) {
  const params = useSearchParams();
  const [isi, setIsi] = useState({ nama: '', noWa: '' });
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<KunciTeks | null>(null);

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault(); setSibuk(true); setGalat(null);
    const res = await fetch('/api/perpus-publik/daftar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isi),
    });
    if (res.ok) {
      // Muat penuh, bukan navigasi klien: proxy perlu melihat baris anggota yang baru.
      window.location.assign(nextAman(params.get('next')) ?? `/${lang}/pinjamanku`);
      return;
    }
    const d = await res.json().catch(() => ({}));
    setSibuk(false);
    setGalat(d.fields?.nama ? 'daftar.namaSalah' : d.fields?.noWa ? 'daftar.waSalah' : 'daftar.gagal');
  };

  return (
    <form onSubmit={simpan} className="p-kartu mx-auto w-full max-w-md space-y-4 p-6">
      <h1 className="p-h2 text-3xl">{t(lang, 'daftar.judul')}</h1>
      <p className="text-perpus-tinta-lembut">{t(lang, 'daftar.sub')}</p>
      <label className="block space-y-1">
        <span className="text-xs font-bold">{t(lang, 'daftar.nama')}</span>
        <input className="p-input" autoComplete="name" required value={isi.nama} onChange={e => setIsi({ ...isi, nama: e.target.value })} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-bold">{t(lang, 'daftar.noWa')}</span>
        <input className="p-input" type="tel" autoComplete="tel" inputMode="tel" placeholder="08…" required value={isi.noWa} onChange={e => setIsi({ ...isi, noWa: e.target.value })} />
      </label>
      {galat && <p role="alert" className="font-bold">{t(lang, galat)}</p>}
      <button type="submit" disabled={sibuk} className="p-tombol w-full">{t(lang, sibuk ? 'daftar.menyimpan' : 'daftar.tombol')}</button>
    </form>
  );
}
