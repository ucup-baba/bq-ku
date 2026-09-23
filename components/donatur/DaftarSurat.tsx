'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, CalendarBlank, MagnifyingGlass, X, FileText, Trash, WhatsappLogo, ArrowUpRight } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';
import { labelSapaan } from '@/lib/surat/data';
import { labelBulan } from '@/lib/utils/rekap';
import { formatDateIndonesian, formatJam } from '@/lib/utils/formatters';
import { formatNilaiDonasi } from '@/lib/donatur/riwayat';
import { statusDariParam, bulanDari, rentangBulan, hitungStatus, saringSurat, type StatusFilter } from '@/lib/donatur/daftar-surat';
import { KepalaHalaman } from '@/components/ui/KepalaHalaman';
import { kelasKartu, Kartu } from '@/components/ui/Kartu';
import { InisialUbin } from '@/components/ui/InisialUbin';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { ChipPilihan } from '@/components/ui/ChipPilihan';
import { TautanUtama, TombolIkon } from '@/components/ui/Tombol';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';
import { kelasInput, kelasLabel } from '@/components/ui/kelas';
import { StatusSurat } from '@/components/donatur/StatusSurat';
import { DialogHapusSurat, type InfoHapusSurat } from '@/components/donatur/DialogHapusSurat';

