'use client';
import { createContext, useContext } from 'react';
import { MODE_KERJA, modeDari, type ModeRuang, type NamaMode } from '@/lib/ruang/mode';

const Ctx = createContext<ModeRuang>(MODE_KERJA);

/** Menerima nama mode (string) karena fungsi tidak bisa dikirim dari layout server. */
export function ModeRuangProvider({ mode, children }: { mode: NamaMode; children: React.ReactNode }) {
  return <Ctx.Provider value={modeDari(mode)}>{children}</Ctx.Provider>;
}

/** Bawaan: mode kerja (Ruang Santri/Donatur tidak perlu provider). */
export const useModeRuang = () => useContext(Ctx);
