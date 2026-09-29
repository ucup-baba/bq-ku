'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Robot, CaretRight } from '@phosphor-icons/react';
import { IkonUbin } from '@/components/ui/IkonUbin';
import { LABEL_PENYEDIA, infoModel } from '@/lib/ai/model';
import type { DataHalamanAi } from '@/lib/ai/setelan';

const kelasBaris = 'goyang-saat-hover flex items-center justify-between gap-3 rounded-2xl border border-bq-garis p-3.5 transition-colors hover:border-bq-biru';

/** Baris "AI & OCR" di halaman Akun (Superadmin): penyedia utama & pindai hari ini. */
export function BarisAi() {
  const [d, setD] = useState<DataHalamanAi | null>(null);
  useEffect(() => {
    let batal = false;
    fetch('/api/ai').then(r => (r.ok ? r.json() : null)).then(j => { if (!batal && j?.data) setD(j.data); }).catch(() => {});
    return () => { batal = true; };
  }, []);
  const sub = d
    ? `${LABEL_PENYEDIA[d.setelan.utama.penyedia]} ${infoModel(d.setelan.utama)?.label ?? d.setelan.utama.model} · ${d.ringkasan.pindaiHariIni}/${d.setelan.batasHarian} pindai hari ini`
    : 'Penyedia, pemakaian & batas';
  return (
    <Link href="/ai" className={kelasBaris}>
      <span className="flex items-center gap-3">
        <IkonUbin ikon={Robot} warna="biru" />
        <span>
          <span className="block text-sm font-bold text-bq-tinta">AI &amp; OCR</span>
          <span className="block text-xs text-bq-redup">{sub}</span>
        </span>
      </span>
      <CaretRight size={16} weight="bold" className="text-bq-redup" aria-hidden="true" />
    </Link>
  );
}
