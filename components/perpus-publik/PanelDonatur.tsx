import Link from 'next/link';
import type { Bahasa } from '@/lib/perpus/ddc';
import { rupiahPublik, tanggalPublik } from '@/lib/perpus/format-publik';
import { t } from '@/lib/perpus/i18n';
import type { DonasiPublik, RingkasanPublik } from '@/lib/perpus/tipe';

export type TabDonatur = 'infaq' | 'wakaf';

export function PanelDonatur({ lang, tab, donasi, ringkasan }: { lang: Bahasa; tab: TabDonatur; donasi: DonasiPublik[]; ringkasan: RingkasanPublik }) {
  const baris = donasi.filter(d => d.jenis === (tab === 'infaq' ? 'uang' : 'buku'));
  const total = [
    ['donatur.totalInfaq', ringkasan.totalInfaq],
    ['donatur.pengadaan', ringkasan.totalPengadaan],
    ['donatur.saldo', ringkasan.saldo],
  ] as const;
  const tautanTab = (nilai: TabDonatur, kunci: 'donatur.tabInfaq' | 'donatur.tabWakaf') => (
    <Link href={`/${lang}/donatur${nilai === 'wakaf' ? '?tab=wakaf' : ''}`} className={`p-pil ${tab === nilai ? 'p-pil-aktif' : ''}`} aria-current={tab === nilai ? 'true' : undefined}>
      {t(lang, kunci)}
    </Link>
  );
  return (
    <>
      <dl className="grid gap-3 sm:grid-cols-3">
        {total.map(([kunci, n]) => (
          <div key={kunci} className="p-kartu p-4">
            <dt className="text-xs font-bold text-perpus-tinta-lembut">{t(lang, kunci)}</dt>
            <dd className="p-h2">{rupiahPublik(lang, n)}</dd>
          </div>
        ))}
      </dl>
      <nav className="flex gap-2" aria-label={t(lang, 'donatur.judul')}>
        {tautanTab('infaq', 'donatur.tabInfaq')}
        {tautanTab('wakaf', 'donatur.tabWakaf')}
      </nav>
      {baris.length === 0 && <p className="p-kartu p-6 text-center">{t(lang, 'donatur.kosong')}</p>}
      <ul className="space-y-2">
        {baris.map(d => (
          <li key={d.id} className="p-baris flex-wrap justify-between">
            <span className="font-extrabold">{d.nama}</span>
            <span className="text-sm text-perpus-tinta-lembut">{tanggalPublik(lang, d.tanggal, d.tanggalTeks)}</span>
            {tab === 'wakaf' && (
              <div className="w-full text-sm">
                {d.buku.length > 0
                  ? <ul className="space-y-1">{d.buku.map(b => <li key={b.idPendek}><Link href={`/${lang}/buku/${b.idPendek}`} className="underline underline-offset-2">{b.judul}</Link></li>)}</ul>
                  : d.jumlahBuku ? t(lang, 'donatur.jumlahBuku', { n: d.jumlahBuku }) : null}
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
