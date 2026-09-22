import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/auth/roles';

export type SessionUser = { id: string; email: string; nama: string; role: UserRole };

export class AuthError extends Error {
  constructor(public status: 401 | 403, public code: 'UNAUTHENTICATED' | 'FORBIDDEN', message: string) {
    super(message); this.name = 'AuthError';
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createServerSupabase();
  return getSessionUserWith(supabase);
}

async function getSessionUserWith(supabase: SupabaseClient): Promise<SessionUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('nama, role, aktif').eq('id', user.id).maybeSingle();
  if (!profile || !profile.aktif) return null;
  return { id: user.id, email: user.email || '', nama: profile.nama, role: profile.role as UserRole };
}

/** Dipanggil di awal setiap route handler terproteksi. Mengembalikan klien ber-RLS milik user. */
export async function requireUser(roles?: UserRole[]): Promise<{ user: SessionUser; supabase: SupabaseClient }> {
  const supabase = await createServerSupabase();
  const user = await getSessionUserWith(supabase);
  if (!user) throw new AuthError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu');
  if (roles && !roles.includes(user.role)) throw new AuthError(403, 'FORBIDDEN', 'Anda tidak memiliki hak akses untuk tindakan ini');
  return { user, supabase };
}

export function authErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  return null;
}
