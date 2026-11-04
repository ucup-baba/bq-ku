import type { SupabaseClient } from '@supabase/supabase-js';
import { identitasDari } from '@/lib/auth/identitas';
import { AuthError } from '@/lib/auth/session';
import { createServerSupabase } from '@/lib/supabase/server';

/** Peminjam umum punya profil nonaktif, jadi `requireUser` selalu 401 untuk mereka. Hak anggota dijaga RPC 0015. */
export async function requireMasuk(): Promise<{ userId: string; supabase: SupabaseClient }> {
  const supabase = await createServerSupabase();
  const user = await identitasDari(supabase);
  if (!user) throw new AuthError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu');
  return { userId: user.id, supabase };
}
