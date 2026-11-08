import { NextResponse } from 'next/server';
import { authErrorResponse } from '@/lib/auth/session';
import { MigrasiBelumError } from '@/lib/db/perpus-cek-repo';

/** Galat bersama rute cek: sesi login, migrasi belum jalan, atau galat lain. */
export function galatCek(e: unknown, konteks: string): NextResponse {
  const authRes = authErrorResponse(e);
  if (authRes) return authRes;
  if (e instanceof MigrasiBelumError) return NextResponse.json({ error: e.message }, { status: 503 });
  console.error(`${konteks}:`, e);
  return NextResponse.json({ error: e instanceof Error ? e.message : konteks }, { status: 500 });
}
