import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { isPublicPath } from '@/lib/auth/public-paths';
import { roomsFor, roomOfPath, pathNetral, ROOM_HOME, ROOM_COOKIE } from '@/lib/auth/rooms';
import type { UserRole } from '@/lib/auth/roles';
import { identitasDari } from '@/lib/auth/identitas';
import type { Bahasa } from '@/lib/perpus/ddc';
import { hostPerpus, putusanSesi, ruteHostPerpus, type HalamanSesi } from '@/lib/perpus/domain';

/**
 * Hanya memutuskan redirect. Halaman di baliknya tidak membaca cookie di server, jadi cukup
 * meneruskan cookie hasil refresh ke browser (refresh token Supabase sekali pakai).
 */
async function sesiPerpus(request: NextRequest, ke: string, halaman: HalamanSesi, lang: Bahasa) {
  let cookieBaru: Parameters<SetAllCookies>[0] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll(list) { cookieBaru = list; } } },
  );
  const user = await identitasDari(supabase);
  const { data: anggota } = user
    ? await supabase.from('perpus_anggota').select('status').eq('userId', user.id).maybeSingle()
    : { data: null };
  const tujuan = putusanSesi(halaman, lang, { masuk: !!user, anggota: !!anggota }, request.nextUrl.searchParams.get('next'));

  const url = request.nextUrl.clone();
  let res: NextResponse;
  if (tujuan) {
    const [path, query] = tujuan.split('?');
    url.pathname = path;
    url.search = query ? `?${query}` : '';
    url.host = request.headers.get('host')!;
    res = NextResponse.redirect(url);
  } else {
    url.pathname = ke;
    res = NextResponse.rewrite(url);
  }
  cookieBaru.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}

async function proxyPerpus(request: NextRequest) {
  const rute = ruteHostPerpus(request.nextUrl.pathname, request.headers.get('accept-language'));
  if (rute.jenis === 'lewat') return NextResponse.next();
  if (rute.jenis === 'tolak') return new NextResponse('Not Found', { status: 404 });
  if (rute.jenis === 'tulis-ulang' && rute.sesi) return sesiPerpus(request, rute.ke, rute.sesi, rute.lang!);
  const url = request.nextUrl.clone();
  url.pathname = rute.ke;
  if (rute.jenis === 'tulis-ulang') return NextResponse.rewrite(url);
  // nextUrl bisa memuat host internal server; pengunjung harus tetap di domain perpus.
  url.host = request.headers.get('host')!;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  if (hostPerpus(request.headers.get('host'))) return proxyPerpus(request);
  if (/^\/(perpusbq|api\/perpus-publik)(\/|$)/.test(request.nextUrl.pathname)) return new NextResponse('Not Found', { status: 404 });

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

    if (rooms.length === 0 && target !== 'santri') {
      // Tidak punya ruangan sama sekali (profil belum ada/nonaktif/gagal dimuat): ruang santri
      // tetap dilewatkan (halaman "Akun belum diaktifkan" yang menangani, tanpa loop redirect),
      // tapi ruang donatur & lembaga tetap ditolak.
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
