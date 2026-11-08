import type { SupabaseClient } from '@supabase/supabase-js';
import type { BukuCek, HasilCek, ItemCek } from '@/lib/perpus/cek';
import type { CekItemInput } from '@/lib/validation/perpus';

export type SesiCek = { id: string; periode: string; dibuatAt: string; selesaiAt: string | null };

/** Kode bila tabel belum ada: PostgREST (cache skema) atau Postgres. */
const TABEL_TIDAK_ADA = new Set(['PGRST205', '42P01']);

export class MigrasiBelumError extends Error {
  constructor() { super('Fitur cek bulanan belum aktif: jalankan migrasi 0019 di SQL Editor Supabase.'); this.name = 'MigrasiBelumError'; }
}

function periksa(error: { code?: string; message: string } | null, konteks: string) {
  if (!error) return;
  if (error.code && TABEL_TIDAK_ADA.has(error.code)) throw new MigrasiBelumError();
  throw new Error(`${konteks}: ${error.message}`);
}

export async function ambilSesi(c: SupabaseClient, periode: string): Promise<SesiCek | null> {
  const { data, error } = await c.from('perpus_cek').select('id, periode, dibuatAt, selesaiAt').eq('periode', periode).maybeSingle();
  periksa(error, 'Gagal memuat sesi cek');
  return data as SesiCek | null;
}

/** Idempoten: membuka halaman dua kali di bulan yang sama tidak membuat sesi ganda. */
export async function mulaiSesi(c: SupabaseClient, periode: string, oleh: string): Promise<SesiCek> {
  const { error } = await c.from('perpus_cek').upsert({ periode, dibuatOleh: oleh }, { onConflict: 'periode', ignoreDuplicates: true });
  periksa(error, 'Gagal memulai sesi cek');
  return (await ambilSesi(c, periode))!;
}

export async function muatDaftar(c: SupabaseClient, cekId: string) {
  const [buku, item, pinjam] = await Promise.all([
    c.from('perpus_buku').select('id, judul, penulis, nomorPanggil, eksemplar').eq('aktif', true),
    c.from('perpus_cek_item').select('bukuId, hasil, jumlahAda, catatan, dicekAt').eq('cekId', cekId),
    c.from('perpus_pinjaman').select('bukuId').in('status', ['dipinjam', 'menunggu_verifikasi']),
  ]);
  periksa(buku.error, 'Gagal memuat buku');
  periksa(item.error, 'Gagal memuat hasil cek');
  const dipinjam: Record<string, number> = {};
  // Tabel pinjaman bisa belum ada di instalasi lama; cek tetap jalan tanpa data pinjaman.
  for (const p of (pinjam.error ? [] : pinjam.data || []) as { bukuId: string }[]) dipinjam[p.bukuId] = (dipinjam[p.bukuId] ?? 0) + 1;
  return { buku: (buku.data || []) as BukuCek[], item: (item.data || []) as ItemCek[], dipinjam };
}

export async function simpanItem(c: SupabaseClient, cekId: string, input: CekItemInput, oleh: string) {
  const { data, error } = await c.from('perpus_cek_item')
    .upsert({ cekId, ...input, dicekOleh: oleh, dicekAt: new Date().toISOString() }, { onConflict: 'cekId,bukuId' })
    .select('bukuId, hasil, jumlahAda, catatan, dicekAt').single();
  periksa(error, 'Gagal menyimpan hasil cek');
  return data as ItemCek;
}

export async function hapusItem(c: SupabaseClient, cekId: string, bukuId: string) {
  const { error } = await c.from('perpus_cek_item').delete().eq('cekId', cekId).eq('bukuId', bukuId);
  periksa(error, 'Gagal membatalkan hasil cek');
}

export async function selesaikanSesi(c: SupabaseClient, id: string, oleh: string): Promise<SesiCek> {
  const { data, error } = await c.from('perpus_cek').update({ selesaiAt: new Date().toISOString(), selesaiOleh: oleh })
    .eq('id', id).is('selesaiAt', null).select('id, periode, dibuatAt, selesaiAt').maybeSingle();
  periksa(error, 'Gagal menyelesaikan sesi');
  if (!data) throw new Error('Sesi tidak ditemukan atau sudah selesai');
  return data as SesiCek;
}

export async function muatRiwayat(c: SupabaseClient, batas = 12) {
  const { data, error } = await c.from('perpus_cek')
    .select('id, periode, dibuatAt, selesaiAt, item:perpus_cek_item(bukuId, hasil, jumlahAda, catatan)')
    .order('periode', { ascending: false }).limit(batas);
  periksa(error, 'Gagal memuat riwayat cek');
  return (data || []) as (SesiCek & { item: { bukuId: string; hasil: HasilCek; jumlahAda: number; catatan: string | null }[] })[];
}

export async function listBukuStiker(c: SupabaseClient) {
  const { data, error } = await c.from('perpus_buku').select('id, nomorPanggil, eksemplar').eq('aktif', true).order('nomorPanggil');
  periksa(error, 'Gagal memuat buku');
  return (data || []) as { id: string; nomorPanggil: string; eksemplar: number }[];
}
