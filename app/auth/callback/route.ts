import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const raw = searchParams.get('next') || req.cookies.get('bq_next')?.value || '/';
  const next = decodeURIComponent(raw);
  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const res = NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`);
      res.cookies.delete('bq_next');
      return res;
    }
  }
  return NextResponse.redirect(`${origin}/login?error=tautan-tidak-valid`);
}
