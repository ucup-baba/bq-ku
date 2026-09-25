import { FileText, Stamp, Signature, Bank, Certificate, IdentificationCard, Scales, Buildings, Files, type Icon } from '@phosphor-icons/react';
import type { WarnaUbin } from '@/components/ui/IkonUbin';
import type { StatusMasaBerlaku } from '@/lib/lembaga/berkas';

export const IKON_JENIS: Record<string, { ikon: Icon; warna: WarnaUbin }> = {
  SK_KEMENKUMHAM: { ikon: Scales, warna: 'biru' },
  AKTA_PENDIRIAN: { ikon: Buildings, warna: 'hijau' },
  AKTA_PERUBAHAN: { ikon: Files, warna: 'hijau' },
  NPWP: { ikon: IdentificationCard, warna: 'jingga' },
  IZIN_OPERASIONAL: { ikon: Certificate, warna: 'ungu' },
  AKREDITASI: { ikon: Certificate, warna: 'biru' },
  REKENING_BANK: { ikon: Bank, warna: 'hijau' },
  CAP: { ikon: Stamp, warna: 'ungu' },
  TANDA_TANGAN: { ikon: Signature, warna: 'ungu' },
  LAINNYA: { ikon: FileText, warna: 'abu' },
};

export const TAMPILAN_STATUS: Record<StatusMasaBerlaku, { label: string; kelas: string }> = {
  'tanpa-batas': { label: 'Tanpa batas', kelas: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  berlaku: { label: 'Berlaku', kelas: 'bg-emerald-50 text-[#0E9F54] dark:bg-emerald-950/40 dark:text-emerald-300' },
  segera: { label: 'Segera urus', kelas: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' },
  mendesak: { label: 'Mendesak', kelas: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
  kedaluwarsa: { label: 'Kedaluwarsa', kelas: 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' },
};

export const ukuranTeks = (b: number) => (b >= 1_048_576 ? `${(b / 1_048_576).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** fetch JSON { data } dengan pesan galat dari server. */
export async function ambil<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Permintaan gagal.');
  return json.data as T;
}

export const kirimJson = (method: string, body?: unknown): RequestInit => ({
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});
