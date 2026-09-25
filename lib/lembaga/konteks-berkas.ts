import 'server-only';
import { NextResponse } from 'next/server';
import { requireRoom } from '@/lib/auth/session';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getPengaturanKelola } from '@/lib/db/berkas-lembaga-repo';
import { hakBerkas } from '@/lib/lembaga/hak-berkas';

export const bucketBerkas = () => process.env.SUPABASE_STORAGE_BUCKET || 'berkas';

/** Pengguna Ruang Lembaga + klien ber-RLS + hak berkas (cermin RLS untuk pesan ramah). */
export async function konteksBerkas() {
  const { user, supabase } = await requireRoom('lembaga');
  const hak = hakBerkas(user.roles, await getPengaturanKelola(supabase));
  return { user, supabase, hak };
}

export const tolak = (pesan: string) => NextResponse.json({ error: pesan }, { status: 403 });
export const PESAN_KELOLA_MATI = 'Pengelolaan berkas sedang dinonaktifkan Superadmin';

/**
 * Pastikan objek hasil unggah langsung benar-benar ada, dengan ukuran & tipe sesuai klaim klien.
 * Memakai kunci admin karena sebelum baris versi ada, RLS belum mengizinkan siapa pun membacanya.
 */
export async function periksaObjekUnggahan(path: string, ukuran: number, mime: string): Promise<string | null> {
  const i = path.lastIndexOf('/');
  const { data, error } = await createAdminSupabase().storage.from(bucketBerkas())
    .list(path.slice(0, i), { search: path.slice(i + 1), limit: 1 });
  const obj = data?.find(o => o.name === path.slice(i + 1));
  if (error || !obj) return 'Berkas belum terunggah. Coba unggah ulang.';
  const meta = (obj.metadata ?? {}) as { size?: number; mimetype?: string };
  if (meta.size !== undefined && meta.size !== ukuran) return 'Ukuran berkas tidak cocok. Coba unggah ulang.';
  if (meta.mimetype && meta.mimetype !== mime) return 'Tipe berkas tidak cocok. Coba unggah ulang.';
  return null;
}
