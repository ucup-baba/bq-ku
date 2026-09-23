import { cache } from 'react';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';
import { identitasDari } from '@/lib/auth/identitas';
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

/**
 * Pengecekan sesi tunggal yang di-cache per siklus render request (React cache).
 * Menghilangkan pemanggilan berulang ke Auth dan query profiles; identitas diverifikasi lewat getClaims.
 */
const getCachedSessionState = cache(async (): Promise<{ user: SessionUser | null; pending: PendingUser | null }> => {
  const supabase = await createServerSupabase();
  const user = await identitasDari(supabase);
  if (!user) return { user: null, pending: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('nama, roles, aktif')
    .eq('id', user.id)
    .maybeSingle();

  if (profile && profile.aktif) {
    return {
      user: {
        id: user.id,
        email: user.email || '',
        nama: profile.nama,
        roles: (profile.roles ?? []) as UserRole[],
      },
      pending: null,
    };
  }

  return {
    user: null,
    pending: { id: user.id, email: user.email || '', aktif: false },
  };
});

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const { user } = await getCachedSessionState();
  return user;
});

/** Untuk layout: user aktif, user menunggu aktivasi, atau null. */
export const getSessionState = cache(async (): Promise<{ user: SessionUser | null; pending: PendingUser | null }> => {
  return getCachedSessionState();
});

/** Dipanggil di awal setiap route handler terproteksi. Mengembalikan klien ber-RLS milik user. */
export async function requireUser(roles?: UserRole[]): Promise<{ user: SessionUser; supabase: SupabaseClient }> {
  const supabase = await createServerSupabase();
  const user = await getSessionUser();
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
