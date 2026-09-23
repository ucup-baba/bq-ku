'use client';
import { useState } from 'react';
import { Trash, Warning } from '@phosphor-icons/react';
import { LembarBawah } from '@/components/ui/LembarBawah';
import { PesanGalat } from '@/components/ui/PesanGalat';

export type InfoHapusSurat = { id: string; nomorSurat: string; namaDonatur: string; nilai: string; terkirim: boolean };

/** Konfirmasi hapus surat (dipakai di Detail Surat & Daftar Surat). `onTerhapus` dipanggil setelah berhasil. */
export function DialogHapusSurat({ surat, onTutup, onTerhapus }: {
  surat: InfoHapusSurat | null; onTutup: () => void; onTerhapus: (id: string) => void;
}) {
  const [menghapus, setMenghapus] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const tutup = () => { if (!menghapus) { setGalat(null); onTutup(); } };

  const hapus = async () => {
    if (!surat) return;
    setMenghapus(true);
    setGalat(null);
    try {
      const res = await fetch(`/api/donatur/surat/${encodeURIComponent(surat.id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setGalat(data?.error || 'Gagal menghapus surat');
        return;
      }
      onTerhapus(surat.id);
    } catch {
      setGalat('Tidak dapat terhubung ke server.');
    } finally {
      setMenghapus(false);
    }
  };

  return (
    <LembarBawah buka={!!surat} onTutup={tutup} judul="Hapus surat ini?">
      {surat && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-bq-garis p-3 text-sm">
            <p className="font-mono text-xs text-bq-redup">{surat.nomorSurat}</p>
            <p className="truncate font-bold text-bq-tinta">{surat.namaDonatur}</p>
            <p className="text-bq-tinta">{surat.nilai}</p>
          </div>
          <p className="text-sm text-bq-tinta">
            Surat dan catatan donasinya akan <strong>dihapus permanen</strong>, dan rekap donasi ikut berkurang. Tindakan ini tidak bisa dibatalkan.
          </p>
          {surat.terkirim && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-xs font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
              <Warning size={16} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
              Surat ini sudah terkirim ke WhatsApp donatur. Donatur tetap memegang salinannya meski data di sini dihapus.
            </p>
          )}
          {galat && <PesanGalat pesan={galat} />}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={tutup} disabled={menghapus} className="tekan h-11 rounded-2xl border border-bq-garis text-sm font-bold text-bq-tinta">
              Batal
            </button>
            <button type="button" onClick={hapus} disabled={menghapus}
              className="tekan inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">
              <Trash size={18} weight="bold" aria-hidden="true" /> {menghapus ? 'Menghapus…' : 'Ya, hapus'}
            </button>
          </div>
        </div>
      )}
    </LembarBawah>
  );
}
