import { NextResponse } from 'next/server';

/** `app/manifest.ts` hanya didukung di akar `app/` dan ikut tertaut di situs perpus; proxy mengarahkannya ke sini. */
export function GET() {
  return new NextResponse(JSON.stringify({
    name: 'Perpus BQ',
    short_name: 'Perpus BQ',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f7f2',
    theme_color: '#f7f7f2',
    icons: [{ src: '/icons/perpus.svg', sizes: 'any', type: 'image/svg+xml' }],
  }), { headers: { 'Content-Type': 'application/manifest+json' } });
}
