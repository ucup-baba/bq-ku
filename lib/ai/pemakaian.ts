import 'server-only';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { Penyedia } from './model';
import { awalBulanWib, awalHariWib } from './waktu';

export type FiturAi = 'ocr_tunggal' | 'ocr_massal' | 'ocr_mandiri';
export type BarisPemakaian = {
  idPermintaan: string; waktu: string; penggunaId: string | null; fitur: FiturAi; peran: 'utama' | 'cadangan';
  penyedia: Penyedia; model: string; tokenMasuk: number; tokenKeluar: number; biayaRp: number | null;
  berhasil: boolean; galat: string | null;
};
export type RiwayatAi = BarisPemakaian & { namaPengguna: string | null };
export type RingkasanPemakaian = {
  pindaiHariIni: number; gagalHariIni: number; biayaBulanIni: number; tokenBulanIni: number;
  cadanganBulanIni: number; terakhir: RiwayatAi[];
};

/** `baris`: semua percobaan sejak awal bulan WIB, terbaru dulu. */
export function ringkasPemakaian(baris: RiwayatAi[], sekarang: Date): RingkasanPemakaian {
  const awalHari = awalHariWib(sekarang).getTime();
  const hariIni = new Map<string, boolean>(); // idPermintaan → ada percobaan berhasil
  for (const x of baris) {
    if (Date.parse(x.waktu) < awalHari) continue;
    hariIni.set(x.idPermintaan, (hariIni.get(x.idPermintaan) ?? false) || x.berhasil);
  }
  return {
    pindaiHariIni: hariIni.size,
    gagalHariIni: [...hariIni.values()].filter(ok => !ok).length,
    biayaBulanIni: Math.round(baris.reduce((t, x) => t + (x.biayaRp ?? 0), 0) * 100) / 100,
    tokenBulanIni: baris.reduce((t, x) => t + x.tokenMasuk + x.tokenKeluar, 0),
    cadanganBulanIni: baris.filter(x => x.peran === 'cadangan' && x.berhasil).length,
    terakhir: baris.slice(0, 20),
  };
}

const KOLOM = '"idPermintaan", waktu, "penggunaId", fitur, peran, penyedia, model, "tokenMasuk", "tokenKeluar", "biayaRp", berhasil, galat, pengguna:profiles(nama)';

export async function ambilRingkasanPemakaian(sekarang = new Date()): Promise<RingkasanPemakaian> {
  const { data, error } = await createAdminSupabase().from('pemakaian_ai').select(KOLOM)
    .gte('waktu', awalBulanWib(sekarang).toISOString()).order('waktu', { ascending: false });
  if (error) throw new Error(`Gagal membaca pemakaian AI: ${error.message}`);
  const baris = (data ?? []).map((r: any) => ({
    ...r, biayaRp: r.biayaRp === null ? null : Number(r.biayaRp), namaPengguna: r.pengguna?.nama ?? null,
  })) as RiwayatAi[];
  return ringkasPemakaian(baris, sekarang);
}

/** Tidak pernah melempar: gagal mencatat tidak boleh menggagalkan pindai. */
export async function catatPemakaian(b: BarisPemakaian): Promise<void> {
  try {
    const { error } = await createAdminSupabase().from('pemakaian_ai').insert(b);
    if (error) console.error('Catat pemakaian AI gagal:', error.message);
  } catch (e) {
    console.error('Catat pemakaian AI gagal:', e);
  }
}
