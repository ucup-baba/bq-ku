'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from '@phosphor-icons/react';
import { hitungBadge, ringkasPinjaman } from '@/lib/perpus/badge';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t, type KunciTeks } from '@/lib/perpus/i18n';
import type { Catatanku, Pinjamanku } from '@/lib/perpus/tipe';
import { PALET, gayaWarna } from '@/lib/perpus/warna';
import { createBrowserSupabase } from '@/lib/supabase/client';

const ambil = (url: string) => fetch(url).then(async r => ({ status: r.status, ok: r.ok, data: (await r.json().catch(() => ({}))).data }));

export function AkunKlien({ lang }: { lang: Bahasa }) {
  const [email, setEmail] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [isi, setIsi] = useState({ nama: '', noWa: '' });
  const [namaKartu, setNamaKartu] = useState('');
  const [pinjaman, setPinjaman] = useState<Pinjamanku[]>([]);
  const [catatan, setCatatan] = useState<Catatanku[]>([]);
  const [siap, setSiap] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [tersimpan, setTersimpan] = useState(false);
  const [galat, setGalat] = useState<KunciTeks | null>(null);

  useEffect(() => {
    createBrowserSupabase().auth.getSession().then(({ data }) => setFoto(data.session?.user.user_metadata?.avatar_url ?? null));
    Promise.all([ambil('/api/perpus-publik/anggota'), ambil('/api/perpus-publik/pinjaman'), ambil('/api/perpus-publik/catatan/saya')]).then(([a, p, c]) => {
      if (a.status === 401) { window.location.assign(`/${lang}/masuk?next=${encodeURIComponent(`/${lang}/akun`)}`); return; }
      if (!a.ok) { setGalat('akun.gagal'); return; }
      setEmail(a.data.email);
      setIsi({ nama: a.data.nama, noWa: a.data.noWa });
      setNamaKartu(a.data.nama);
      setPinjaman(p.data ?? []);
      setCatatan(c.data ?? []);
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
    if (res.ok) { setIsi({ nama: d.data.nama, noWa: d.data.noWa }); setNamaKartu(d.data.nama); setTersimpan(true); return; }
    setGalat(d.fields?.nama ? 'daftar.namaSalah' : d.fields?.noWa ? 'daftar.waSalah' : 'daftar.gagal');
  };

  const keluar = async () => {
    await createBrowserSupabase().auth.signOut();
    window.location.assign(`/${lang}`);
  };

  const tutup = async (id: string) => {
    await fetch(`/api/perpus-publik/catatan/${id}`, { method: 'PATCH' });
    setCatatan(catatan.map(c => (c.id === id ? { ...c, pemberitahuanDitutupAt: new Date().toISOString() } : c)));
  };

  const aktif = catatan.filter(c => !c.dihapusAt);
  const pemberitahuan = catatan.filter(c => c.dihapusAt && !c.pemberitahuanDitutupAt);
  const jumlahPublik = aktif.filter(c => c.publik).length;
  const badge = hitungBadge(pinjaman, jumlahPublik);
  const ringkas = ringkasPinjaman(pinjaman);
  const ubin = [
    ['akun.ringkasBerjalan', ringkas.berjalan, PALET.periwinkle],
    ['akun.ringkasSelesai', ringkas.selesai, PALET.amber],
    ['akun.ringkasCatatan', jumlahPublik, PALET.teal],
  ] as const;

  return (
    <>
      <header className="space-y-3">
        <span className="p-chip">{t(lang, 'akun.chip')}</span>
        <h1 className="p-h1">{t(lang, 'akun.judulA')} <span className="p-sorot">{t(lang, 'akun.judulB')}</span></h1>
        <p className="text-perpus-tinta-lembut">{t(lang, 'akun.sub')}</p>
      </header>

      {pemberitahuan.map(c => (
        <div key={c.id} role="status" className="p-kartu flex flex-wrap items-center justify-between gap-3 p-4" style={gayaWarna(PALET.krem)}>
          <p className="font-bold">{c.alasanHapus ? t(lang, 'akun.dihapusAlasan', { judul: c.judul, alasan: c.alasanHapus }) : t(lang, 'akun.dihapus', { judul: c.judul })}</p>
          <button type="button" className="p-pil" onClick={() => tutup(c.id)}>{t(lang, 'akun.tutup')}</button>
        </div>
      ))}

      <section className="p-kartu overflow-hidden">
        <div className="p-kartu-kepala">{t(lang, 'akun.kartu')}</div>
        <div className="flex items-center gap-4 p-5">
          {foto
            ? <img src={foto} alt="" referrerPolicy="no-referrer" className="h-20 w-20 shrink-0 rounded-full border-2 border-perpus-tinta object-cover" />
            : <span className="p-avatar h-20 w-20 text-3xl">{namaKartu.charAt(0).toUpperCase()}</span>}
          <div className="min-w-0">
            <p className="p-h2 truncate">{namaKartu}</p>
            <p className="truncate font-bold">{email}</p>
          </div>
        </div>
      </section>

      <dl className="grid grid-cols-3 gap-3">
        {ubin.map(([kunci, n, warna]) => (
          <div key={kunci} className="p-kartu p-3 text-center" style={gayaWarna(warna)}>
            <dd className="p-h2" style={{ color: 'inherit' }}>{n}</dd>
            <dt className="text-xs font-bold">{t(lang, kunci)}</dt>
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="p-h2">{t(lang, 'akun.badge')}</h2>
          <p className="text-sm font-bold text-perpus-tinta-lembut">{t(lang, 'akun.badgeDidapat', { n: badge.filter(b => b.didapat).length, total: badge.length })}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badge.map(b => (
            <li key={b.kunci} className="p-kartu p-3" style={b.didapat ? gayaWarna(b.warna) : undefined}>
              <p className="flex items-center gap-1 font-extrabold">{!b.didapat && <Lock size={16} aria-hidden />}{t(lang, `badge.${b.kunci}`)}</p>
              <p className="text-xs font-bold">{t(lang, `badge.${b.kunci}.syarat`)}</p>
              {!b.didapat && <p className="text-xs text-perpus-tinta-lembut">{b.kemajuan}/{b.target}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="p-h2">{t(lang, 'akun.data')}</h2>
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
            <Link href={`/${lang}/donatur`} className="p-pil lg:hidden">{t(lang, 'nav.donatur')}</Link>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="p-h2">{t(lang, 'akun.catatanku')}</h2>
        {aktif.length === 0 && <p className="text-perpus-tinta-lembut">{t(lang, 'akun.catatanKosong')}</p>}
        <ul className="space-y-3">
          {aktif.map(c => (
            <li key={c.id} className="p-kartu space-y-1 p-4">
              <Link href={`/${lang}/buku/${c.idPendek}#catatan`} className="font-bold underline-offset-2 hover:underline">{c.judul}</Link>
              <p className="line-clamp-3 whitespace-pre-line text-sm">{c.isi}</p>
              {!c.publik && <p className="text-xs font-bold text-perpus-tinta-lembut">{t(lang, 'catatan.privatInfo')}</p>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
