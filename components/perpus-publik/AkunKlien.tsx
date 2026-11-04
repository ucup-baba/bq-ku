'use client';
import { useEffect, useState } from 'react';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t, type KunciTeks } from '@/lib/perpus/i18n';
import { createBrowserSupabase } from '@/lib/supabase/client';

export function AkunKlien({ lang }: { lang: Bahasa }) {
  const [email, setEmail] = useState('');
  const [isi, setIsi] = useState({ nama: '', noWa: '' });
  const [siap, setSiap] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);
  const [galat, setGalat] = useState<KunciTeks | null>(null);

  useEffect(() => {
    fetch('/api/perpus-publik/anggota').then(async res => {
      if (res.status === 401) { window.location.assign(`/${lang}/masuk?next=${encodeURIComponent(`/${lang}/akun`)}`); return; }
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setGalat('akun.gagal'); return; }
      setEmail(d.data.email);
      setIsi({ nama: d.data.nama, noWa: d.data.noWa });
      setSiap(true);
    });
  }, [lang]);

  const ubah = (kolom: 'nama' | 'noWa', nilai: string) => {
    setIsi({ ...isi, [kolom]: nilai });
    setTersimpan(false);
  };

  const simpan = async (e: React.FormEvent) => {
    e.preventDefault(); setSibuk(true); setGalat(null); setTersimpan(false);
    const res = await fetch('/api/perpus-publik/daftar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isi),
    });
    const d = await res.json().catch(() => ({}));
    setSibuk(false);
    if (res.ok) { setIsi({ nama: d.data.nama, noWa: d.data.noWa }); setTersimpan(true); return; }
    setGalat(d.fields?.nama ? 'daftar.namaSalah' : d.fields?.noWa ? 'daftar.waSalah' : 'daftar.gagal');
  };

  const keluar = async () => {
    await createBrowserSupabase().auth.signOut();
    window.location.assign(`/${lang}`);
  };

  return (
    <>
      <header className="space-y-1">
        <h1 className="p-h1">{t(lang, 'akun.judul')}</h1>
        {email && <p className="text-perpus-tinta-lembut">{email}</p>}
      </header>
      <form onSubmit={simpan} className="p-kartu w-full max-w-md space-y-4 p-6">
        <label className="block space-y-1">
          <span className="text-xs font-bold">{t(lang, 'daftar.nama')}</span>
          <input className="p-input" autoComplete="name" required disabled={!siap} value={isi.nama} onChange={e => ubah('nama', e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold">{t(lang, 'daftar.noWa')}</span>
          <input className="p-input" type="tel" autoComplete="tel" inputMode="tel" required disabled={!siap} value={isi.noWa} onChange={e => ubah('noWa', e.target.value)} />
        </label>
        {galat && <p role="alert" className="font-bold">{t(lang, galat)}</p>}
        {tersimpan && <p role="status" className="font-bold">{t(lang, 'akun.tersimpan')}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={sibuk || !siap} className="p-tombol">{t(lang, sibuk ? 'daftar.menyimpan' : 'daftar.tombol')}</button>
          <button type="button" onClick={keluar} className="p-pil">{t(lang, 'akun.keluar')}</button>
        </div>
      </form>
    </>
  );
}
