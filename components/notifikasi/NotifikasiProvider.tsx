'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { totalNotifikasi, type Notifikasi } from '@/lib/notifikasi/jenis';

type Ctx = { daftar: Notifikasi[] | null; total: number; muatUlang: () => void };
const NotifikasiContext = createContext<Ctx>({ daftar: null, total: 0, muatUlang: () => {} });

/** Jeda minimum antar-pemuatan saat berpindah halaman / kembali ke tab. */
const JEDA_MS = 30_000;

/** Memuat notifikasi saat dibuka, saat berpindah halaman (paling sering tiap 30 detik), dan saat tab kembali aktif. */
export function NotifikasiProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [daftar, setDaftar] = useState<Notifikasi[] | null>(null);
  const terakhir = useRef(0);

  const muat = useCallback(async (paksa = false) => {
    if (!paksa && Date.now() - terakhir.current < JEDA_MS) return;
    terakhir.current = Date.now();
    try {
      const res = await fetch('/api/notifikasi', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setDaftar(data.data ?? []);
    } catch { /* diam: notifikasi bukan hal kritis */ }
  }, []);

  useEffect(() => { muat(); }, [pathname, muat]);
  useEffect(() => {
    const fokus = () => { if (document.visibilityState === 'visible') muat(); };
    document.addEventListener('visibilitychange', fokus);
    return () => document.removeEventListener('visibilitychange', fokus);
  }, [muat]);

  const muatUlang = useCallback(() => { muat(true); }, [muat]);
  return (
    <NotifikasiContext.Provider value={{ daftar, total: daftar ? totalNotifikasi(daftar) : 0, muatUlang }}>
      {children}
    </NotifikasiContext.Provider>
  );
}

export const useNotifikasi = () => useContext(NotifikasiContext);