export function DaftarSurat() {
  const router = useRouter();
  const sp = useSearchParams();
  const [status, setStatus] = useState<StatusFilter>(() => statusDariParam(sp.get('status')));
  const [bulan, setBulan] = useState(() => bulanDari(new Date()));
  const [cari, setCari] = useState('');
  const [bulanBuka, setBulanBuka] = useState(false);
  const [surat, setSurat] = useState<SuratWithRelasi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [akanDihapus, setAkanDihapus] = useState<InfoHapusSurat | null>(null);
  const [otomatisTandai, setOtomatisTandai] = useState(true);
  const { dari, sampai } = useMemo(() => rentangBulan(bulan), [bulan]);

  useEffect(() => {
    try {
      const v = localStorage.getItem('bq_auto_tandai_wa');
      if (v !== null) setOtomatisTandai(v === 'true');
    } catch {
      /* ignore */
    }
  }, []);

  const ubahOtomatisTandai = (baru: boolean) => {
    setOtomatisTandai(baru);
    try {
      localStorage.setItem('bq_auto_tandai_wa', String(baru));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let batal = false;
    setError(null);
    setSurat(null);
    (async () => {
      try {
        const res = await fetch(`/api/donatur/surat?${new URLSearchParams({ dari, sampai, limit: '500' })}`);
        const data = await res.json();
        if (batal) return;
        if (!res.ok) { setError(data.error || 'Gagal memuat daftar surat'); return; }
        setSurat(data.data);
      } catch {
        if (!batal) setError('Tidak dapat terhubung ke server.');
      }
    })();
    return () => { batal = true; };
  }, [dari, sampai]);

  const hitung = surat ? hitungStatus(surat) : null;
  const infoHapus = (s: SuratWithRelasi): InfoHapusSurat => ({
    id: s.id, nomorSurat: s.nomorSurat, terkirim: s.terkirimWa,
    namaDonatur: `${labelSapaan(s.donasi.donatur.sapaan)} ${s.donasi.donatur.nama}`, nilai: formatNilaiDonasi(s.donasi),
  });
  const tombolHapus = (s: SuratWithRelasi) => (
    <TombolIkon ikon={Trash} label={`Hapus surat ${s.nomorSurat}`} ukuran="sm" varian="polos"
      onClick={(e) => { e.stopPropagation(); setAkanDihapus(infoHapus(s)); }} className="text-bq-redup hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" />
  );
  const tersaring = surat ? saringSurat(surat, status, cari) : null;

  return (
    <div className="space-y-3 md:space-y-5">
      <KepalaHalaman judul="Surat" sub="Surat ucapan terima kasih yang sudah dibuat."
        aksi={<>
          <button type="button" onClick={() => setBulanBuka(true)} aria-label={`Ganti bulan, sekarang ${labelBulan(bulan)}`}
            className="tekan inline-flex h-11 items-center gap-2 rounded-2xl border border-bq-garis bg-bq-surface px-3 text-sm font-bold text-bq-tinta">
            <CalendarBlank size={18} weight="bold" aria-hidden="true" /><span>{labelBulan(bulan)}</span>
          </button>
          <TautanUtama href="/donatur/surat/baru" ikon={Plus} className="hidden md:inline-flex">Buat Surat</TautanUtama>
        </>} />

      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-2 bg-bq-bg/90 px-4 py-2 backdrop-blur sm:-mx-8 sm:px-8 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <ChipPilihan<StatusFilter> label="Saring status" nilai={status} onPilih={setStatus}
            opsi={[
              { value: 'SEMUA', label: 'Semua', jumlah: hitung?.semua },
              { value: 'BELUM', label: 'Belum dikirim', labelPendek: 'Belum', jumlah: hitung?.belum },
              { value: 'SUDAH', label: 'Sudah dikirim', labelPendek: 'Sudah', jumlah: hitung?.sudah },
            ]} />

          {/* Toggle Otomatis Tandai WA */}
          <div className="inline-flex h-9 items-center gap-2 rounded-full border border-bq-garis bg-bq-surface px-3 text-xs text-bq-redup shadow-xs">
            <span className="font-semibold text-bq-tinta whitespace-nowrap">Otomatis tandai WA</span>
            <button
              type="button"
              role="switch"
              aria-checked={otomatisTandai}
              onClick={() => ubahOtomatisTandai(!otomatisTandai)}
              title="Otomatis tandai surat sebagai sudah terkirim saat klik Kirim WA"
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                otomatisTandai ? 'bg-[#0E9F54]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  otomatisTandai ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="relative md:ml-auto md:w-72">
          <MagnifyingGlass size={16} weight="bold" aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bq-redup" />
          <input type="search" value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nomor atau donatur…"
            aria-label="Cari surat" className={twMerge(kelasInput, 'pl-10 pr-12')} />
          {cari && <TombolIkon ikon={X} label="Hapus pencarian" ukuran="sm" varian="polos" onClick={() => setCari('')} className="absolute right-1 top-1/2 -translate-y-1/2" />}
        </div>
      </div>

      {error && <PesanGalat pesan={error} />}

      {surat === null && !error && (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-kartu bg-slate-200/60 dark:bg-slate-800/60" />)}</div>
      )}

      {tersaring !== null && tersaring.length === 0 && (
        <Kartu className="flex flex-col items-center gap-3 p-8 text-center">
          <IkonUbin ikon={FileText} warna="biru" ukuran="lg" doodle="coretan" />
          <p className="text-sm font-semibold text-bq-tinta">
            {cari.trim() ? `Tidak ada surat dengan kata kunci "${cari}".` : `Tidak ada surat pada ${labelBulan(bulan)}.`}
          </p>
        </Kartu>
      )}

      {tersaring !== null && tersaring.length > 0 && (
        <>
          {/* HP: baris ringkas, seluruh baris menuju detail */}
          <ul data-audit-daftar className="bergilir space-y-2 md:hidden">
            {tersaring.map((s, i) => {
              const d = s.donasi.donatur;
              return (
                <li key={s.id} className={kelasKartu('biasa', 'flex items-center gap-1 p-1.5 pr-1')}>
                  <Link href={`/donatur/surat/${s.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1.5">
                    <InisialUbin nama={d.nama} indeks={i} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-bq-tinta">{labelSapaan(d.sapaan)} {d.nama}</span>
                      <span className="block truncate text-xs text-bq-redup">
                        {formatNilaiDonasi(s.donasi)} · <span className="font-mono">{s.nomorSurat}</span>{s.createdAt ? ` · ${formatJam(s.createdAt)}` : ''}
                      </span>
                    </span>
                    <StatusSurat terkirim={s.terkirimWa} />
                  </Link>
                  {tombolHapus(s)}
                </li>
              );
            })}
          </ul>

          {/* Desktop: tabel */}
          <div data-audit-daftar className={kelasKartu('biasa', 'hidden overflow-x-auto md:block')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bq-garis text-left text-xs font-bold uppercase tracking-wider text-bq-redup">
                  <th className="px-5 py-3">Nomor</th><th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Donatur</th>
                  <th className="px-5 py-3">Nilai</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bq-garis">
                {tersaring.map((s, i) => {
                  const d = s.donasi.donatur;
                  return (
                    <tr key={s.id} onClick={() => router.push(`/donatur/surat/${s.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-mono text-xs font-bold">
                        <Link href={`/donatur/surat/${s.id}`} className="text-bq-biru hover:underline">{s.nomorSurat}</Link>
                      </td>
                      <td className="px-5 py-3 text-xs text-bq-redup">
                        <div className="font-medium text-bq-tinta">{formatDateIndonesian(s.tanggalSurat)}</div>
                        {s.createdAt && <div className="text-[11px] text-bq-redup">Pukul {formatJam(s.createdAt)}</div>}
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/donatur/surat/${s.id}`} className="flex items-center gap-3">
                          <InisialUbin nama={d.nama} indeks={i} className="h-8 w-8" />
                          <span className="truncate font-bold text-bq-tinta group-hover:text-bq-biru group-hover:underline">
                            {labelSapaan(d.sapaan)} {d.nama}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 font-bold text-bq-tinta">{formatNilaiDonasi(s.donasi)}</td>
                      <td className="px-5 py-3"><StatusSurat terkirim={s.terkirimWa} /></td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          {!s.terkirimWa ? (
                            <Link
                              href={`/donatur/surat/${s.id}`}
                              className="tekan inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#0E9F54] px-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0c8a49]"
                              title="Kirim via WhatsApp"
                            >
                              <WhatsappLogo size={14} weight="bold" />
                              <span>Kirim WA</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/donatur/surat/${s.id}`}
                              className="tekan inline-flex h-8 items-center gap-1 rounded-xl border border-bq-garis px-2 text-xs font-bold text-bq-redup hover:border-bq-tinta hover:text-bq-tinta"
                              title="Lihat detail surat"
                            >
                              <span>Detail</span>
                              <ArrowUpRight size={13} weight="bold" />
                            </Link>
                          )}
                          {tombolHapus(s)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <DialogHapusSurat surat={akanDihapus} onTutup={() => setAkanDihapus(null)}
        onTerhapus={(id) => { setAkanDihapus(null); setSurat(l => l?.filter(x => x.id !== id) ?? l); }} />

      <LembarBawah buka={bulanBuka} onTutup={() => setBulanBuka(false)} judul="Pilih bulan">
        <label className="block space-y-1">
          <span className={kelasLabel}>Bulan surat</span>
          <input type="month" value={bulan} className={kelasInput}
            onChange={e => { if (e.target.value) { setBulan(e.target.value); setBulanBuka(false); } }} />
        </label>
      </LembarBawah>
    </div>
  );
}
