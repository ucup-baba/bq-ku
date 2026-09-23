'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HandCoins, Receipt, Package, PaperPlaneTilt,
  CheckCircle, Clock, Warning, PlusCircle,
} from '@phosphor-icons/react';
import type { Rekap, SuratWithRelasi } from '@/lib/db/donatur-repo';
import { rentangPeriode } from '@/lib/utils/rekap';
import { formatRupiah } from '@/lib/utils/terbilang';
import { labelSapaan } from '@/lib/surat/data';
import { susunRingkasan, type Ringkasan } from '@/lib/donatur/ringkasan';

type Status = 'memuat' | 'siap' | 'error';

function nilaiSurat(s: SuratWithRelasi): string {
  return s.donasi.bentuk === 'UANG'
    ? `Rp ${formatRupiah(s.donasi.nominal ?? 0)}`
    : (s.donasi.deskripsiBarang || '-');
}

function BadgeStatus({ terkirim }: { terkirim: boolean }) {
  return terkirim ? (
    <span className="inline-flex items-center gap-1 text-[#0E9F54] font-bold text-xs whitespace-nowrap">
      <CheckCircle size={16} weight="bold" aria-hidden="true" /> Terkirim
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-xs whitespace-nowrap">
      <Clock size={16} weight="bold" aria-hidden="true" /> Belum terkirim
    </span>
  );
}

function ErrorBanner({ pesan }: { pesan: string }) {
  return (
    <div role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2 flex items-center gap-2">
      <Warning size={18} weight="bold" aria-hidden="true" /> {pesan}
    </div>
  );
}

function KartuAngka({ icon, warna, label, nilai }: { icon: React.ReactNode; warna: string; label: string; nilai: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-1">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className={warna}>{icon}</span> {label}
      </p>
      <p className="text-2xl font-extrabold">{nilai}</p>
    </div>
  );
}

function KartuAngkaSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2 animate-pulse">
      <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

async function ambilJson(url: string): Promise<any> {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const rincian = json.fields ? Object.values<string>(json.fields).join(' ') : '';
    throw new Error([json.error || 'Gagal memuat data.', rincian].filter(Boolean).join(' — '));
  }
  return json.data;
}

export function RingkasanDonatur() {
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [statusRingkasan, setStatusRingkasan] = useState<Status>('memuat');
  const [errorRingkasan, setErrorRingkasan] = useState<string | null>(null);

  const [suratTerbaru, setSuratTerbaru] = useState<SuratWithRelasi[] | null>(null);
  const [statusSurat, setStatusSurat] = useState<Status>('memuat');
  const [errorSurat, setErrorSurat] = useState<string | null>(null);

  useEffect(() => {
    let batal = false;
    const { dari, sampai } = rentangPeriode('bulan-ini', new Date());

    // Dua kelompok data (kartu ringkasan & daftar surat terbaru) dimuat
    // secara paralel — masing-masing dengan status/error sendiri agar satu
    // kegagalan tidak menyembunyikan bagian lain yang berhasil.
    Promise.all([
      ambilJson(`/api/donatur/rekap?dari=${encodeURIComponent(dari)}&sampai=${encodeURIComponent(sampai)}`) as Promise<Rekap>,
      ambilJson(`/api/donatur/surat?dari=${encodeURIComponent(dari)}&sampai=${encodeURIComponent(sampai)}&terkirim=true&limit=500`) as Promise<SuratWithRelasi[]>,
    ])
      .then(([rekap, suratTerkirimBulanIni]) => {
        if (batal) return;
        setRingkasan(susunRingkasan(rekap, suratTerkirimBulanIni.length));
        setStatusRingkasan('siap');
      })
      .catch((err) => {
        if (batal) return;
        setErrorRingkasan(err instanceof Error ? err.message : 'Tidak dapat terhubung ke server.');
        setStatusRingkasan('error');
      });

    ambilJson('/api/donatur/surat?limit=5')
      .then((data: SuratWithRelasi[]) => {
        if (batal) return;
        setSuratTerbaru(data);
        setStatusSurat('siap');
      })
      .catch((err) => {
        if (batal) return;
        setErrorSurat(err instanceof Error ? err.message : 'Tidak dapat terhubung ke server.');
        setStatusSurat('error');
      });

    return () => { batal = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statusRingkasan === 'memuat' && Array.from({ length: 4 }).map((_, i) => <KartuAngkaSkeleton key={i} />)}

        {statusRingkasan === 'error' && (
          <div className="sm:col-span-2 lg:col-span-4">
            <ErrorBanner pesan={errorRingkasan || 'Gagal memuat ringkasan donasi.'} />
          </div>
        )}

        {statusRingkasan === 'siap' && ringkasan && (
          <>
            <KartuAngka
              icon={<HandCoins size={16} weight="duotone" />}
              warna="text-[#0E9F54]"
              label="Total uang bulan ini"
              nilai={`Rp ${formatRupiah(ringkasan.totalUang)}`}
            />
            <KartuAngka
              icon={<Receipt size={16} weight="duotone" />}
              warna="text-[#0B5FA5]"
              label="Jumlah donasi"
              nilai={String(ringkasan.jumlahDonasi)}
            />
            <KartuAngka
              icon={<Package size={16} weight="duotone" />}
              warna="text-[#0B5FA5]"
              label="Donasi barang"
              nilai={String(ringkasan.jumlahBarang)}
            />
            <KartuAngka
              icon={<PaperPlaneTilt size={16} weight="duotone" />}
              warna="text-[#0E9F54]"
              label="Surat terkirim bulan ini"
              nilai={String(ringkasan.suratTerkirim)}
            />
          </>
        )}
      </div>

      <Link
        href="/donatur/surat/baru"
        className="flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-[#0B5FA5] hover:bg-[#094a84] text-white font-extrabold text-base shadow-sm transition-colors"
      >
        <PlusCircle size={22} weight="bold" aria-hidden="true" /> Buat Surat
      </Link>

      <div className="space-y-3">
        <h2 className="font-bold text-lg">Surat Terbaru</h2>

        {statusSurat === 'memuat' && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        )}

        {statusSurat === 'error' && <ErrorBanner pesan={errorSurat || 'Gagal memuat daftar surat terbaru.'} />}

        {statusSurat === 'siap' && suratTerbaru && suratTerbaru.length === 0 && (
          <p className="text-sm text-slate-500 px-1">Belum ada surat dibuat. Mulai dengan membuat surat pertama.</p>
        )}

        {statusSurat === 'siap' && suratTerbaru && suratTerbaru.length > 0 && (
          <div className="space-y-2">
            {suratTerbaru.map((s) => (
              <Link
                key={s.id}
                href={`/donatur/surat/${s.id}`}
                className="flex items-center justify-between gap-3 min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-[#0B5FA5] transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-bold truncate">{s.nomorSurat}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {labelSapaan(s.donasi.donatur.sapaan)} {s.donasi.donatur.nama} · {nilaiSurat(s)}
                  </p>
                </div>
                <BadgeStatus terkirim={s.terkirimWa} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
