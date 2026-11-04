import type { SupabaseClient } from '@supabase/supabase-js';
import { gabungPenulis } from '@/lib/perpus/beranda';
import type { Penulis, PenulisAdmin } from '@/lib/perpus/tipe';
import type { PenulisInput } from '@/lib/validation/perpus';

export async function listPenulisAdmin(c: SupabaseClient): Promise<PenulisAdmin[]> {
  const [buku, profil] = await Promise.all([
    c.from('perpus_buku').select('penulis').eq('aktif', true),
    c.from('perpus_penulis').select('*'),
  ]);
  const galat = buku.error ?? profil.error;
  if (galat) throw new Error(`Gagal memuat penulis: ${galat.message}`);
  return gabungPenulis((buku.data || []).map((b: { penulis: string }) => b.penulis), (profil.data || []) as Penulis[]);
}

export async function simpanPenulis(c: SupabaseClient, input: PenulisInput): Promise<Penulis> {
  const { data, error } = await c.from('perpus_penulis')
    .upsert({ ...input, updatedAt: new Date().toISOString() }).select('*').single();
  if (error) throw new Error(`Gagal menyimpan penulis: ${error.message}`);
  return data as Penulis;
}
