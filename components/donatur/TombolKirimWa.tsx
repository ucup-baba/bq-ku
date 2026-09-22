'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WhatsappLogo, DownloadSimple, CheckCircle } from '@phosphor-icons/react';
import { pesanUcapan, waWebLink } from '@/lib/surat/pesan';
import { labelSapaan } from '@/lib/surat/data';
import type { SuratWithRelasi } from '@/lib/db/donatur-repo';

export function TombolKirimWa({ surat, onTerkirim }: { surat: SuratWithRelasi; onTerkirim?: () => void }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  const [menandai, setMenandai] = useState(false);
  const [terkirimLokal, setTerkirimLokal] = useState(surat.terkirimWa);
  const [pesanInfo, setPesanInfo] = useState<string | null>(null);
  const [pesanError, setPesanError] = useState<string | null>(null);
  const donatur = surat.donasi.donatur;
  const sapaanNama = `${labelSapaan(donatur.sapaan)} ${donatur.nama}`;
  const teks = pesanUcapan(sapaanNama, surat.nomorSurat);
  const namaFile = `${surat.nomorSurat.replace(/\//g, '-')}.png`;

  const ambilFile = async () => {
    const res = await fetch(`/api/donatur/surat/${surat.id}/png`);
    if (!res.ok) throw new Error('Gagal mengambil gambar surat');
    return new File([await res.blob()], namaFile, { type: 'image/png' });
  };

  const kirim = async () => {
    setSibuk(true);
    setPesanError(null);
    setPesanInfo(null);
    try {
      const file = await ambilFile();
      const bisaShare = typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });
      if (bisaShare) {
        await navigator.share({ files: [file], text: teks });
      } else {
        // Desktop: unduh gambar, salin teks, buka WhatsApp Web ke nomor donatur.
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = namaFile;
        a.click();
        URL.revokeObjectURL(url);
        try {
          await navigator.clipboard.writeText(teks);
        } catch {
          // Clipboard bisa ditolak browser — tidak fatal, teks tetap ada di pesan info.
        }
        const link = waWebLink(donatur.noWa, teks);
        if (link) window.open(link, '_blank', 'noopener,noreferrer');
        setPesanInfo('Gambar sudah diunduh dan teks disalin. Tempel gambarnya (Ctrl+V) di chat WhatsApp yang terbuka.');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setPesanError(e.message || 'Gagal mengirim');
    } finally {
      setSibuk(false);
    }
  };

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={kirim}
          disabled={sibuk || !donatur.noWa}
          aria-label="Kirim surat sebagai gambar lewat WhatsApp"
          className="h-12 px-5 rounded-2xl bg-[#0E9F54] hover:bg-[#0c8a49] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold inline-flex items-center gap-2"
        >
          <WhatsappLogo size={22} weight="bold" aria-hidden="true" /> {sibuk ? 'Menyiapkan…' : 'Kirim WhatsApp'}
        </button>
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
      {!donatur.noWa && (
        <p className="text-xs text-amber-600">
          Donatur belum punya nomor WhatsApp — lengkapi dulu di data donatur agar surat bisa dikirim.
        </p>
      )}
      {pesanInfo && <p role="status" className="text-xs text-slate-600 dark:text-slate-300">{pesanInfo}</p>}
      {pesanError && <p role="alert" className="text-xs text-rose-600">{pesanError}</p>}
    </div>
  );
}
