import { terbilang, formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian, toTitleCase } from '@/lib/utils/formatters';
import { parseNomorSurat, bulanRomawi } from '@/lib/utils/nomor-surat';
import type { SuratWithRelasi, Sapaan, GayaTulisan } from '@/lib/db/donatur-repo';

export type BarisNilai =
  | { tipe: 'UANG'; rupiah: string; terbilang: string }
  | { tipe: 'BARANG'; deskripsi: string };

export type SuratData = {
  nomorSurat: string;
  /** Bagian nomor surat yang sudah dipecah untuk isian tulisan tangan di formulir (mis. "271/PBQ/IX/2026" -> "271" / "IX" / "26"). */
  nomorUrut: string;
  nomorBulanRomawi: string;
  nomorTahunDuaDigit: string;
  tanggalTeks: string;      // "21 September 2026"
  sapaan: Sapaan;
  namaDonatur: string;
  barisNilai: BarisNilai;
  keterangan: string | null;
  /** Gaya font tulisan tangan untuk isian di PNG surat. */
  gayaTulisan: GayaTulisan;
};

const LABEL_SAPAAN: Record<Sapaan, string> = {
  BAPAK: 'Bapak', IBU: 'Ibu', SDR: 'Sdr.', SDRI: 'Sdri.', BAPAK_IBU: 'Bapak/Ibu',
};

export function labelSapaan(s: Sapaan): string { return LABEL_SAPAAN[s]; }

/** Memecah nomor surat "271/PBQ/IX/2026" -> urut "271", bulan romawi "IX", tahun dua digit "26". */
function pecahNomorSurat(nomor: string): { urut: string; bulanRomawi: string; tahunDuaDigit: string } {
  const p = parseNomorSurat(nomor);
  if (!p) return { urut: '', bulanRomawi: '', tahunDuaDigit: '' };
  return {
    urut: String(p.urut),
    bulanRomawi: bulanRomawi(p.bulan),
    tahunDuaDigit: String(p.tahun % 100).padStart(2, '0'),
  };
}

export function buildSuratData(surat: SuratWithRelasi): SuratData {
  const d = surat.donasi;
  const nomor = pecahNomorSurat(surat.nomorSurat);
  return {
    nomorSurat: surat.nomorSurat,
    nomorUrut: nomor.urut,
    nomorBulanRomawi: nomor.bulanRomawi,
    nomorTahunDuaDigit: nomor.tahunDuaDigit,
    tanggalTeks: formatDateIndonesian(surat.tanggalSurat),
    sapaan: d.donatur.sapaan,
    namaDonatur: toTitleCase(d.donatur.nama),
    barisNilai: d.bentuk === 'UANG'
      ? { tipe: 'UANG', rupiah: formatRupiah(d.nominal ?? 0), terbilang: terbilang(d.nominal ?? 0) }
      : { tipe: 'BARANG', deskripsi: d.deskripsiBarang ?? '-' },
    keterangan: d.keterangan ?? null,
    gayaTulisan: surat.gayaTulisan ?? 'KALAM',
  };
}
