'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DownloadSimple, CheckCircle, Clock, Warning } from '@phosphor-icons/react';
import { labelSapaan } from '@/lib/surat/data';
import { formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian } from '@/lib/utils/formatters';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';

type StatusFilter = 'SEMUA' | 'BELUM' | 'SUDAH';

function bulanIni(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

function rentangBulan(bulan: string): { dari: string; sampai: string } {
  const [tahun, bln] = bulan.split('-').map(Number);
  const dari = `${bulan}-01`;
  const akhir = new Date(tahun, bln, 0).getDate(); // hari terakhir bulan itu
  const sampai = `${bulan}-${String(akhir).padStart(2, '0')}`;
  return { dari, sampai };
}

function nilaiSurat(s: SuratWithRelasi): string {
  return s.donasi.bentuk === 'UANG'
    ? `Rp ${formatRupiah(s.donasi.nominal ?? 0)}`
    : (s.donasi.deskripsiBarang || '-');
}

function badgeStatus(terkirim: boolean) {
  return terkirim ? (
    <span className="inline-flex items-center gap-1 text-[#0E9F54] font-bold text-xs">
      <CheckCircle size={16} weight="bold" aria-hidden="true" /> Sudah terkirim
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-amber-600 font-bold text-xs">
      <Clock size={16} weight="bold" aria-hidden="true" /> Belum terkirim
    </span>
  );
}

export function DaftarSurat() {
  const [bulan, setBulan] = useState(bulanIni());
  const [status, setStatus] = useState<StatusFilter>('SEMUA');
  const [surat, setSurat] = useState<SuratWithRelasi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { dari, sampai } = useMemo(() => rentangBulan(bulan), [bulan]);

  useEffect(() => {
    let batal = false;
    setError(null);
    (async () => {
      try {
        const p = new URLSearchParams({ dari, sampai });
        if (status !== 'SEMUA') p.set('terkirim', status === 'SUDAH' ? 'true' : 'false');
        const res = await fetch(`/api/donatur/surat?${p.toString()}`);
        const data = await res.json();
        if (batal) return;
        if (!res.ok) { setError(data.error || 'Gagal memuat daftar surat'); return; }
        setSurat(data.data);
      } catch {
        if (!batal) setError('Tidak dapat terhubung ke server.');
      }
    })();
    return () => { batal = true; };
  }, [dari, sampai, status]);

  const OPSI_STATUS: Array<{ id: StatusFilter; label: string }> = [
    { id: 'SEMUA', label: 'Semua' },
    { id: 'BELUM', label: 'Belum terkirim' },
    { id: 'SUDAH', label: 'Sudah terkirim' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Bulan</span>
          <input
            type="month"
            value={bulan}
            onChange={e => setBulan(e.target.value)}
            aria-label="Pilih bulan surat"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm min-h-11 focus:outline-none focus:ring-2 focus:ring-[#0B5FA5]"
          />
        </label>
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          {OPSI_STATUS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setStatus(opt.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-9 ${
                status === opt.id
                  ? 'bg-white dark:bg-slate-900 text-[#0B5FA5] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-3 py-2 flex items-center gap-2">
          <Warning size={18} weight="bold" aria-hidden="true" /> {error}
        </div>
      )}

      {surat === null && !error && (
        <p className="text-sm text-slate-500 px-1">Memuat daftar surat…</p>
      )}

      {surat !== null && surat.length === 0 && (
        <p className="text-sm text-slate-500 px-1">Tidak ada surat pada periode ini.</p>
      )}

      {surat !== null && surat.length > 0 && (
        <>
          {/* Tabel — desktop */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3">Nomor</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Donatur</th>
                  <th className="px-4 py-3">Nilai</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {surat.map(s => (
                  <tr key={s.id} className="border-b last:border-0 border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-bold">{s.nomorSurat}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateIndonesian(s.tanggalSurat)}</td>
                    <td className="px-4 py-3">{labelSapaan(s.donasi.donatur.sapaan)} {s.donasi.donatur.nama}</td>
                    <td className="px-4 py-3">{nilaiSurat(s)}</td>
                    <td className="px-4 py-3">{badgeStatus(s.terkirimWa)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/donatur/surat/${s.id}`} className="font-bold text-[#0B5FA5] hover:underline">
                          Detail
                        </Link>
                        <a
                          href={`/api/donatur/surat/${s.id}/png`}
                          download={`${s.nomorSurat.replace(/\//g, '-')}.png`}
                          aria-label={`Unduh PNG surat ${s.nomorSurat}`}
                          className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <DownloadSimple size={18} weight="bold" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu — mobile */}
          <div className="md:hidden space-y-3">
            {surat.map(s => (
              <div key={s.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{s.nomorSurat}</p>
                    <p className="text-xs text-slate-500">{formatDateIndonesian(s.tanggalSurat)}</p>
                  </div>
                  {badgeStatus(s.terkirimWa)}
                </div>
                <p className="text-sm">{labelSapaan(s.donasi.donatur.sapaan)} {s.donasi.donatur.nama}</p>
                <p className="text-sm font-bold">{nilaiSurat(s)}</p>
                <div className="flex items-center gap-4 pt-1">
                  <Link href={`/donatur/surat/${s.id}`} className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm inline-flex items-center text-[#0B5FA5]">
                    Detail
                  </Link>
                  <a
                    href={`/api/donatur/surat/${s.id}/png`}
                    download={`${s.nomorSurat.replace(/\//g, '-')}.png`}
                    aria-label={`Unduh PNG surat ${s.nomorSurat}`}
                    className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center text-slate-600 dark:text-slate-300"
                  >
                    <DownloadSimple size={20} weight="bold" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
