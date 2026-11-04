import type { SupabaseClient } from '@supabase/supabase-js';
import { galatDariRpc } from '@/lib/perpus/pinjaman';
import type { CatatanBukuData, CatatanModerasi, CatatanPublik, Catatanku } from '@/lib/perpus/tipe';
import type { CatatanInput } from '@/lib/validation/perpus';

async function panggil<T>(c: SupabaseClient, fungsi: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await c.rpc(fungsi, args);
  if (error) throw galatDariRpc(error.message);
  return data as T;
}

export const simpanCatatan = (c: SupabaseClient, input: CatatanInput) =>
  panggil<Catatanku>(c, 'perpus_simpan_catatan', { p_buku: input.bukuId, p_isi: input.isi, p_publik: input.publik });

export const hapusCatatan = (c: SupabaseClient, id: string) => panggil<void>(c, 'perpus_hapus_catatan', { p_id: id });
export const tutupPemberitahuan = (c: SupabaseClient, id: string) => panggil<void>(c, 'perpus_tutup_pemberitahuan', { p_id: id });
export const moderasiCatatan = (c: SupabaseClient, id: string, alasan: string | null) =>
  panggil<unknown>(c, 'perpus_moderasi_catatan', { p_id: id, p_alasan: alasan });

export async function ambilCatatanBuku(c: SupabaseClient, userId: string | null, bukuId: string): Promise<CatatanBukuData> {
  const { data, error } = await c.from('perpus_catatan_publik').select('*').eq('bukuId', bukuId).order('updatedAt', { ascending: false });
  if (error) throw new Error(`Gagal memuat catatan: ${error.message}`);
  const publik = (data || []) as CatatanPublik[];
  if (!userId) return { publik, milikku: null, bolehTulis: false };
  const [milikku, pernah] = await Promise.all([
    c.from('perpus_catatanku').select('*').eq('bukuId', bukuId).is('dihapusAt', null).maybeSingle(),
    c.from('perpus_pinjaman').select('id', { head: true, count: 'exact' }).eq('anggotaId', userId).eq('bukuId', bukuId)
      .in('status', ['dipinjam', 'menunggu_verifikasi', 'dikembalikan']),
  ]);
  const galat = milikku.error ?? pernah.error;
  if (galat) throw new Error(`Gagal memuat catatan: ${galat.message}`);
  return { publik, milikku: milikku.data as Catatanku | null, bolehTulis: (pernah.count ?? 0) > 0 };
}

export async function listCatatanku(c: SupabaseClient): Promise<Catatanku[]> {
  const { data, error } = await c.from('perpus_catatanku').select('*').order('updatedAt', { ascending: false });
  if (error) throw new Error(`Gagal memuat catatan: ${error.message}`);
  return (data || []) as Catatanku[];
}

export async function listCatatanModerasi(c: SupabaseClient): Promise<CatatanModerasi[]> {
  const { data, error } = await c.from('perpus_catatan')
    .select('id, isi, createdAt, anggota:perpus_anggota(nama), buku:perpus_buku(judul)')
    .eq('publik', true).is('dihapusAt', null).order('createdAt', { ascending: false });
  if (error) throw new Error(`Gagal memuat catatan: ${error.message}`);
  return (data || []) as unknown as CatatanModerasi[];
}
