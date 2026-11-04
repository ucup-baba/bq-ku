'use client';
import { useEffect, useState } from 'react';
import type { PinjamanAdmin } from '@/lib/perpus/tipe';
import type { AksiPustakawanInput } from '@/lib/validation/perpus';

export type KirimAksi = (id: string, aksi: AksiPustakawanInput) => Promise<void>;

/** Muat semua pinjaman dan jalankan aksi; setelah aksi daftar dimuat ulang, termasuk saat galat (status mungkin sudah berubah). */
export function usePinjaman() {
  const [daftar, setDaftar] = useState<PinjamanAdmin[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);

  const muat = async () => {
    const res = await fetch('/api/perpus/pinjaman');
    const d = await res.json();
    if (res.ok) setDaftar(d.data); else setGalat(d.error || 'Gagal memuat pinjaman');
  };
  useEffect(() => { muat(); }, []);

  const kirim: KirimAksi = async (id, aksi) => {
    setSibuk(id); setGalat(null);
    const res = await fetch(`/api/perpus/pinjaman/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aksi),
    });
    const d = await res.json();
    if (!res.ok) setGalat(d.fields ? Object.values(d.fields).join(' · ') : d.error || 'Gagal memproses pinjaman');
    await muat();
    setSibuk(null);
  };

  return { daftar, galat, sibuk, kirim };
}
