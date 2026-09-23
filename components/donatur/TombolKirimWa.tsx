'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WhatsappLogo, ArrowClockwise, CheckCircle } from '@phosphor-icons/react';
import { twMerge } from 'tailwind-merge';
import { pesanUcapan, waWebLink } from '@/lib/surat/pesan';
import { labelSapaan } from '@/lib/surat/data';
import { tandaiTerkirim } from '@/lib/donatur/tandai-terkirim';
import { TombolIkon } from '@/components/ui/Tombol';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';

type StatusFile = 'menunggu' | 'memuat' | 'siap' | 'gagal';

/**
 * Tombol kirim surat sebagai gambar lewat WhatsApp. `aktif=false` menunda pengambilan PNG
 * (dipakai carousel beranda agar hanya slide aktif yang merender PNG).
 */
export function TombolKirimWa({ surat, onTerkirim, aktif = true, className }: {
  surat: SuratWithRelasi; onTerkirim?: () => void; aktif?: boolean; className?: string;
}) {
  const router = useRouter();
  const [statusFile, setStatusFile] = useState<StatusFile>(aktif ? 'memuat' : 'menunggu');
  const [percobaan, setPercobaan] = useState(0);
  const fileRef = useRef<File | null>(null);
  const [menandai, setMenandai] = useState(false);
  const [terkirimLokal, setTerkirimLokal] = useState(surat.terkirimWa);
  const [otomatisTandai, setOtomatisTandai] = useState(true);
  const [sudahDicoba, setSudahDicoba] = useState(false);
  const [pesanInfo, setPesanInfo] = useState<string | null>(null);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [tautanManual, setTautanManual] = useState<string | null>(null);

  useEffect(() => {
    try {
      const disimpan = localStorage.getItem('bq_auto_tandai_wa');
      if (disimpan !== null) setOtomatisTandai(disimpan === 'true');
    } catch {
      /* ignore SSR / storage blocked */
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

  const donatur = surat.donasi.donatur;
  const sapaanNama = `${labelSapaan(donatur.sapaan)} ${donatur.nama}`;
  const teks = pesanUcapan(sapaanNama, surat.nomorSurat);
  const namaFile = `${surat.nomorSurat.replace(/\//g, '-')}.png`;

  // Ambil PNG lebih awal (bukan di dalam handler klik) — di Safari iOS, menunggu
  // jaringan di handler klik menghabiskan "aktivasi pengguna" sehingga share() gagal.
  useEffect(() => {
    if (!aktif) {
      if (!fileRef.current) setStatusFile('menunggu');
      return;
    }
    if (fileRef.current) return;
    let batal = false;
    setStatusFile('memuat');
    fetch(`/api/donatur/surat/${surat.id}/png`)
      .then(res => {
        if (!res.ok) throw new Error('Gagal mengambil gambar surat');
        return res.blob();
      })
      .then(blob => {
        if (batal) return;
        fileRef.current = new File([blob], namaFile, { type: 'image/png' });
        setStatusFile('siap');
      })
      .catch(() => { if (!batal) setStatusFile('gagal'); });
    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surat.id, percobaan, aktif]);

  /** Jalur cadangan (desktop, dan bila share() gagal selain dibatalkan pengguna). */
  const jalurCadangan = (file: File) => {
    // window.open PALING AWAL agar tidak diblokir popup blocker.
    const link = waWebLink(donatur.noWa, teks);
    const waWindow = link ? window.open(link, '_blank') : null;
    if (waWindow) waWindow.opener = null;

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = namaFile;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    navigator.clipboard?.writeText(teks).catch(() => { /* tidak fatal */ });

    if (link && !waWindow) {
      setTautanManual(link);
      setPesanInfo('Gambar sudah diunduh dan teks disalin. Popup diblokir — buka WhatsApp Web lewat tautan di bawah, lalu tempel gambarnya (Ctrl+V).');
    } else {
      setPesanInfo('Gambar sudah diunduh dan teks disalin. Tempel gambarnya (Ctrl+V) di chat WhatsApp yang terbuka.');
    }
  };

  const kirim = () => {
    const file = fileRef.current;
    if (!file) return;
    setPesanError(null);
    setPesanInfo(null);
    setTautanManual(null);
    setSudahDicoba(true);

    if (otomatisTandai && !terkirimLokal) {
      void tandai();
    }

    const bisaShare = typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });
    if (bisaShare) {
      // Panggilan SINKRON agar aktivasi pengguna dari klik ini masih berlaku.
      navigator.share({ files: [file], text: teks }).catch((e: { name?: string }) => {
        if (e?.name === 'AbortError') return;
        jalurCadangan(file);
      });
    } else {
      jalurCadangan(file);
    }
  };

  const tandai = async () => {
    setMenandai(true);
    setPesanError(null);
    const galat = await tandaiTerkirim(surat.id);
    setMenandai(false);
    if (galat) { setPesanError(galat); return; }
    setTerkirimLokal(true);
    if (onTerkirim) onTerkirim(); else router.refresh();
  };

  const labelKirim = statusFile === 'memuat' ? 'Menyiapkan gambar…' : 'Kirim WA';

  return (
    <div className={twMerge('space-y-2', className)}>
      {!terkirimLokal ? (
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-semibold text-bq-redup">Otomatis tandai terkirim</span>
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
      ) : (
        <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle size={15} weight="fill" aria-hidden="true" />
          <span>Surat sudah berstatus terkirim</span>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={kirim} disabled={statusFile !== 'siap' || !donatur.noWa}
          aria-label="Kirim surat sebagai gambar lewat WhatsApp"
          className="tekan inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0E9F54] px-4 text-sm font-bold text-white shadow-[0_8px_16px_-8px_rgb(14_159_84/0.7)] hover:bg-[#0c8a49] disabled:cursor-not-allowed disabled:opacity-50">
          <WhatsappLogo size={20} weight="bold" aria-hidden="true" /> {labelKirim}
        </button>
        {statusFile === 'gagal' && (
          <TombolIkon ikon={ArrowClockwise} label="Coba lagi memuat gambar surat" onClick={() => setPercobaan(p => p + 1)} />
        )}
      </div>
      {sudahDicoba && !terkirimLokal && !otomatisTandai && (
        <div role="status" className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-bq-tinta dark:bg-emerald-950/30">
          <span>Sudah terkirim ke donatur?</span>
          <button type="button" onClick={tandai} disabled={menandai}
            className="tekan inline-flex items-center gap-1 font-bold text-bq-hijau disabled:opacity-50">
            <CheckCircle size={16} weight="bold" aria-hidden="true" /> {menandai ? 'Menandai…' : 'Tandai'}
          </button>
        </div>
      )}
      {statusFile === 'gagal' && <p role="alert" className="text-xs text-rose-600">Gagal memuat gambar surat. Coba lagi.</p>}
      {!donatur.noWa && <p className="text-xs text-bq-jingga">Nomor WhatsApp donatur belum diisi.</p>}
      {pesanInfo && <p role="status" className="text-xs text-bq-redup">{pesanInfo}</p>}
      {tautanManual && (
        <a href={tautanManual} target="_blank" rel="noopener" className="text-xs font-bold text-bq-biru underline underline-offset-2">
          Buka WhatsApp Web
        </a>
      )}
      {pesanError && <p role="alert" className="text-xs text-rose-600">{pesanError}</p>}
    </div>
  );
}
