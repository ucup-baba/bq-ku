'use client';
import { useLayoutEffect, useState } from 'react';
import { hitungNaik } from '@/lib/ui/animasi';
import { formatAngka } from '@/lib/ui/format-angka';

/** Angka yang menghitung naik dari 0 setiap kali `nilai` berubah. Pembaca layar hanya membaca nilai akhir. */
export function AngkaNaik({ nilai, format = 'angka', className }: { nilai: number; format?: 'angka' | 'rupiah'; className?: string }) {
  const [tampil, setTampil] = useState(nilai);
  useLayoutEffect(() => hitungNaik(nilai, setTampil), [nilai]);
  return (
    <span className={`tabular-nums ${className ?? ''}`}>
      <span aria-hidden="true">{formatAngka(tampil, format)}</span>
      <span className="sr-only">{formatAngka(nilai, format)}</span>
    </span>
  );
}
