import { NextResponse } from 'next/server';

export const PESAN_TIDAK_BERLAKU = 'Tautan ini sudah tidak berlaku. Silakan hubungi pengirimnya.';

/** Header keamanan untuk semua respons halaman bagikan. */
export const HEADER_AMAN = {
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
} as const;

/** Satu jawaban untuk semua alasan (tak ada / kedaluwarsa / dicabut / batas habis) agar tidak bisa ditebak. */
export const tidakBerlaku = () => NextResponse.json({ error: PESAN_TIDAK_BERLAKU }, { status: 410, headers: HEADER_AMAN });
