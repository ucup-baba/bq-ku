import type { SupabaseClient } from '@supabase/supabase-js';
import type { BukuPublik, DonasiPublik, Penulis, RingkasanPublik } from '@/lib/perpus/tipe';

export async function listKatalogPublik(c: SupabaseClient): Promise<BukuPublik[]> {
  const { data, error } = await c.from('perpus_katalog_publik').select('*').order('nomorPanggil', { nullsFirst: false });
  if (error) throw new Error(`Gagal memuat katalog: ${error.message}`);
  return (data || []) as BukuPublik[];
}

export async function ambilBukuPublik(c: SupabaseClient, idPendek: string): Promise<BukuPublik | null> {
  const { data, error } = await c.from('perpus_katalog_publik').select('*').eq('idPendek', idPendek).limit(1).maybeSingle();
  if (error) throw new Error(`Gagal memuat buku: ${error.message}`);
  return data as BukuPublik | null;
}

export async function listDonasiPublik(c: SupabaseClient): Promise<DonasiPublik[]> {
  const { data, error } = await c.from('perpus_donasi_publik').select('*').order('tanggal', { ascending: false, nullsFirst: false });
  if (error) throw new Error(`Gagal memuat donatur: ${error.message}`);
  return (data || []) as DonasiPublik[];
}

export async function ambilRingkasanPublik(c: SupabaseClient): Promise<RingkasanPublik> {
  const { data, error } = await c.from('perpus_ringkasan_publik').select('*').single();
  if (error) throw new Error(`Gagal memuat ringkasan: ${error.message}`);
  return data as RingkasanPublik;
}

/** Profil hanya pelengkap: bila gagal dimuat, halaman tetap tampil tanpa bio. */
export async function listPenulisPublik(c: SupabaseClient): Promise<Penulis[]> {
  const { data, error } = await c.from('perpus_penulis').select('*');
  if (error) { console.error('Gagal memuat penulis:', error.message); return []; }
  return (data || []) as Penulis[];
}
