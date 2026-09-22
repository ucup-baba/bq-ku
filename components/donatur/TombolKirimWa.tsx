'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WhatsappLogo, DownloadSimple, CheckCircle, ArrowClockwise } from '@phosphor-icons/react';
import { pesanUcapan, waWebLink } from '@/lib/surat/pesan';
import { labelSapaan } from '@/lib/surat/data';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';

type StatusFile = 'memuat' | 'siap' | 'gagal';

export function TombolKirimWa({ surat, onTerkirim }: { surat: SuratWithRelasi; onTerkirim?: () => void }) {
  const router = useRouter();
  const [statusFile, setStatusFile] = useState<StatusFile>('memuat');
  const [percobaan, setPercobaan] = useState(0);
  const fileRef = useRef<File | null>(null);
  const [menandai, setMenandai] = useState(false);
  const [terkirimLokal, setTerkirimLokal] = useState(surat.terkirimWa);
  const [pesanInfo, setPesanInfo] = useState<string | null>(null);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const [tautanManual, setTautanManual] = useState<string | null>(null);
  const donatur = surat.donasi.donatur;
  const sapaanNama = `${labelSapaan(donatur.sapaan)} ${donatur.nama}`;
  const teks = pesanUcapan(sapaanNama, surat.nomorSurat);
  const namaFile = `${surat.nomorSurat.replace(/\//g, '-')}.png`;

  // Ambil PNG lebih awal (saat komponen dipasang / dicoba ulang), BUKAN di
  // dalam handler klik — di Safari iOS dan sebagian browser, menunggu
  // jaringan di dalam handler klik menghabiskan "aktivasi pengguna" sehingga
  // navigator.share() gagal dengan NotAllowedError meski dipanggil sesudahnya.
  useEffect(() => {
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
      .catch(() => {
        if (!batal) setStatusFile('gagal');
      });
    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surat.id, percobaan]);

  /** Jalur cadangan (dipakai di desktop, dan bila share() gagal selain dibatalkan pengguna). */
  const jalurCadangan = (file: File) => {
    // window.open dipanggil PALING AWAL, sebelum operasi lain, supaya tidak
    // diblokir popup blocker (yang menganggap klik sudah "basi" setelah ada
    // pekerjaan lain di antaranya).
    const link = waWebLink(donatur.noWa, teks);
    const waWindow = link ? window.open(link, '_blank') : null;
    if (waWindow) waWindow.opener = null; // setara rel=noopener tanpa kehilangan referensi untuk deteksi blokir

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = namaFile;
    a.click();
    // Tunda pelepasan URL objek — beberapa browser masih memprosesnya sesaat
    // setelah click() dipanggil; revoke terlalu cepat bisa menggagalkan unduhan.
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    navigator.clipboard?.writeText(teks).catch(() => {
      // Clipboard bisa ditolak browser — tidak fatal, teks tetap ada di pesan info.
    });

    if (link && !waWindow) {
      setTautanManual(link);
      setPesanInfo('Gambar sudah diunduh dan teks disalin. Popup diblokir — klik tautan di bawah untuk membuka WhatsApp Web, lalu tempel gambarnya (Ctrl+V).');
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

    const bisaShare = typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });
    if (bisaShare) {
      // Panggilan SINKRON, tanpa await apa pun sebelumnya, agar aktivasi
      // pengguna dari klik ini masih berlaku saat share() dipanggil.
      navigator.share({ files: [file], text: teks }).catch((e: any) => {
        if (e?.name === 'AbortError') return; // pembatalan oleh pengguna, bukan error
        jalurCadangan(file);
      });
    } else {
      jalurCadangan(file);
    }
  };

  const cobaLagi = () => setPercobaan(p => p + 1);

  const tandai = async () => {
    setMenandai(true);
    setPesanError(null);
    try {
      const res = await fetch(`/api/donatur/surat/${surat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terkirimWa: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPesanError(data?.error || 'Gagal menandai surat sebagai terkirim');
        return;
      }
      setTerkirimLokal(true);
      if (onTerkirim) {
        onTerkirim();
      } else {
        router.refresh();
      }
    } catch {
      setPesanError('Tidak dapat terhubung ke server.');
    } finally {
      setMenandai(false);
    }
  };

  const labelKirim = statusFile === 'memuat' ? 'Menyiapkan gambar…' : 'Kirim WhatsApp';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={kirim}
          disabled={statusFile !== 'siap' || !donatur.noWa}
          aria-label="Kirim surat sebagai gambar lewat WhatsApp"
          className="h-12 px-5 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8a49] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold inline-flex items-center gap-2"
        >
          <WhatsappLogo size={22} weight="bold" aria-hidden="true" /> {labelKirim}
        </button>
        {statusFile === 'gagal' && (
          <button
            type="button"
            onClick={cobaLagi}
            aria-label="Coba lagi memuat gambar surat"
            className="h-12 px-5 rounded-2xl border border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300 font-bold inline-flex items-center gap-2"
          >
            <ArrowClockwise size={20} weight="bold" aria-hidden="true" /> Coba lagi
          </button>
        )}
        <a
          href={`/api/donatur/surat/${surat.id}/png`}
          download={namaFile}
          aria-label="Unduh surat sebagai gambar PNG"
          className="h-12 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 font-bold inline-flex items-center gap-2"
        >
          <DownloadSimple size={20} weight="bold" aria-hidden="true" /> Unduh PNG
        </a>
        {!terkirimLokal && (
          <button
            type="button"
            onClick={tandai}
            disabled={menandai}
            aria-label="Tandai surat sudah terkirim"
            className="h-12 px-5 rounded-2xl border border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 disabled:opacity-50 font-bold inline-flex items-center gap-2"
          >
            <CheckCircle size={20} weight="bold" aria-hidden="true" /> {menandai ? 'Menandai…' : 'Tandai sudah terkirim'}
          </button>
        )}
      </div>
      {statusFile === 'gagal' && (
        <p role="alert" className="text-xs text-rose-600">Gagal memuat gambar surat. Coba lagi.</p>
      )}
      {!donatur.noWa && (
        <p className="text-xs text-amber-600">
          Donatur belum punya nomor WhatsApp — lengkapi dulu di data donatur agar surat bisa dikirim.
        </p>
      )}
      {pesanInfo && <p role="status" className="text-xs text-slate-600 dark:text-slate-300">{pesanInfo}</p>}
      {tautanManual && (
        <a href={tautanManual} target="_blank" rel="noopener" className="text-xs font-bold text-[#0B5FA5] underline underline-offset-2">
          Buka WhatsApp Web
        </a>
      )}
      {pesanError && <p role="alert" className="text-xs text-rose-600">{pesanError}</p>}
    </div>
  );
}
