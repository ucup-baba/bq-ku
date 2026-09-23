import type { SupabaseClient } from '@supabase/supabase-js';

export type Identitas = { id: string; email: string };

/**
 * Identitas pengguna dari JWT sesi yang sudah diverifikasi lewat `getClaims()`.
 * Dengan kunci JWT asimetris, verifikasi berjalan lokal (JWKS di-cache) tanpa
 * bolak-balik ke server Auth seperti `getUser()`; sesi yang hampir kedaluwarsa
 * tetap di-refresh lebih dulu. Status aktif/peran tetap dibaca dari tabel profiles.
 */
export async function identitasDari(supabase: SupabaseClient): Promise<Identitas | null> {
  const { data, error } = await supabase.auth.getClaims();
  const klaim = data?.claims;
  if (error || !klaim?.sub) return null;
  return { id: klaim.sub, email: typeof klaim.email === 'string' ? klaim.email : '' };
}
