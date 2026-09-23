import { terbilang, formatRupiah } from '@/lib/utils/terbilang';
import { formatDateIndonesian, toTitleCase } from '@/lib/utils/formatters';
import { parseNomorSurat, bulanRomawi } from '@/lib/utils/nomor-surat';
import type { SuratData } from '@/lib/surat/data';
import type { Sapaan, JenisDonasi, GayaTulisan } from '@/lib/db/donatur-repo';

export type FormState = {
  nama: string; sapaan: Sapaan; bentuk: 'UANG' | 'BARANG'; nominal: number;
  deskripsiBarang: string; tanggalSurat: string; nomorSurat: string; keterangan: string;
  gayaTulisan: GayaTulisan;
};

/** Memecah nomor surat untuk pratinjau; string kosong bila format belum lengkap/valid (masih diketik). */
function pecahNomorUntukPratinjau(nomor: string): { urut: string; bulan: string; tahun: string } {
  const p = parseNomorSurat(nomor);
  if (!p) return { urut: '', bulan: '', tahun: '' };
  return { urut: String(p.urut), bulan: bulanRomawi(p.bulan), tahun: String(p.tahun % 100).padStart(2, '0') };
}

/** Menyusun data pratinjau tanpa memanggil server. */
export function hitungPratinjau(s: FormState): SuratData {
  const nomor = pecahNomorUntukPratinjau(s.nomorSurat);
  return {
    nomorSurat: s.nomorSurat,
    nomorUrut: nomor.urut,
    nomorBulanRomawi: nomor.bulan,
    nomorTahunDuaDigit: nomor.tahun,
    tanggalTeks: formatDateIndonesian(s.tanggalSurat),
    sapaan: s.sapaan,
    namaDonatur: toTitleCase(s.nama || ''),
    barisNilai: s.bentuk === 'UANG'
      ? { tipe: 'UANG', rupiah: formatRupiah(s.nominal || 0), terbilang: terbilang(s.nominal || 0) }
      : { tipe: 'BARANG', deskripsi: s.deskripsiBarang || '-' },
    keterangan: s.keterangan || null,
    gayaTulisan: s.gayaTulisan,
  };
}

export const FIELD_DONATUR_DIKENAL = new Set(['nama', 'sapaan', 'noWa']);
export const FIELD_SURAT_DIKENAL = new Set(['jenis', 'tanggal', 'nominal', 'deskripsiBarang', 'nomorSurat', 'tanggalSurat', 'donaturId', 'keterangan']);

/**
 * Melepas prefix "donasi." dari kunci error field surat, dan mengumpulkan
 * kunci yang tidak bisa dipetakan ke field mana pun (mis. "donasi" dari
 * refine di level body) ke pesan umum.
 */
export function petakanErrorField(fields: Record<string, string>): { field: Record<string, string>; umum: string | null } {
  const field: Record<string, string> = {};
  let umum: string | null = null;
  for (const [k, v] of Object.entries(fields)) {
    if (k === 'donasi') {
      umum = umum ?? v;
    } else if (k.startsWith('donasi.')) {
      field[k.slice('donasi.'.length)] = v;
    } else {
      field[k] = v;
    }
  }
  return { field, umum };
}

export const OPSI_JENIS: Array<{ value: JenisDonasi; label: string }> = [
  { value: 'ZAKAT', label: 'Zakat' },
  { value: 'INFAQ', label: 'Infaq' },
  { value: 'SHADAQAH', label: 'Shadaqah' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

export function hariIni(): string {
  return new Date().toISOString().slice(0, 10);
}
