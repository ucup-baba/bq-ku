import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isPublicPath } from '@/lib/auth/public-paths';
import { roomsFor, roomOfPath, pathNetral, ROOM_HOME, ROOM_COOKIE } from '@/lib/auth/rooms';
import type { UserRole } from '@/lib/auth/roles';
import { identitasDari } from '@/lib/auth/identitas';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims: verifikasi JWT lokal (tanpa panggilan jaringan ke server Auth di setiap request).
  const user = await identitasDari(supabase);
  const { pathname, search } = request.nextUrl;

  // `response` bisa dibuat ulang oleh `setAll` di atas saat sesi di-refresh; salin cookie-nya
  // ke setiap respons pengganti (redirect/json) supaya cookie sesi baru tidak hilang.
  const withSessionCookies = (res: NextResponse) => {
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Silakan masuk terlebih dahulu', code: 'UNAUTHENTICATED' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return withSessionCookies(NextResponse.redirect(url));
  }
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone(); url.pathname = '/'; url.search = '';
    return withSessionCookies(NextResponse.redirect(url));
  }

  if (user && !isPublicPath(pathname) && !pathNetral(pathname)) {
    const { data: profile } = await supabase
      .from('profiles').select('roles, aktif').eq('id', user.id).maybeSingle();
    const roles = (profile?.aktif ? profile.roles : []) as UserRole[] | undefined ?? [];
    const rooms = roomsFor(roles);
    const target = roomOfPath(pathname);

    if (rooms.length > 0 && !rooms.includes(target)) {
      // Punya ruangan, tapi bukan ruangan yang dituju.
      if (pathname.startsWith('/api/')) {
        return withSessionCookies(NextResponse.json(
          { error: 'Anda tidak memiliki akses ke ruangan ini', code: 'FORBIDDEN' },
          { status: 403 },
        ));
      }
      const url = request.nextUrl.clone();
      url.pathname = ROOM_HOME[rooms[0]];
      url.search = '';
      return withSessionCookies(NextResponse.redirect(url));
    }

    if (rooms.length === 0 && target === 'donatur') {
      // Tidak punya ruangan sama sekali (profil belum ada/nonaktif/gagal dimuat): ruang santri
      // tetap dilewatkan (halaman "Akun belum diaktifkan" yang menangani, tanpa loop redirect),
      // tapi ruang donatur tetap ditolak.
      if (pathname.startsWith('/api/')) {
        return withSessionCookies(NextResponse.json(
          { error: 'Anda tidak memiliki akses ke ruangan ini', code: 'FORBIDDEN' },
          { status: 403 },
        ));
      }
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return withSessionCookies(NextResponse.redirect(url));
    }

    if (rooms.includes(target)) {
      response.cookies.set(ROOM_COOKIE, target, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$).*)'],
};
