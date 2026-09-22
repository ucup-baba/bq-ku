import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/auth/roles';
import { roomsFor, type Room } from '@/lib/auth/rooms';

export type SessionUser = { id: string; email: string; nama: string; roles: UserRole[] };
/** Akun Google sudah masuk tetapi profil nonaktif / belum diizinkan. */
export type PendingUser = { id: string; email: string; aktif: false };

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
  const { data: profile } = await supabase.from('profiles').select('nama, roles, aktif').eq('id', user.id).maybeSingle();
  if (!profile || !profile.aktif) return null;
  return { id: user.id, email: user.email || '', nama: profile.nama, roles: (profile.roles ?? []) as UserRole[] };
}

/** Untuk layout: user aktif, user menunggu aktivasi, atau null. */
export async function getSessionState(): Promise<{ user: SessionUser | null; pending: PendingUser | null }> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, pending: null };
  const active = await getSessionUserWith(supabase);
  if (active) return { user: active, pending: null };
  return { user: null, pending: { id: user.id, email: user.email || '', aktif: false } };
}

/** Dipanggil di awal setiap route handler terproteksi. Mengembalikan klien ber-RLS milik user. */
export async function requireUser(roles?: UserRole[]): Promise<{ user: SessionUser; supabase: SupabaseClient }> {
  const supabase = await createServerSupabase();
  const user = await getSessionUserWith(supabase);
  if (!user) throw new AuthError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu');
  if (roles && !roles.some(r => user.roles.includes(r))) throw new AuthError(403, 'FORBIDDEN', 'Anda tidak memiliki hak akses untuk tindakan ini');
  return { user, supabase };
}

/** Menjamin user berhak atas ruangan tertentu. */
export async function requireRoom(room: Room): Promise<{ user: SessionUser; supabase: SupabaseClient }> {
  const ctx = await requireUser();
  if (!roomsFor(ctx.user.roles).includes(room)) {
    throw new AuthError(403, 'FORBIDDEN', 'Anda tidak memiliki akses ke ruangan ini');
  }
  return ctx;
}

export function authErrorResponse(e: unknown): NextResponse | null {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  return null;
}
