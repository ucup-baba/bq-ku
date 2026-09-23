'use client';
import { useState } from 'react';
import { WhatsappLogo } from '@phosphor-icons/react';
import { TombolIkon } from '@/components/ui/Tombol';
import { nomorWali, pesanPengingat } from '@/lib/santri/pengingat';
import type { DokRingkas } from '@/lib/santri/ringkasan';

/** Buat tautan unggah mandiri lalu buka WhatsApp wali dengan pesan pengingat berkas. */
export function TombolPengingatWa({ santriId, nama, kontakWali, docs }: {
  santriId: string; nama: string; kontakWali?: string | null; docs?: DokRingkas[];
}) {
  const [busy, setBusy] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const nomor = nomorWali(kontakWali);
  if (!nomor) return null;

  const kirim = async () => {
    // Buka jendela lebih dulu (sinkron dengan klik) agar tidak diblokir popup blocker.
    const jendela = window.open('', '_blank');
    setBusy(true);
    setGalat(null);
    try {
      const res = await fetch('/api/upload-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ santriId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat tautan unggah');
      const url = `https://wa.me/${nomor}?text=${encodeURIComponent(pesanPengingat(nama, docs, data.uploadUrl))}`;
      if (jendela) jendela.location.href = url; else window.open(url, '_blank');
    } catch (e) {
      jendela?.close();
      setGalat(e instanceof Error ? e.message : 'Gagal menyiapkan pengingat WhatsApp');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TombolIkon ikon={WhatsappLogo} label="Ingatkan wali lewat WhatsApp" ukuran="sm" onClick={kirim} disabled={busy}
        className="text-emerald-600 hover:text-emerald-700" />
      {galat && <p role="alert" className="basis-full text-xs text-rose-600">{galat}</p>}
    </>
  );
}
