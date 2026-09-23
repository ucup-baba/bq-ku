import { terbilang, formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian, toTitleCase } from '@/lib/utils/formatters';
import type { SuratWithRelasi, Sapaan } from '@/lib/db/donatur-repo';

export type BarisNilai =
  | { tipe: 'UANG'; rupiah: string; terbilang: string }
  | { tipe: 'BARANG'; deskripsi: string };

export type SuratData = {
  nomorSurat: string;
  tanggalTeks: string;      // "21 September 2026"
  sapaan: Sapaan;
  namaDonatur: string;
  barisNilai: BarisNilai;
  keterangan: string | null;
};

const LABEL_SAPAAN: Record<Sapaan, string> = {
  BAPAK: 'Bapak', IBU: 'Ibu', SDR: 'Sdr.', SDRI: 'Sdri.', BAPAK_IBU: 'Bapak/Ibu',
};

export function labelSapaan(s: Sapaan): string { return LABEL_SAPAAN[s]; }

export function buildSuratData(surat: SuratWithRelasi): SuratData {
  const d = surat.donasi;
  return {
    nomorSurat: surat.nomorSurat,
    tanggalTeks: formatDateIndonesian(surat.tanggalSurat),
    sapaan: d.donatur.sapaan,
    namaDonatur: toTitleCase(d.donatur.nama),
    barisNilai: d.bentuk === 'UANG'
      ? { tipe: 'UANG', rupiah: formatRupiah(d.nominal ?? 0), terbilang: terbilang(d.nominal ?? 0) }
      : { tipe: 'BARANG', deskripsi: d.deskripsiBarang ?? '-' },
    keterangan: d.keterangan ?? null,
  };
}
