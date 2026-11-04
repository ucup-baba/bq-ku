import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { resolveLandingPath, ROOM_COOKIE } from '@/lib/auth/rooms';
import type { UserRole } from '@/lib/auth/roles';
import { gagalCallback, hostPerpus, tujuanCallback } from '@/lib/perpus/domain';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const host = req.headers.get('host');
  const perpus = hostPerpus(host);
  // req.url bisa memuat host internal server; peminjam harus tetap di domain perpus.
  const origin = perpus ? `${url.protocol}//${host}` : url.origin;
  const accept = req.headers.get('accept-language');
  const code = searchParams.get('code');
  const raw = searchParams.get('next') || req.cookies.get('bq_next')?.value || '/';
  const next = decodeURIComponent(raw);
  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let dest = next.startsWith('/') ? next : '/';
      if (perpus) {
        const { data: anggota } = await supabase.from('perpus_anggota').select('status').eq('userId', authUser?.id ?? '').maybeSingle();
        dest = tujuanCallback(next, !!anggota, accept);
      } else if (dest === '/' && authUser) {
        const { data: profile } = await supabase.from('profiles').select('roles, aktif').eq('id', authUser.id).maybeSingle();
        const roles = (profile?.aktif ? profile.roles : []) as UserRole[] ?? [];
        dest = resolveLandingPath(roles, req.cookies.get(ROOM_COOKIE)?.value ?? null) ?? '/';
      }
      const res = NextResponse.redirect(`${origin}${dest}`);
      res.cookies.delete('bq_next');
      return res;
    }
  }
  return NextResponse.redirect(`${origin}${perpus ? gagalCallback(next, accept) : '/login?error=tautan-tidak-valid'}`);
}
