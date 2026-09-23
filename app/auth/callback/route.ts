import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { resolveLandingPath, ROOM_COOKIE } from '@/lib/auth/rooms';
import type { UserRole } from '@/lib/auth/roles';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const raw = searchParams.get('next') || req.cookies.get('bq_next')?.value || '/';
  const next = decodeURIComponent(raw);
  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let dest = next.startsWith('/') ? next : '/';
      if (dest === '/' && authUser) {
        const { data: profile } = await supabase.from('profiles').select('roles, aktif').eq('id', authUser.id).maybeSingle();
        const roles = (profile?.aktif ? profile.roles : []) as UserRole[] ?? [];
        dest = resolveLandingPath(roles, req.cookies.get(ROOM_COOKIE)?.value ?? null) ?? '/';
      }
      const res = NextResponse.redirect(`${origin}${dest}`);
      res.cookies.delete('bq_next');
      return res;
    }
  }
  return NextResponse.redirect(`${origin}/login?error=tautan-tidak-valid`);
}
