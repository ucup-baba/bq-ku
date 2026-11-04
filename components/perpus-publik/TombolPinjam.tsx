'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Bahasa } from '@/lib/perpus/ddc';
import { t } from '@/lib/perpus/i18n';
import { tampilanPinjam, type KodeGalat } from '@/lib/perpus/pinjaman';
import type { StatusPinjamBuku } from '@/lib/perpus/tipe';

export function TombolPinjam({ lang, bukuId, idPendek }: { lang: Bahasa; bukuId: string; idPendek: string }) {
  const [s, setS] = useState<StatusPinjamBuku | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [terkirim, setTerkirim] = useState(false);
  const [galat, setGalat] = useState<KodeGalat | null>(null);

  useEffect(() => {
    fetch(`/api/perpus-publik/status?buku=${bukuId}`).then(r => r.json()).then(d => setS(d.data ?? null));
  }, [bukuId]);

  const ajukan = async () => {
    setSibuk(true); setGalat(null);
    const res = await fetch('/api/perpus-publik/pinjaman', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bukuId }),
    });
    const d = await res.json().catch(() => ({}));
    setSibuk(false);
    if (res.ok) setTerkirim(true); else setGalat((d.kode as KodeGalat) ?? 'buku_tidak_ada');
  };

  const tampilan = terkirim ? 'sudah_ada' : tampilanPinjam(s);
  const tujuan = encodeURIComponent(`/${lang}/buku/${idPendek}`);
  if (tampilan === 'memuat') return <button type="button" disabled className="p-tombol">{t(lang, 'pinjam.memuat')}</button>;
  if (tampilan === 'masuk') return <Link href={`/${lang}/masuk?next=${tujuan}`} className="p-tombol">{t(lang, 'pinjam.masuk')}</Link>;
  if (tampilan === 'daftar') return <Link href={`/${lang}/daftar?next=${tujuan}`} className="p-tombol">{t(lang, 'pinjam.daftar')}</Link>;
  if (tampilan === 'sudah_ada') {
    return (
      <div className="space-y-2">
        {terkirim && <p role="status" className="font-bold">{t(lang, 'pinjam.terkirim')}</p>}
        <Link href={`/${lang}/pinjamanku`} className="p-tombol">{t(lang, 'pinjam.sudahAda')}</Link>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={ajukan} disabled={sibuk || tampilan !== 'bisa'} className="p-tombol disabled:opacity-50">
        {t(lang, sibuk ? 'pinjam.mengajukan' : 'pinjam.tombol')}
      </button>
      {tampilan === 'diblokir' && <p className="font-bold">{t(lang, 'pinjam.diblokir')}</p>}
      {tampilan === 'habis' && <p className="font-bold">{t(lang, 'pinjam.habis')}</p>}
      {galat && <p role="alert" className="font-bold">{t(lang, `galat.${galat}`)}</p>}
    </div>
  );
}
